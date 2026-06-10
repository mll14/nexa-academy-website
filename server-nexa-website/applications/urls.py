from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .calendar_views import CalendarEventsView

router = DefaultRouter()
router.register(r'applications', views.ApplicationViewSet, basename='application')
router.register(r'application-drafts', views.DraftApplicationViewSet, basename='application-draft')

urlpatterns = [
    path('', include(router.urls)),
    path('calendar/events/', CalendarEventsView.as_view(), name='calendar-events'),
]