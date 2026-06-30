from rest_framework import serializers
from django.db.models import Q
from accounts.models import User
from programs.models import Program, ProgramIntake
from programs.serializers import calculate_fee_structure, normalize_payment_plan
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
            'interview_type', 'zoom_link', 'gcal_event_id', 'meet_url',
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


class ApplicationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = [
            'full_name',
            'email',
            'phone',
            'program',
            'program_name',
            'payment_plan',
            'start_date',
        ]

    def to_internal_value(self, data):
        if isinstance(data, dict):
            if data.get('start_date') == '':
                data = {**data, 'start_date': None}
            if data.get('payment_plan'):
                data = {**data, 'payment_plan': normalize_payment_plan(data.get('payment_plan')) or data.get('payment_plan')}
        return super().to_internal_value(data)

    def validate_full_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Full name is required')
        return value

    def validate_email(self, value):
        value = (value or '').strip().lower()
        active_statuses = ['pending', 'reviewed', 'approved', 'interview_scheduled', 'interview_completed', 'enrolled']

        app_qs = Application.objects.filter(email__iexact=value, status__in=active_statuses)
        if self.instance:
            app_qs = app_qs.exclude(pk=self.instance.pk)
        if app_qs.exists():
            raise serializers.ValidationError('An active application already exists for this email.')

        user_qs = User.objects.filter(email__iexact=value)
        if self.instance and self.instance.user_id:
            user_qs = user_qs.exclude(uid=self.instance.user_id)
        if user_qs.exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_payment_plan(self, value):
        if value in (None, ''):
            return ''
        return normalize_payment_plan(value) or value

    def validate(self, attrs):
        instance = self.instance
        program_slug = attrs.get('program', getattr(instance, 'program', ''))
        payment_plan = attrs.get('payment_plan', getattr(instance, 'payment_plan', ''))
        start_date = attrs.get('start_date', getattr(instance, 'start_date', None))

        if program_slug and program_slug != '__help_me__':
            program = Program.objects.filter(slug__iexact=program_slug).first()
            if program:
                attrs['program_name'] = program.name
                if program.price is not None:
                    estimated_fees, _installment_amount = calculate_fee_structure(program.price, payment_plan)
                    attrs['_estimated_fees'] = estimated_fees
            elif not attrs.get('program_name') and instance:
                attrs['program_name'] = instance.program_name
        elif attrs.get('program_name'):
            attrs['program_name'] = attrs['program_name'].strip()

        if start_date and program_slug and program_slug != '__help_me__':
            intake_exists = ProgramIntake.objects.filter(
                program__slug__iexact=program_slug,
                start_date=start_date,
            ).exists()
            if not intake_exists:
                raise serializers.ValidationError({'start_date': 'Select a valid intake for the chosen program.'})

        return attrs

    def update(self, instance, validated_data):
        estimated_fees = validated_data.pop('_estimated_fees', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if estimated_fees is not None:
            instance.estimated_fees = estimated_fees

        if instance.user_id:
            user = instance.user
            user_updates = []
            if user.display_name != instance.full_name:
                user.display_name = instance.full_name
                user_updates.append('display_name')
            if user.email.lower() != instance.email.lower():
                user.email = instance.email
                user_updates.append('email')
            if (user.phone or '') != (instance.phone or ''):
                user.phone = instance.phone
                user_updates.append('phone')
            if user_updates:
                user.save(update_fields=list(dict.fromkeys(user_updates)))

        instance.save()
        return instance

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
        if Application.objects.filter(email__iexact=email).exclude(status__in=['rejected', 'achieved']).exists():
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



