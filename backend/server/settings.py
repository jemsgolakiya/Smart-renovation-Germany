# --------------------------------------------------------------------------------------------------------------
# Settings for the Django backend
# NOTE: This is just temporary settings for development. For production, we will use a more secure settings file.
# --------------------------------------------------------------------------------------------------------------

from pathlib import Path
import os
from dotenv import load_dotenv
import os
from pathlib import Path
import os

# Optionally support loading a local .env file for development (do NOT commit .env)
try:
	from dotenv import load_dotenv
	_DOTENV_AVAILABLE = True
except Exception:
	_DOTENV_AVAILABLE = False


BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env.example')
print(f"\n{'='*80}")
print("LOADING ENVIRONMENT VARIABLES")
print(f"{'='*80}")
print(f"BASE_DIR: {BASE_DIR}")
print(f".env file path: {BASE_DIR / '.env'}")
print(f".env file exists: {(BASE_DIR / '.env').exists()}")
gemini_key = os.environ.get('GEMINI_API_KEY')
if gemini_key:
	print(f"SUCCESS: GEMINI_API_KEY loaded: {gemini_key[:20]}...{gemini_key[-4:]}")
else:
	print("ERROR: GEMINI_API_KEY NOT FOUND!")
print(f"{'='*80}\n")
# If python-dotenv is installed, load environment variables from backend/.env
if _DOTENV_AVAILABLE:
	try:
		load_dotenv(str(BASE_DIR / ".env"))
	except Exception:
		# Ignore errors loading .env; environment variables may be set elsewhere
		pass
else:
	# If python-dotenv isn't installed, attempt a minimal .env parser so local
	# backend/.env files still work without adding a dependency. This will
	# populate os.environ for the running process only.
	env_path = BASE_DIR / ".env"
	try:
		if env_path.exists():
			with env_path.open() as fh:
				for raw_line in fh:
					line = raw_line.strip()
					if not line or line.startswith("#"):
						continue
					if "=" in line:
						k, v = line.split("=", 1)
						k = k.strip()
						v = v.strip().strip('"').strip("'")
						# Only set if not already in environment
						os.environ.setdefault(k, v)
	except Exception:
		pass

PDF_DIRECTORY = os.path.join(BASE_DIR, 'knowledge_base', 'pdfs')
SECRET_KEY = "dev-secret-key"

QDRANT_URL = 'https://46936dac-34c2-4404-b20c-9df508c3b44a.europe-west3-0.gcp.cloud.qdrant.io'
QDRANT_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.9qQIERr0mpAriT8M8PS86VjYgHEHY71FRbdwH73C5So'
DEBUG = True
GEMINI_API_KEY = "AIzaSyBixKKkZ7Kvk2nyQIgPSSUHp1Of5Zwm-cw"
ALLOWED_HOSTS: list[str] = ["*"]


INSTALLED_APPS = [
	"django.contrib.admin",
	"django.contrib.auth",
	"django.contrib.contenttypes",
	"django.contrib.sessions",
	"django.contrib.messages",
	"django.contrib.staticfiles",
	"rest_framework",
	"corsheaders",
	"django_q",  # django-q2 uses the same app name
	"core",
]

