from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0018_helpmelead_incompleteapplication'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="ALTER TABLE programs ADD COLUMN IF NOT EXISTS coming_soon boolean NOT NULL DEFAULT false;",
                    reverse_sql="ALTER TABLE programs DROP COLUMN IF EXISTS coming_soon;",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='program',
                    name='coming_soon',
                    field=models.BooleanField(default=False),
                ),
            ],
        ),
    ]
