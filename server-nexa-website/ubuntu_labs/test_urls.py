"""
Minimal URL configuration for unit tests.
Excludes chatbot URLs to avoid sentence_transformers / chromadb dependency.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import EmailTokenObtainPairView
from programs.views import program_interest_create
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/programs/interest/', program_interest_create),
    path('api/', include('applications.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('programs.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('newsletter.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('contacts.urls')),
    # chatbot excluded — requires sentence_transformers / chromadb
    path('api/ai/', include('aiassistant.urls')),
    path('api/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair_legacy'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
