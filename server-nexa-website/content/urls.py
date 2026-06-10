from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .cms_sync import CmsSyncView

router = DefaultRouter()
router.register(r'content/admin/testimonials', views.TestimonialAdminViewSet, basename='testimonial-admin')
router.register(r'content/admin/faqs', views.FAQAdminViewSet, basename='faq-admin')
router.register(r'content/admin/features', views.HomepageFeatureAdminViewSet, basename='feature-admin')
router.register(r'content/admin/legal', views.LegalDocumentAdminViewSet, basename='legal-admin')
router.register(r'content/admin/banners', views.PopupBannerAdminViewSet, basename='banner-admin')

urlpatterns = [
    path('', include(router.urls)),
    # Public read-only endpoints
    path('content/testimonials/', views.TestimonialListView.as_view(), name='testimonials'),
    path('content/faqs/', views.FAQListView.as_view(), name='faqs'),
    path('content/settings/', views.SiteSettingsView.as_view(), name='settings'),
    path('content/settings/<str:key>/', views.SiteSettingUpdateView.as_view(), name='setting-update'),
    path('content/features/', views.HomepageFeatureListView.as_view(), name='features'),
    path('content/legal/<str:doc_type>/', views.LegalDocumentView.as_view(), name='legal'),
    # Admin — Cloudinary upload signature
    path('content/upload-signature/', views.CloudinarySignatureView.as_view(), name='upload-signature'),
    # Blog and announcements
    path('content/blog/', views.BlogPostListView.as_view(), name='blog-list'),
    path('content/blog/<slug:slug>/', views.BlogPostDetailView.as_view(), name='blog-detail'),
    path('content/announcements/', views.AnnouncementListView.as_view(), name='announcements'),
    # Banners, navigation, footer
    path('content/banners/', views.PopupBannerListView.as_view(), name='banners'),
    path('content/nav/', views.SiteNavigationView.as_view(), name='nav'),
    path('content/footer/', views.FooterConfigView.as_view(), name='footer'),
    # Admin singletons
    path('content/admin/nav/', views.SiteNavigationAdminView.as_view(), name='nav-admin'),
    path('content/admin/footer/', views.FooterConfigAdminView.as_view(), name='footer-admin'),
    # Sanity CMS unified webhook
    path('cms/sync/', CmsSyncView.as_view(), name='cms-sync'),
]
