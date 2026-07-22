from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from . import keycloak_views

router = DefaultRouter()
router.register(r'permissions', views.AppPermissionViewSet, basename='permissions')
router.register(r'roles', views.RoleViewSet, basename='roles')
router.register(r'staff', views.StaffUserViewSet, basename='staff')
router.register(r'guardians', views.GuardianViewSet, basename='guardians')

urlpatterns = [
    # ── Keycloak BFF (Option 3): custom UI keeps its own form, Django brokers Keycloak ──
    path('keycloak/login/', keycloak_views.KeycloakLoginView.as_view(), name='kc_login'),
    path('keycloak/2fa/complete/', keycloak_views.KeycloakTwoFACompleteView.as_view(), name='kc_2fa_complete'),
    path('keycloak/social/exchange/', keycloak_views.KeycloakSocialExchangeView.as_view(), name='kc_social_exchange'),
    path('keycloak/refresh/', keycloak_views.KeycloakRefreshView.as_view(), name='kc_refresh'),
    path('keycloak/logout/', keycloak_views.KeycloakLogoutView.as_view(), name='kc_logout'),

    path('login/', views.EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    path('accept-invite/', views.AcceptInviteView.as_view(), name='accept_invite'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('my-profile/', views.UpdateMyProfileView.as_view(), name='my_profile'),
    path('upload-photo/', views.UploadPhotoView.as_view(), name='upload_photo'),
    path('refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('sessions/', views.LoginSessionListView.as_view(), name='login-sessions'),
    path('sessions/logout-all/', views.LogoutAllSessionsView.as_view(), name='login-sessions-logout-all'),
    path('sessions/<uuid:session_id>/revoke/', views.LoginSessionRevokeView.as_view(), name='login-session-revoke'),
    path('account/credentials/', views.AccountCredentialsView.as_view(), name='account-credentials'),
    path('notification-preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
    path('account/export/', views.AccountExportView.as_view(), name='account-export'),
    path('account/deactivate/', views.AccountDeactivateView.as_view(), name='account-deactivate'),
    path('account/', views.AccountDeleteView.as_view(), name='account-delete'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('signup/', views.SignUpView.as_view(), name='signup'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('login/google/', views.GoogleLoginView.as_view(), name='google_login'),
    path('students/<uuid:uid>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-logs'),
    path('2fa/status/', views.TwoFAStatusView.as_view(), name='2fa-status'),
    path('2fa/setup/', views.TwoFASetupView.as_view(), name='2fa-setup'),
    path('2fa/verify/', views.TwoFAVerifyView.as_view(), name='2fa-verify'),
    path('2fa/disable/', views.TwoFADisableView.as_view(), name='2fa-disable'),
    path('2fa/complete-login/', views.TwoFACompleteLoginView.as_view(), name='2fa-complete-login'),
    path('', include(router.urls)),
]
