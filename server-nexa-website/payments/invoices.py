"""PDF invoice generation.

An invoice *requests* payment: it states an amount due and a due date. It is the
counterpart of ``payments/receipts.py``, which records money already received.

An issued invoice is stored as a ``Payment`` row with ``status='pending'``, so it
flows through the existing reconciliation, transaction listing and Paystack
confirmation paths without a parallel model.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from django.utils.html import escape
from django.utils.safestring import mark_safe

from .pdf import logo_data_uri, money, render_pdf

logger = logging.getLogger(__name__)


def build_invoice_context(payment, reconciliation=None, amount=None):
    """Assemble the template context for an invoice PDF from a pending Payment."""
    student = payment.student
    program = payment.program
    amount_due = Decimal(str(amount if amount is not None else payment.amount))
    reconciliation = reconciliation or {}

    # The invoice number IS the payment reference the student quotes when paying, so
    # there is only ever one identifier on the document to get wrong.
    invoice_number = payment.payment_reference or str(payment.payment_id).split('-')[0].upper()
    issued_at = timezone.localtime(payment.created_at or timezone.now())
    due_date = timezone.localtime(payment.due_date) if payment.due_date else None

    outstanding = Decimal(str(reconciliation.get('amount_remaining') or 0))
    return {
        'logo_data_uri': logo_data_uri(),
        'invoice_number': invoice_number,
        'invoice_no_html': mark_safe(f'No. <strong>{escape(invoice_number)}</strong>'),
        'issued_at': issued_at,
        'issued_at_str': issued_at.strftime('%d %b %Y'),
        'due_date': due_date,
        'due_date_str': due_date.strftime('%d %B %Y') if due_date else '',
        'is_overdue': bool(due_date and due_date < timezone.localtime()),
        'student_name': student.display_name or payment.student_name,
        'student_email': student.email or payment.student_email,
        'program_name': (program.name if program else payment.program_name) or 'Program fees',
        'reference': payment.payment_reference or str(payment.payment_id),
        'description': payment.description or 'Programme fee instalment',
        'amount_due': money(amount_due),
        # The wider account picture, so the student can see this instalment in context.
        'total_fee': money(reconciliation.get('total_fee')),
        'total_paid': money(reconciliation.get('amount_paid')),
        'outstanding': money(outstanding),
        'has_account_context': bool(reconciliation.get('items')),
        'frontend_url': getattr(settings, 'FRONTEND_URL', ''),
        'admissions_email': getattr(settings, 'ADMISSIONS_NOTIFICATION_EMAIL', 'admissions@nexaacademy.co.ke'),
    }


def render_invoice_pdf(payment, reconciliation=None, amount=None):
    """Return the invoice PDF as bytes, or ``None`` if rendering fails."""
    try:
        context = build_invoice_context(payment, reconciliation, amount=amount)
    except Exception as exc:
        logger.error('Failed to build invoice context for payment %s: %s', payment.payment_id, exc, exc_info=True)
        return None
    return render_pdf('invoices/invoice.html', context, 'invoice', payment.payment_id)
