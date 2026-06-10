import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ubuntu_labs.settings')
django.setup()

from applications.models import Application
import traceback

try:
    Application.objects.create(
        full_name='Test User',
        email='test@example.com',
        phone='123',
        course='fullstack',
        course_name='Full Stack',
        estimated_fees='1000.00',
        payment_plan='full',
        start_date='2026-05-11',
        message='test'
    )
    print("Success")
except Exception as e:
    print(traceback.format_exc())
