from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import re

_ENTITIES = [
    ('&mdash;', '—'), ('&ndash;', '–'), ('&rarr;', '→'), ('&larr;', '←'),
    ('&middot;', '·'), ('&nbsp;', ' '), ('&amp;', '&'), ('&lt;', '<'),
    ('&gt;', '>'), ('&copy;', '©'), ('&reg;', '®'), ('&trade;', '™'),
]


def _html_to_text(html: str) -> str:
    """Convert HTML email to a readable plain-text fallback."""
    # Block-level openers → newline before content
    html = re.sub(r'<(?:br\s*/?|p|div|h[1-6]|li|tr)[^>]*>', '\n', html, flags=re.IGNORECASE)
    # Block-level closers → newline after content
    html = re.sub(r'</(?:p|div|h[1-6]|li|tr|td|blockquote)>', '\n', html, flags=re.IGNORECASE)
    # Strip remaining tags
    html = re.sub(r'<[^>]+>', '', html)
    # Decode HTML entities
    for entity, char in _ENTITIES:
        html = html.replace(entity, char)
    # Collapse excessive blank lines
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip()


def send_html_email(subject, template_name, context, recipient_email):
    """Send an HTML email using a Django template."""
    html_content = render_to_string(f'emails/{template_name}', context)
    text_content = _html_to_text(html_content)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
    )
    email.attach_alternative(html_content, 'text/html')
    email.send(fail_silently=False)
