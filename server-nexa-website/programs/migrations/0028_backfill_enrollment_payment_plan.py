from django.db import migrations
from django.db.models import Q


def backfill_enrollment_payment_plan(apps, schema_editor):
    """
    For every Enrollment with no payment_plan set, look up the student's
    Application for that program and copy its payment_plan over.
    Handles applications matched by user FK or by email (covers applications
    submitted before an account existed).
    """
    Enrollment = apps.get_model('programs', 'Enrollment')
    Application = apps.get_model('applications', 'Application')

    enrollments = Enrollment.objects.filter(payment_plan='').select_related('student')
    updated = 0

    for enrollment in enrollments:
        student = enrollment.student
        if student is None:
            continue

        app = (
            Application.objects
            .filter(
                Q(user=student) | Q(email__iexact=student.email),
                program_name__iexact=enrollment.program_name,
            )
            .exclude(payment_plan='')
            .order_by('-created_at')
            .first()
        )

        if app and app.payment_plan:
            enrollment.payment_plan = app.payment_plan
            enrollment.save(update_fields=['payment_plan'])
            updated += 1

    print(f'  Backfilled payment_plan on {updated} enrollment(s).')


def reverse_backfill(apps, schema_editor):
    pass  # non-destructive — no need to reverse


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0027_helpmeleads_pipeline'),
        ('applications', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_enrollment_payment_plan, reverse_backfill),
    ]
