from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0021_rename_help_me_leads_email_idx_help_me_lea_email_9d85ec_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='programinterest',
            name='phone',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
