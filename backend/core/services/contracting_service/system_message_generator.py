"""
System Message Generator - Generates natural language system notifications
"""
import os
import json
import logging
from typing import Dict, List, Optional
from django.conf import settings

from core.models import Contractor, ContractorOffer
from core.services.gemini_service.gemini_service import get_gemini_service
import google.generativeai as genai

logger = logging.getLogger(__name__)


class SystemMessageGenerator:
    """
    Generates natural, concise system notification messages about contractor emails.
    Uses Gemini AI to create human-friendly notifications.
    """
    
    def __init__(self):
        """Initialize the system message generator with Gemini service."""
        self.gemini_service = get_gemini_service()
    
    def _load_prompt_template(self) -> str:
        """Load the email notification prompt template."""
        prompt_path = os.path.join(
            settings.BASE_DIR,
            'core',
            'services',
            'gemini_service',
            'prompts',
            'contracting',
            'email_notification_prompt.md'
        )
        
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template not found at {prompt_path}")
            raise
    
    def generate_email_notification(
        self,
        email_data: Dict,
        contractor: Contractor,
        detected_offer: Optional[ContractorOffer] = None
    ) -> Dict[str, any]:
        """
        Generate a natural language notification message about a new contractor email.
        
        Args:
            email_data: Dictionary with email details (subject, body, etc.)
            contractor: Contractor instance
            detected_offer: Optional ContractorOffer if an offer was detected
            
        Returns:
            Dictionary with 'message' and 'suggested_actions'
        """
        try:
            # Load prompt template
            template = self._load_prompt_template()
            
            # Determine offer type
            offer_detected = detected_offer is not None
            
            # Build context for prompt
            context = {
                'contractor_name': contractor.name,
                'email_subject': email_data.get('subject', 'No subject'),
                'email_body': email_data.get('body', ''),
                'offer_detected': 'yes' if offer_detected else 'no',
            }
            
            # Add offer details if available
            if offer_detected and detected_offer:
                context['offer_price'] = f"€{detected_offer.total_price:,.0f}" if detected_offer.total_price else "Not specified"
                context['offer_timeline'] = f"{detected_offer.timeline_duration_days} days" if detected_offer.timeline_duration_days else "Not specified"
            else:
                context['offer_price'] = "N/A"
                context['offer_timeline'] = "N/A"
            
            # Replace placeholders in template
            prompt = template
            for key, value in context.items():
                placeholder = "{" + key + "}"
                prompt = prompt.replace(placeholder, str(value))
            
            # Call Gemini to generate natural message
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(prompt)
            
            if response.text:
                # Parse JSON response
                response_text = response.text.strip()
                
                # Remove markdown code blocks if present
                if response_text.startswith('```'):
                    lines = response_text.split('\n')
                    if len(lines) > 2:
                        response_text = '\n'.join(lines[1:-1])
                        if response_text.startswith('json'):
                            response_text = response_text[4:].strip()
                
                try:
                    result = json.loads(response_text)
                    return {
                        'message': result.get('message', 'Error occurred'),
                        'suggested_actions': result.get('suggested_actions', self._generate_default_actions(offer_detected))
                    }
                except json.JSONDecodeError:
                    logger.warning("Failed to parse Gemini response as JSON, using fallback")
                    return {
                        'message': 'Error occurred',
                        'suggested_actions': self._generate_default_actions(offer_detected)
                    }
            else:
                return {
                    'message': 'Error occurred',
                    'suggested_actions': self._generate_default_actions(offer_detected)
                }
        
        except Exception as e:
            logger.error(f"Error generating email notification: {str(e)}", exc_info=True)
            # Return fallback message
            return {
                'message': f"I've received a new email from {contractor.name}.",
                'suggested_actions': self._generate_default_actions(detected_offer is not None)
            }
    
    def _generate_default_actions(self, offer_detected: bool) -> List[str]:
        """
        Generate default suggested actions based on context.
        
        Args:
            offer_detected: Whether an offer was detected in the email
            
        Returns:
            List of suggested action strings
        """
        if offer_detected:
            return [
                "Analyze this offer",
                "Compare all offers",
                "Ask about pricing",
                "View offer details"
            ]
        else:
            return [
                "Read the email",
                "Reply to them",
                "Ask follow-up questions",
                "Check for more emails"
            ]

