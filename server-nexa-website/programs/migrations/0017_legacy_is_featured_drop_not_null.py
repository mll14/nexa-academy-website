from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0016_legacy_columns_content_not_null'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE programs ALTER COLUMN is_featured DROP NOT NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
