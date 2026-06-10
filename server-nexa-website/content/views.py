import hashlib
import logging
import time

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from accounts.permissions import IsAdminUser
from django.db.models import Q
from .models import (
    Testimonial, FAQ, SiteSetting, HomepageFeature, LegalDocument, BlogPost, Announcement,
    PopupBanner, SiteNavigation, FooterConfig,
)
from .serializers import (
    TestimonialSerializer,
    FAQSerializer,
    SiteSettingSerializer,
    HomepageFeatureSerializer,
    LegalDocumentSerializer,
    BlogPostSerializer,
    AnnouncementSerializer,
    PopupBannerSerializer,
    SiteNavigationSerializer,
    FooterConfigSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public read-only views
# ---------------------------------------------------------------------------

class TestimonialListView(generics.ListAPIView):
    """GET /api/content/testimonials/ — public, active testimonials only."""
    serializer_class = TestimonialSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        try:
            return Testimonial.objects.filter(is_active=True).order_by('sort_order', '-created_at')
        except Exception as exc:
            logger.error("TestimonialListView: failed to fetch testimonials: %s", exc)
            return Testimonial.objects.none()


class FAQListView(generics.ListAPIView):
    """GET /api/content/faqs/ — public, active FAQs.
    Optional query params: ?category=<cat> and ?show_on_homepage=true
    """
    serializer_class = FAQSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        try:
            qs = FAQ.objects.filter(is_active=True)
            category = self.request.query_params.get('category')
            if category:
                qs = qs.filter(category=category)
            show_on_homepage = self.request.query_params.get('show_on_homepage', '').lower()
            if show_on_homepage == 'true':
                qs = qs.filter(show_on_homepage=True)
            return qs
        except Exception as exc:
            logger.error("FAQListView: failed to fetch FAQs: %s", exc)
            return FAQ.objects.none()


class SiteSettingsView(APIView):
    """GET /api/content/settings/ — returns all settings as flat {key: value} dict.
    Optional query param: ?group=<group>
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            qs = SiteSetting.objects.all()
            group = request.query_params.get('group')
            if group:
                qs = qs.filter(group=group)
            result = {s.key: s.value for s in qs}
            return Response(result)
        except Exception as exc:
            logger.error("SiteSettingsView: failed to fetch settings: %s", exc)
            return Response({'detail': 'Unable to retrieve settings.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HomepageFeatureListView(generics.ListAPIView):
    """GET /api/content/features/ — public, active features.
    Optional query param: ?section=<section>
    """
    serializer_class = HomepageFeatureSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        try:
            qs = HomepageFeature.objects.filter(is_active=True)
            section = self.request.query_params.get('section')
            if section:
                qs = qs.filter(section=section)
            return qs
        except Exception as exc:
            logger.error("HomepageFeatureListView: failed to fetch features: %s", exc)
            return HomepageFeature.objects.none()


class LegalDocumentView(generics.ListAPIView):
    """GET /api/content/legal/<doc_type>/ — public, active sections for a doc type."""
    serializer_class = LegalDocumentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        try:
            doc_type = self.kwargs.get('doc_type')
            return LegalDocument.objects.filter(doc_type=doc_type, is_active=True)
        except Exception as exc:
            logger.error("LegalDocumentView: failed to fetch legal docs: %s", exc)
            return LegalDocument.objects.none()


# ---------------------------------------------------------------------------
# Admin CRUD viewsets
# ---------------------------------------------------------------------------

class TestimonialAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for testimonials — admin only."""
    serializer_class = TestimonialSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Testimonial.objects.all().order_by('sort_order', '-created_at')

    def handle_exception(self, exc):
        logger.error("TestimonialAdminViewSet error: %s", exc)
        return super().handle_exception(exc)


class FAQAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for FAQs — admin only."""
    serializer_class = FAQSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = FAQ.objects.all()

    def handle_exception(self, exc):
        logger.error("FAQAdminViewSet error: %s", exc)
        return super().handle_exception(exc)


class SiteSettingUpdateView(generics.UpdateAPIView):
    """PATCH /api/content/settings/<key>/ — admin only, updates value field only."""
    serializer_class = SiteSettingSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field = 'key'
    queryset = SiteSetting.objects.all()

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            value = request.data.get('value')
            if value is None:
                return Response({'detail': 'Field "value" is required.'}, status=status.HTTP_400_BAD_REQUEST)
            instance.value = value
            instance.save(update_fields=['value', 'updated_at'])
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except SiteSetting.DoesNotExist:
            return Response({'detail': 'Setting not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            logger.error("SiteSettingUpdateView: failed to update setting key=%s: %s", kwargs.get('key'), exc)
            return Response({'detail': 'Unable to update setting.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Override patch to call partial_update
    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    # Disable full PUT
    def put(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


class HomepageFeatureAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for homepage features — admin only."""
    serializer_class = HomepageFeatureSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = HomepageFeature.objects.all()

    def handle_exception(self, exc):
        logger.error("HomepageFeatureAdminViewSet error: %s", exc)
        return super().handle_exception(exc)


class LegalDocumentAdminViewSet(viewsets.ModelViewSet):
    """Full CRUD for legal documents — admin only. Supports ?doc_type= filter."""
    serializer_class = LegalDocumentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = LegalDocument.objects.all()
        doc_type = self.request.query_params.get('doc_type')
        if doc_type:
            qs = qs.filter(doc_type=doc_type)
        return qs

    def handle_exception(self, exc):
        logger.error("LegalDocumentAdminViewSet error: %s", exc)
        return super().handle_exception(exc)


class BlogPostListView(generics.ListAPIView):
    """GET /api/content/blog/ — published posts, newest first, paginated."""
    serializer_class = BlogPostSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True).order_by('-published_at')


