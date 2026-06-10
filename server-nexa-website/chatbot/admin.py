from django.contrib import admin
from django.contrib import messages as django_messages

from .models import KnowledgeBase


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'source_url', 'is_active', 'updated_at']
    list_filter = ['category', 'is_active']
    search_fields = ['title', 'content', 'slug']
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active']
    ordering = ['category', 'title']

    fieldsets = [
        (None, {
            'fields': ['title', 'slug', 'category', 'source_url', 'is_active'],
        }),
        ('Content', {
            'fields': ['content'],
            'description': 'This text is indexed by the AI chatbot. Write clearly and factually.',
        }),
        ('Metadata', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    actions = ['reindex_selected']

    @admin.action(description='Re-index selected entries in ChromaDB')
    def reindex_selected(self, request, queryset):
        from chatbot.rag import index_single_page
        count = 0
        for kb in queryset.filter(is_active=True):
            try:
                index_single_page({
                    'url': kb.source_url or f'/kb/{kb.slug}',
                    'title': kb.title,
                    'content': kb.content,
                })
                count += 1
            except Exception as exc:
                self.message_user(
                    request, f'Error indexing {kb.title}: {exc}',
                    level=django_messages.ERROR,
                )
        if count:
            self.message_user(
                request, f'Re-indexed {count} entr{"y" if count == 1 else "ies"}.',
                level=django_messages.SUCCESS,
            )
