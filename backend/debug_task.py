import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

# Import and run your task
from core.tasks.email_monitoring import poll_contractor_emails

if __name__ == '__main__':
    print("Running task...")
    result = poll_contractor_emails()
    print(f"Result: {result}")