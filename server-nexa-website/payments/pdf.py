"""Shared helpers for the PDF documents Nexa emails: receipts and invoices."""
import base64
import logging
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

LOGO_PATH = Path(settings.BASE_DIR) / 'static' / 'img' / 'nexa-academy-logo.png'


def money(value):
    return f"KSh {Decimal(str(value or 0)):,.2f}"


@lru_cache(maxsize=1)
def logo_data_uri():
    """Base64-encode the logo so the PDF never depends on static serving or the network.

    Cached because the bytes never change within a process. Returns ``''`` when the
    asset is missing so the template falls back to the wordmark.
    """
    try:
        encoded = base64.b64encode(LOGO_PATH.read_bytes()).decode('ascii')
        return f"data:image/png;base64,{encoded}"
    except Exception as exc:
        logger.warning('PDF logo unavailable at %s: %s', LOGO_PATH, exc)
        return ''


def render_pdf(template_name, context, document_label, reference):
    """Render a template to PDF bytes, or ``None`` if rendering fails.

    Failures are swallowed and logged so a broken render never takes down the
    surrounding payment transaction. Callers that must have the PDF check for None.
    """
    from django.template.loader import render_to_string

    try:
        from weasyprint import HTML  # imported lazily so a missing dep can't break imports
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.error('WeasyPrint unavailable, skipping PDF %s: %s', document_label, exc)
        return None

    try:
        return HTML(string=render_to_string(template_name, context)).write_pdf()
    except Exception as exc:
        logger.error(
            'Failed to render %s PDF for %s: %s', document_label, reference, exc, exc_info=True,
        )
        return None
