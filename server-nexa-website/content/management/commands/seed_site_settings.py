"""
Management command: seed_site_settings

Seeds initial SiteSetting records. Safe to re-run — uses update_or_create.

Usage:
    python manage.py seed_site_settings
"""

import logging
from django.core.management.base import BaseCommand
from content.models import SiteSetting

logger = logging.getLogger(__name__)

SETTINGS = [
    # Hero stats
    {
        'key': 'hero_stat_graduates',
        'value': '300+',
        'group': 'hero',
        'label': 'Graduates Count',
    },
    {
        'key': 'hero_stat_rating',
        'value': '4.9/5',
        'group': 'hero',
        'label': 'Student Rating',
    },
    {
        'key': 'hero_stat_success_rate',
        'value': '95%',
        'group': 'hero',
        'label': 'Success Rate',
    },
    # Contact info
    {
        'key': 'contact_email',
        'value': 'info@nexaacademy.co.ke',
        'group': 'contact',
        'label': 'Contact Email',
    },
    {
        'key': 'contact_phone',
        'value': '+254713067311',
        'group': 'contact',
        'label': 'Contact Phone',
    },
    {
        'key': 'contact_address',
        'value': '10th Floor, JKUAT Towers, CBD — Opp. Jamia Mosque',
        'group': 'contact',
        'label': 'Contact Address',
    },
    # CTA section
    {
        'key': 'cta_heading',
        'value': 'Ready To Become Job-Ready?',
        'group': 'cta',
        'label': 'CTA Heading',
    },
    {
        'key': 'cta_subtext',
        'value': (
            'Join a cohort built for outcomes — learn modern tech, '
            'build real projects, and launch your career.'
        ),
        'group': 'cta',
        'label': 'CTA Subtext',
    },
    {
        'key': 'cta_button_label',
        'value': 'Apply Now',
        'group': 'cta',
        'label': 'CTA Button Label',
    },
]


class Command(BaseCommand):
    help = 'Seeds initial SiteSetting values. Safe to re-run.'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for entry in SETTINGS:
            try:
                obj, created = SiteSetting.objects.update_or_create(
                    key=entry['key'],
                    defaults={
                        'value': entry['value'],
                        'group': entry['group'],
                        'label': entry['label'],
                    },
                )
                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f"  Created: {entry['key']}"))
                else:
                    updated_count += 1
                    self.stdout.write(f"  Updated: {entry['key']}")
            except Exception as exc:
                logger.error("seed_site_settings: failed for key=%s: %s", entry['key'], exc)
                self.stdout.write(self.style.ERROR(f"  ERROR on {entry['key']}: {exc}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created: {created_count}, Updated: {updated_count}."
            )
        )
