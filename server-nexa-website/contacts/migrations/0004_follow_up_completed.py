from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0003_contactmessage_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='contactmessage',
            name='follow_up_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='contactmessage',
            name='follow_up_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
