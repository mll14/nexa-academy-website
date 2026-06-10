from rest_framework import serializers
from .models import (
    Testimonial, FAQ, SiteSetting, HomepageFeature, LegalDocument, BlogPost, Announcement,
    PopupBanner, SiteNavigation, FooterConfig,
)


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = [
            'id',
            'name',
            'role',
            'quote',
            'rating',
            'avatar_url',
            'is_active',
            'sort_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = [
            'id',
            'question',
            'answer',
            'category',
            'show_on_homepage',
            'is_active',
            'sort_order',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = ['key', 'value', 'group', 'label', 'updated_at']
        read_only_fields = ['key', 'updated_at']


class HomepageFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageFeature
        fields = [
            'id',
            'section',
            'title',
            'description',
            'icon_name',
            'sort_order',
            'is_active',
        ]
        read_only_fields = ['id']


class LegalDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LegalDocument
        fields = [
            'id',
            'doc_type',
            'section_id',
            'title',
            'content',
            'sort_order',
            'is_active',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            'id', 'sanity_id', 'title', 'slug', 'body', 'author',
            'cover_image_url', 'category', 'tags',
            'published_at', 'is_published', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = [
            'id', 'sanity_id', 'title', 'body',
            'is_active', 'published_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PopupBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopupBanner
        fields = [
            'id', 'title', 'body', 'cta_text', 'cta_url',
            'is_active', 'start_date', 'end_date',
            'target_page', 'dismissible', 'priority',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SiteNavigationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteNavigation
        fields = ['items', 'updated_at']
        read_only_fields = ['updated_at']


class FooterConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FooterConfig
        fields = ['columns', 'social_links', 'copyright_text', 'tagline', 'updated_at']
        read_only_fields = ['updated_at']
