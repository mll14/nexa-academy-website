from rest_framework import serializers
from django.db.models import Q
from .models import Application, ApplicationAdminNote, ApplicationLog, DraftApplication
from .models import InterviewSlot, InterviewBlackout, CustomCalendarEvent

class ApplicationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationLog
        fields = '__all__'


class ApplicationAdminNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationAdminNote
        fields = [
            'id', 'application', 'stage', 'html', 'text',
            'created_by', 'created_by_name', 'created_by_email', 'created_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_by_email', 'created_at']

    def validate_html(self, value):
        if not (value or '').strip():
            raise serializers.ValidationError('Note content is required')
        return value


class InterviewSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSlot
        fields = [
            'id', 'application', 'proposed_times', 'chosen_time',
            'zoom_link', 'gcal_event_id', 'meet_url',
            'admin_approved', 'completed', 'notes', 'confirmed_at', 'created_at',
            'extra_guests', 'student_gmail',
        ]
        read_only_fields = ['id', 'created_at']


class ApplicationSerializer(serializers.ModelSerializer):
    logs = ApplicationLogSerializer(many=True, read_only=True)
    interview_slot = InterviewSlotSerializer(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('estimated_fees') not in (None, ''):
            return data

        try:
            from programs.models import Enrollment, Program

            enrollment_qs = Enrollment.objects.filter(
                Q(student=instance.user) | Q(student__email__iexact=instance.email),
            )
            if instance.program_name:
                enrollment_qs = enrollment_qs.filter(program_name__iexact=instance.program_name)
            elif instance.program:
                enrollment_qs = enrollment_qs.filter(program__slug__iexact=instance.program)

            enrollment_amount = enrollment_qs.order_by('-enrollment_date').values_list('amount', flat=True).first()
            if enrollment_amount is not None:
                data['estimated_fees'] = str(enrollment_amount)
                return data

            program_qs = Program.objects.all()
            if instance.program:
                program_qs = program_qs.filter(slug__iexact=instance.program)
            elif instance.program_name:
                program_qs = program_qs.filter(name__iexact=instance.program_name)

            program_price = program_qs.values_list('price', flat=True).first()
            if program_price is not None:
                data['estimated_fees'] = str(program_price)
        except Exception:
            pass
        return data
    
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


class InterviewBlackoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewBlackout
        fields = ['id', 'date', 'start_time', 'end_time', 'reason', 'gcal_event_id', 'created_by', 'created_at']
        read_only_fields = ['id', 'gcal_event_id', 'created_by', 'created_at']

    def validate(self, attrs):
        start = attrs.get('start_time')
        end = attrs.get('end_time')
        if (start is None) != (end is None):
            raise serializers.ValidationError('Both start_time and end_time must be provided together, or both omitted for a full-day block.')
        if start and end and end <= start:
            raise serializers.ValidationError('end_time must be after start_time.')
        return attrs


class CustomCalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomCalendarEvent
        fields = [
            'id', 'title', 'date', 'start_time', 'end_time', 'all_day',
            'category', 'description', 'with_meet', 'meet_url', 'attendees',
            'gcal_event_id', 'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'meet_url', 'gcal_event_id', 'created_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        if not attrs.get('all_day'):
            if not attrs.get('start_time') or not attrs.get('end_time'):
                raise serializers.ValidationError('start_time and end_time are required for timed events.')
            if attrs['end_time'] <= attrs['start_time']:
                raise serializers.ValidationError('end_time must be after start_time.')
        return attrs


class DraftApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftApplication
        fields = ['id', 'email', 'full_name', 'program', 'step_reached']



