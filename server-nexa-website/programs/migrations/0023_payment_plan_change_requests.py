from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('programs', '0022_programinterest_phone'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollment',
            name='installment_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='enrollment',
            name='payment_plan',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.CreateModel(
            name='PaymentPlanChangeRequest',
            fields=[
                ('request_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('current_payment_plan', models.CharField(blank=True, max_length=100)),
                ('current_installment_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('requested_payment_plan', models.CharField(max_length=100)),
                ('requested_installment_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('reason', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('admin_notes', models.TextField(blank=True)),
                ('approved_payment_plan', models.CharField(blank=True, max_length=100)),
                ('approved_installment_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('reviewed_by', models.CharField(blank=True, max_length=255)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('enrollment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_plan_requests', to='programs.enrollment')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_plan_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payment_plan_change_requests',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='paymentplanchangerequest',
            index=models.Index(fields=['student'], name='payment_pla_student_71bccb_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentplanchangerequest',
            index=models.Index(fields=['enrollment'], name='payment_pla_enrollm_23d44d_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentplanchangerequest',
            index=models.Index(fields=['status'], name='payment_pla_status_1bf92e_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentplanchangerequest',
            index=models.Index(fields=['-created_at'], name='payment_pla_created_8d7382_idx'),
        ),
    ]
