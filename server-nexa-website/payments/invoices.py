"""PDF invoice generation for payments.

Renders ``templates/invoices/invoice.html`` to a PDF via WeasyPrint. All failures are
swallowed (logged, return ``None``) so that a broken PDF render never blocks the
invoice email or the surrounding payment transaction.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def _money(value):
    return f"KSh {Decimal(str(value or 0)):,.2f}"


def build_invoice_context(payment, reconciliation, amount=None, program=None, payment_type='payment'):
    """Assemble the template context for an invoice PDF from a Payment + reconciliation dict."""
    student = payment.student
    program = program or payment.program
    amount = Decimal(str(amount if amount is not None else payment.amount))
    reconciliation = reconciliation or {}
    items = [
        {
            'program_name': item.get('program_name') or 'Program fees',
            'payment_plan': item.get('payment_plan') or 'Standard plan',
            'total_fee': _money(item.get('total_fee')),
            'amount_paid': _money(item.get('amount_paid')),
            'amount_remaining': _money(item.get('amount_remaining')),
        }
        for item in (reconciliation.get('items') or [])
    ]
    return {
        'invoice_number': str(payment.payment_id).split('-')[0].upper(),
        'issued_at': timezone.localtime(payment.confirmed_at or payment.payment_date or timezone.now()),
        'student_name': student.display_name or payment.student_name,
        'student_email': student.email or payment.student_email,
        'program_name': (program.name if program else payment.program_name) or '',
        'payment_method': payment.get_payment_method_display() if hasattr(payment, 'get_payment_method_display') else payment.payment_method,
        'payment_type': payment_type,
        'reference': payment.payment_reference or payment.transaction_id or str(payment.payment_id),
        'amount': _money(amount),
        'total_fee': _money(reconciliation.get('total_fee')),
        'total_paid': _money(reconciliation.get('amount_paid')),
        'balance': _money(reconciliation.get('amount_remaining')),
        'items': items,
        'frontend_url': getattr(settings, 'FRONTEND_URL', ''),
        'admissions_email': getattr(settings, 'ADMISSIONS_NOTIFICATION_EMAIL', 'admissions@nexaacademy.co.ke'),
    }


def render_invoice_pdf(payment, reconciliation, amount=None, program=None, payment_type='payment'):
    """Return the invoice PDF as bytes, or ``None`` if rendering fails."""
    try:
        from weasyprint import HTML  # imported lazily so a missing dep can't break imports
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.error('WeasyPrint unavailable, skipping PDF invoice: %s', exc)
        return None

    try:
        context = build_invoice_context(
            payment, reconciliation, amount=amount, program=program, payment_type=payment_type,
        )
        html = render_to_string('invoices/invoice.html', context)
        return HTML(string=html).write_pdf()
    except Exception as exc:
        logger.error('Failed to render invoice PDF for payment %s: %s', payment.payment_id, exc, exc_info=True)
        return None
