from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from applications.models import DraftApplication
from ubuntu_labs.email_utils import send_html_email
from django.conf import settings


class Command(BaseCommand):
    help = 'Send 24-hour reminder emails to users who started but did not complete their application'

    def handle(self, *args, **kwargs):
        cutoff = timezone.now() - timedelta(hours=24)
        drafts = DraftApplication.objects.filter(
            completed=False,
            reminder_sent=False,
            created_at__lte=cutoff,
        )

        sent = 0
        errors = 0
        for draft in drafts:
            try:
                send_html_email(
                    subject="Don't miss your spot — Complete your Nexa Academy application",
                    template_name='application_reminder.html',
                    context={
                        'full_name': draft.full_name or 'there',
                        'program': draft.program or '',
                        'frontend_url': settings.FRONTEND_URL,
                        'apply_url': f"{settings.FRONTEND_URL}/apply",
                    },
                    recipient_email=draft.email,
                )
                draft.reminder_sent = True
                draft.save(update_fields=['reminder_sent'])
                sent += 1
            except Exception as e:
                errors += 1
                self.stderr.write(f"Failed to send reminder to {draft.email}: {e}")

        self.stdout.write(self.style.SUCCESS(
            f'Sent {sent} reminder email(s). {errors} failed.'
        ))
