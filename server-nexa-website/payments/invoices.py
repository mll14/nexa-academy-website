"""PDF invoice generation for payments.

Renders ``templates/invoices/invoice.html`` to a PDF via WeasyPrint. The document is
two pages: page 1 is the receipt for a single payment, page 2 is a statement of
account showing the full reconciliation ledger and the outstanding balance.

All failures are swallowed (logged, return ``None``) so that a broken PDF render
never blocks the invoice email or the surrounding payment transaction.
"""
import base64
import logging
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

LOGO_PATH = Path(settings.BASE_DIR) / 'static' / 'img' / 'nexa-academy-logo.png'


def _money(value):
    return f"KSh {Decimal(str(value or 0)):,.2f}"


@lru_cache(maxsize=1)
def _logo_data_uri():
    """Base64-encode the logo so the PDF never depends on static serving or the network.

    Cached because the bytes never change within a process. Returns ``''`` when the
    asset is missing so the template falls back to the wordmark.
    """
    try:
        encoded = base64.b64encode(LOGO_PATH.read_bytes()).decode('ascii')
        return f"data:image/png;base64,{encoded}"
    except Exception as exc:
        logger.warning('Invoice logo unavailable at %s: %s', LOGO_PATH, exc)
        return ''


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
            'debit': _money(debit) if debit > 0 else '',
            'credit': _money(credit) if credit > 0 else '',
            'balance': _money(entry.get('balance')),
        })
    return rows


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
    balance_due = Decimal(str(reconciliation.get('amount_remaining') or 0))
    total_discount = Decimal(str(reconciliation.get('total_discount') or 0))
    effective_fee = Decimal(str(reconciliation.get('effective_fee') or 0))
    return {
        'logo_data_uri': _logo_data_uri(),
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
        'total_discount': _money(total_discount),
        'has_discount': total_discount > 0,
        'effective_fee': _money(effective_fee),
        'total_paid': _money(reconciliation.get('amount_paid')),
        'balance': _money(balance_due),
        # Mirrors reconciliation's own rule: an account with no fees posted is not
        # "settled", it simply has nothing owing yet.
        'has_fees': effective_fee > 0,
        'is_settled': balance_due <= 0 and effective_fee > 0,
        'items': items,
        'ledger': _ledger_rows(reconciliation),
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
