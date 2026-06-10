from rest_framework import serializers
from .models import Program, Enrollment, StudentProgramEnrolled, ProgramProgress, Certificate, ProgramInterest, ProgramIntake
from accounts.serializers import UserSerializer

class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = '__all__'
        read_only_fields = ['program_id', 'slug', 'sanity_id', 'created_at', 'updated_at', 'current_enrolled']


class EnrollmentSerializer(serializers.ModelSerializer):
    student_details = UserSerializer(source='student', read_only=True)
    program_details = ProgramSerializer(source='program', read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'
        read_only_fields = ['enrollment_id', 'enrollment_date', 'student_name', 'program_name']


class StudentProgramEnrolledSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProgramEnrolled
        fields = '__all__'
        read_only_fields = ['id']


class ProgramProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramProgress
        fields = '__all__'
        read_only_fields = ['id', 'updated_at']


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = '__all__'
        read_only_fields = ['certificate_id', 'issued_date', 'certificate_number', 'verification_code', 'verification_url']


class SimpleProgramProgressSerializer(serializers.ModelSerializer):
    """Simplified version for student dashboard"""
    class Meta:
        model = ProgramProgress
        fields = ['program_name', 'completion_percentage', 'status', 'last_accessed_at', 'certificate_earned']


class EnrollStudentSerializer(serializers.Serializer):
    program_id = serializers.UUIDField()
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class ProgramInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramInterest
        fields = ['id', 'program_slug', 'program_name', 'name', 'email', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProgramIntakeSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.program_name', read_only=True)

    class Meta:
        model = ProgramIntake
        fields = [
            'id', 'program', 'program_name', 'start_date', 'end_date',
            'application_deadline', 'max_seats', 'seats_remaining',
            'status', 'notes', 'source', 'cms_id', 'last_synced_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'source', 'cms_id', 'last_synced_at', 'created_at', 'updated_at']