import json
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.management.base import BaseCommand

from programs.sanity_sync import sync_program, sync_intake


class Command(BaseCommand):
    help = 'Bulk-sync all published programs and intakes from Sanity to Django.'

    def handle(self, *args, **options):
        project_id = settings.SANITY_PROJECT_ID
        dataset = settings.SANITY_DATASET
        token = settings.SANITY_API_TOKEN
        base = f'https://{project_id}.api.sanity.io/v2021-10-21/data/query/{dataset}'

        programs = self._query(base, token,
            '*[_type == "program" && !(_id in path("drafts.**"))]'
        )
        intakes = self._query(base, token,
            '*[_type == "programIntake" && !(_id in path("drafts.**"))]{..., program->{ _id }}'
        )

        p_count = 0
        for doc in programs:
            doc['_transition'] = 'appear'
            sync_program(doc)
            p_count += 1

        i_count = 0
        for doc in intakes:
            # Dereference: GROQ gives program._id; sync_intake expects program._ref
            if doc.get('program') and '_id' in doc['program']:
                doc['program']['_ref'] = doc['program']['_id']
            doc['_transition'] = 'appear'
            sync_intake(doc)
            i_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Synced {p_count} programs, {i_count} intakes.'
        ))

    def _query(self, base_url: str, token: str, groq: str) -> list:
        url = f'{base_url}?query={urllib.parse.quote(groq)}'
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read()).get('result', [])
