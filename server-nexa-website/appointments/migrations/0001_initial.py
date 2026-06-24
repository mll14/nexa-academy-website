import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Appointment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(max_length=30)),
                ('appointment_type', models.CharField(
                    choices=[('physical', 'Physical'), ('virtual', 'Virtual')],
                    max_length=20,
                )),
                ('host', models.CharField(
                    choices=[('admissions_manager', 'Admissions Manager'), ('technical_mentor', 'Technical Mentor')],
                    max_length=30,
                )),
                ('chosen_time', models.DateTimeField()),
                ('reason', models.TextField()),
                ('status', models.CharField(
                    choices=[('scheduled', 'Scheduled'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No Show')],
                    default='scheduled',
                    max_length=20,
                )),
                ('gcal_event_id', models.CharField(blank=True, max_length=255)),
                ('meet_url', models.URLField(blank=True)),
                ('admin_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'appointments',
                'ordering': ['-chosen_time'],
            },
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['status'], name='appts_status_idx'),
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['chosen_time'], name='appts_time_idx'),
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['email'], name='appts_email_idx'),
        ),
    ]
