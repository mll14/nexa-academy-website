"""
Minimal settings for running unit tests without external ML dependencies.
Excludes chatbot (requires sentence_transformers / chromadb).
"""
from ubuntu_labs.settings import *  # noqa: F401, F403

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
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
    'aiassistant',
    'drf_spectacular',
    # 'chatbot' excluded — requires sentence_transformers / chromadb
]

# Use SQLite so no special DB permissions are needed in CI / local tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Suppress chatbot URL registration errors by providing a stub ROOT_URLCONF
# We override ROOT_URLCONF to use a test-only url conf
ROOT_URLCONF = 'ubuntu_labs.test_urls'
