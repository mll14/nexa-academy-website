from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .calendar_views import CalendarEventsView

router = DefaultRouter()
router.register(r'applications', views.ApplicationViewSet, basename='application')
router.register(r'application-notes', views.ApplicationAdminNoteViewSet, basename='application-note')
router.register(r'application-drafts', views.DraftApplicationViewSet, basename='application-draft')
router.register(r'interview-blackouts', views.InterviewBlackoutViewSet, basename='interview-blackout')
router.register(r'calendar-events-custom', views.CustomCalendarEventViewSet, basename='calendar-event-custom')

urlpatterns = [
    path('', include(router.urls)),
    path('calendar/events/', CalendarEventsView.as_view(), name='calendar-events'),
    path('admin/send-follow-up/', views.AdminFollowUpEmailView.as_view(), name='admin-send-follow-up'),
]
