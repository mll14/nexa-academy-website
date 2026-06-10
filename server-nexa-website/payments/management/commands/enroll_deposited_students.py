"""
Management command: enroll_deposited_students

Retroactively marks any application that is still in 'interview_completed'
status as 'enrolled' when the linked student has already paid a total of
KSh 10,000 or more in completed payments.

Usage:
    python manage.py enroll_deposited_students          # dry-run (no changes)
    python manage.py enroll_deposited_students --commit  # apply changes
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from decimal import Decimal

from accounts.models import User
from applications.models import Application, ApplicationLog
from payments.models import Payment


DEPOSIT_THRESHOLD = Decimal('10000')


class Command(BaseCommand):
    help = 'Enroll students who have paid the KSh 10,000 deposit but are still interview_completed'

    def add_arguments(self, parser):
        parser.add_argument(
            '--commit',
            action='store_true',
            default=False,
            help='Actually save changes. Without this flag the command runs as a dry-run.',
        )

    def handle(self, *args, **options):
        commit = options['commit']
        mode = 'LIVE' if commit else 'DRY-RUN'
        self.stdout.write(self.style.WARNING(f'--- enroll_deposited_students [{mode}] ---'))

        # Find every student who has >= KSh 10,000 in completed payments
        students_qs = (
            User.objects.filter(
                payments__status='completed',
            )
            .annotate(
                total_paid=Coalesce(
                    Sum('payments__amount', filter=Q(payments__status='completed')),
                    Decimal('0.00'),
                )
            )
            .filter(total_paid__gte=DEPOSIT_THRESHOLD)
            .distinct()
        )

        self.stdout.write(f'Students with total paid >= KSh {DEPOSIT_THRESHOLD:,.0f}: {students_qs.count()}')

        enrolled_count = 0
        skipped_count = 0

        for student in students_qs:
            # Find their interview_completed applications
            apps = Application.objects.filter(
                Q(user=student) | Q(email__iexact=student.email),
                status='interview_completed',
            )

            if not apps.exists():
                skipped_count += 1
                continue

            for app in apps:
                self.stdout.write(
                    f'  → Enrolling: {app.full_name} | {app.email} | {app.program_name} '
                    f'(app_id={app.id})'
                )
                if commit:
                    try:
                        with transaction.atomic():
                            prev = app.status
                            app.status = 'enrolled'
                            app.status_updated_at = timezone.now()
                            app.save()
                            ApplicationLog.objects.create(
                                application=app,
                                previous_status=prev,
                                new_status='enrolled',
                                changed_by='system (backfill)',
                                notes='Retroactive enrollment: deposit of KSh 10,000 was already paid',
                                applicant_email=app.email,
                                applicant_name=app.full_name,
                            )
                        enrolled_count += 1
                    except Exception as exc:
                        self.stderr.write(
                            self.style.ERROR(f'    ERROR enrolling {app.id}: {exc}')
                        )
                else:
                    enrolled_count += 1

        self.stdout.write('')
        if commit:
            self.stdout.write(self.style.SUCCESS(f'Done. Enrolled: {enrolled_count}  |  Skipped (no pending apps): {skipped_count}'))
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'Dry-run complete. Would enroll: {enrolled_count}  |  '
                    f'Skipped (no pending apps): {skipped_count}\n'
                    f'Run with --commit to apply changes.'
                )
            )
