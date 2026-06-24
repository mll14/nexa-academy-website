from decimal import Decimal

from django.db import connection
from django.db.models import DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce

from applications.models import Application
from programs.models import Enrollment
from .models import Payment


ZERO = Decimal('0.00')
MONEY_FIELD = DecimalField(max_digits=12, decimal_places=2)


def money(value):
    return Decimal(str(value or 0)).quantize(Decimal('0.01'))


def _completed_payments_for(student, program=None):
    qs = Payment.objects.filter(student=student, status='completed')
    if program:
        qs = qs.filter(program=program)
    return qs


def completed_total(queryset):
    return queryset.aggregate(
        total=Coalesce(
            Sum('amount', output_field=MONEY_FIELD),
            Value(ZERO),
            output_field=MONEY_FIELD,
        )
    )['total']


def enrollment_columns():
    with connection.cursor() as cursor:
        return {
            column.name
            for column in connection.introspection.get_table_description(cursor, Enrollment._meta.db_table)
        }


def payment_reconciliation_for_student(student):
    columns = enrollment_columns()
    enrollment_fields = [
        'enrollment_id',
        'program_id',
        'program_name',
        'amount',
        'amount_paid',
        'enrollment_date',
    ]
    if 'payment_plan' in columns:
        enrollment_fields.append('payment_plan')
    if 'installment_amount' in columns:
        enrollment_fields.append('installment_amount')

    enrollments = Enrollment.objects.filter(student=student).only(*enrollment_fields).order_by('-enrollment_date')
    payments = Payment.objects.filter(student=student).order_by('payment_date', 'created_at')
    completed = payments.filter(status='completed')
    total_paid = money(completed_total(completed))

    items = []
    allocated_paid = ZERO
    for enrollment in enrollments:
        program_payments = _completed_payments_for(student, enrollment.program_id)
        paid = money(completed_total(program_payments))
        if paid == ZERO:
            paid = money(enrollment.amount_paid)
        allocated_paid += paid

        total_fee = money(enrollment.amount)
        remaining = max(ZERO, total_fee - paid)
        payment_plan = enrollment.payment_plan if 'payment_plan' in columns else ''
        installment_value = enrollment.installment_amount if 'installment_amount' in columns else None
        installment = money(installment_value) if installment_value is not None else None
        items.append({
            'enrollment_id': str(enrollment.enrollment_id),
            'program_id': str(enrollment.program_id),
            'program_name': enrollment.program_name,
            'total_fee': total_fee,
            'amount_paid': paid,
            'amount_remaining': remaining,
            'payment_plan': payment_plan or 'Standard plan',
            'installment_amount': installment,
            'status': 'paid' if remaining <= 0 and total_fee > 0 else 'outstanding',
            'ledger_date': enrollment.enrollment_date,
            'last_payment_date': program_payments.order_by('-payment_date').values_list('payment_date', flat=True).first(),
        })

    if not items:
        application = Application.objects.filter(
            Q(user=student) | Q(email__iexact=student.email),
        ).order_by('-applied_at').first()
        if application:
            total_fee = money(application.estimated_fees)
            remaining = max(ZERO, total_fee - total_paid)
            items.append({
                'enrollment_id': None,
                'program_id': application.program or None,
                'program_name': application.program_name,
                'total_fee': total_fee,
                'amount_paid': total_paid,
                'amount_remaining': remaining,
                'payment_plan': application.payment_plan or 'Standard plan',
                'installment_amount': None,
                'status': 'paid' if remaining <= 0 and total_fee > 0 else 'outstanding',
                'ledger_date': application.applied_at,
                'last_payment_date': completed.order_by('-payment_date').values_list('payment_date', flat=True).first(),
            })

    total_fee = money(sum((item['total_fee'] for item in items), ZERO))
    amount_paid = money(total_paid if total_paid > allocated_paid else allocated_paid)
    amount_remaining = max(ZERO, total_fee - amount_paid)
    ledger = []
    running_balance = ZERO

    for item in items:
        debit = money(item['total_fee'])
        if debit <= ZERO:
            continue
        running_balance = money(running_balance + debit)
        ledger.append({
            'date': item.get('ledger_date'),
            'type': 'fee',
            'description': f"{item['program_name'] or 'Program'} fee",
            'program_name': item['program_name'],
            'reference': item['payment_plan'],
            'status': 'posted',
            'debit': debit,
            'credit': ZERO,
            'balance': running_balance,
            'applied': True,
        })

    for payment in payments:
        is_completed = payment.status == 'completed'
        credit = money(payment.amount) if is_completed else ZERO
        if is_completed:
            running_balance = max(ZERO, money(running_balance - credit))
        ledger.append({
            'date': payment.payment_date,
            'type': 'payment',
            'description': payment.description or payment.program_name or 'Payment received',
            'program_name': payment.program_name,
            'reference': payment.payment_reference or payment.transaction_id or str(payment.payment_id),
            'status': payment.status,
            'debit': ZERO,
            'credit': credit,
            'balance': running_balance,
            'applied': is_completed,
        })

    return {
        'student_id': str(student.uid),
        'student_name': student.display_name,
        'student_email': student.email,
        'total_fee': total_fee,
        'amount_paid': amount_paid,
        'amount_remaining': amount_remaining,
        'status': 'paid' if amount_remaining <= 0 and total_fee > 0 else 'outstanding',
        'items': items,
        'ledger': ledger,
    }


def serialize_reconciliation(data):
    def serialize_value(value):
        if isinstance(value, Decimal):
            return str(value)
        if hasattr(value, 'isoformat'):
            return value.isoformat()
        if isinstance(value, list):
            return [serialize_value(item) for item in value]
        if isinstance(value, dict):
            return {key: serialize_value(item) for key, item in value.items()}
        return value

    return serialize_value(data)
