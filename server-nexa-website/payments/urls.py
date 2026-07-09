from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'manual-payment-requests', views.ManualPaymentRequestViewSet, basename='manual-payment-request')

urlpatterns = [
    path('', include(router.urls)),
]