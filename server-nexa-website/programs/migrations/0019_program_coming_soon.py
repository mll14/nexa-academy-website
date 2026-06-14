from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0018_helpmelead_incompleteapplication'),
    ]

    operations = [
        migrations.AddField(
            model_name='program',
            name='coming_soon',
            field=models.BooleanField(default=False),
        ),
    ]
