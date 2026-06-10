from rest_framework import serializers
from .models import Application, ApplicationLog, DraftApplication
from .models import InterviewSlot

class ApplicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationLog
        fields = '__all__'


class InterviewSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSlot
        fields = [
            'id', 'application', 'proposed_times', 'chosen_time',
            'zoom_link', 'gcal_event_id', 'meet_url',
            'admin_approved', 'completed', 'notes', 'confirmed_at', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ApplicationSerializer(serializers.ModelSerializer):
    logs = ApplicationLogSerializer(many=True, read_only=True)
    interview_slot = InterviewSlotSerializer(read_only=True)
    
    class Meta:
        model = Application
        fields = '__all__'
        read_only_fields = ['id', 'applied_at', 'updated_at', 'status_updated_at', 'month_year']

class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        exclude = ['user', 'status', 'previous_status', 'processed',
                  'processed_by', 'admin_notes', 'email_sent',
                  'status_updated_at', 'updated_at', 'month_year']
        read_only_fields = ['id', 'applied_at']

    def validate_email(self, value):
        # Normalize email
        email = value.lower().strip()
        # Check for existing applications that are not rejected
        if Application.objects.filter(email__iexact=email).exclude(status='rejected').exists():
            raise serializers.ValidationError("An active application already exists for this email.")
        return email

    def validate(self, attrs):
        # Require explicit knowledge answer and a non-empty description
        has_knowledge = attrs.get('has_basic_knowledge')
        desc = attrs.get('knowledge_description', '') or ''

        if has_knowledge is None:
            raise serializers.ValidationError({'has_basic_knowledge': 'Please indicate if you have basic knowledge of the chosen program.'})

        if not desc.strip():
            raise serializers.ValidationError({'knowledge_description': 'Please describe what basic knowledge you have. This is required.'})

        return attrs


class DraftApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftApplication
        fields = ['id', 'email', 'full_name', 'program', 'step_reached']



