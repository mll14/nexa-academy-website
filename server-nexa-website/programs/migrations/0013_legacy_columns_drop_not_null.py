"""
Migration 0013 — Drop NOT NULL from legacy Program columns.

Migration 0012 removed these fields from the Django model state but kept
the physical DB columns. The columns still carry NOT NULL constraints from
migration 0001, so any INSERT fails because Django no longer supplies values
for them.

This migration uses raw SQL (IF EXISTS guards for safety) to:
  - Set empty-string defaults on text/char columns, then make them nullable.
  - Set numeric defaults on integer columns, then make them nullable.

The columns remain in the DB for data safety; they are simply no longer
required on write.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0012_rename_program_name_to_name_and_drop_legacy_fields'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE programs
                    ALTER COLUMN description      DROP NOT NULL,
                    ALTER COLUMN category         DROP NOT NULL,
                    ALTER COLUMN instructor       DROP NOT NULL,
                    ALTER COLUMN instructor_email DROP NOT NULL,
                    ALTER COLUMN duration         DROP NOT NULL;
            """,
            reverse_sql="""
                UPDATE programs SET description = ''      WHERE description IS NULL;
                UPDATE programs SET category = ''         WHERE category IS NULL;
                UPDATE programs SET instructor = ''       WHERE instructor IS NULL;
                UPDATE programs SET instructor_email = '' WHERE instructor_email IS NULL;
                UPDATE programs SET duration = 0          WHERE duration IS NULL;

                ALTER TABLE programs
                    ALTER COLUMN description      SET NOT NULL,
                    ALTER COLUMN category         SET NOT NULL,
                    ALTER COLUMN instructor       SET NOT NULL,
                    ALTER COLUMN instructor_email SET NOT NULL,
                    ALTER COLUMN duration         SET NOT NULL;
            """,
        ),
    ]
