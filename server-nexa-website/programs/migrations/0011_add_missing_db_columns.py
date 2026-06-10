"""
Migration 0011 — Add columns that migrations 0007 and 0010 declared as
state-only (SeparateDatabaseAndState with database_operations=[]).

Those migrations assumed the columns already existed in the original
production DB from prior manual SQL work.  On a fresh deployment (Docker /
Coolify) those columns are never actually created, so running `migrate`
has no effect and the app errors with "column does not exist".

This migration physically adds every missing column, populates slugs for
any existing rows, then adds the UNIQUE constraint on slug.
"""

from django.db import migrations
from django.utils.text import slugify as django_slugify


def populate_slugs(apps, schema_editor):
    db = schema_editor.connection.alias
    Program = apps.get_model('programs', 'Program')
    seen = set()
    for program in Program.objects.using(db).filter(slug='').order_by('created_at'):
        base = django_slugify(program.program_name) or f'program-{str(program.program_id)[:8]}'
        slug = base
        n = 1
        while slug in seen or Program.objects.using(db).filter(slug=slug).exclude(pk=program.pk).exists():
            slug = f'{base}-{n}'
            n += 1
        seen.add(slug)
        Program.objects.using(db).filter(pk=program.pk).update(slug=slug)


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0010_program_is_featured_alter_program_description_and_more'),
    ]

    operations = [
        # Step 1: add all missing columns.
        # state_operations=[] because Django's migration state already knows
        # about these fields from migrations 0007 and 0010.
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE programs
                            ADD COLUMN IF NOT EXISTS slug            VARCHAR(100)  NOT NULL DEFAULT '',
                            ADD COLUMN IF NOT EXISTS subtitle        VARCHAR(255)  NOT NULL DEFAULT '',
                            ADD COLUMN IF NOT EXISTS icon            VARCHAR(200)  NOT NULL DEFAULT '',
                            ADD COLUMN IF NOT EXISTS image           VARCHAR(200)  NOT NULL DEFAULT '',
                            ADD COLUMN IF NOT EXISTS original_price  NUMERIC(10,2) NULL,
                            ADD COLUMN IF NOT EXISTS duration_months INTEGER       NULL,
                            ADD COLUMN IF NOT EXISTS topics          JSONB         NOT NULL DEFAULT '[]',
                            ADD COLUMN IF NOT EXISTS curriculum      JSONB         NOT NULL DEFAULT '[]',
                            ADD COLUMN IF NOT EXISTS features        JSONB         NOT NULL DEFAULT '[]',
                            ADD COLUMN IF NOT EXISTS outcomes        JSONB         NOT NULL DEFAULT '[]',
                            ADD COLUMN IF NOT EXISTS faq             JSONB         NOT NULL DEFAULT '[]',
                            ADD COLUMN IF NOT EXISTS is_featured     BOOLEAN       NOT NULL DEFAULT FALSE;
                    """,
                    reverse_sql="""
                        ALTER TABLE programs
                            DROP COLUMN IF EXISTS slug,
                            DROP COLUMN IF EXISTS subtitle,
                            DROP COLUMN IF EXISTS icon,
                            DROP COLUMN IF EXISTS image,
                            DROP COLUMN IF EXISTS original_price,
                            DROP COLUMN IF EXISTS duration_months,
                            DROP COLUMN IF EXISTS topics,
                            DROP COLUMN IF EXISTS curriculum,
                            DROP COLUMN IF EXISTS features,
                            DROP COLUMN IF EXISTS outcomes,
                            DROP COLUMN IF EXISTS faq,
                            DROP COLUMN IF EXISTS is_featured;
                    """,
                ),
            ],
        ),

        # Step 2: generate unique slugs for any existing programs.
        migrations.RunPython(populate_slugs, migrations.RunPython.noop),

        # Step 3: add the UNIQUE constraint on slug now that all values are populated.
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint
                                WHERE conname = 'programs_slug_unique'
                                  AND conrelid = 'programs'::regclass
                            ) THEN
                                ALTER TABLE programs
                                    ADD CONSTRAINT programs_slug_unique UNIQUE (slug);
                            END IF;
                        END
                        $$;
                    """,
                    reverse_sql="ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_slug_unique;",
                ),
            ],
        ),
    ]
