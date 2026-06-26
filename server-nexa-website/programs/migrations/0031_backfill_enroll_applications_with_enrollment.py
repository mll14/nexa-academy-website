from django.db import migrations
from django.db.models import Q
from django.utils import timezone


def backfill_enrolled_status(apps, schema_editor):
    """
    Promote interview_completed applications to enrolled where an Enrollment
    record already exists. These were created via manual_enroll before the fix
    that marks the application enrolled immediately upon enrollment creation.
    """
    Application = apps.get_model('applications', 'Application')
    ApplicationLog = apps.get_model('applications', 'ApplicationLog')
    Enrollment = apps.get_model('programs', 'Enrollment')

    promoted = 0
    for enrollment in Enrollment.objects.select_related('student', 'program').iterator():
        student = enrollment.student
        program = enrollment.program
        if student is None or program is None:
            continue

        apps_qs = Application.objects.filter(
            Q(user=student) | Q(email__iexact=student.email),
            status='interview_completed',
            program_name__iexact=program.name,
        )

        for app in apps_qs:
            app.status = 'enrolled'
            app.status_updated_at = timezone.now()
            app.save(update_fields=['status', 'status_updated_at'])
            ApplicationLog.objects.create(
                application=app,
                previous_status='interview_completed',
                new_status='enrolled',
                changed_by='system',
                notes='Backfill: enrollment record existed; application promoted to enrolled status',
                applicant_email=app.email,
                applicant_name=app.full_name,
            )
            promoted += 1

    print(f'\n  Backfilled {promoted} application(s) to enrolled.')


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0030_fix_installment_fee_structures'),
        ('applications', '0017_add_meet_fields_to_custom_calendar_event'),
    ]

    operations = [
        migrations.RunPython(backfill_enrolled_status, migrations.RunPython.noop),
    ]
