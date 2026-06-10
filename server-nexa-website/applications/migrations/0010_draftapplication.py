import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0009_alter_application_program'),
    ]

    operations = [
        migrations.CreateModel(
            name='DraftApplication',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(unique=True)),
                ('full_name', models.CharField(blank=True, max_length=255)),
                ('program', models.CharField(blank=True, max_length=100)),
                ('step_reached', models.IntegerField(default=1)),
                ('completed', models.BooleanField(default=False)),
                ('reminder_sent', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'draft_applications',
            },
        ),
        migrations.AddIndex(
            model_name='draftapplication',
            index=models.Index(fields=['email'], name='draft_email_idx'),
        ),
        migrations.AddIndex(
            model_name='draftapplication',
            index=models.Index(fields=['completed', 'reminder_sent', 'created_at'], name='draft_reminder_idx'),
        ),
    ]
