from django.db import migrations

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


def seed_roles_and_permissions(apps, schema_editor):
    AppPermission = apps.get_model('accounts', 'AppPermission')
    Role = apps.get_model('accounts', 'Role')

    perm_map = {}
    for codename, name, resource, action in PERMISSIONS:
        perm, _ = AppPermission.objects.get_or_create(
            codename=codename,
            defaults={'name': name, 'resource': resource, 'action': action},
        )
        perm_map[codename] = perm

    for role_data in ROLES:
        perm_codenames = role_data.pop('permissions')
        role, _ = Role.objects.get_or_create(
            slug=role_data['slug'],
            defaults={k: v for k, v in role_data.items()},
        )
        role.permissions.set([perm_map[c] for c in perm_codenames if c in perm_map])


def reverse_seed(apps, schema_editor):
    AppPermission = apps.get_model('accounts', 'AppPermission')
    Role = apps.get_model('accounts', 'Role')
    Role.objects.filter(slug__in=[r['slug'] for r in ROLES]).delete()
    AppPermission.objects.filter(codename__in=[p[0] for p in PERMISSIONS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_apppermission_remove_user_permissions_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_roles_and_permissions, reverse_seed),
    ]
