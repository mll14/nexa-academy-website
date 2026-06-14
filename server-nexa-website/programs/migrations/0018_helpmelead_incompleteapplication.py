from django.db import migrations, models
import uuid
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0017_legacy_is_featured_drop_not_null'),
    ]

    operations = [
        migrations.CreateModel(
            name='HelpMeLead',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, max_length=30)),
                ('message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'db_table': 'help_me_leads',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['email'], name='help_me_leads_email_idx'),
                    models.Index(fields=['-created_at'], name='help_me_leads_created_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='IncompleteApplication',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(blank=True, max_length=255)),
                ('email', models.EmailField(max_length=254)),
                ('phone', models.CharField(blank=True, max_length=30)),
                ('program_slug', models.CharField(blank=True, max_length=100)),
                ('program_name', models.CharField(blank=True, max_length=255)),
                ('step_reached', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'incomplete_applications',
                'ordering': ['-updated_at'],
                'indexes': [
                    models.Index(fields=['email'], name='incomplete_app_email_idx'),
                    models.Index(fields=['-updated_at'], name='incomplete_app_updated_idx'),
                ],
            },
        ),
        migrations.AlterUniqueTogether(
            name='incompleteapplication',
            unique_together={('email', 'program_slug')},
        ),
    ]
