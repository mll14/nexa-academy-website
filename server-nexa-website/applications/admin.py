from django.contrib import admin
from .models import Application, ApplicationLog

class ApplicationLogInline(admin.TabularInline):
    model = ApplicationLog
    extra = 0
    readonly_fields = ['changed_at', 'changed_by']
    can_delete = False

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'program', 'status', 'applied_at']
    list_filter = ['status', 'program', 'applied_at']
    search_fields = ['full_name', 'email', 'phone']
    readonly_fields = ['id', 'applied_at', 'updated_at', 'month_year']
    inlines = [ApplicationLogInline]
    
    fieldsets = (
        ('Applicant Information', {
            'fields': ('full_name', 'email', 'phone')
        }),
        ('Program Details', {
            'fields': ('program', 'program_name', 'estimated_fees', 'payment_plan', 'start_date')
        }),
        ('Application', {
            'fields': ('message', 'source', 'recaptcha_verified')
        }),
        ('Status', {
            'fields': ('status', 'previous_status', 'email_sent', 'processed')
        }),
        ('Admin Notes', {
            'fields': ('admin_notes', 'processed_by')
        }),
        ('Metadata', {
            'fields': ('id', 'applied_at', 'updated_at', 'month_year', 'user'),
            'classes': ('collapse',)
        })
    )

@admin.register(ApplicationLog)
class ApplicationLogAdmin(admin.ModelAdmin):
    list_display = ['applicant_name', 'changed_at', 'previous_status', 'new_status', 'changed_by']
    list_filter = ['changed_at', 'new_status']
    search_fields = ['applicant_name', 'applicant_email', 'changed_by']
    readonly_fields = ['changed_at']