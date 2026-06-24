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
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('signup/', views.SignUpView.as_view(), name='signup'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('login/google/', views.GoogleLoginView.as_view(), name='google_login'),
    path('students/<uuid:uid>/', views.StudentDetailView.as_view(), name='student-detail'),
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-logs'),
    path('', include(router.urls)),
]
