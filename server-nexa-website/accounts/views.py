from rest_framework import generics, permissions, status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from urllib.parse import urlencode
from .serializers import UserSerializer, EmailTokenObtainPairSerializer, AppPermissionSerializer, RoleSerializer, StaffUserSerializer, MyProfileSerializer, AuditLogSerializer
from .models import AppPermission, Role, AuditLog
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests as http_requests
from django.shortcuts import get_object_or_404
from applications.models import Application
from applications.serializers import ApplicationSerializer
from payments.models import Payment
from payments.serializers import PaymentSerializer
from payments.reconciliation import payment_reconciliation_for_student, serialize_reconciliation
from programs.models import Enrollment
from programs.serializers import EnrollmentSerializer
from accounts.permissions import IsAdminUser, IsSuperAdmin, HasAppPermission
from ubuntu_labs.email_utils import send_html_email
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

class SignUpView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('google_token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Try verifying as an ID token first
            client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
            email = name = picture = None

            try:
                idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
                if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                    raise ValueError('Wrong issuer.')
                email = idinfo['email']
                name = idinfo.get('name', '')
                picture = idinfo.get('picture', '')
            except Exception:
                # Fall back: treat token as an OAuth2 access token and fetch userinfo
                resp = http_requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=10,
                )
                if resp.status_code != 200:
                    return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)
                userinfo = resp.json()
                email = userinfo.get('email')
                name = userinfo.get('name', '')
                picture = userinfo.get('picture', '')

            if not email:
                return Response({'error': 'Could not retrieve email from Google'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'display_name': name,
                    'photo_url': picture,
                    'role': 'student',
                    'status': 'active'
                }
            )

            # Generate tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'isNewUser': created
            }, status=status.HTTP_200_OK)

        except Exception:
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StudentDetailView(generics.RetrieveAPIView):
    """Admin-only: full student profile with enrollments, applications, payments."""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer

    def get_object(self):
        uid = self.kwargs.get('uid')
        return get_object_or_404(User, uid=uid)

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        applications = Application.objects.filter(user=user).order_by('-applied_at')
        payments = Payment.objects.filter(student=user).order_by('-payment_date')
        enrollments = Enrollment.objects.filter(student=user)
        return Response({
            'user': UserSerializer(user).data,
            'applications': ApplicationSerializer(applications, many=True).data,
            'payments': PaymentSerializer(payments, many=True).data,
            'enrollments': EnrollmentSerializer(enrollments, many=True).data,
            'reconciliation': serialize_reconciliation(payment_reconciliation_for_student(user)),
        })

