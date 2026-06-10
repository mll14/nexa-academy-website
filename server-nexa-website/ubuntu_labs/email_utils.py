from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import re


def send_html_email(subject, template_name, context, recipient_email):
    """Send an HTML email using a Django template."""
    html_content = render_to_string(f'emails/{template_name}', context)
    # Simple plain-text fallback
    text_content = re.sub(r'<[^>]+>', '', html_content).strip()

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
    )
    email.attach_alternative(html_content, 'text/html')
    email.send(fail_silently=True)
