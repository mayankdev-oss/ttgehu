"""
Development settings — SQLite DB, Celery ALWAYS_EAGER (no broker needed).
"""
from .base import *  # noqa: F401, F403

DEBUG = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ── Celery: run tasks synchronously in process (no Redis needed locally) ──────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"

# ── Email: console backend for local dev ──────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "exam-system@college.local"

# ── Session cookies ───────────────────────────────────────────────────────────
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False   # HTTPS not needed locally
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = False
