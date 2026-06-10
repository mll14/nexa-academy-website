from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from applications.models import Application
from newsletter.models import NewsletterSubscription
from contacts.models import ContactMessage
from django.contrib.auth import get_user_model
from django.conf import settings

User = get_user_model()

class Command(BaseCommand):
    help = 'Sends a weekly report to admins'

    def handle(self, *args, **kwargs):
        one_week_ago = timezone.now() - timedelta(days=7)

        # Gather metrics
        new_applications = Application.objects.filter(applied_at__gte=one_week_ago).count()
        new_subscriptions = NewsletterSubscription.objects.filter(subscribed_at__gte=one_week_ago).count()
        new_contacts = ContactMessage.objects.filter(created_at__gte=one_week_ago).count()

        admin_users = User.objects.filter(is_staff=True)
        admin_emails = [admin.email for admin in admin_users if admin.email]

        if not admin_emails:
            admin_emails = [settings.DEFAULT_FROM_EMAIL]

        subject = "Nexa Academy - Weekly Admin Report"
        message = (
            "Hello Admin,\n\n"
            "Here is your weekly summary report:\n\n"
            f"- New Program Applications: {new_applications}\n"
            f"- New Newsletter Subscribers: {new_subscriptions}\n"
            f"- New Contact Inquiries: {new_contacts}\n\n"
            "Log in to the dashboard for more details.\n"
        )

        try:
            # Use HTML template utility to send per-admin
            from ubuntu_labs.email_utils import send_html_email
            for email in admin_emails:
                send_html_email(
                    subject=subject,
                    template_name='weekly_report.html',
                    context={
                        'new_applications': new_applications,
                        'new_subscriptions': new_subscriptions,
                        'new_contacts': new_contacts,
                        'frontend_url': settings.FRONTEND_URL,
                    },
                    recipient_email=email,
                )
            self.stdout.write(self.style.SUCCESS(f'Successfully sent weekly report to {len(admin_emails)} admins.'))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to send report: {str(e)}'))
