"""
Migration 0007 — Program CMS content fields.

Most columns (curriculum, features, outcomes, topics, slug, subtitle,
image, icon, original_price, duration_months, faq) already existed in
the live database from prior work outside Django migrations.

We use SeparateDatabaseAndState to:
  - Tell Django's migration state about all those existing columns
    without touching the database (database_operations=[]).
  - Actually add the two columns that are genuinely new:
      coming_soon  (BooleanField)
      faq          (replacing the old `program_faq` name in state)

The slug index also already exists in Postgres, so it is declared
as a state-only operation as well.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0006_intake_swap_gcal_for_cms'),
    ]

    operations = [
        # ── State-only declarations for columns already in the DB ──────────
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AddField(
                    model_name='program',
                    name='slug',
                    field=models.SlugField(blank=True, max_length=100, unique=True),
                ),
                migrations.AddField(
                    model_name='program',
                    name='subtitle',
                    field=models.CharField(blank=True, max_length=255),
                ),
                migrations.AddField(
                    model_name='program',
                    name='icon',
                    field=models.URLField(blank=True),
                ),
                migrations.AddField(
                    model_name='program',
                    name='image',
                    field=models.URLField(blank=True),
                ),
                migrations.AddField(
                    model_name='program',
                    name='original_price',
                    field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
                ),
                migrations.AddField(
                    model_name='program',
                    name='duration_months',
                    field=models.IntegerField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='program',
                    name='topics',
                    field=models.JSONField(blank=True, default=list),
                ),
                migrations.AddField(
                    model_name='program',
                    name='curriculum',
                    field=models.JSONField(blank=True, default=list),
                ),
                migrations.AddField(
                    model_name='program',
                    name='features',
                    field=models.JSONField(blank=True, default=list),
                ),
                migrations.AddField(
                    model_name='program',
                    name='outcomes',
                    field=models.JSONField(blank=True, default=list),
                ),
                migrations.AddField(
                    model_name='program',
                    name='faq',
                    field=models.JSONField(blank=True, default=list),
                ),
                migrations.AddIndex(
                    model_name='program',
                    index=models.Index(fields=['slug'], name='programs_slug_6c689f_idx'),
                ),
            ],
        ),

        # ── Real DB operation: add coming_soon (genuinely new column) ──────
        migrations.AddField(
            model_name='program',
            name='coming_soon',
            field=models.BooleanField(
                default=False,
                help_text='Hides from the application form and shows a Coming Soon badge.',
            ),
        ),
    ]
