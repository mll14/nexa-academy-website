from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('programs', '0019_program_coming_soon'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollment',
            name='student',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='enrollments',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
