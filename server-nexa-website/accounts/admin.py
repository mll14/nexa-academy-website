from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

admin.site.site_header = 'Nexa Academy Admin'
admin.site.site_title = 'Nexa Academy'
admin.site.index_title = 'Operations Dashboard'

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'display_name', 'role', 'status', 'created_at']
    list_filter = ['role', 'status', 'batch_year']
    search_fields = ['email', 'display_name', 'phone']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('display_name', 'phone', 'photo_url', 'id_number')}),
        ('Academic', {'fields': ('batch_year', 'fee_balance', 'total_fee_paid', 'notes')}),
        ('Permissions', {'fields': ('role', 'status', 'is_active', 'is_staff', 'is_superuser', 'permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'display_name', 'password1', 'password2', 'role'),
        }),
    )
    
    readonly_fields = ['uid', 'created_at', 'updated_at', 'last_login']