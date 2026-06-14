from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'newsletter', views.NewsletterViewSet, basename='newsletter')
router.register(r'newsletter-campaigns', views.NewsletterCampaignViewSet, basename='newsletter-campaign')

urlpatterns = [
    path('', include(router.urls)),
]