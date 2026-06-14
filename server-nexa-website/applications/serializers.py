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

    def to_internal_value(self, data):
        # Convert empty-string date fields to None before DRF's DateField parser rejects them
        if isinstance(data, dict) and data.get('start_date') == '':
            data = {**data, 'start_date': None}
        return super().to_internal_value(data)

    def validate_email(self, value):
        # Normalize email
        email = value.lower().strip()
        # Check for existing applications that are not rejected
        if Application.objects.filter(email__iexact=email).exclude(status='rejected').exists():
            raise serializers.ValidationError("An active application already exists for this email.")
        return email

    def validate(self, attrs):
        from programs.models import Program as ProgramModel

        program_slug = attrs.get('program', '')
        has_knowledge = attrs.get('has_basic_knowledge')
        desc = attrs.get('knowledge_description', '') or ''

        # Skip knowledge check for "help me choose" and coming-soon programs
        skip_knowledge = (
            program_slug == '__help_me__'
            or ProgramModel.objects.filter(slug=program_slug, coming_soon=True).exists()
        )

        if not skip_knowledge:
            if has_knowledge is None:
                raise serializers.ValidationError({'has_basic_knowledge': 'Please indicate if you have basic knowledge of the chosen program.'})
            if has_knowledge and not desc.strip():
                raise serializers.ValidationError({'knowledge_description': 'Please describe what basic knowledge you have.'})

        if not has_knowledge:
            attrs['knowledge_description'] = ''

        return attrs


class DraftApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftApplication
        fields = ['id', 'email', 'full_name', 'program', 'step_reached']



