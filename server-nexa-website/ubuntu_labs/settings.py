"""
Django settings for ubuntu_labs project.

Single-file settings module used for both development and production.
"""

from pathlib import Path
from datetime import timedelta

import dj_database_url
from decouple import AutoConfig, Csv


BASE_DIR = Path(__file__).resolve().parent.parent
config = AutoConfig(search_path=str(BASE_DIR))


SECRET_KEY = config('SECRET_KEY', default=config('DJANGO_SECRET_KEY', default=None))
if not SECRET_KEY:
    raise RuntimeError(
        'SECRET_KEY environment variable is not set. '
        'Set SECRET_KEY (or DJANGO_SECRET_KEY) in your .env file or deployment environment.'
    )
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,localhost:8000,127.0.0.1:8000,api.nexaacademy.co.ke,api-test.nexaacademy.co.ke',
    cast=Csv(),
)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'anymail',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'accounts',
    'applications',
    'programs',
    'payments',
    'notifications',
    'newsletter',
    'analytics',
    'contacts',
    'chatbot',
    'aiassistant',
    'content',
    'appointments',
    'drf_spectacular',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'ubuntu_labs.middleware.SecurityHeadersMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

SPECTACULAR_SETTINGS = {
    'TITLE': 'Nexa Academy API',
    'DESCRIPTION': 'REST API for Nexa Academy — programs, applications, payments, accounts, and more.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

ROOT_URLCONF = 'ubuntu_labs.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ubuntu_labs.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(
        default=config(
            'DATABASE_URL',
            default='postgres://nexa:@127.0.0.1:5432/nexa_db',
        ),
        conn_max_age=config('DB_CONN_MAX_AGE', default=60, cast=int),
        conn_health_checks=True,
    )
}

# Allow test runner to use existing DB when the user lacks CREATEDB privilege.
# Override via TEST_DB_NAME env var; defaults to a dedicated test DB name.
_test_db_name = config('TEST_DB_NAME', default='')
if _test_db_name:
    DATABASES['default']['TEST'] = {'NAME': _test_db_name}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Nairobi'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.SessionAwareJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'login': '10/minute',
        'forgot_password': '5/minute',
        'two_fa': '5/minute',
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'uid',
    'USER_ID_CLAIM': 'user_id',
}


CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002,http://localhost:8000,http://127.0.0.1:8000,https://nexaacademy.co.ke,https://admissions.nexaacademy.co.ke,https://api-test.nexaacademy.co.ke',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = config('CORS_ALLOW_CREDENTIALS', default=True, cast=bool)
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000,https://nexaacademy.co.ke,https://admissions.nexaacademy.co.ke,https://api.nexaacademy.co.ke,https://api-test.nexaacademy.co.ke',
    cast=Csv(),
)

# Ensure FRONTEND_URL is always an allowed CORS origin and CSRF trusted origin.
# Guards against a production env var that overrides the defaults but omits the live URL.
# Default is empty so a missing env var never silently injects localhost into production.
FRONTEND_URL = config('FRONTEND_URL', default='').rstrip('/')
if FRONTEND_URL:
    if FRONTEND_URL not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS = [*CORS_ALLOWED_ORIGINS, FRONTEND_URL]
    if FRONTEND_URL not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS = [*CSRF_TRUSTED_ORIGINS, FRONTEND_URL]

ADMISSIONS_PORTAL_URL = config('ADMISSIONS_PORTAL_URL', default='https://admissions.nexaacademy.co.ke').rstrip('/')

EMAIL_BACKEND = 'anymail.backends.resend.EmailBackend'
ANYMAIL = {
    'RESEND_API_KEY': config('RESEND_API_KEY', default=''),
}
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='admissions@nexaacademy.co.ke')
ADMISSIONS_NOTIFICATION_EMAIL = config('ADMISSIONS_NOTIFICATION_EMAIL', default='admissions@nexaacademy.co.ke')

PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='')
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')
GOOGLE_CLIENT_ID = config('GOOGLE_CLIENT_ID', default='')

# reCAPTCHA secret key for server-side verification
RECAPTCHA_SECRET_KEY = config('RECAPTCHA_SECRET_KEY', default='')
RECAPTCHA_V3_ACTION = config('RECAPTCHA_V3_ACTION', default='application_submit')
RECAPTCHA_MIN_SCORE = config('RECAPTCHA_MIN_SCORE', default=0.5, cast=float)
RECAPTCHA_ENFORCE = config('RECAPTCHA_ENFORCE', default=not DEBUG, cast=bool)

# Gemini LLM for RAG chatbot
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
GEMINI_MODEL = config('GEMINI_MODEL', default='gemini-2.0-flash')

# Google Calendar — admissions interview scheduling
GOOGLE_SERVICE_ACCOUNT_JSON = config('GOOGLE_SERVICE_ACCOUNT_JSON', default='')
GCAL_ADMISSIONS_CALENDAR_ID = config('GCAL_ADMISSIONS_CALENDAR_ID', default='admissions@nexaacademy.co.ke')
GCAL_DELEGATE_EMAIL = config('GCAL_DELEGATE_EMAIL', default='admissions@nexaacademy.co.ke')
GCAL_SLOT_DURATION_MINUTES = config('GCAL_SLOT_DURATION_MINUTES', default=30, cast=int)
GCAL_SLOT_START_HOUR = config('GCAL_SLOT_START_HOUR', default=10, cast=int)
GCAL_SLOT_END_HOUR = config('GCAL_SLOT_END_HOUR', default=16, cast=int)
GCAL_LUNCH_START_HOUR = config('GCAL_LUNCH_START_HOUR', default=13, cast=int)
GCAL_LUNCH_END_HOUR = config('GCAL_LUNCH_END_HOUR', default=14, cast=int)
NEXA_OFFICE_LOCATION = config('NEXA_OFFICE_LOCATION', default='10th Floor, JKUAT Towers, CBD Nairobi')
ADMISSIONS_EMAIL = config('ADMISSIONS_EMAIL', default='admissions@nexaacademy.co.ke')
PORTAL_URL = config('PORTAL_URL', default='https://admissions.nexaacademy.co.ke')

# CMS integration
CMS_WEBHOOK_TOKEN = config('CMS_WEBHOOK_TOKEN', default='')

# Sanity CMS
SANITY_PROJECT_ID = config('SANITY_PROJECT_ID', default='')
SANITY_DATASET = config('SANITY_DATASET', default='production')
SANITY_WEBHOOK_SECRET = config('SANITY_WEBHOOK_SECRET', default='')
SANITY_API_TOKEN = config('SANITY_API_TOKEN', default='')

# Cloudinary — image hosting for admin uploads
CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default='')
CLOUDINARY_API_KEY = config('CLOUDINARY_API_KEY', default='')
CLOUDINARY_API_SECRET = config('CLOUDINARY_API_SECRET', default='')

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    import cloudinary
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )

# Security headers — handled by Django's SecurityMiddleware
# HSTS: tell browsers to always use HTTPS for 1 year, including subdomains
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=63072000 if not DEBUG else 0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Secure cookies — only transmitted over HTTPS
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# Force HTTP → HTTPS in production. SECURE_PROXY_SSL_HEADER lets Django detect
# HTTPS correctly when sitting behind a reverse proxy (nginx/Caddy/load balancer).
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
