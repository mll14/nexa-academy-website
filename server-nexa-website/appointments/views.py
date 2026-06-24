from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from django.conf import settings
import logging

from accounts.permissions import IsAdminUser
from ubuntu_labs.email_utils import send_html_email
from ubuntu_labs.pagination import StandardResultsSetPagination
from applications.gcal_service import get_all_slots_with_status, CalendarServiceError

from .models import Appointment
from .serializers import AppointmentSerializer, AppointmentCreateSerializer, AppointmentUpdateSerializer
from . import gcal_service as appt_gcal

logger = logging.getLogger(__name__)

_HOST_LABELS = {
    'admissions_manager': 'Admissions Manager',
    'technical_mentor': 'Technical Mentor',
}


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    pagination_class = StandardResultsSetPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'available_slots'):
            return [AllowAny()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'create':
            return AppointmentCreateSerializer
        if self.action == 'partial_update':
            return AppointmentUpdateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        qs = Appointment.objects.all()
        status_filter = self.request.query_params.get('status')
        appt_type = self.request.query_params.get('appointment_type')
        host = self.request.query_params.get('host')
        search = self.request.query_params.get('search')
        ordering = self.request.query_params.get('ordering', '-chosen_time')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if appt_type:
            qs = qs.filter(appointment_type=appt_type)
        if host:
            qs = qs.filter(host=host)
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))

        allowed_orderings = {'chosen_time', '-chosen_time', 'created_at', '-created_at', 'name', '-name'}
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()

        formatted_time = appointment.chosen_time.strftime('%A, %d %B %Y at %I:%M %p EAT')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://nexaacademy.co.ke')
        office_location = getattr(settings, 'NEXA_OFFICE_LOCATION', '10th Floor, JKUAT Towers, CBD Nairobi')
        host_label = _HOST_LABELS.get(appointment.host, appointment.host)

        # Calendar event — non-fatal
        try:
            result = appt_gcal.create_appointment_event(appointment)
            appointment.gcal_event_id = result['event_id']
            appointment.meet_url = result.get('meet_url', '')
            appointment.save(update_fields=['gcal_event_id', 'meet_url'])
        except CalendarServiceError as exc:
            logger.error('Calendar event creation failed for appointment %s: %s', appointment.id, exc)

        # Confirmation email to booker
        try:
            send_html_email(
                subject='Your Nexa Academy appointment is confirmed',
                template_name='appointment_confirmed.html',
                context={
                    'name': appointment.name,
                    'appointment_type': appointment.get_appointment_type_display(),
                    'host_label': host_label,
                    'chosen_time': formatted_time,
                    'reason': appointment.reason,
                    'meet_url': appointment.meet_url,
                    'office_location': office_location,
                    'is_virtual': appointment.appointment_type == 'virtual',
                    'frontend_url': frontend_url,
                    'preview_text': f'Your appointment with {host_label} is confirmed for {formatted_time}.',
                    'header_label': 'Appointment Confirmed',
                },
                recipient_email=appointment.email,
            )
        except Exception as exc:
            logger.error('Confirmation email failed for appointment %s: %s', appointment.id, exc)

        # Admin notification
        try:
            admissions_email = getattr(settings, 'ADMISSIONS_EMAIL', 'admissions@nexaacademy.co.ke')
            portal_url = getattr(settings, 'PORTAL_URL', 'https://admissions.nexaacademy.co.ke')
            send_html_email(
                subject=f'New appointment booked: {appointment.name} — {formatted_time}',
                template_name='appointment_admin_notification.html',
                context={
                    'name': appointment.name,
                    'email': appointment.email,
                    'phone': appointment.phone,
                    'appointment_type': appointment.get_appointment_type_display(),
                    'host_label': host_label,
                    'chosen_time': formatted_time,
                    'reason': appointment.reason,
                    'meet_url': appointment.meet_url,
                    'office_location': office_location,
                    'is_virtual': appointment.appointment_type == 'virtual',
                    'appointment_id': str(appointment.id),
                    'portal_url': portal_url,
                    'frontend_url': frontend_url,
                    'header_label': 'New Appointment',
                },
                recipient_email=admissions_email,
            )
        except Exception as exc:
            logger.error('Admin notification failed for appointment %s: %s', appointment.id, exc)

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def available_slots(self, request):
        """Return all slots with status for the next 2 weeks."""
        try:
            slots = get_all_slots_with_status(weeks_ahead=2)
            return Response(slots)
        except CalendarServiceError as exc:
            logger.error('appointments.available_slots failed: %s', exc)
            return Response(
                {'error': 'Calendar unavailable. Please try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        if appointment.status == 'cancelled':
            return Response({'error': 'Already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        if appointment.gcal_event_id:
            try:
                appt_gcal.cancel_appointment_event(appointment.gcal_event_id)
            except CalendarServiceError as exc:
                logger.error('Calendar deletion failed for appointment %s: %s', appointment.id, exc)

        appointment.status = 'cancelled'
        appointment.save(update_fields=['status', 'updated_at'])
        return Response(AppointmentSerializer(appointment).data)
