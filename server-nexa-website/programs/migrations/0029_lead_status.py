from django.db import migrations, models


def backfill_lead_status(apps, schema_editor):
    for model_name in ('ProgramInterest', 'HelpMeLead', 'IncompleteApplication'):
        model = apps.get_model('programs', model_name)
        model.objects.filter(follow_up_completed=True).update(lead_status='completed')
        model.objects.filter(follow_up_completed=False).update(lead_status='new')


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0028_backfill_enrollment_payment_plan'),
    ]

    operations = [
        migrations.AddField(
            model_name='helpmelead',
            name='lead_status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('contacted', 'Contacted'),
                    ('not_reached', 'Not Reached'),
                    ('completed', 'Completed'),
                ],
                default='new',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='incompleteapplication',
            name='lead_status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('contacted', 'Contacted'),
                    ('not_reached', 'Not Reached'),
                    ('completed', 'Completed'),
                ],
                default='new',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='programinterest',
            name='lead_status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('contacted', 'Contacted'),
                    ('not_reached', 'Not Reached'),
                    ('completed', 'Completed'),
                ],
                default='new',
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_lead_status, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name='helpmelead',
            index=models.Index(fields=['lead_status'], name='help_me_lea_lead_st_2b8f58_idx'),
        ),
        migrations.AddIndex(
            model_name='incompleteapplication',
            index=models.Index(fields=['lead_status'], name='incomplete__lead_st_6c1426_idx'),
        ),
        migrations.AddIndex(
            model_name='programinterest',
            index=models.Index(fields=['lead_status'], name='program_int_lead_st_6b14cb_idx'),
        ),
    ]
