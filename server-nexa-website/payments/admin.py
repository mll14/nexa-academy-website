from django.contrib import admin
from .models import Payment, PaymentHistory, ManualPaymentRequest

class PaymentHistoryInline(admin.TabularInline):
    model = PaymentHistory
    extra = 0
    readonly_fields = ['created_at']
    fields = ['amount', 'payment_method', 'reference', 'status', 'payment_date']

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['student_name', 'amount', 'currency', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['student_name', 'student_email', 'transaction_id']
    readonly_fields = ['payment_id', 'created_at', 'updated_at', 'confirmed_at']
    inlines = [PaymentHistoryInline]
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'student_name', 'student_email')
        }),
        ('Payment Details', {
            'fields': ('amount', 'currency', 'payment_method', 'payment_reference', 'mobile_number')
        }),
        ('Transaction', {
            'fields': ('transaction_id', 'status', 'source', 'recorded_by', 'payment_date', 'confirmed_at')
        }),
        ('Program', {
            'fields': ('program', 'program_name')
        }),
        ('Additional Info', {
            'fields': ('description', 'provider_message', 'invoice_url', 'receipt_url', 'notes')
        }),
        ('Metadata', {
            'fields': ('payment_id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(PaymentHistory)
class PaymentHistoryAdmin(admin.ModelAdmin):
    list_display = ['student', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['status', 'payment_method', 'payment_date']
    search_fields = ['student__email', 'reference']
    readonly_fields = ['id', 'created_at']


@admin.register(ManualPaymentRequest)
class ManualPaymentRequestAdmin(admin.ModelAdmin):
    list_display = ['student', 'amount', 'payment_method', 'status', 'payment_date', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['student__email', 'student__display_name', 'reference']
    readonly_fields = ['request_id', 'created_payment', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']