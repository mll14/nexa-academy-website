"""
The interview_slots table has two columns (student_gmail, extra_guests) that were
added by a previous migration but are missing from the Django model. They have
NOT NULL constraints with no default, so any InterviewSlot.objects.create() /
get_or_create() call raises an IntegrityError → 500 on confirm_interview.

This migration:
  1. Adds defaults to those columns so Django INSERTs no longer fail.
  2. Registers the fields in Django's migration state so future migrations
     don't re-create them.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('applications', '0012_interviewslot_add_confirmed_at'),
    ]

    operations = [
        # ── Fix NOT NULL columns that already exist in the DB ─────────────────
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='interview_slots' AND column_name='student_gmail'
                            ) THEN
                                ALTER TABLE interview_slots ADD COLUMN student_gmail VARCHAR(255) NOT NULL DEFAULT '';
                            ELSE
                                ALTER TABLE interview_slots ALTER COLUMN student_gmail SET DEFAULT '';
                            END IF;
                        END $$;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM information_schema.columns
                                WHERE table_name='interview_slots' AND column_name='extra_guests'
                            ) THEN
                                ALTER TABLE interview_slots ADD COLUMN extra_guests JSONB NOT NULL DEFAULT '[]';
                            ELSE
                                ALTER TABLE interview_slots ALTER COLUMN extra_guests SET DEFAULT '[]'::jsonb;
                            END IF;
                        END $$;
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='interviewslot',
                    name='student_gmail',
                    field=models.CharField(blank=True, default='', max_length=255),
                ),
                migrations.AddField(
                    model_name='interviewslot',
                    name='extra_guests',
                    field=models.JSONField(blank=True, default=list),
                ),
            ],
        ),
    ]