MIDDLEWARE = [
	"corsheaders.middleware.CorsMiddleware",
	"django.middleware.security.SecurityMiddleware",
	"django.contrib.sessions.middleware.SessionMiddleware",
	"django.middleware.common.CommonMiddleware",
	"django.middleware.csrf.CsrfViewMiddleware",
	"django.contrib.auth.middleware.AuthenticationMiddleware",
	"django.contrib.messages.middleware.MessageMiddleware",
	"django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "server.urls"

TEMPLATES = [
	{
		"BACKEND": "django.template.backends.django.DjangoTemplates",
		"DIRS": [BASE_DIR / "templates"],
		"APP_DIRS": True,
		"OPTIONS": {
			"context_processors": [
				"django.template.context_processors.debug",
				"django.template.context_processors.request",
				"django.contrib.auth.context_processors.auth",
				"django.contrib.messages.context_processors.messages",
			],
		},
	}
]

WSGI_APPLICATION = "server.wsgi.application"
ASGI_APPLICATION = "server.asgi.application"

DATABASES = {
	"default": {
		"ENGINE": "django.db.backends.sqlite3",
		"NAME": BASE_DIR / "db.sqlite3",
	}
}

AUTH_PASSWORD_VALIDATORS: list[dict] = []

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS configuration
# For development, we'll use CORS_ALLOW_ALL_ORIGINS = True
# This is simpler and works reliably in development
# In production, set this to False and use CORS_ALLOWED_ORIGINS with specific origins
CORS_ALLOW_ALL_ORIGINS = True

# CSRF trusted origins - required for CSRF protection when using CORS
# Add the frontend origin here to allow CSRF-protected requests
CSRF_TRUSTED_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
]

# Allow credentials if needed (required for session cookies)
CORS_ALLOW_CREDENTIALS = True

# Allow common HTTP methods
CORS_ALLOW_METHODS = [
	"DELETE",
	"GET",
	"OPTIONS",
	"PATCH",
	"POST",
	"PUT",
]

# Allow common headers
CORS_ALLOW_HEADERS = [
	"accept",
	"accept-encoding",
	"authorization",
	"content-type",
	"dnt",
	"origin",
	"user-agent",
	"x-csrftoken",
	"x-requested-with",
]

REST_FRAMEWORK = {
	"DEFAULT_AUTHENTICATION_CLASSES": [
		"rest_framework.authentication.SessionAuthentication",
	],
	"DEFAULT_PERMISSION_CLASSES": [
		"rest_framework.permissions.IsAuthenticatedOrReadOnly",
	],
	"EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
	"FORMAT_SUFFIX_KWARG": "format",
}

# Google Gemini API Configuration
# The API key must be set via environment variable GOOGLE_API_KEY.
# Do NOT hardcode secrets in source control. For local development you can
# create a backend/.env file (gitignored) with GOOGLE_API_KEY=your_key_here.
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", GOOGLE_API_KEY)

# Hunter.io API Key for email discovery
# Get your API key from https://hunter.io/
HUNTER_API_KEY = os.getenv("HUNTER_API_KEY")

# Google Places API (New) v1 Configuration
# For contractor discovery using Google Places API
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
GOOGLE_PLACES_API_V1_ENDPOINT = "https://places.googleapis.com/v1"

# Gmail API Configuration for OAuth and Email Sending
# Get these credentials from Google Cloud Console
GMAIL_API_CLIENT_ID = os.getenv("GMAIL_API_CLIENT_ID", "")
GMAIL_API_CLIENT_SECRET = os.getenv("GMAIL_API_CLIENT_SECRET", "")
GMAIL_OAUTH_REDIRECT_URI = os.getenv(
	"GMAIL_OAUTH_REDIRECT_URI",
	"http://localhost:3000/gmail/callback"
)
GMAIL_OAUTH_SCOPES = ["https://www.googleapis.com/auth/gmail.send",
                      "https://www.googleapis.com/auth/gmail.readonly",
                      "https://www.googleapis.com/auth/userinfo.email",
                      "openid",
                      "https://www.googleapis.com/auth/gmail.modify"]

# Media files configuration for file uploads
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Django-Q Configuration for Background Tasks
Q_CLUSTER = {
	'name': 'RenovAlte',
	'workers': 1,
	'timeout': 300,
	'retry': 360,
	'queue_limit': 50,
	'save_limit': 250,
	'orm': 'default',
	'schedule': [
		{
			'func': 'core.tasks.email_monitoring.poll_contractor_emails',
			'schedule_type': 'I',  # Interval
			'seconds': 10,
			'repeats': -1,  # Run indefinitely
		}
	]
}


