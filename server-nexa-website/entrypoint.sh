#!/bin/sh
set -e

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Seeding default roles and permissions..."
python manage.py seed_permissions || echo "Warning: seed_permissions failed (non-fatal)"

echo "==> Syncing content from Sanity..."
python manage.py sync_content_from_sanity || echo "Warning: Sanity sync failed (non-fatal)"

echo "==> Starting gunicorn..."
exec gunicorn ubuntu_labs.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120
