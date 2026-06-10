"""
Management command: sync_content_from_sanity

Bulk-pulls all published content documents from Sanity and writes them to
the Django DB via the same sync_* handlers used by the live webhook.
Safe to re-run — every handler uses update_or_create on sanity_id.

Usage:
    python manage.py sync_content_from_sanity
    python manage.py sync_content_from_sanity --types testimonial faq
"""

import json
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand

from content.cms_sync import (
    sync_testimonial,
    sync_faq,
    sync_homepage_feature,
    sync_site_setting,
    sync_blog_post,
    sync_announcement,
)

HANDLERS = {
    'testimonial':     sync_testimonial,
    'faq':             sync_faq,
    'homepageFeature': sync_homepage_feature,
    'siteSetting':     sync_site_setting,
    'blogPost':        sync_blog_post,
    'announcement':    sync_announcement,
}


class Command(BaseCommand):
    help = 'Bulk-sync all published content from Sanity CMS to the Django database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--types',
            nargs='+',
            choices=list(HANDLERS),
            default=list(HANDLERS),
            metavar='TYPE',
            help='Content types to sync (default: all). Choices: ' + ', '.join(HANDLERS),
        )

    def handle(self, *args, **options):
        project_id = settings.SANITY_PROJECT_ID.strip()
        dataset = settings.SANITY_DATASET.strip()
        token = settings.SANITY_API_TOKEN.strip()
        base = f'https://{project_id}.api.sanity.io/v2021-10-21/data/query/{dataset}'

        if not token:
            self.stdout.write(self.style.ERROR('SANITY_API_TOKEN is not set — aborting.'))
            return

        total = 0
        for _type in options['types']:
            groq = f'*[_type == "{_type}" && !(_id in path("drafts.**"))]'
            try:
                docs = self._query(base, token, groq)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f'  {_type}: query failed — {exc}'))
                continue

            handler = HANDLERS[_type]
            count = 0
            for doc in docs:
                try:
                    handler(doc)
                    count += 1
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(
                        f'  {_type} {doc.get("_id", "?")} failed — {exc}'
                    ))

            self.stdout.write(f'  {_type}: {count} synced')
            total += count

        self.stdout.write(self.style.SUCCESS(f'\nDone. {total} documents synced.'))

    def _query(self, base_url, token, groq):
        url = f'{base_url}?query={urllib.parse.quote(groq)}'
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()).get('result', [])
