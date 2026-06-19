from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from .serializers import UserSerializer, EmailTokenObtainPairSerializer
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
from accounts.permissions import IsAdminUser
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
