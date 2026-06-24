from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .webhook_views import SanityWebhookView

router = DefaultRouter()
router.register(r'programs', views.ProgramViewSet, basename='program')
router.register(r'enrollments', views.EnrollmentViewSet, basename='enrollment')
router.register(r'payment-plan-requests', views.PaymentPlanChangeRequestViewSet, basename='payment-plan-request')
router.register(r'progress', views.ProgramProgressViewSet, basename='progress')
router.register(r'certificates', views.CertificateViewSet, basename='certificate')
router.register(r'intakes', views.ProgramIntakeViewSet, basename='intake')
router.register(r'lead-notes', views.LeadAdminNoteViewSet, basename='lead-note')

urlpatterns = [
    path('sanity-webhook/', SanityWebhookView.as_view(), name='sanity-webhook'),
    path('programs/interest/', views.ProgramInterestCreate.as_view(), name='program-interest-create'),
    path('programs/program-interests/', views.ProgramInterestListView.as_view(), name='program-interest-list'),
    path('programs/program-interests/<uuid:pk>/', views.ProgramInterestDetailView.as_view(), name='program-interest-detail'),
    path('programs/program-interests/notify/', views.ProgramInterestNotifyView.as_view(), name='program-interest-notify'),
    path('programs/help-me/', views.HelpMeLeadView.as_view(), name='help-me-lead'),
    path('programs/help-me/<uuid:pk>/', views.HelpMeLeadDetailView.as_view(), name='help-me-lead-detail'),
    path('programs/incomplete/', views.IncompleteApplicationView.as_view(), name='incomplete-application'),
    path('programs/incomplete/<uuid:pk>/', views.IncompleteApplicationDetailView.as_view(), name='incomplete-application-detail'),
    path('cms/intakes/sync/', views.CMSIntakeSyncView.as_view(), name='cms-intake-sync'),
    path('', include(router.urls)),
]
