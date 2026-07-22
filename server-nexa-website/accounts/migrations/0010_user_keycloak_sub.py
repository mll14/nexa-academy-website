from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_photo_url_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='keycloak_sub',
            field=models.CharField(
                blank=True, db_index=True, max_length=255, null=True, unique=True
            ),
        ),
    ]
