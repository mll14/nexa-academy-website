import uuid
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsletter', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='NewsletterCampaign',
            fields=[
                ('campaign_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('subject', models.CharField(max_length=255)),
                ('preview_text', models.CharField(blank=True, max_length=255)),
                ('html_body', models.TextField()),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('sent', 'Sent')], default='draft', max_length=10)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('sent_count', models.IntegerField(default=0)),
                ('failed_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'newsletter_campaigns',
                'ordering': ['-created_at'],
            },
        ),
    ]
