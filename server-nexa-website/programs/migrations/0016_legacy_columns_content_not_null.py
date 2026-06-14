"""
Migration 0016 — Drop NOT NULL from remaining legacy Program content columns.

Covers the columns not addressed in 0013/0015:
  From migration 0001 (blank=True but no null=True → DB column is NOT NULL):
    thumbnail, syllabus, requirements, skills
  From migration 0011 (ADD COLUMN with NOT NULL, no DB DEFAULT):
    subtitle, icon, image, topics, curriculum, features, outcomes, faq,
    coming_soon

DROP NOT NULL is idempotent in PostgreSQL, so it is safe to include columns
that are already nullable.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0015_legacy_columns_remaining_not_null'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE programs
                    ALTER COLUMN thumbnail    DROP NOT NULL,
                    ALTER COLUMN syllabus     DROP NOT NULL,
                    ALTER COLUMN requirements DROP NOT NULL,
                    ALTER COLUMN skills       DROP NOT NULL,
                    ALTER COLUMN subtitle     DROP NOT NULL,
                    ALTER COLUMN icon         DROP NOT NULL,
                    ALTER COLUMN image        DROP NOT NULL,
                    ALTER COLUMN topics       DROP NOT NULL,
                    ALTER COLUMN curriculum   DROP NOT NULL,
                    ALTER COLUMN features     DROP NOT NULL,
                    ALTER COLUMN outcomes     DROP NOT NULL,
                    ALTER COLUMN faq          DROP NOT NULL,
                    ALTER COLUMN coming_soon  DROP NOT NULL;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
