"""
Email Monitoring Task - Background task that polls Gmail for new contractor emails
"""
import logging
from django.utils import timezone

from core.services.contracting_service.email_monitor_service import EmailMonitorService

logger = logging.getLogger(__name__)


def poll_contractor_emails():
    """
    Periodic task that checks for new contractor emails across all users.
    
    This task is scheduled to run every 10 seconds via Django-Q.
    It automatically:
    - Checks Gmail for new emails from contractors
    - Detects and extracts offer metadata
    - Posts AI-generated system messages to chat timelines
    - Creates pending actions for detected offers
    
    Returns:
        Dictionary with task execution statistics
    """
    start_time = timezone.now()
    
    try:
        logger.info("Starting email monitoring task...")
        
        # Initialize the email monitor service
        monitor_service = EmailMonitorService()
        
        # Check emails for all users
        stats = monitor_service.check_all_users()
        
        duration = (timezone.now() - start_time).total_seconds()
        
        logger.info(
            f"Email monitoring task completed in {duration:.2f}s. "
            f"Stats: {stats['users_checked']} users checked, "
            f"{stats['emails_found']} emails found, "
            f"{stats['emails_processed']} emails processed, "
            f"{stats['errors']} errors"
        )
        
        return {
            'success': True,
            'duration_seconds': duration,
            'stats': stats,
            'timestamp': timezone.now().isoformat()
        }
    
    except Exception as e:
        duration = (timezone.now() - start_time).total_seconds()
        logger.error(f"Email monitoring task failed after {duration:.2f}s: {str(e)}", exc_info=True)
        
        return {
            'success': False,
            'duration_seconds': duration,
            'error': str(e),
            'timestamp': timezone.now().isoformat()
        }

