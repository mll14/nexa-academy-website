from rest_framework import serializers
from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    appointment_type_label = serializers.CharField(source='get_appointment_type_display', read_only=True)
    host_label = serializers.CharField(source='get_host_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ('id', 'gcal_event_id', 'meet_url', 'created_at', 'updated_at')


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ('name', 'email', 'phone', 'appointment_type', 'host', 'chosen_time', 'reason', 'attendees')

    def validate_appointment_type(self, value):
        if value not in ('physical', 'virtual'):
            raise serializers.ValidationError("Must be 'physical' or 'virtual'.")
        return value

    def validate_host(self, value):
        if value not in ('admissions_manager', 'technical_mentor'):
            raise serializers.ValidationError("Must be 'admissions_manager' or 'technical_mentor'.")
        return value


class AppointmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ('status', 'admin_notes')
