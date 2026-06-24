from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0025_leadadminnote'),
    ]

    operations = [
        migrations.AddField(
            model_name='programinterest',
            name='follow_up_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='programinterest',
            name='follow_up_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='helpmelead',
            name='follow_up_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='helpmelead',
            name='follow_up_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='incompleteapplication',
            name='follow_up_completed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='incompleteapplication',
            name='follow_up_completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
