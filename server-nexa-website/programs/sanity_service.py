import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SANITY_PROJECT_ID = getattr(settings, 'SANITY_PROJECT_ID', '')
SANITY_DATASET = getattr(settings, 'SANITY_DATASET', 'production')
SANITY_API_TOKEN = getattr(settings, 'SANITY_API_TOKEN', '')

MUTATIONS_URL = f'https://{SANITY_PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/{SANITY_DATASET}'


def _headers():
    return {
        'Authorization': f'Bearer {SANITY_API_TOKEN}',
        'Content-Type': 'application/json',
    }


def _mutate(mutations: list) -> dict | None:
    if not SANITY_PROJECT_ID or not SANITY_API_TOKEN:
        logger.warning('Sanity credentials not configured — skipping mutation')
        return None
    try:
        resp = requests.post(MUTATIONS_URL, json={'mutations': mutations}, headers=_headers(), timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.error('Sanity mutation failed: %s', exc)
        return None


def create_program_in_sanity(program) -> str:
    """Creates or replaces a Program document in Sanity. Returns the Sanity _id."""
    doc = {
        '_type': 'program',
        '_id': f'program-{program.slug}',
        'slug': {'_type': 'slug', 'current': program.slug},
        'name': program.name,
        'price': float(program.price) if program.price else None,
        'originalPrice': float(program.original_price) if program.original_price else None,
    }
    _mutate([{'createOrReplace': doc}])
    return doc['_id']


def update_program_in_sanity(program) -> None:
    """Patches name/price/originalPrice on the Sanity document."""
    sanity_id = program.sanity_id or f'program-{program.slug}'
    patch = {
        'id': sanity_id,
        'set': {
            'name': program.name,
            'price': float(program.price) if program.price else None,
            'originalPrice': float(program.original_price) if program.original_price else None,
        },
    }
    _mutate([{'patch': patch}])


def delete_program_from_sanity(sanity_id: str) -> None:
    """Deletes a program document from Sanity by _id."""
    _mutate([{'delete': {'id': sanity_id}}])
