from django.contrib import admin
from .models import Program, Enrollment, StudentProgramEnrolled, ProgramProgress, Certificate, ProgramIntake

class EnrollmentInline(admin.TabularInline):
    model = Enrollment
    extra = 0
    fields = ['student', 'status', 'enrollment_date', 'amount_paid']
    readonly_fields = ['enrollment_date']

class ProgramProgressInline(admin.TabularInline):
    model = ProgramProgress
    extra = 0
    fields = ['student', 'completion_percentage', 'status', 'last_accessed_at']
    readonly_fields = ['last_accessed_at']

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'status', 'slug', 'sanity_id']
    list_filter = ['status']
    search_fields = ['name', 'slug', 'sanity_id']
    readonly_fields = ['program_id', 'created_at', 'updated_at']
    inlines = [EnrollmentInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'price', 'original_price', 'status')
        }),
        ('CMS', {
            'fields': ('sanity_id',)
        }),
        ('Metadata', {
            'fields': ('program_id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ['student_name', 'program_name', 'status', 'amount', 'balance', 'enrollment_date']
    list_filter = ['status', 'enrollment_date']
    search_fields = ['student_name', 'program_name', 'student__email']
    readonly_fields = ['enrollment_id', 'enrollment_date', 'student_name', 'program_name']
    
    fieldsets = (
        ('Student', {
            'fields': ('student', 'student_name')
        }),
        ('Program', {
            'fields': ('program', 'program_name')
        }),
        ('Enrollment Details', {
            'fields': ('status', 'enrollment_date', 'start_date', 'end_date')
        }),
        ('Payment', {
            'fields': ('amount', 'amount_paid', 'balance')
        }),
        ('Metadata', {
            'fields': ('enrollment_id',),
            'classes': ('collapse',)
        })
    )

@admin.register(StudentProgramEnrolled)
class StudentProgramEnrolledAdmin(admin.ModelAdmin):
    list_display = ['student', 'program_name', 'status', 'progress', 'application_status']
    list_filter = ['status', 'application_status']
    search_fields = ['student__email', 'student__display_name', 'program_name']

@admin.register(ProgramProgress)
class ProgramProgressAdmin(admin.ModelAdmin):
    list_display = ['student', 'program_name', 'completion_percentage', 'status', 'last_accessed_at']
    list_filter = ['status', 'certificate_earned']
    search_fields = ['student__email', 'student__display_name', 'program_name']
    readonly_fields = ['updated_at']
    
    fieldsets = (
        ('Student & Program', {
            'fields': ('student', 'program', 'program_name')
        }),
        ('Progress', {
            'fields': ('completion_percentage', 'status', 'total_hours_spent', 'last_accessed_at')
        }),
        ('Lessons & Tests', {
            'fields': ('lessons_completed', 'lessons_total', 'tests_passed')
        }),
        ('Certificate', {
            'fields': ('certificate_earned', 'certificate_earned_at', 'certificate_url')
        }),
        ('Detailed Data', {
            'fields': ('modules', 'assignments', 'quizzes'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('enrollment_date', 'start_date', 'end_date', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',)
        })
    )

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_number', 'student_name', 'program_name', 'issued_date', 'status']
    list_filter = ['status', 'grade', 'issued_date']
    search_fields = ['certificate_number', 'student_name', 'verification_code']
    readonly_fields = ['certificate_id', 'issued_date', 'certificate_number', 'verification_code']

    fieldsets = (
        ('Certificate Information', {
            'fields': ('certificate_number', 'verification_code', 'verification_url', 'status')
        }),
        ('Recipient', {
            'fields': ('student', 'student_name')
        }),
        ('Program', {
            'fields': ('program', 'program_name', 'grade', 'completion_percentage')
        }),
        ('Issuance', {
            'fields': ('issued_date', 'instructor', 'certificate_url')
        }),
        ('Metadata', {
            'fields': ('certificate_id',),
            'classes': ('collapse',)
        })
    )


@admin.register(ProgramIntake)
class ProgramIntakeAdmin(admin.ModelAdmin):
    list_display = ['program', 'start_date', 'application_deadline', 'seats_remaining', 'status', 'source', 'last_synced_at']
    list_filter = ['status', 'source', 'program']
    search_fields = ['program__program_name', 'notes', 'cms_id']
    readonly_fields = ['id', 'created_at', 'updated_at', 'last_synced_at', 'source', 'cms_id']
    list_editable = ['status', 'seats_remaining']
    ordering = ['start_date']

    fieldsets = [
        (None, {
            'fields': ['program', 'status', 'start_date', 'end_date', 'application_deadline'],
        }),
        ('Capacity', {
            'fields': ['max_seats', 'seats_remaining'],
        }),
        ('Notes', {
            'fields': ['notes'],
        }),
        ('CMS Sync', {
            'fields': ['source', 'cms_id', 'last_synced_at'],
            'classes': ['collapse'],
            'description': 'These fields are managed automatically when syncing from a CMS.',
        }),
        ('Metadata', {
            'fields': ['id', 'created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]