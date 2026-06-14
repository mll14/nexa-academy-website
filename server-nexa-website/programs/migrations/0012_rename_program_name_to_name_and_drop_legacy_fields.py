"""
Migration 0012 — Rename program_name → name, remove legacy content fields.

The Program model was refactored to serve rich content from Sanity CMS.
The old DB columns are kept intact (SeparateDatabaseAndState with empty
database_operations) so no data is lost on production.

Critical DB change: rename `program_name` column to `name` so the ORM
queries match the DB schema and the /api/programs/ endpoint stops 500-ing.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0011_add_missing_db_columns'),
    ]

    operations = [
        # ── 1. Rename program_name → name (both state and DB) ─────────────
        migrations.RenameField(
            model_name='program',
            old_name='program_name',
            new_name='name',
        ),

        # ── 2. Remove the category index (category field is being dropped) ─
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveIndex(
                    model_name='program',
                    name='programs_category_idx',
                ),
            ],
            database_operations=[],
        ),

        # ── 3. Remove legacy fields from state only (DB columns kept) ──────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name='program', name='description'),
                migrations.RemoveField(model_name='program', name='category'),
                migrations.RemoveField(model_name='program', name='level'),
                migrations.RemoveField(model_name='program', name='duration'),
                migrations.RemoveField(model_name='program', name='max_students'),
                migrations.RemoveField(model_name='program', name='current_enrolled'),
                migrations.RemoveField(model_name='program', name='instructor'),
                migrations.RemoveField(model_name='program', name='instructor_email'),
                migrations.RemoveField(model_name='program', name='start_date'),
                migrations.RemoveField(model_name='program', name='end_date'),
                migrations.RemoveField(model_name='program', name='modules'),
                migrations.RemoveField(model_name='program', name='total_lessons'),
                migrations.RemoveField(model_name='program', name='thumbnail'),
                migrations.RemoveField(model_name='program', name='syllabus'),
                migrations.RemoveField(model_name='program', name='requirements'),
                migrations.RemoveField(model_name='program', name='skills'),
                migrations.RemoveField(model_name='program', name='offers_certificate'),
                migrations.RemoveField(model_name='program', name='subtitle'),
                migrations.RemoveField(model_name='program', name='icon'),
                migrations.RemoveField(model_name='program', name='image'),
                migrations.RemoveField(model_name='program', name='duration_months'),
                migrations.RemoveField(model_name='program', name='topics'),
                migrations.RemoveField(model_name='program', name='curriculum'),
                migrations.RemoveField(model_name='program', name='features'),
                migrations.RemoveField(model_name='program', name='outcomes'),
                migrations.RemoveField(model_name='program', name='faq'),
                migrations.RemoveField(model_name='program', name='coming_soon'),
                migrations.RemoveField(model_name='program', name='is_featured'),
            ],
            database_operations=[],
        ),
    ]
