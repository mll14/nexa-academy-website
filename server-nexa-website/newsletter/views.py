from rest_framework import viewsets, status, filters
from ubuntu_labs.pagination import StandardResultsSetPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db import IntegrityError
from .models import NewsletterSubscription
from .serializers import NewsletterSubscriptionSerializer, SubscribeSerializer
from accounts.permissions import IsAdminUser
from django.conf import settings
from ubuntu_labs.email_utils import send_html_email


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
                    subject="Welcome to the Nexa Academy Newsletter",
                    template_name='newsletter_confirm.html',
                    context={
                        'name': subscription.name or 'Subscriber',
                        'frontend_url': settings.FRONTEND_URL,
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