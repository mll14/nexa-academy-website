from django.core.management.base import BaseCommand
from accounts.models import AppPermission, Role

PERMISSIONS = [
    ('dashboard.view',       'View Dashboard',              'dashboard',    'view'),
    ('applications.view',    'View Applications',           'applications', 'view'),
    ('applications.manage',  'Manage Applications',         'applications', 'manage'),
    ('interviews.view',      'View Interviews',             'interviews',   'view'),
    ('interviews.manage',    'Manage Interviews',           'interviews',   'manage'),
    ('appointments.view',    'View Appointments',           'appointments', 'view'),
    ('appointments.manage',  'Manage Appointments',         'appointments', 'manage'),
    ('programs.view',        'View Programs & Intakes',     'programs',     'view'),
    ('programs.manage',      'Manage Programs & Intakes',   'programs',     'manage'),
    ('students.view',        'View Enrolled Students',      'students',     'view'),
    ('students.manage',      'Manage Enrolled Students',    'students',     'manage'),
    ('transactions.view',    'View Transactions',           'transactions', 'view'),
    ('transactions.manage',  'Manage Transactions',         'transactions', 'manage'),
    ('payment_plans.view',   'View Payment Plans',          'payment_plans','view'),
    ('payment_plans.manage', 'Manage Payment Plans',        'payment_plans','manage'),
    ('leads.view',           'View Leads',                  'leads',        'view'),
    ('leads.manage',         'Manage Leads',                'leads',        'manage'),
    ('messages.view',        'View Messages',               'messages',     'view'),
    ('messages.manage',      'Manage Messages',             'messages',     'manage'),
    ('newsletter.view',      'View Newsletter',             'newsletter',   'view'),
    ('newsletter.manage',    'Manage Newsletter',           'newsletter',   'manage'),
    ('notifications.view',   'View Notifications',          'notifications','view'),
    ('users.view',           'View Staff Users',            'users',        'view'),
    ('users.manage',         'Manage Staff Users',          'users',        'manage'),
    ('roles.view',           'View Roles',                  'roles',        'view'),
    ('roles.manage',         'Manage Roles',                'roles',        'manage'),
]

ROLES = [
    {
        'name': 'Admissions Manager',
        'slug': 'admissions_manager',
        'description': 'Manages applications, interviews, and appointments.',
        'is_system': True,
        'permissions': [
            'dashboard.view',
            'applications.view', 'applications.manage',
            'interviews.view', 'interviews.manage',
            'appointments.view', 'appointments.manage',
            'students.view',
            'leads.view', 'leads.manage',
            'notifications.view',
        ],
    },
    {
        'name': 'Community Manager',
        'slug': 'community_manager',
        'description': 'Manages enrolled students, programs, messages, and newsletter.',
        'is_system': True,
        'permissions': [
            'dashboard.view',
            'students.view', 'students.manage',
            'programs.view',
            'messages.view', 'messages.manage',
            'newsletter.view', 'newsletter.manage',
            'notifications.view',
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed default AppPermissions and assign them to the default system roles. Safe to re-run.'

    def handle(self, *args, **options):
        # 1. Ensure all AppPermission objects exist
        perm_map = {}
        created_count = 0
        for codename, name, resource, action in PERMISSIONS:
            perm, created = AppPermission.objects.get_or_create(
                codename=codename,
                defaults={'name': name, 'resource': resource, 'action': action},
            )
            perm_map[codename] = perm
            if created:
                created_count += 1

        if created_count:
            self.stdout.write(self.style.SUCCESS(f'Created {created_count} new permission(s).'))
        else:
            self.stdout.write(f'All {len(PERMISSIONS)} permissions already exist.')

        # 2. Create/update default roles and assign correct permissions
        for role_data in ROLES:
            perm_codenames = role_data['permissions']
            role, role_created = Role.objects.get_or_create(
                slug=role_data['slug'],
                defaults={
                    'name': role_data['name'],
                    'description': role_data['description'],
                    'is_system': role_data['is_system'],
                },
            )
            perms_to_set = [perm_map[c] for c in perm_codenames if c in perm_map]
            role.permissions.set(perms_to_set)

            action_label = 'Created' if role_created else 'Updated'
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action_label} role '{role.name}' with {len(perms_to_set)} permission(s)."
                )
            )

        self.stdout.write(self.style.SUCCESS('Done. Run python manage.py seed_permissions any time to re-sync.'))
