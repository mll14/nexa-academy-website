"""PDF receipt generation for payments.

Renders ``templates/receipts/receipt.html`` to a PDF via WeasyPrint. The document is
two pages: page 1 is the receipt for a single payment, page 2 is a statement of
account showing the full reconciliation ledger and the outstanding balance.

This is a receipt, not an invoice: it records money already received. Invoices, which
request payment, live in ``payments/invoices.py``.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from django.utils.html import escape
from django.utils.safestring import mark_safe

from .pdf import logo_data_uri, money, render_pdf

logger = logging.getLogger(__name__)


def _ledger_rows(reconciliation):
    """Flatten the reconciliation ledger into display rows for the statement page."""
    rows = []
    for entry in (reconciliation.get('ledger') or []):
        debit = Decimal(str(entry.get('debit') or 0))
        credit = Decimal(str(entry.get('credit') or 0))
        rows.append({
            'date': entry.get('date'),
            'description': entry.get('description') or '',
            'reference': entry.get('reference') or '',
            'type': entry.get('type') or '',
            'status': entry.get('status') or '',
            'applied': entry.get('applied', True),
            'debit': money(debit) if debit > 0 else '',
            'credit': money(credit) if credit > 0 else '',
            'balance': money(entry.get('balance')),
        })
    return rows


def build_receipt_context(payment, reconciliation, amount=None, program=None, payment_type='payment'):
    """Assemble the template context for a receipt PDF from a Payment + reconciliation dict."""
    student = payment.student
    program = program or payment.program
    amount = Decimal(str(amount if amount is not None else payment.amount))
    reconciliation = reconciliation or {}
    items = [
        {
            'program_name': item.get('program_name') or 'Program fees',
            'payment_plan': item.get('payment_plan') or 'Standard plan',
            'total_fee': money(item.get('total_fee')),
            'amount_paid': money(item.get('amount_paid')),
            'amount_remaining': money(item.get('amount_remaining')),
        }
        for item in (reconciliation.get('items') or [])
    ]
    balance_due = Decimal(str(reconciliation.get('amount_remaining') or 0))
    total_discount = Decimal(str(reconciliation.get('total_discount') or 0))
    effective_fee = Decimal(str(reconciliation.get('effective_fee') or 0))
    receipt_number = str(payment.payment_id).split('-')[0].upper()
    issued_at = timezone.localtime(payment.confirmed_at or payment.payment_date or timezone.now())
    return {
        'logo_data_uri': logo_data_uri(),
        'receipt_number': receipt_number,
        'receipt_no_html': mark_safe(f'No. <strong>{escape(receipt_number)}</strong>'),
        'issued_at_str': issued_at.strftime('%d %b %Y, %H:%M'),
        'as_at_str': f"As at {issued_at.strftime('%d %b %Y, %H:%M')}",
        'issued_at': issued_at,
        'student_name': student.display_name or payment.student_name,
        'student_email': student.email or payment.student_email,
        'program_name': (program.name if program else payment.program_name) or '',
        'payment_method': payment.get_payment_method_display() if hasattr(payment, 'get_payment_method_display') else payment.payment_method,
        'payment_type': payment_type,
        'reference': payment.payment_reference or payment.transaction_id or str(payment.payment_id),
        'amount': money(amount),
        'total_fee': money(reconciliation.get('total_fee')),
        'total_discount': money(total_discount),
        'has_discount': total_discount > 0,
        'effective_fee': money(effective_fee),
        'total_paid': money(reconciliation.get('amount_paid')),
        'balance': money(balance_due),
        # Mirrors reconciliation's own rule: an account with no fees posted is not
        # "settled", it simply has nothing owing yet.
        'has_fees': effective_fee > 0,
        'is_settled': balance_due <= 0 and effective_fee > 0,
        'items': items,
        'ledger': _ledger_rows(reconciliation),
        'frontend_url': getattr(settings, 'FRONTEND_URL', ''),
        'admissions_email': getattr(settings, 'ADMISSIONS_NOTIFICATION_EMAIL', 'admissions@nexaacademy.co.ke'),
    }


def render_receipt_pdf(payment, reconciliation, amount=None, program=None, payment_type='payment'):
    """Return the receipt PDF as bytes, or ``None`` if rendering fails.

    Context assembly is guarded too, not just the render: a malformed reconciliation
    dict must not escape and take down the surrounding payment transaction.
    """
    try:
        context = build_receipt_context(
            payment, reconciliation, amount=amount, program=program, payment_type=payment_type,
        )
    except Exception as exc:
        logger.error('Failed to build receipt context for payment %s: %s', payment.payment_id, exc, exc_info=True)
        return None
    return render_pdf('receipts/receipt.html', context, 'receipt', payment.payment_id)
