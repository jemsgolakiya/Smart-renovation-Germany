"""
Email Monitor Service - Automatically checks for new contractor emails
"""
import logging
from typing import Dict, List
from datetime import datetime
from django.utils import timezone
from django.contrib.auth.models import User

from core.models import (
    ContractingPlanning,
    EmailCredential,
    Contractor,
    MessageAction,
    ProcessedEmail
)
from core.services.contracting_service.gmail_service import GmailService
from core.services.contracting_service.offer_service import OfferService
from core.services.contracting_service.conversation_agent import ConversationAgent

logger = logging.getLogger(__name__)


class EmailMonitorService:
    """
    Service for monitoring contractor emails in the background.
    Automatically checks Gmail for new contractor replies and triggers workflow events.
    """
    
    def __init__(self):
        """Initialize the email monitor service."""
        self.offer_service = OfferService()
        self.conversation_agent = ConversationAgent()
    
    def check_all_users(self) -> Dict[str, int]:
        """
        Check for new emails for all users with active contracting projects.
        
        Returns:
            Dictionary with statistics (users_checked, emails_found, errors)
        """
        stats = {
            'users_checked': 0,
            'emails_found': 0,
            'emails_processed': 0,
            'errors': 0
        }
        
        # Get all users with valid email credentials
        # Query EmailCredential directly to avoid reverse relationship caching issues
        user_ids_with_credentials = EmailCredential.objects.values_list('user_id', flat=True)
        users_with_credentials = User.objects.filter(id__in=user_ids_with_credentials)
        
        for user in users_with_credentials:
            try:
                user_stats = self.check_contractor_emails_for_user(user)
                stats['users_checked'] += 1
                stats['emails_found'] += user_stats['emails_found']
                stats['emails_processed'] += user_stats['emails_processed']
            except Exception as e:
                logger.error(f"Error checking emails for user {user.id}: {str(e)}", exc_info=True)
                stats['errors'] += 1
        
        return stats
    
    def check_contractor_emails_for_user(self, user) -> Dict[str, int]:
        """
        Check for new contractor emails for a specific user.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with statistics (emails_found, emails_processed)
        """
        stats = {
            'emails_found': 0,
            'emails_processed': 0
        }
        
        # Get user's email credentials
        try:
            credential = EmailCredential.objects.get(user=user)
        except EmailCredential.DoesNotExist:
            logger.debug(f"No email credentials found for user {user.id}")
            return stats
        
        # Check if credentials are valid
        if not credential.is_valid():
            # Try to refresh token
            if credential.refresh_token:
                try:
                    token_data = GmailService.refresh_access_token(credential.refresh_token)
                    credential.access_token = token_data['access_token']
                    credential.token_expiry = token_data['token_expiry']
                    credential.save()
                    logger.info(f"Refreshed access token for user {user.id}")
                except Exception as e:
                    logger.error(f"Failed to refresh token for user {user.id}: {str(e)}")
                    return stats
            else:
                logger.warning(f"Expired credentials for user {user.id}, no refresh token available")
                return stats
        
        # Get all active contracting projects for this user
        active_plannings = ContractingPlanning.objects.filter(
            project__user=user,
            current_step__gte=4  # Step 4 is the Communicate step
        )
        
        for planning in active_plannings:
            # Get selected contractors for this project
            selected_contractor_ids = planning.selected_contractors or []
            
            if not selected_contractor_ids:
                continue
            
            contractors = Contractor.objects.filter(id__in=selected_contractor_ids)
            
            for contractor in contractors:
                if not contractor.email:
                    continue
                
                try:
                    # Search for emails from this contractor
                    new_emails = self._fetch_new_emails_from_contractor(
                        credential.access_token,
                        contractor.email,
                        planning,
                        contractor.id
                    )
                    
                    stats['emails_found'] += len(new_emails)
                    
                    # Process each new email
                    for email_data in new_emails:
                        try:
                            self.process_new_email_event(
                                email_data,
                                planning,
                                contractor.id,
                                credential.access_token,
                                user
                            )
                            stats['emails_processed'] += 1
                        except Exception as e:
                            logger.error(
                                f"Error processing email {email_data.get('message_id')} "
                                f"for contractor {contractor.id}: {str(e)}",
                                exc_info=True
                            )
                
                except Exception as e:
                    logger.error(
                        f"Error fetching emails from contractor {contractor.email}: {str(e)}",
                        exc_info=True
                    )
        
        return stats
    
    def _fetch_new_emails_from_contractor(
        self,
        access_token: str,
        contractor_email: str,
        planning: ContractingPlanning,
        contractor_id: int,
        max_results: int = 10
    ) -> List[Dict]:
        """
        Fetch new emails from a specific contractor that haven't been processed yet.
        
        Args:
            access_token: Gmail API access token
            contractor_email: Email address of the contractor
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            max_results: Maximum number of emails to fetch
            
        Returns:
            List of new email dictionaries
        """
        # Search for emails from this contractor
        message_list = GmailService.search_messages(
            access_token=access_token,
            from_email=contractor_email,
            max_results=max_results
        )
        
        if not message_list:
            return []
        
        # Get already processed email IDs
        processed_ids = self._get_processed_email_ids(planning, contractor_id)
        
        # Fetch details for new emails only
        new_emails = []
        for msg in message_list:
            message_id = msg['id']
            
            # Skip if already processed
            if message_id in processed_ids:
                continue
            
            try:
                details = GmailService.get_message_details(
                    access_token=access_token,
                    message_id=message_id
                )
                new_emails.append(details)
            except Exception as e:
                logger.warning(f"Failed to fetch details for message {message_id}: {str(e)}")
                continue
        
        # Sort by received date (most recent first)
        new_emails.sort(
            key=lambda x: x['received_at'] if x['received_at'] else datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )
        
        return new_emails
    
    def _get_processed_email_ids(
        self,
        planning: ContractingPlanning,
        contractor_id: int
    ) -> set:
        """
        Get set of already-processed Gmail message IDs for a contractor.
        Checks both ProcessedEmail table and MessageAction execution results.
        
        Args:
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            
        Returns:
            Set of processed gmail_message_ids
        """
        processed_ids = set()
        
        # 1. Check ProcessedEmail table (emails processed by monitoring service)
        processed_emails = ProcessedEmail.objects.filter(
            contracting_planning=planning,
            contractor_id=contractor_id
        ).values_list('gmail_message_id', flat=True)
        
        processed_ids.update(processed_emails)
        
        # 2. Check MessageAction table (emails manually fetched by user via fetch_email action)
        fetch_actions = MessageAction.objects.filter(
            message__contracting_planning=planning,
            message__contractor_id=contractor_id,
            action_type='fetch_email',
            action_status='executed',
            execution_result__isnull=False
        )
        
        for action in fetch_actions:
            if action.execution_result and 'emails' in action.execution_result:
                for email in action.execution_result['emails']:
                    if 'message_id' in email:
                        processed_ids.add(email['message_id'])
        
        return processed_ids
    
    def process_new_email_event(
        self,
        email_data: Dict,
        planning: ContractingPlanning,
        contractor_id: int,
        access_token: str,
        user
    ):
        """
        Process a new email event - detect offer, extract metadata, post AI message.
        
        Args:
            email_data: Email dictionary with message details
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            access_token: Gmail API access token for downloading attachments
            user: User instance
        """
        logger.info(
            f"Processing new email from contractor {contractor_id} "
            f"(message_id: {email_data.get('message_id')})"
        )
        
        # Detect and extract offer if present
        detected_offer = None
        try:
            extracted_data = self.offer_service.detect_and_extract_offer(
                emails=[email_data],
                contractor_id=contractor_id,
                access_token=access_token
            )
            
            if extracted_data:
                # Store the offer
                detected_offer = self.offer_service.store_offer(
                    extracted_data=extracted_data,
                    planning=planning
                )
                logger.info(f"Detected and stored offer {detected_offer.id} from email {email_data.get('message_id')}")
        except Exception as e:
            logger.error(f"Error detecting/storing offer: {str(e)}", exc_info=True)
        
        # Post system notification message to chat
        created_message = None
        try:
            created_message = self.conversation_agent.post_system_email_notification(
                planning=planning,
                contractor_id=contractor_id,
                email_data=email_data,
                detected_offer=detected_offer,
                user=user
            )
            logger.info(f"Posted system notification for email from contractor {contractor_id}")
        except Exception as e:
            logger.error(f"Error posting system notification: {str(e)}", exc_info=True)
            raise
        
        # Mark email as processed to prevent duplicate processing
        try:
            ProcessedEmail.objects.create(
                gmail_message_id=email_data.get('message_id'),
                contractor_id=contractor_id,
                contracting_planning=planning,
                email_subject=email_data.get('subject', '')[:500],  # Limit to 500 chars
                email_received_at=email_data.get('received_at'),
                created_offer=detected_offer,
                created_message=created_message
            )
            logger.info(f"Marked email {email_data.get('message_id')} as processed")
        except Exception as e:
            logger.error(f"Error creating ProcessedEmail record: {str(e)}", exc_info=True)
            # Don't raise - email was already processed successfully

