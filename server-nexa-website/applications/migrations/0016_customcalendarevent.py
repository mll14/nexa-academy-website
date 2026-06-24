import uuid
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0015_interviewblackout'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomCalendarEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('date', models.DateField()),
                ('start_time', models.TimeField(blank=True, null=True)),
                ('end_time', models.TimeField(blank=True, null=True)),
                ('all_day', models.BooleanField(default=False)),
                ('category', models.CharField(
                    choices=[
                        ('interview_follow_up', 'Interview Follow-up'),
                        ('lead_follow_up', 'Lead Follow-up'),
                        ('personal', 'Personal'),
                        ('meeting', 'Meeting'),
                        ('other', 'Other'),
                    ],
                    default='other',
                    max_length=30,
                )),
                ('description', models.TextField(blank=True)),
                ('gcal_event_id', models.CharField(blank=True, max_length=255)),
                ('created_by', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'custom_calendar_events',
                'ordering': ['date', 'start_time'],
            },
        ),
    ]
