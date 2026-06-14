"""
Migration 0014 — Drop NOT NULL from remaining legacy Program columns.

Migration 0013 handled description/category/instructor/instructor_email/duration.
These five columns also have NOT NULL constraints but only Python-level defaults
(not DB-level DEFAULT), so inserts fail when Django omits them.

Affected columns:
  level             VARCHAR NOT NULL (Python default='Beginner')
  current_enrolled  INTEGER NOT NULL (Python default=0)
  modules           INTEGER NOT NULL (Python default=0)
  total_lessons     INTEGER NOT NULL (Python default=0)
  offers_certificate BOOLEAN NOT NULL (Python default=True)
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0014_remove_program_programs_categor_6d4a27_idx_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE programs
                    ALTER COLUMN level              DROP NOT NULL,
                    ALTER COLUMN current_enrolled   DROP NOT NULL,
                    ALTER COLUMN modules            DROP NOT NULL,
                    ALTER COLUMN total_lessons      DROP NOT NULL,
                    ALTER COLUMN offers_certificate DROP NOT NULL;
            """,
            reverse_sql="""
                UPDATE programs SET level = 'Beginner' WHERE level IS NULL;
                UPDATE programs SET current_enrolled = 0 WHERE current_enrolled IS NULL;
                UPDATE programs SET modules = 0          WHERE modules IS NULL;
                UPDATE programs SET total_lessons = 0    WHERE total_lessons IS NULL;
                UPDATE programs SET offers_certificate = TRUE WHERE offers_certificate IS NULL;

                ALTER TABLE programs
                    ALTER COLUMN level              SET NOT NULL,
                    ALTER COLUMN current_enrolled   SET NOT NULL,
                    ALTER COLUMN modules            SET NOT NULL,
                    ALTER COLUMN total_lessons      SET NOT NULL,
                    ALTER COLUMN offers_certificate SET NOT NULL;
            """,
        ),
    ]
