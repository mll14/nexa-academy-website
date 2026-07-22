from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import AppPermission, Role, AuditLog, Guardian, NotificationPreference

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'


class AppPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppPermission
        fields = ['id', 'codename', 'name', 'resource', 'action']
        read_only_fields = ['id']


class RoleSerializer(serializers.ModelSerializer):
    permissions = AppPermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=AppPermission.objects.all(),
        write_only=True, source='permissions', required=False,
    )
    user_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Role
        fields = ['id', 'name', 'slug', 'description', 'is_system', 'permissions', 'permission_ids', 'user_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_system', 'created_at', 'updated_at']

    def create(self, validated_data):
        perms = validated_data.pop('permissions', [])
        role = Role.objects.create(**validated_data)
        role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        perms = validated_data.pop('permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if perms is not None:
            instance.permissions.set(perms)
        return instance


class StaffUserSerializer(serializers.ModelSerializer):
    staff_role = RoleSerializer(read_only=True)
    staff_role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), source='staff_role',
        allow_null=True, required=False, write_only=True,
    )
    individual_permissions = AppPermissionSerializer(many=True, read_only=True)
    individual_permission_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=AppPermission.objects.all(),
        source='individual_permissions', required=False, write_only=True,
    )
    effective_permissions = serializers.SerializerMethodField()
    invitation_accepted = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'uid', 'email', 'display_name', 'phone', 'photo_url',
            'role', 'status', 'created_at',
            'staff_role', 'staff_role_id',
            'individual_permissions', 'individual_permission_ids',
            'effective_permissions', 'invitation_accepted',
        ]
        read_only_fields = ['uid', 'email', 'display_name', 'role', 'created_at', 'effective_permissions', 'invitation_accepted']

    def get_effective_permissions(self, obj):
        return obj.get_effective_permissions()

    def get_invitation_accepted(self, obj):
        return obj.has_usable_password()

    def update(self, instance, validated_data):
        individual_perms = validated_data.pop('individual_permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if individual_perms is not None:
            instance.individual_permissions.set(individual_perms)
        return instance


def mask_id_number(value: str) -> str:
    """
    Show only the last 4 characters of a national ID / passport number.

    `id_number` is PII that the portal rarely needs in full once captured — masking it in
    API responses keeps it out of browser memory, logs, and screenshots. The unmasked value
    stays in the database for admissions verification.
    """
    if not value:
        return ''
    tail = value[-4:]
    return f"{'•' * max(len(value) - 4, 0)}{tail}"


PERSONAL_FIELDS = [
    'first_name', 'middle_name', 'last_name',
    'date_of_birth', 'gender', 'nationality', 'phone', 'alt_phone',
]
ADDRESS_FIELDS = ['country', 'county', 'city', 'postal_address']


class MyProfileSerializer(serializers.ModelSerializer):
    """
    Self-service profile write surface (PATCH /api/auth/my-profile/).

    `email` is accepted but the view must sync it to Keycloak — it doubles as the Keycloak
    username, and changing it here alone would leave the user signing in with the old one.
    """
    id_number = serializers.SerializerMethodField()
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'display_name', 'email', 'photo_url', 'google_linked', 'id_number', 'age',
            *PERSONAL_FIELDS, *ADDRESS_FIELDS,
        ]
        read_only_fields = ['google_linked', 'id_number', 'age', 'display_name']

    def get_id_number(self, obj):
        return mask_id_number(obj.id_number)

    def validate_email(self, value):
        value = value.strip().lower()
        qs = User.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_date_of_birth(self, value):
        from django.utils import timezone
        if value and value > timezone.localdate():
            raise serializers.ValidationError('Date of birth cannot be in the future.')
        return value


class GuardianSerializer(serializers.ModelSerializer):
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)

    class Meta:
        model = Guardian
        fields = [
            'id', 'full_name', 'relationship', 'relationship_display', 'phone', 'email',
            'occupation', 'is_primary', 'is_emergency_contact', 'is_bill_payer',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'relationship_display', 'created_at', 'updated_at']

    def validate(self, attrs):
        # A guardian is only reachable if there is some way to contact them.
        phone = attrs.get('phone', getattr(self.instance, 'phone', ''))
        email = attrs.get('email', getattr(self.instance, 'email', ''))
        if not phone and not email:
            raise serializers.ValidationError(
                'Provide at least a phone number or an email address for the guardian.'
            )
        return attrs


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'email_enabled', 'sms_enabled', 'in_app_enabled',
            'application_updates', 'interview_reminders', 'payment_updates',
            'program_announcements', 'newsletter', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    # CamelCase aliases for frontend consistency
    feeBalance = serializers.DecimalField(source='fee_balance', max_digits=10, decimal_places=2, read_only=True)
    totalFeePaid = serializers.DecimalField(source='total_fee_paid', max_digits=10, decimal_places=2, read_only=True)
    displayName = serializers.CharField(source='display_name', read_only=True)
    idNumber = serializers.SerializerMethodField()
    id_number = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    effectivePermissions = serializers.SerializerMethodField()
    staffRole = serializers.SerializerMethodField()
    age = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'uid', 'email', 'display_name', 'displayName', 'phone', 'photo_url',
            'role', 'status', 'fee_balance', 'feeBalance', 'total_fee_paid', 'totalFeePaid',
            'id_number', 'idNumber', 'created_at', 'createdAt', 'password',
            'effectivePermissions', 'staffRole', 'google_linked', 'age',
            *PERSONAL_FIELDS, *ADDRESS_FIELDS,
        ]
        read_only_fields = [
            'uid', 'role', 'status', 'fee_balance', 'feeBalance',
            'total_fee_paid', 'totalFeePaid',
            'display_name', 'displayName', 'id_number', 'idNumber', 'age',
            'created_at', 'createdAt', 'effectivePermissions', 'staffRole',
            *PERSONAL_FIELDS, *ADDRESS_FIELDS,
        ]

    def _id_number(self, obj):
        """
        Full ID only for admins (admissions must verify it); masked for everyone else,
        including the owner — they already know their own number, and an unmasked value
        in the student payload is an avoidable PII leak.
        """
        request = self.context.get('request')
        viewer = getattr(request, 'user', None) if request else None
        if viewer is not None and getattr(viewer, 'role', None) == 'admin':
            return obj.id_number
        return mask_id_number(obj.id_number)

    def get_idNumber(self, obj):
        return self._id_number(obj)

    def get_id_number(self, obj):
        return self._id_number(obj)

    def get_effectivePermissions(self, obj):
        return obj.get_effective_permissions()

    def get_staffRole(self, obj):
        if obj.staff_role:
            return RoleSerializer(obj.staff_role).data
        return None

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AuditLogSerializer(serializers.ModelSerializer):
    performed_by = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'action_display', 'resource_type', 'resource_id', 'resource_summary', 'ip_address', 'created_at', 'performed_by']
        read_only_fields = fields

    def get_performed_by(self, obj):
        if obj.user:
            return {'uid': str(obj.user.uid), 'display_name': obj.user.display_name, 'email': obj.user.email}
        return None
