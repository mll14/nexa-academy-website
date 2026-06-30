from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0019_add_achieved_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='interviewslot',
            name='interview_type',
            field=models.CharField(
                choices=[
                    ('online', 'Online'),
                    ('physical', 'Physical'),
                ],
                default='online',
                max_length=20,
            ),
        ),
    ]
