"""
URL configuration for ubuntu_labs project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import EmailTokenObtainPairView
from programs.views import program_interest_create
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Public interest endpoint placed early to avoid other routers intercepting
    path('api/programs/interest/', program_interest_create),
    path('api/', include('applications.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('programs.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('newsletter.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('contacts.urls')),
    path('api/chatbot/', include('chatbot.urls')),
    # AI assistant retrieval endpoints
    path('api/ai/', include('aiassistant.urls')),
    path('api/', include('content.urls')),
    path('api/', include('appointments.urls')),
    # Backward compatibility for older frontend bundles still posting to /api/token/
    path('api/token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair_legacy'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # OpenAPI schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
