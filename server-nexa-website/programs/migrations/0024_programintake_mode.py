from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0023_payment_plan_change_requests'),
    ]

    operations = [
        migrations.AddField(
            model_name='programintake',
            name='mode',
            field=models.CharField(
                choices=[
                    ('full_time_hybrid', 'Full-time Hybrid'),
                    ('full_time_remote', 'Full-time Remote'),
                    ('part_time_hybrid', 'Part-time Hybrid'),
                    ('part_time_remote', 'Part-time Remote'),
                ],
                default='full_time_hybrid',
                max_length=20,
            ),
        ),
    ]
