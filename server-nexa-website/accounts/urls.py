from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'permissions', views.AppPermissionViewSet, basename='permissions')
router.register(r'roles', views.RoleViewSet, basename='roles')
router.register(r'staff', views.StaffUserViewSet, basename='staff')

urlpatterns = [
    path('login/', views.EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    path('accept-invite/', views.AcceptInviteView.as_view(), name='accept_invite'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('my-profile/', views.UpdateMyProfileView.as_view(), name='my_profile'),
    path('upload-photo/', views.UploadPhotoView.as_view(), name='upload_photo'),
    path('refresh/', views.CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('sessions/', views.LoginSessionListView.as_view(), name='login-sessions'),
    path('sessions/<uuid:session_id>/revoke/', views.LoginSessionRevokeView.as_view(), name='login-session-revoke'),
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
