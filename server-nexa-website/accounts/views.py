from rest_framework import generics, permissions, status, viewsets, mixins
from django.db.models import Count, Q
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from urllib.parse import urlencode
from .serializers import UserSerializer, EmailTokenObtainPairSerializer, AppPermissionSerializer, RoleSerializer, StaffUserSerializer, MyProfileSerializer, AuditLogSerializer
from .models import AppPermission, Role, AuditLog, TwoFADevice, LoginSession
import hashlib
import pyotp, qrcode
from io import BytesIO
import base64
from django.core import signing
from rest_framework_simplejwt.views import TokenRefreshView as _BaseTokenRefreshView
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


# ── Rate-limit throttles ──────────────────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class ForgotPasswordRateThrottle(AnonRateThrottle):
    scope = 'forgot_password'


class TwoFARateThrottle(AnonRateThrottle):
    scope = 'two_fa'


# ── Cookie helpers ────────────────────────────────────────────────────────────

_REFRESH_COOKIE = 'refresh_token'
_REFRESH_COOKIE_PATH = '/api/auth/'
_REFRESH_MAX_AGE = 30 * 24 * 60 * 60  # 30 days in seconds


def _set_refresh_cookie(response, refresh_token: str) -> None:
    response.set_cookie(
        _REFRESH_COOKIE,
        str(refresh_token),
        max_age=_REFRESH_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Lax',
        path=_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response) -> None:
    response.delete_cookie(_REFRESH_COOKIE, path=_REFRESH_COOKIE_PATH)

User = get_user_model()


# ── Session helpers ───────────────────────────────────────────────────────────

def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        # Take the rightmost address — the one our immediate reverse proxy appended.
        # The leftmost entries can be client-supplied and spoofed. If multiple trusted
        # proxies sit in front of this server, adjust to xff.split(',')[-N].strip().
        return xff.split(',')[-1].strip()
    return request.META.get('REMOTE_ADDR')


def _issue_tokens(user, request):
    """Create a LoginSession, embed session_id in both tokens, return (refresh, access)."""
    session = LoginSession.objects.create(
        user=user,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        last_seen_at=timezone.now(),
    )
    refresh = RefreshToken.for_user(user)
    refresh['session_id'] = str(session.id)
    access = refresh.access_token
    access['session_id'] = str(session.id)
    session.refresh_jti = str(refresh['jti'])
    session.save(update_fields=['refresh_jti'])
    return refresh, access


# ── Login ─────────────────────────────────────────────────────────────────────

