from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0026_follow_up_completed'),
    ]

    operations = [
        migrations.AddField(
            model_name='helpmelead',
            name='assigned_program_slug',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='helpmelead',
            name='assigned_program_name',
            field=models.CharField(blank=True, default='', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='helpmelead',
            name='converted_to_pipeline',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='helpmelead',
            name='converted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
