from decimal import Decimal, ROUND_HALF_UP

from django.db import migrations
from django.db.models import Q


def _payment_plan_key(value):
    normalized = (value or '').strip().lower()
    if normalized in ('', 'full', 'one-time payment', 'full payment'):
        return 'full'
    if '3' in normalized:
        return 'installment3'
    if '2' in normalized:
        return 'installment2'
    return 'full'


def _round_to_nearest_500(value):
    return (Decimal(value) / Decimal('500')).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * Decimal('500')


def _fee_structure(base_amount, payment_plan):
    base = Decimal(str(base_amount or 0))
    plan = _payment_plan_key(payment_plan)
    if plan == 'installment3':
        installment = _round_to_nearest_500((base * Decimal('1.20')) / Decimal('3'))
        return installment * Decimal('3'), installment
    if plan == 'installment2':
        installment = _round_to_nearest_500((base * Decimal('1.10')) / Decimal('2'))
        return installment * Decimal('2'), installment
    return base, None


def fix_installment_fee_structures(apps, schema_editor):
    Enrollment = apps.get_model('programs', 'Enrollment')
    Application = apps.get_model('applications', 'Application')

    updated_enrollments = 0
    updated_applications = 0

    enrollments = (
        Enrollment.objects
        .exclude(payment_plan='')
        .select_related('student', 'program')
    )

    for enrollment in enrollments:
        plan = _payment_plan_key(enrollment.payment_plan)
        if plan not in ('installment2', 'installment3'):
            continue

        program = enrollment.program
        if not program or program.price is None:
            continue

        expected_amount, expected_installment = _fee_structure(program.price, enrollment.payment_plan)
        update_fields = []

        if enrollment.amount != expected_amount:
            enrollment.amount = expected_amount
            enrollment.balance = expected_amount - Decimal(enrollment.amount_paid or 0)
            update_fields.extend(['amount', 'balance'])

        if enrollment.installment_amount != expected_installment:
            enrollment.installment_amount = expected_installment
            update_fields.append('installment_amount')

        if update_fields:
            enrollment.save(update_fields=list(dict.fromkeys(update_fields)))
            updated_enrollments += 1

        student = enrollment.student
        app_filter = Q(program__iexact=program.slug) | Q(program_name__iexact=enrollment.program_name)
        if student:
            app_filter &= Q(user_id=student.pk) | Q(email__iexact=student.email)

        if student:
            matching_apps = Application.objects.filter(app_filter)
            updated_applications += matching_apps.exclude(
                estimated_fees=expected_amount,
                payment_plan=enrollment.payment_plan,
            ).update(
                estimated_fees=expected_amount,
                payment_plan=enrollment.payment_plan,
            )

    print(
        f'  Corrected fee structure on {updated_enrollments} enrollment(s) '
        f'and {updated_applications} application(s).'
    )


def reverse_fix(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0017_add_meet_fields_to_custom_calendar_event'),
        ('programs', '0029_lead_status'),
    ]

    operations = [
        migrations.RunPython(fix_installment_fee_structures, reverse_fix),
    ]