class BlogPostDetailView(generics.RetrieveAPIView):
    """GET /api/content/blog/<slug>/ — single published post."""
    serializer_class = BlogPostSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True)


class AnnouncementListView(generics.ListAPIView):
    """GET /api/content/announcements/ — active announcements."""
    serializer_class = AnnouncementSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Announcement.objects.filter(is_active=True).order_by('-published_at')


class CloudinarySignatureView(APIView):
    """
    POST /api/content/upload-signature/
    Admin only. Returns a signed Cloudinary upload signature so the
    browser can POST directly to Cloudinary without exposing the API secret.

    The client posts: { folder: "nexa/programs" }  (optional)
    Response: { signature, timestamp, api_key, cloud_name, folder }
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        cloud_name = getattr(settings, 'CLOUDINARY_CLOUD_NAME', '')
        api_key = getattr(settings, 'CLOUDINARY_API_KEY', '')
        api_secret = getattr(settings, 'CLOUDINARY_API_SECRET', '')

        if not all([cloud_name, api_key, api_secret]):
            return Response(
                {'error': 'Cloudinary is not configured on this server. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        folder = (request.data.get('folder') or 'nexa').strip()
        timestamp = int(time.time())

        # Build the string-to-sign: alphabetically sorted params
        params_to_sign = f"folder={folder}&timestamp={timestamp}"
        signature = hashlib.sha256(f"{params_to_sign}{api_secret}".encode()).hexdigest()

        return Response({
            'signature': signature,
            'timestamp': timestamp,
            'api_key': api_key,
            'cloud_name': cloud_name,
            'folder': folder,
        })


# ---------------------------------------------------------------------------
# Popup Banners
# ---------------------------------------------------------------------------

class PopupBannerListView(generics.ListAPIView):
    """GET /api/content/banners/ — active banners within their date window."""
    serializer_class = PopupBannerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        now = timezone.now()
        return PopupBanner.objects.filter(
            is_active=True,
        ).filter(
            Q(start_date__isnull=True) | Q(start_date__lte=now)
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        )


class PopupBannerAdminViewSet(viewsets.ModelViewSet):
    queryset = PopupBanner.objects.all()
    serializer_class = PopupBannerSerializer
    permission_classes = [IsAdminUser]


# ---------------------------------------------------------------------------
# Navigation singleton
# ---------------------------------------------------------------------------

class SiteNavigationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        nav, _ = SiteNavigation.objects.get_or_create(pk=1)
        return Response(SiteNavigationSerializer(nav).data)


class SiteNavigationAdminView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request):
        nav, _ = SiteNavigation.objects.get_or_create(pk=1)
        s = SiteNavigationSerializer(nav, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


# ---------------------------------------------------------------------------
# Footer singleton
# ---------------------------------------------------------------------------

class FooterConfigView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        footer, _ = FooterConfig.objects.get_or_create(pk=1)
        return Response(FooterConfigSerializer(footer).data)


class FooterConfigAdminView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request):
        footer, _ = FooterConfig.objects.get_or_create(pk=1)
        s = FooterConfigSerializer(footer, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)
