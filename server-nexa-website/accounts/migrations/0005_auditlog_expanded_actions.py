from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_auditlog'),
    ]

    operations = [
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(
                choices=[
                    ('update_application_status', 'Updated Application Status'),
                    ('delete_application', 'Deleted Application'),
                    ('add_application_note', 'Added Application Note'),
                    ('propose_interview_times', 'Proposed Interview Times'),
                    ('schedule_interview', 'Scheduled Interview'),
                    ('reschedule_interview', 'Rescheduled Interview'),
                    ('complete_interview', 'Completed Interview'),
                    ('cancel_interview', 'Cancelled Interview'),
                    ('delete_lead_program_interest', 'Deleted Program Interest Lead'),
                    ('delete_lead_help_me', 'Deleted Help Me Lead'),
                    ('delete_lead_incomplete', 'Deleted Incomplete Lead'),
                    ('invite_staff', 'Invited Staff User'),
                    ('update_staff', 'Updated Staff User'),
                    ('remove_staff', 'Removed Staff User'),
                    ('create_role', 'Created Role'),
                    ('update_role', 'Updated Role'),
                    ('delete_role', 'Deleted Role'),
                ],
                max_length=60,
            ),
        ),
    ]
