from decimal import Decimal
from django.db import migrations
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone


def revert_unpaid_enrolled(apps, schema_editor):
    """
    Migration 0031 promoted ALL interview_completed applications with an
    enrollment record to enrolled — including those with no deposit paid.
    This migration reverts those incorrect promotions: any application
    marked enrolled by 0031 (changed_by='system', specific notes text)
    where the student's total completed payments are below KSh 10,000
    is moved back to interview_completed.
    """
    Application = apps.get_model('applications', 'Application')
    ApplicationLog = apps.get_model('applications', 'ApplicationLog')
    Payment = apps.get_model('payments', 'Payment')

    THRESHOLD = Decimal('10000')

    # Find applications promoted by the 0031 backfill
    backfill_logs = ApplicationLog.objects.filter(
        changed_by='system',
        notes='Backfill: enrollment record existed; application promoted to enrolled status',
        new_status='enrolled',
        previous_status='interview_completed',
    ).select_related('application')

    reverted = 0
    for log in backfill_logs:
        app = log.application
        if app.status != 'enrolled':
            continue

        student = app.user
        if student is None:
            continue

        total_paid = Payment.objects.filter(
            student=student, status='completed',
        ).aggregate(total=Coalesce(Sum('amount'), Decimal('0.00')))['total']

        if total_paid >= THRESHOLD:
            continue  # legitimately enrolled — keep it

        app.status = 'interview_completed'
        app.status_updated_at = timezone.now()
        app.save(update_fields=['status', 'status_updated_at'])
        ApplicationLog.objects.create(
            application=app,
            previous_status='enrolled',
            new_status='interview_completed',
            changed_by='system',
            notes='Revert migration 0031: no deposit paid, returned to interview_completed',
            applicant_email=app.email,
            applicant_name=app.full_name,
        )
        reverted += 1

    print(f'\n  Reverted {reverted} application(s) back to interview_completed.')


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0031_backfill_enroll_applications_with_enrollment'),
        ('applications', '0017_add_meet_fields_to_custom_calendar_event'),
        ('payments', '0003_remove_payment_pay_stud_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(revert_unpaid_enrolled, migrations.RunPython.noop),
    ]
