from rest_framework import serializers
from .models import ContactMessage

class ContactMessageSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = ContactMessage
        fields = '__all__'

    def validate(self, attrs):
        pref = attrs.get('preferred_contact') or attrs.get('preferred_contact', None)
        phone = attrs.get('phone')
        if pref and pref.lower() in ['phone', 'whatsapp']:
            if not phone:
                raise serializers.ValidationError({'phone': 'Phone number is required when preferred contact is phone or whatsapp.'})
        return attrs
