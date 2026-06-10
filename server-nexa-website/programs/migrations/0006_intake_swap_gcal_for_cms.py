"""
Reconcile the program_intakes table with the current model definition.

The table was previously created with a `gcal_event_id` column instead of
`cms_id`. This migration adds `cms_id` (which the model now expects) and
removes `gcal_event_id` (which was the old Google-Calendar-specific column).

Uses database_forwards/database_backwards via RunSQL with db_vendor guards
so the migration applies correctly on both PostgreSQL (production) and SQLite
(test runner), and degrades gracefully when the columns already match.
"""

from django.db import migrations, models


def add_cms_id_pg(apps, schema_editor):
    """Add cms_id on PostgreSQL using IF NOT EXISTS."""
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(
            "ALTER TABLE program_intakes "
            "ADD COLUMN IF NOT EXISTS cms_id varchar(255) NOT NULL DEFAULT '';"
        )
    else:
        # SQLite / other: check via introspection
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(program_intakes)")
            cols = [row[1] for row in cursor.fetchall()]
        if 'cms_id' not in cols:
            schema_editor.execute(
                "ALTER TABLE program_intakes ADD COLUMN cms_id varchar(255) NOT NULL DEFAULT '';"
            )


def drop_gcal_event_id(apps, schema_editor):
    """Drop gcal_event_id on PostgreSQL (SQLite doesn't support DROP COLUMN easily)."""
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(
            "ALTER TABLE program_intakes DROP COLUMN IF EXISTS gcal_event_id;"
        )
    else:
        # SQLite: column drop is only supported in SQLite ≥ 3.35.
        # In the test runner (:memory:) the table is created fresh from migration
        # 0005 which already has cms_id and no gcal_event_id, so nothing to drop.
        with schema_editor.connection.cursor() as cursor:
            try:
                cursor.execute("PRAGMA table_info(program_intakes)")
                cols = [row[1] for row in cursor.fetchall()]
                if 'gcal_event_id' in cols:
                    cursor.execute(
                        "ALTER TABLE program_intakes DROP COLUMN gcal_event_id;"
                    )
            except Exception:
                pass  # Silently skip if SQLite version is too old


def reverse_add_cms_id(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(
            "ALTER TABLE program_intakes DROP COLUMN IF EXISTS cms_id;"
        )
    else:
        try:
            schema_editor.execute("ALTER TABLE program_intakes DROP COLUMN cms_id;")
        except Exception:
            pass


def reverse_drop_gcal_event_id(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute(
            "ALTER TABLE program_intakes "
            "ADD COLUMN IF NOT EXISTS gcal_event_id varchar(255) NOT NULL DEFAULT '';"
        )
    else:
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(program_intakes)")
            cols = [row[1] for row in cursor.fetchall()]
        if 'gcal_event_id' not in cols:
            schema_editor.execute(
                "ALTER TABLE program_intakes ADD COLUMN gcal_event_id varchar(255) NOT NULL DEFAULT '';"
            )


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0005_add_program_intake'),
    ]

    operations = [
        migrations.RunPython(add_cms_id_pg, reverse_add_cms_id),
        migrations.RunPython(drop_gcal_event_id, reverse_drop_gcal_event_id),
    ]
