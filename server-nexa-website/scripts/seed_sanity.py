"""
One-time script: exports existing Django content into Sanity and writes
the returned _id values back to sanity_id on each Django record.

Usage:
  cd server-nexa-website
  DJANGO_SETTINGS_MODULE=ubuntu_labs.settings python scripts/seed_sanity.py

Requires SANITY_PROJECT_ID and SANITY_DATASET to be set in .env.
Also requires SANITY_API_TOKEN with write access (create one at sanity.io/manage
→ API → Tokens → Add API token → role: Editor).
"""
import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ubuntu_labs.settings')
django.setup()

import requests
from django.conf import settings
from content.models import Testimonial, FAQ, HomepageFeature, LegalDocument, SiteSetting

PROJECT_ID = settings.SANITY_PROJECT_ID
DATASET    = settings.SANITY_DATASET
TOKEN      = os.environ.get('SANITY_API_TOKEN', '')
API_URL    = f'https://{PROJECT_ID}.api.sanity.io/v2021-06-07/data/mutate/{DATASET}?returnIds=true'

if not TOKEN:
    print('ERROR: set SANITY_API_TOKEN env var (Editor token from sanity.io/manage)')
    sys.exit(1)

if not PROJECT_ID:
    print('ERROR: SANITY_PROJECT_ID not set in .env')
    sys.exit(1)

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
}


def mutate(mutations):
    resp = requests.post(API_URL, json={'mutations': mutations}, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()


def seed_testimonials():
    print('Seeding testimonials...')
    for t in Testimonial.objects.filter(sanity_id__isnull=True):
        result = mutate([{'create': {
            '_type':     'testimonial',
            'name':      t.name,
            'role':      t.role,
            'quote':     t.quote,
            'rating':    t.rating,
            'avatarUrl': t.avatar_url,
            'isActive':  t.is_active,
            'sortOrder': t.sort_order,
        }}])
        doc_id = result['results'][0]['id']
        Testimonial.objects.filter(pk=t.pk).update(sanity_id=doc_id)
        print(f'  OK {t.name} -> {doc_id}')


def seed_faqs():
    print('Seeding FAQs...')
    for f in FAQ.objects.filter(sanity_id__isnull=True):
        result = mutate([{'create': {
            '_type':          'faq',
            'question':       f.question,
            'answer':         f.answer,
            'category':       f.category,
            'showOnHomepage': f.show_on_homepage,
            'isActive':       f.is_active,
            'sortOrder':      f.sort_order,
        }}])
        doc_id = result['results'][0]['id']
        FAQ.objects.filter(pk=f.pk).update(sanity_id=doc_id)
        print(f'  OK {f.question[:60]} -> {doc_id}')


def seed_features():
    print('Seeding homepage features...')
    for feat in HomepageFeature.objects.filter(sanity_id__isnull=True):
        result = mutate([{'create': {
            '_type':       'homepageFeature',
            'section':     feat.section,
            'title':       feat.title,
            'description': feat.description,
            'iconName':    feat.icon_name,
            'sortOrder':   feat.sort_order,
            'isActive':    feat.is_active,
        }}])
        doc_id = result['results'][0]['id']
        HomepageFeature.objects.filter(pk=feat.pk).update(sanity_id=doc_id)
        print(f'  OK {feat.title} -> {doc_id}')


def seed_legal():
    print('Seeding legal documents...')
    for doc in LegalDocument.objects.filter(sanity_id__isnull=True):
        result = mutate([{'create': {
            '_type':     'legalDocument',
            'docType':   doc.doc_type,
            'sectionId': {'_type': 'slug', 'current': doc.section_id},
            'title':     doc.title,
            'content':   doc.content,
            'sortOrder': doc.sort_order,
            'isActive':  doc.is_active,
        }}])
        doc_id = result['results'][0]['id']
        LegalDocument.objects.filter(pk=doc.pk).update(sanity_id=doc_id)
        print(f'  OK [{doc.doc_type}] {doc.title} -> {doc_id}')


def seed_settings():
    print('Seeding site settings...')
    for s in SiteSetting.objects.filter(sanity_id__isnull=True):
        result = mutate([{'create': {
            '_type': 'siteSetting',
            'key':   s.key,
            'value': s.value,
            'group': s.group,
            'label': s.label,
        }}])
        doc_id = result['results'][0]['id']
        SiteSetting.objects.filter(pk=s.pk).update(sanity_id=doc_id)
        print(f'  OK {s.key} -> {doc_id}')


if __name__ == '__main__':
    seed_testimonials()
    seed_faqs()
    seed_features()
    seed_legal()
    seed_settings()
    print('\nDone. All content seeded into Sanity.')