class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/
    Sends a password-reset email. Always returns 200 regardless of whether the
    email is registered — prevents email enumeration.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if user:
            try:
                token = PasswordResetTokenGenerator().make_token(user)
                reset_url = (
                    f"{getattr(settings, 'ADMISSIONS_PORTAL_URL', 'https://admissions.nexaacademy.co.ke')}"
                    f"/reset-password?uid={user.uid}&token={token}"
                )
                send_html_email(
                    subject='Reset your Nexa Academy password',
                    template_name='password_reset.html',
                    context={'display_name': user.display_name or email, 'reset_url': reset_url},
                    recipient_email=email,
                )
            except Exception:
                logger.exception('Failed to send password reset email to %s', email)

        return Response(
            {'detail': 'If that email is registered, a reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/
    Verifies the PasswordResetTokenGenerator token and sets the new password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '').strip()
        token = request.data.get('token', '').strip()
        password = request.data.get('password', '')

        if not uid or not token or not password:
            return Response({'error': 'uid, token, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()
        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the submitted refresh token. Verifies the token belongs to
    the authenticated user before blacklisting to prevent one user from
    invalidating another user's session.
    Returns 205 on success, 400 on bad token, 403 on ownership mismatch.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            # Verify the token belongs to the authenticated user
            token_user_id = str(token.get("user_id", ""))
            if token_user_id != str(request.user.uid):
                return Response({"detail": "Token does not belong to the authenticated user."}, status=status.HTTP_403_FORBIDDEN)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


# ─── Roles & Permissions ─────────────────────────────────────────────────────

class AppPermissionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """GET /api/auth/permissions/ — list; POST — create custom permission (super admin only)."""
    queryset = AppPermission.objects.all().order_by('resource', 'action')
    serializer_class = AppPermissionSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action == 'create':
            return [IsSuperAdmin()]
        return [IsAdminUser()]


class RoleViewSet(viewsets.ModelViewSet):
    """CRUD for roles. Write actions require super admin. Reads require any admin."""
    queryset = Role.objects.prefetch_related('permissions').all()
    serializer_class = RoleSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'destroy'):
            return [IsSuperAdmin()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save()
        create_audit_log(
            request=self.request,
            action='create_role',
            resource_type='role',
            resource_id=str(instance.id),
            resource_summary={'name': instance.name, 'slug': instance.slug},
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        create_audit_log(
            request=self.request,
            action='update_role',
            resource_type='role',
            resource_id=str(instance.id),
            resource_summary={'name': instance.name, 'slug': instance.slug},
        )

    def perform_destroy(self, instance):
        if instance.is_system:
            raise DRFValidationError('System roles cannot be deleted.')
        create_audit_log(
            request=self.request,
            action='delete_role',
            resource_type='role',
            resource_id=str(instance.id),
            resource_summary={'name': instance.name, 'slug': instance.slug},
        )
        instance.users.filter(role='admin').update(staff_role=None)
        instance.delete()


class StaffUserViewSet(viewsets.ModelViewSet):
    """Manage admin users: list/create/update/remove. Create/update/delete requires super admin."""
    serializer_class = StaffUserSerializer
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return (
            User.objects.filter(role='admin')
            .order_by('display_name')
            .prefetch_related('staff_role__permissions', 'individual_permissions')
            .select_related('staff_role')
        )

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'destroy', 'resend_invite'):
            return [IsSuperAdmin()]
        return [HasAppPermission('users.view')()]

    def _send_invite_email(self, user, invited_by_name, staff_role):
        token = PasswordResetTokenGenerator().make_token(user)
        qs = urlencode({'uid': str(user.uid), 'token': token, 'name': user.display_name})
        invite_url = (
            f"{getattr(settings, 'ADMISSIONS_PORTAL_URL', 'https://admissions.nexaacademy.co.ke')}"
            f"/accept-invite?{qs}"
        )
        role_name = staff_role.name if staff_role else None
        try:
            send_html_email(
                subject='You\'ve been invited to Nexa Academy Admissions Portal',
                template_name='staff_invitation.html',
                context={
                    'display_name': user.display_name,
                    'invited_by': invited_by_name,
                    'role_name': role_name,
                    'invite_url': invite_url,
                },
                recipient_email=user.email,
            )
        except Exception:
            logger.exception('Failed to send invite email to %s', user.email)

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        display_name = request.data.get('display_name', '').strip()
        staff_role_id = request.data.get('staff_role_id')

        if not email or not display_name:
            raise DRFValidationError({'error': 'email and display_name are required.'})

        staff_role = None
        if staff_role_id:
            try:
                staff_role = Role.objects.get(id=staff_role_id)
            except Role.DoesNotExist:
                raise DRFValidationError({'staff_role_id': 'Role does not exist.'})

        existing = User.objects.filter(email=email).first()
        if existing:
            if existing.role == 'admin':
                raise DRFValidationError({'email': 'A staff user with this email already exists.'})
            # Promote existing student to admin — clear password so invite accept flow works
            existing.role = 'admin'
            existing.staff_role = staff_role
            existing.display_name = display_name or existing.display_name
            existing.set_password(None)
            existing.individual_permissions.clear()
            existing.save(update_fields=['role', 'staff_role', 'display_name', 'password'])
            # Invalidate all existing tokens so the student session ends
            for token in OutstandingToken.objects.filter(user=existing):
                BlacklistedToken.objects.get_or_create(token=token)
            invited_by_name = request.user.display_name or request.user.email
            self._send_invite_email(existing, invited_by_name, staff_role)
            create_audit_log(
                request=request,
                action='invite_staff',
                resource_type='staff_user',
                resource_id=str(existing.uid),
                resource_summary={
                    'name': existing.display_name,
                    'email': existing.email,
                    'role': staff_role.name if staff_role else 'Super Admin',
                },
            )
            return Response(StaffUserSerializer(existing).data, status=status.HTTP_201_CREATED)

        # Create with no usable password — user must accept the invite to set one
        user = User.objects.create_user(
            email=email, display_name=display_name, password=None,
            role='admin', staff_role=staff_role,
        )

        invited_by_name = request.user.display_name or request.user.email
        self._send_invite_email(user, invited_by_name, staff_role)
        create_audit_log(
            request=request,
            action='invite_staff',
            resource_type='staff_user',
            resource_id=str(user.uid),
            resource_summary={
                'name': user.display_name,
                'email': user.email,
                'role': staff_role.name if staff_role else 'Super Admin',
            },
        )

        return Response(StaffUserSerializer(user).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='resend_invite')
    def resend_invite(self, request, pk=None):
        user = self.get_object()
        if user.has_usable_password():
            return Response({'error': 'This user has already accepted their invitation.'}, status=status.HTTP_400_BAD_REQUEST)
        invited_by_name = request.user.display_name or request.user.email
        self._send_invite_email(user, invited_by_name, user.staff_role)
        return Response({'detail': 'Invitation resent.'})

    def perform_update(self, serializer):
        old_role = serializer.instance.staff_role
        instance = serializer.save()
        create_audit_log(
            request=self.request,
            action='update_staff',
            resource_type='staff_user',
            resource_id=str(instance.uid),
            resource_summary={
                'name': instance.display_name,
                'email': instance.email,
                'role': instance.staff_role.name if instance.staff_role else 'Super Admin',
                'previous_role': old_role.name if old_role else 'Super Admin',
            },
        )

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise DRFValidationError('You cannot remove yourself.')
        create_audit_log(
            request=self.request,
            action='remove_staff',
            resource_type='staff_user',
            resource_id=str(instance.uid),
            resource_summary={'name': instance.display_name, 'email': instance.email},
        )
        instance.role = 'student'
        instance.is_staff = False
        instance.staff_role = None
        instance.save(update_fields=['role', 'is_staff', 'staff_role'])
        instance.individual_permissions.clear()


class AcceptInviteView(APIView):
    """
    POST /api/auth/accept-invite/
    Validates the invite token and sets the user's display name and password.
    Returns JWT tokens on success so the user is immediately logged in.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '').strip()
        token = request.data.get('token', '').strip()
        display_name = request.data.get('display_name', '').strip()
        password = request.data.get('password', '')

        if not uid or not token or not display_name or not password:
            return Response({'error': 'uid, token, display_name, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired invitation link.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.has_usable_password():
            return Response({'error': 'This invitation has already been accepted.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired invitation link.'}, status=status.HTTP_400_BAD_REQUEST)

        user.display_name = display_name
        user.set_password(password)
        user.save(update_fields=['display_name', 'password'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'detail': 'Account set up successfully.',
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — change the authenticated user's password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response({'error': 'current_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class UpdateMyProfileView(APIView):
    """PATCH /api/auth/my-profile/ — update the authenticated user's own profile fields."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = MyProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


# ─── Audit Logs ──────────────────────────────────────────────────────────────

def create_audit_log(request, action: str, resource_type: str, resource_id: str, resource_summary: dict):
    """Helper called from any view that performs a sensitive delete operation."""
    ip = (
        request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        or request.META.get('REMOTE_ADDR')
        or None
    )
    AuditLog.objects.create(
        user=request.user if request.user.is_authenticated else None,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        resource_summary=resource_summary,
        ip_address=ip or None,
    )


class AuditLogListView(generics.ListAPIView):
    """GET /api/auth/audit-logs/ — super admin only."""
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = None  # returns a plain array; capped at 200 in get_queryset

    def get_queryset(self):
        from django.utils.dateparse import parse_date
        qs = AuditLog.objects.select_related('user').all()

        action = self.request.query_params.get('action')
        user_uid = self.request.query_params.get('user')
        resource_type = self.request.query_params.get('resource_type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if action:
            qs = qs.filter(action=action)
        if user_uid:
            qs = qs.filter(user__uid=user_uid)
        if resource_type:
            qs = qs.filter(resource_type=resource_type)
        if date_from:
            parsed = parse_date(date_from)
            if parsed:
                qs = qs.filter(created_at__date__gte=parsed)
        if date_to:
            parsed = parse_date(date_to)
            if parsed:
                qs = qs.filter(created_at__date__lte=parsed)

        return qs[:500]
