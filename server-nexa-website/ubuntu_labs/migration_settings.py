"""
Minimal settings for running makemigrations/migrate without ML dependencies.
Includes chatbot app for migration purposes but uses test URL conf to avoid
loading chatbot URLs (which trigger rag.py imports).
"""
from ubuntu_labs.settings import *  # noqa: F401, F403

# Use in-memory SQLite so no DB credentials are needed
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Use test URL conf to avoid chatbot URL imports (which require sentence_transformers)
ROOT_URLCONF = 'ubuntu_labs.test_urls'
