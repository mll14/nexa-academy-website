from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'type', 'read', 'created_at']
    list_filter = ['type', 'read', 'created_at']
    search_fields = ['user__email', 'user__display_name', 'title', 'message']
    readonly_fields = ['notification_id', 'created_at']
    
    fieldsets = (
        ('Recipient', {
            'fields': ('user',)
        }),
        ('Notification', {
            'fields': ('type', 'title', 'message', 'link')
        }),
        ('Status', {
            'fields': ('read', 'created_at')
        }),
        ('Related', {
            'fields': ('application', 'course_name')
        }),
        ('Metadata', {
            'fields': ('notification_id',),
            'classes': ('collapse',)
        })
    )