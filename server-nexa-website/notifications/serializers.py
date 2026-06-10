from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['notification_id', 'created_at']


class CreateNotificationSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    type = serializers.ChoiceField(choices=Notification.TYPE_CHOICES)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    application_id = serializers.UUIDField(required=False)
    course_name = serializers.CharField(required=False, allow_blank=True)
    link = serializers.CharField(required=False, allow_blank=True)


class CreateGroupNotificationSerializer(serializers.Serializer):
    VALID_LITERALS = ('all', 'pending', 'approved', 'enrolled')

    group = serializers.CharField()
    type = serializers.ChoiceField(choices=Notification.TYPE_CHOICES)
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    link = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_group(self, value):
        if value in self.VALID_LITERALS:
            return value
        if value.startswith('program:') and len(value) > len('program:'):
            return value
        raise serializers.ValidationError(
            "group must be one of: all, pending, approved, enrolled, or program:<slug>"
        )