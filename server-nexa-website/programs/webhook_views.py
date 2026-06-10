import hashlib
import hmac
import json
import logging
import time

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import sanity_sync

logger = logging.getLogger(__name__)


class SanityWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not self._valid_signature(request):
            return Response({'error': 'Invalid signature'}, status=401)
        try:
            payload = json.loads(request.body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return Response({'error': 'Invalid JSON'}, status=400)

        doc_type = payload.get('_type', '')
        if doc_type == 'program':
            sanity_sync.sync_program(payload)
        elif doc_type == 'programIntake':
            sanity_sync.sync_intake(payload)
        else:
            logger.info('SanityWebhookView: ignoring _type=%s', doc_type)
        return Response({'ok': True})

    def _valid_signature(self, request) -> bool:
        header = request.headers.get('sanity-webhook-signature', '')
        if not header:
            return False
        try:
            parts = dict(item.split('=', 1) for item in header.split(','))
            timestamp = parts['t']
            signature = parts['v1']
        except (KeyError, ValueError):
            return False
        try:
            if abs(time.time() - int(timestamp)) > 300:
                return False
        except ValueError:
            return False
        payload_str = f'{timestamp}.{request.body.decode("utf-8")}'
        expected = hmac.new(
            settings.SANITY_WEBHOOK_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
