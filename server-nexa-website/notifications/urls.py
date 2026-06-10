from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet, basename='notification')

# Place explicit chat endpoints before the router so they are not
# accidentally captured by the viewset's `notifications/<pk>/` pattern.
urlpatterns = [
    path('chat/', views.ChatView.as_view(), name='chat'),
    path('notifications/chat/', views.ChatView.as_view(), name='chat_notifications'),
    path('', include(router.urls)),
]