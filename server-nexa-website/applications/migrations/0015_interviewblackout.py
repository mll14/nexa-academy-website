import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0014_applicationadminnote'),
    ]

    operations = [
        migrations.CreateModel(
            name='InterviewBlackout',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('start_time', models.TimeField(blank=True, null=True)),
                ('end_time', models.TimeField(blank=True, null=True)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('gcal_event_id', models.CharField(blank=True, max_length=255)),
                ('created_by', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'db_table': 'interview_blackouts',
                'ordering': ['date', 'start_time'],
            },
        ),
    ]
