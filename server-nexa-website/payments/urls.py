from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'manual-payment-requests', views.ManualPaymentRequestViewSet, basename='manual-payment-request')

urlpatterns = [
    # Explicit routes must precede the router so they are not shadowed by it.
    path('payments/paystack/webhook/', views.PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('', include(router.urls)),
]