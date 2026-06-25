from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class SessionAwareJWTAuthentication(JWTAuthentication):
    """
    Extends JWTAuthentication to reject tokens whose session has been revoked.
    One extra DB query per request — acceptable for an admin/student portal.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, token = result
        session_id = token.get('session_id')
        if session_id:
            from .models import LoginSession
            if LoginSession.objects.filter(id=session_id, is_revoked=True).exists():
                raise AuthenticationFailed('This session has been revoked. Please log in again.')
        return user, token
