from django.contrib import admin
from .models import (
    Testimonial, FAQ, SiteSetting, HomepageFeature, LegalDocument,
    PopupBanner, SiteNavigation, FooterConfig,
)


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['name', 'role', 'rating', 'is_active', 'sort_order']
    list_editable = ['is_active', 'sort_order']
    list_filter = ['is_active', 'rating']
    search_fields = ['name', 'role', 'quote']
    ordering = ['sort_order']


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'show_on_homepage', 'is_active', 'sort_order']
    list_editable = ['is_active', 'show_on_homepage', 'sort_order']
    list_filter = ['category', 'is_active', 'show_on_homepage']
    search_fields = ['question', 'answer']


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'label', 'group', 'value', 'updated_at']
    list_filter = ['group']
    search_fields = ['key', 'label', 'value']
    readonly_fields = ['updated_at']


@admin.register(HomepageFeature)
class HomepageFeatureAdmin(admin.ModelAdmin):
    list_display = ['title', 'section', 'sort_order', 'is_active']
    list_editable = ['sort_order', 'is_active']
    list_filter = ['section', 'is_active']


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'doc_type', 'sort_order', 'is_active', 'updated_at']
    list_editable = ['sort_order', 'is_active']
    list_filter = ['doc_type', 'is_active']
    search_fields = ['title', 'content']


@admin.register(PopupBanner)
class PopupBannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'is_active', 'target_page', 'priority', 'start_date', 'end_date']
    list_filter = ['is_active', 'target_page']
    list_editable = ['is_active', 'priority']
    search_fields = ['title', 'body']


@admin.register(SiteNavigation)
class SiteNavigationAdmin(admin.ModelAdmin):
    pass


@admin.register(FooterConfig)
class FooterConfigAdmin(admin.ModelAdmin):
    pass
