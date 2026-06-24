import logging
from urllib.parse import urlencode
from rest_framework import viewsets, status, filters
from ubuntu_labs.pagination import StandardResultsSetPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db import IntegrityError
from django.utils import timezone
from django.core import signing
from django.http import HttpResponseRedirect
from .models import NewsletterSubscription, NewsletterCampaign
from .serializers import NewsletterSubscriptionSerializer, SubscribeSerializer, NewsletterCampaignSerializer
from accounts.permissions import IsAdminUser
from django.conf import settings
from ubuntu_labs.email_utils import send_html_email

logger = logging.getLogger(__name__)

_UNSUB_SALT = 'newsletter-unsubscribe'
_UNSUB_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


def _make_unsubscribe_token(email):
    return signing.dumps(email, salt=_UNSUB_SALT)


def _read_unsubscribe_token(token):
    return signing.loads(token, salt=_UNSUB_SALT, max_age=_UNSUB_MAX_AGE)


def _build_unsubscribe_url(request, email):
    token = _make_unsubscribe_token(email)
    return request.build_absolute_uri(f'/api/newsletter/unsubscribe-via-token/?token={token}')


def _unsubscribe_result_url(status_value, reason=''):
    base = getattr(settings, 'ADMISSIONS_PORTAL_URL', '') or getattr(settings, 'FRONTEND_URL', '')
    base = base.rstrip('/')
    params = {'status': status_value}
    if reason:
        params['reason'] = reason
    return f"{base}/unsubscribe?{urlencode(params)}"

class NewsletterViewSet(viewsets.ModelViewSet):
    queryset = NewsletterSubscription.objects.all()
    serializer_class = NewsletterSubscriptionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source']
    search_fields = ['email', 'name']
    ordering_fields = ['subscribed_at', 'email']
    ordering = ['-subscribed_at']
    pagination_class = StandardResultsSetPagination

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def subscribe(self, request):
        """Public endpoint for newsletter subscription"""
        serializer = SubscribeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            subscription, created = NewsletterSubscription.objects.get_or_create(
                email=serializer.validated_data['email'],
                defaults={
                    'name': serializer.validated_data.get('name', ''),
                    'source': serializer.validated_data.get('source', 'website'),
                    'status': 'active'
                }
            )

            if not created and subscription.status == 'inactive':
                # Reactivate subscription
                subscription.status = 'active'
                subscription.unsubscribed_at = None
                subscription.save()
            elif not created and subscription.status == 'active':
                return Response({
                    'success': False,
                    'error': 'This user is already subscribed'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Send confirmation email
            try:
                send_html_email(
                    subject="You're subscribed — welcome to the Nexa Academy Newsletter",
                    template_name='newsletter_confirm.html',
                    context={
                        'name': subscription.name or 'Subscriber',
                        'frontend_url': settings.FRONTEND_URL,
                        'unsubscribe_url': _build_unsubscribe_url(request, subscription.email),
                        'preview_text': "You're on the list! Here's what to expect from the Nexa Academy newsletter.",
                        'header_label': 'Newsletter',
                    },
                    recipient_email=subscription.email,
                )
            except Exception:
                pass

            return Response({
                'success': True,
                'message': 'Successfully subscribed to newsletter',
                'subscription': NewsletterSubscriptionSerializer(subscription).data
            }, status=status.HTTP_200_OK)

        except IntegrityError:
            return Response({
                'success': False,
                'error': 'This user is already subscribed'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def unsubscribe(self, request):
        """Public endpoint for unsubscribing"""
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            subscription = NewsletterSubscription.objects.get(email=email)
            subscription.unsubscribe()

            return Response({
                'success': True,
                'message': 'Successfully unsubscribed from newsletter'
            })
        except NewsletterSubscription.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Email not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='unsubscribe-via-token')
    def unsubscribe_via_token(self, request):
        """One-click unsubscribe via signed token embedded in email links."""
        token = request.query_params.get('token')
        if not token:
            return HttpResponseRedirect(_unsubscribe_result_url('error', 'missing_token'))

        try:
            email = _read_unsubscribe_token(token)
        except signing.SignatureExpired:
            return HttpResponseRedirect(_unsubscribe_result_url('error', 'expired'))
        except signing.BadSignature:
            return HttpResponseRedirect(_unsubscribe_result_url('error', 'invalid'))

        try:
            subscription = NewsletterSubscription.objects.get(email=email)
            if subscription.status == 'active':
                subscription.unsubscribe()
                return HttpResponseRedirect(_unsubscribe_result_url('success'))
            return HttpResponseRedirect(_unsubscribe_result_url('success', 'already_unsubscribed'))
        except NewsletterSubscription.DoesNotExist:
            return HttpResponseRedirect(_unsubscribe_result_url('error', 'not_found'))

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get subscriber count"""
        count = NewsletterSubscription.objects.filter(status='active').count()
        return Response({'count': count})

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export subscribers as CSV"""
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="newsletter_subscribers.csv"'

        writer = csv.writer(response)
        writer.writerow(['Email', 'Name', 'Subscribed At', 'Status', 'Source'])

        subscribers = self.get_queryset()
        for sub in subscribers:
            writer.writerow([
                sub.email,
                sub.name,
                sub.subscribed_at.strftime('%Y-%m-%d %H:%M:%S'),
                sub.status,
                sub.source
            ])

        return response


class NewsletterCampaignViewSet(viewsets.ModelViewSet):
    queryset = NewsletterCampaign.objects.all()
    serializer_class = NewsletterCampaignSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_update(self, serializer):
        # Prevent editing a sent campaign's body/subject
        instance = self.get_object()
        if instance.status == 'sent':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Sent campaigns cannot be edited.")
        serializer.save()

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send the campaign to all active subscribers."""
        campaign = self.get_object()

        if campaign.status == 'sent':
            return Response(
                {'error': 'This campaign has already been sent.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscribers = NewsletterSubscription.objects.filter(status='active')
        total = subscribers.count()

        if total == 0:
            return Response(
                {'error': 'No active subscribers to send to.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sent_count = 0
        failed_count = 0

        for sub in subscribers:
            try:
                unsubscribe_url = _build_unsubscribe_url(request, sub.email)
                send_html_email(
                    subject=campaign.subject,
                    template_name='newsletter_campaign.html',
                    context={
                        'subject': campaign.subject,
                        'preview_text': campaign.preview_text or '',
                        'header_label': 'Newsletter',
                        'html_body': campaign.html_body,
                        'subscriber_name': sub.name or 'Subscriber',
                        'unsubscribe_url': unsubscribe_url,
                        'frontend_url': settings.FRONTEND_URL,
                    },
                    recipient_email=sub.email,
                )
                sent_count += 1
            except Exception as e:
                logger.error("Failed to send campaign %s to %s: %s", campaign.campaign_id, sub.email, e)
                failed_count += 1

        campaign.status = 'sent'
        campaign.sent_at = timezone.now()
        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        campaign.save()

        return Response({
            'success': True,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total': total,
        })

    @action(detail=False, methods=['get'])
    def subscriber_count(self, request):
        """Quick count for the compose UI."""
        count = NewsletterSubscription.objects.filter(status='active').count()
        return Response({'count': count})
