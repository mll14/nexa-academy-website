from rest_framework import viewsets, status, filters
from ubuntu_labs.pagination import StandardResultsSetPagination
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import ContactMessage
from .serializers import ContactMessageSerializer
from django.conf import settings
from ubuntu_labs.email_utils import send_html_email
from accounts.permissions import IsAdminUser

class ContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_read', 'status', 'follow_up_completed']
    search_fields = ['name', 'email', 'subject', 'message']
    ordering_fields = ['created_at', 'name', 'is_read']
    ordering = ['-created_at']
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        """
        AllowAny for creating a message, 
        IsAdminUser for everything else.
        """
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        name = serializer.validated_data.get('name')
        email = serializer.validated_data.get('email')
        subject_text = serializer.validated_data.get('subject')
        message_text = serializer.validated_data.get('message')
        preferred = serializer.validated_data.get('preferred_contact')
        phone = serializer.validated_data.get('phone')

        # 1. Send Email to Admin
        admin_subject = f"New Contact Inquiry: {subject_text}"
        admin_message = f"Name: {name}\n" \
                        f"Email: {email}\n" \
                        f"Preferred Contact: {preferred}\n"
        if phone:
            admin_message += f"Phone: {phone}\n"
        admin_message += "\n"
        admin_message += f"Message:\n{message_text}"
        
        try:
            send_html_email(
                subject=admin_subject,
                template_name='contact_received.html',
                context={
                    'name': name,
                    'email': email,
                    'subject': subject_text,
                    'message': message_text,
                    'preferred': preferred,
                    'phone': phone,
                    'frontend_url': settings.FRONTEND_URL,
                },
                recipient_email=settings.DEFAULT_FROM_EMAIL,
            )
        except Exception:
            pass

        # 2. Send Automatic Thank You Reply to Submitter
        user_subject = "Thank you for contacting Nexa Academy"
        user_message = f"Dear {name},\n\n" \
                       f"Thank you for reaching out to Nexa Academy regarding '{subject_text}'.\n\n" \
                       f"We have received your message and our team will get back to you as soon as possible.\n\n" \
                       f"Best regards,\n" \
                       f"The Nexa Academy Team"
        
        try:
            send_html_email(
                subject=user_subject,
                template_name='contact_received.html',
                context={
                    'name': name,
                    'email': email,
                    'subject': subject_text,
                    'message': message_text,
                    'phone': phone,
                    'frontend_url': settings.FRONTEND_URL,
                },
                recipient_email=email,
            )
        except Exception:
            pass

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get total number of contact messages"""
        count = ContactMessage.objects.count()
        unread_count = ContactMessage.objects.filter(is_read=False).count()
        return Response({
            'count': count,
            'unread_count': unread_count
        })

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        message.is_read = True
        message.save()
        return Response({'success': True, 'is_read': message.is_read})

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark a message follow-up as completed"""
        message = self.get_object()
        message.follow_up_completed = True
        message.follow_up_completed_at = timezone.now()
        message.save(update_fields=['follow_up_completed', 'follow_up_completed_at'])
        return Response({'success': True, 'follow_up_completed': True})

    @action(detail=True, methods=['post'])
    def revert_completed(self, request, pk=None):
        """Revert a message follow-up completion (undo accidental mark)"""
        message = self.get_object()
        message.follow_up_completed = False
        message.follow_up_completed_at = None
        message.save(update_fields=['follow_up_completed', 'follow_up_completed_at'])
        return Response({'success': True, 'follow_up_completed': False})