class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response(
                {'detail': 'No active account found with the given credentials.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user = serializer.user
        device = getattr(user, 'two_fa_device', None)
        if device and device.enabled:
            temp_token = signing.dumps({'uid': str(user.uid)}, salt='2fa-login')
            return Response({'requires_2fa': True, 'temp_token': temp_token})
        refresh, access = _issue_tokens(user, request)
        response = Response({'access': str(access)})
        _set_refresh_cookie(response, refresh)
        return response


# ── Token refresh — keep session refresh_jti in sync ─────────────────────────

class CustomTokenRefreshView(_BaseTokenRefreshView):
    """Reads refresh token from httpOnly cookie when absent from the request body."""

    def get_serializer(self, *args, **kwargs):
        if 'data' in kwargs and not kwargs['data'].get('refresh'):
            cookie_refresh = self.request.COOKIES.get(_REFRESH_COOKIE, '')
            if cookie_refresh:
                kwargs['data'] = {**dict(kwargs['data']), 'refresh': cookie_refresh}
        return super().get_serializer(*args, **kwargs)

    def post(self, request, *args, **kwargs):
        old_refresh_str = request.data.get('refresh') or request.COOKIES.get(_REFRESH_COOKIE, '')
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response

        # Keep the LoginSession refresh_jti in sync after rotation
        try:
            from rest_framework_simplejwt.tokens import RefreshToken as RT
            old = RT(old_refresh_str)
            session_id = old.get('session_id')
            if session_id:
                new_refresh_str = response.data.get('refresh', '')
                if new_refresh_str:
                    new = RT(new_refresh_str)
                    LoginSession.objects.filter(
                        id=session_id, is_revoked=False
                    ).update(refresh_jti=str(new['jti']), last_seen_at=timezone.now())
        except Exception:
            pass

        # Move the rotated refresh token from the response body into a cookie
        new_refresh = response.data.pop('refresh', None)
        if new_refresh:
            _set_refresh_cookie(response, new_refresh)

        return response

class SignUpView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh, access = _issue_tokens(user, request)
        response = Response({
            'user': UserSerializer(user).data,
            'access': str(access),
        }, status=status.HTTP_201_CREATED)
        _set_refresh_cookie(response, refresh)
        return response

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        token = request.data.get('google_token')
        if not token:
            return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
            email = name = picture = None

            try:
                idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
                if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                    raise ValueError('Wrong issuer.')
                if not idinfo.get('email_verified', False):
                    return Response({'error': 'Google account email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)
                email = idinfo['email']
                name = idinfo.get('name', '')
                picture = idinfo.get('picture', '')
            except Exception as id_token_error:
                # ID token verification failed — fall back to OAuth2 access-token userinfo endpoint
                logger.debug('Google ID token verification failed, trying userinfo fallback: %s', id_token_error)
                resp = http_requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'},
                    timeout=10,
                )
                if resp.status_code != 200:
                    return Response({'error': 'Invalid Google token'}, status=status.HTTP_400_BAD_REQUEST)
                userinfo = resp.json()
                if not userinfo.get('email_verified', False):
                    return Response({'error': 'Google account email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)
                email = userinfo.get('email')
                name = userinfo.get('name', '')
                picture = userinfo.get('picture', '')

            if not email:
                return Response({'error': 'Could not retrieve email from Google'}, status=status.HTTP_400_BAD_REQUEST)

            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'display_name': name,
                    'photo_url': picture,
                    'role': 'student',
                    'status': 'active',
                    'google_linked': True,
                }
            )
            if not created and not user.google_linked:
                user.google_linked = True
                user.save(update_fields=['google_linked'])

            device = getattr(user, 'two_fa_device', None)
            if device and device.enabled:
                temp_token = signing.dumps({'uid': str(user.uid)}, salt='2fa-login')
                return Response({'requires_2fa': True, 'temp_token': temp_token})

            refresh, access = _issue_tokens(user, request)
            response = Response({
                'user': UserSerializer(user).data,
                'access': str(access),
                'isNewUser': created,
            }, status=status.HTTP_200_OK)
            _set_refresh_cookie(response, refresh)
            return response

        except Exception:
            logger.exception('Unexpected error in GoogleLoginView')
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
        applications = Application.objects.select_related('interview_slot').filter(user=user).order_by('-applied_at')
        payments = Payment.objects.filter(student=user).order_by('-payment_date')
        enrollments = Enrollment.objects.select_related('program').filter(student=user)
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
    throttle_classes = [ForgotPasswordRateThrottle]

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

        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save()
        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token (from httpOnly cookie or request body) and
    clears the cookie. Returns 205 whether or not a token was present — the
    client's session is always terminated from their perspective.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh") or request.COOKIES.get(_REFRESH_COOKIE)
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        _clear_refresh_cookie(response)

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token_user_id = str(token.get("user_id", ""))
                if token_user_id == str(request.user.uid):
                    token.blacklist()
            except TokenError:
                pass  # Token already expired or invalid — logout still succeeds

        return response


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
    queryset = Role.objects.prefetch_related('permissions').annotate(
        user_count=Count('users', filter=Q(users__role='admin'))
    ).all()
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

        try:
            user = User.objects.get(uid=uid)
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired invitation link.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.has_usable_password():
            return Response({'error': 'This invitation has already been accepted.'}, status=status.HTTP_400_BAD_REQUEST)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({'error': 'Invalid or expired invitation link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password, user)
        except DjangoValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        user.display_name = display_name
        user.set_password(password)
        user.save(update_fields=['display_name', 'password'])

        refresh, access = _issue_tokens(user, request)
        response = Response({
            'detail': 'Account set up successfully.',
            'user': UserSerializer(user).data,
            'access': str(access),
        }, status=status.HTTP_200_OK)
        _set_refresh_cookie(response, refresh)
        return response


_IMAGE_MAGIC_SIGNATURES = (
    b'\xff\xd8\xff',           # JPEG
    b'\x89PNG\r\n\x1a\n',     # PNG
    b'GIF87a',                  # GIF
    b'GIF89a',                  # GIF
)
_IMAGE_WEBP_SIG = (b'RIFF', b'WEBP')  # bytes 0-3 and 8-11


def _is_valid_image_bytes(file_obj) -> bool:
    header = file_obj.read(12)
    file_obj.seek(0)
    for sig in _IMAGE_MAGIC_SIGNATURES:
        if header[:len(sig)] == sig:
            return True
    # WebP: RIFF????WEBP
    if header[:4] == _IMAGE_WEBP_SIG[0] and header[8:12] == _IMAGE_WEBP_SIG[1]:
        return True
    return False


class UploadPhotoView(APIView):
    """
    POST /api/auth/upload-photo/
    Accepts a multipart file upload, uploads to Cloudinary, and saves the
    returned URL on the authenticated user's photo_url field.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('photo')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.content_type.startswith('image/'):
            return Response({'error': 'File must be an image.'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > 5 * 1024 * 1024:
            return Response({'error': 'Image must be under 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)
        if not _is_valid_image_bytes(file):
            return Response({'error': 'File must be a valid image.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                file,
                folder='nexa/avatars',
                public_id=f'user_{request.user.uid}',
                overwrite=True,
                resource_type='image',
                transformation=[
                    {'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'},
                    {'quality': 'auto', 'fetch_format': 'auto'},
                ],
            )
            url = result.get('secure_url')
            if not url:
                raise ValueError('Cloudinary did not return a URL.')
        except Exception:
            logger.exception('Cloudinary upload failed for user %s', request.user.uid)
            return Response({'error': 'Upload failed. Please try again.'}, status=status.HTTP_502_BAD_GATEWAY)

        request.user.photo_url = url
        request.user.save(update_fields=['photo_url'])
        return Response({'photo_url': url})


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — change the authenticated user's password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')

        if not current_password or not new_password:
            return Response({'error': 'current_password and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not request.user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, request.user)
        except DjangoValidationError as exc:
            return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

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

from .utils import create_audit_log  # noqa: E402 — re-exported for callers that import from here


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

        return qs.order_by('-created_at')[:200]


# ── Two-Factor Authentication ─────────────────────────────────────────────────

class TwoFAStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        device = getattr(request.user, 'two_fa_device', None)
        return Response({'enabled': bool(device and device.enabled)})


class TwoFASetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        device, _ = TwoFADevice.objects.get_or_create(user=user)
        if device.enabled:
            return Response({'error': '2FA is already enabled.'}, status=status.HTTP_400_BAD_REQUEST)
        secret = pyotp.random_base32()
        device.secret = secret
        device.save()
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.email, issuer_name='Nexa Academy')
        qr = qrcode.make(uri)
        buf = BytesIO()
        qr.save(buf, format='PNG')
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        return Response({
            'secret': secret,
            'qr_image': f'data:image/png;base64,{qr_b64}',
            'otpauth_url': uri,
        })


class TwoFAVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip()
        device = getattr(request.user, 'two_fa_device', None)
        if not device:
            return Response({'error': 'No 2FA setup in progress.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pyotp.TOTP(device.secret).verify(code, valid_window=1):
            return Response({'error': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)
        device.enabled = True
        device.confirmed_at = timezone.now()
        device.save()
        return Response({'enabled': True})


class TwoFADisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip()
        device = getattr(request.user, 'two_fa_device', None)
        if not device or not device.enabled:
            return Response({'error': '2FA is not enabled.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pyotp.TOTP(device.secret).verify(code, valid_window=1):
            return Response({'error': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)
        device.delete()
        return Response({'enabled': False})


class TwoFACompleteLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [TwoFARateThrottle]

    def post(self, request):
        temp_token = request.data.get('temp_token', '')
        code = request.data.get('code', '').strip()
        if not temp_token or not code:
            return Response({'error': 'temp_token and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent replay: each temp_token can only complete 2FA once
        used_key = f'2fa_used:{hashlib.sha256(temp_token.encode()).hexdigest()}'
        if cache.get(used_key):
            return Response({'error': 'Token expired. Please log in again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = signing.loads(temp_token, salt='2fa-login', max_age=300)
        except signing.SignatureExpired:
            return Response({'error': 'Token expired. Please log in again.'}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

        user = get_object_or_404(User, uid=payload.get('uid'))
        device = getattr(user, 'two_fa_device', None)
        if not device or not device.enabled:
            return Response({'error': '2FA not configured.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pyotp.TOTP(device.secret).verify(code, valid_window=1):
            return Response({'error': 'Invalid code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Atomic replay guard: cache.add returns False if the key already exists,
        # closing the race window where two concurrent requests both pass cache.get above.
        if not cache.add(used_key, True, timeout=300):
            return Response({'error': 'Token expired. Please log in again.'}, status=status.HTTP_400_BAD_REQUEST)

        refresh, access = _issue_tokens(user, request)
        response = Response({'access': str(access)})
        _set_refresh_cookie(response, refresh)
        return response


# ── Login session list & revoke ───────────────────────────────────────────────

class LoginSessionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_session_id = str(request.auth.get('session_id', '')) if request.auth else ''
        sessions = LoginSession.objects.filter(user=request.user, is_revoked=False).order_by('-last_seen_at', '-created_at')
        # Update last_seen_at for the current session
        if current_session_id:
            sessions.filter(id=current_session_id).update(last_seen_at=timezone.now())
        data = [
            {
                'id': str(s.id),
                'ip_address': s.ip_address,
                'user_agent': s.user_agent or None,
                'created_at': s.created_at.isoformat(),
                'last_seen_at': s.last_seen_at.isoformat() if s.last_seen_at else s.created_at.isoformat(),
                'is_current': str(s.id) == current_session_id,
            }
            for s in sessions
        ]
        return Response(data)


class LoginSessionRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(LoginSession, id=session_id, user=request.user, is_revoked=False)
        current_session_id = str(request.auth.get('session_id', '')) if request.auth else ''
        if str(session.id) == current_session_id:
            return Response({'error': 'Cannot revoke the current session. Log out instead.'}, status=status.HTTP_400_BAD_REQUEST)
        # Blacklist the outstanding refresh token
        if session.refresh_jti:
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                outstanding = OutstandingToken.objects.get(jti=session.refresh_jti)
                BlacklistedToken.objects.get_or_create(token=outstanding)
            except Exception:
                pass
        session.is_revoked = True
        session.save(update_fields=['is_revoked'])
        return Response({'detail': 'Session revoked.'})
