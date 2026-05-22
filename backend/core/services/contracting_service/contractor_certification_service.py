"""
Batch Contractor Enrichment Service
Analyzes contractors' certifications and finds email addresses using Hunter.io
"""

import logging
import json
import os
import requests
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)


class ContractorCertificationService:
    """Batch enrichment of contractor certifications and email discovery using Hunter.io"""
    
    def __init__(self):
        # Initialize Gemini for certification analysis
        api_key = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Initialize Hunter.io
        self.hunter_api_key = os.getenv('HUNTER_API_KEY') or getattr(settings, 'HUNTER_API_KEY', None)
        if not self.hunter_api_key:
            logger.warning("HUNTER_API_KEY not configured - email discovery will be skipped")
        
        self.hunter_base_url = "https://api.hunter.io/v2"
    
    def _find_emails_with_hunter(self, contractor: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
        """
        Find ALL email addresses using Hunter.io API
        
        Args:
            contractor: Contractor dict with website, name, etc.
            
        Returns:
            List of email dicts with value, type, confidence or None if not found
        """
        if not self.hunter_api_key:
            return None
        
        website = contractor.get('website', '')
        if not website:
            return None
        
        # Extract domain from website URL
        try:
            parsed_url = urlparse(website)
            domain = parsed_url.netloc or parsed_url.path
            domain = domain.replace('www.', '')
            
            if not domain or '.' not in domain:
                return None
            
            logger.debug(f"🔍 Searching for emails at domain: {domain}")
            
            # Call Hunter.io Domain Search API
            url = f"{self.hunter_base_url}/domain-search"
            params = {
                'domain': domain,
                'api_key': self.hunter_api_key,
                'limit': 10  # Get up to 10 emails for Gemini to analyze
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('data', {}).get('emails'):
                    emails = data['data']['emails']
                    logger.info(f"📧 Found {len(emails)} emails for {contractor.get('name')} at {domain}")
                    return emails
                
                logger.debug(f"No emails found for domain: {domain}")
                return None
            
            elif response.status_code == 429:
                logger.warning(f"Hunter.io rate limit exceeded")
                return None
            else:
                logger.warning(f"Hunter.io API error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error finding emails with Hunter.io: {e}")
            return None
    
    def enrich_contractors_batch(self, contractors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Analyze certifications AND find email addresses for multiple contractors
        
        Args:
            contractors: List of contractor dicts with 'name', 'website', 'phone', etc.
            
        Returns:
            List of contractors enriched with certification data AND email addresses
        """
        if not contractors:
            return contractors
        
        # Step 1: Find email lists using Hunter.io (one by one) - Skip if no API key
        if self.hunter_api_key:
            logger.info(f"🔍 Finding emails for {len(contractors)} contractors using Hunter.io...")
            for contractor in contractors:
                emails_list = self._find_emails_with_hunter(contractor)
                if emails_list:
                    contractor['_hunter_emails'] = emails_list
            
            contractors_with_emails = sum(1 for c in contractors if c.get('_hunter_emails'))
            logger.info(f"📧 Found emails for {contractors_with_emails}/{len(contractors)} contractors via Hunter.io")
        else:
            logger.info(f"⏭️ Skipping Hunter.io email search (API key not configured)")
            contractors_with_emails = 0
        
        # Step 2: Batch analyze certifications AND select best emails with Gemini
        prompt = self._build_enrichment_prompt(contractors)
        
        try:
            logger.info(f"🤖 Analyzing certifications and selecting best emails for {len(contractors)} contractors...")
            response = self.model.generate_content(
                prompt,
                generation_config={'temperature': 0.1}
            )
            response_text = response.text
            
            # Parse batch response (includes email selection)
            enrichments = self._parse_batch_response(response_text, contractors)
            
            # Merge certifications AND selected emails
            enriched = self._merge_enrichments(contractors, enrichments)
            
            # Log email statistics (but don't filter)
            contractors_with_emails = sum(1 for c in enriched if c.get('email'))
            contractors_without_emails = len(enriched) - contractors_with_emails
            
            if contractors_without_emails > 0:
                logger.info(f"ℹ️ {contractors_without_emails} contractors without email addresses (still included)")
            
            logger.info(f"✅ Enriched {len(enriched)} contractors (📧 {contractors_with_emails} with emails, 🏆 {len(enrichments)} certifications)")
            return enriched
            
        except Exception as e:
            logger.error(f"Failed to enrich contractors: {e}")
            # Return contractors with default enrichments
            return self._add_default_enrichments(contractors)
    
    def _build_enrichment_prompt(self, contractors: List[Dict[str, Any]]) -> str:
        """Build a prompt for analyzing certifications AND selecting best email from Hunter.io results"""
        
        # Build contractor list for prompt
        contractor_list = []
        for i, contractor in enumerate(contractors, 1):
            # Format email options from Hunter.io
            email_options = "None found"
            if '_hunter_emails' in contractor:
                emails = contractor['_hunter_emails']
                email_lines = []
                for email_obj in emails[:10]:  # Max 10 emails
                    email_val = email_obj.get('value', '')
                    email_type = email_obj.get('type', 'unknown')
                    confidence = email_obj.get('confidence', 0)
                    position = email_obj.get('position', 'unknown')
                    first_name = email_obj.get('first_name', '')
                    last_name = email_obj.get('last_name', '')
                    
                    name_info = f"{first_name} {last_name}".strip() if first_name or last_name else ""
                    email_lines.append(
                        f"     • {email_val} (type: {email_type}, confidence: {confidence}%, "
                        f"position: {position}, name: {name_info or 'N/A'})"
                    )
                email_options = "\n".join(email_lines)
            
            contractor_info = f"""
{i}. {contractor.get('name', 'Unknown')}
   - Website: {contractor.get('website', 'N/A')}
   - Phone: {contractor.get('phone', 'N/A')}
   - City: {contractor.get('city', 'N/A')}
   - Services: {contractor.get('services', 'N/A')}
   - Description: {contractor.get('description', 'N/A')}
   - Available Email Options (from Hunter.io):
{email_options}
"""
            contractor_list.append(contractor_info)
        
        contractors_text = "\n".join(contractor_list)
        
        prompt = f"""You are analyzing German contractors for professional certifications AND selecting the best official business email.

GERMAN CERTIFICATION REFERENCE:
- HWK (Handwerkskammer): Chamber of Crafts membership - indicates registered trade business
- Meisterbetrieb: Master craftsman business (Meister qualification)
- KfW-Zertifizierung: KfW efficiency expert certification (e.g., "KfW-Effizienzexperte", "KfW-zugelassen")
- Betriebshaftpflicht: Liability insurance
- IHK: Chamber of Commerce registration

CONTRACTORS TO ANALYZE:
{contractors_text}

TASK:
For EACH contractor:

1. **EMAIL SELECTION**: Choose the BEST email from the Hunter.io options based on:
   - PRIORITY 1: Generic business emails (info@, kontakt@, office@, verwaltung@, anfrage@)
   - PRIORITY 2: Management/Owner emails if clearly identified (geschäftsführer, inhaber)
   - PRIORITY 3: Higher confidence scores (90%+ is best)
   - AVOID: Personal employee emails unless they're clearly management
   - AVOID: Sales/marketing emails if generic business email exists
   - If NO emails available, set to null

2. **CERTIFICATION ANALYSIS**: Analyze available information (especially website URLs, phone numbers, descriptions) 
   and make educated inferences about certifications.

3. **DESCRIPTION GENERATION**: Create a SHORT, professional description (max 100 chars) about what the contractor does.
   - Based on their name, services, and available info
   - Be specific and informative
   - Focus on their core services and specialties
   - Example: "Full-service plumbing and heating contractor"
   - Example: "Electrical installations for homes and businesses"

INFERENCE RULES (Certifications):
1. Website domains (e.g., .hwk.de, mentions of "Meister", "KfW") are strong indicators
2. Professional descriptions mentioning certifications
3. German area codes can indicate HWK chamber region
4. Established businesses are more likely to have insurance
5. If minimal info available, set confidence to "low" and certifications to null

EMAIL SELECTION EXAMPLES:
- If options include "info@domain.de" (generic, 95%) and "j.mueller@domain.de" (personal, 90%) 
  → Choose "info@domain.de" (generic business email is preferred)
- If options include "verkauf@domain.de" (sales, 85%) and "kontakt@domain.de" (generic, 80%)
  → Choose "kontakt@domain.de" (general contact is better than sales)
- If only "ceo@domain.de" (management, 90%) available
  → Choose it (management is acceptable if no generic available)

REQUIRED JSON FORMAT (MUST BE VALID JSON):
[
  {{
    "contractor_index": 1,
    "name": "Contractor Name",
    "selected_email": "info@domain.de or null",
    "email_reasoning": "Why this email was selected (max 80 chars)",
    "email_confidence": "high/medium/low/none",
    "ai_description": "Short description of what they do (max 100 chars)",
    "hwk_listed": true/false/null,
    "hwk_chamber": "chamber name if inferable, else null",
    "insurance_stated": true/false/null,
    "meisterbetrieb": true/false/null,
    "kfw_certified": true/false/null,
    "confidence": "high/medium/low",
    "reasoning": "Brief certification explanation (max 100 chars)"
  }},
  ...
]

IMPORTANT: 
- Return ONLY valid JSON array, no markdown formatting
- Use null for unknown values
- Be conservative with certifications: only set true/false if there's reasonable evidence
- Be thoughtful with email selection: prioritize official business contacts
- Keep reasoning under specified character limits
- Analyze all {len(contractors)} contractors"""

        return prompt
    
    def _parse_batch_response(self, response_text: str, contractors: List[Dict]) -> List[Dict]:
        """Parse Gemini's batch JSON response"""
        try:
            # Clean response (remove markdown code blocks if present)
            cleaned = response_text.strip()
            if cleaned.startswith('```'):
                # Remove markdown code blocks
                lines = cleaned.split('\n')
                cleaned = '\n'.join(line for line in lines if not line.strip().startswith('```'))
            
            # Find JSON array
            json_start = cleaned.find('[')
            json_end = cleaned.rfind(']') + 1
            
            if json_start == -1 or json_end == 0:
                logger.warning("No JSON array found in response")
                return []
            
            json_str = cleaned[json_start:json_end]
            certifications = json.loads(json_str)
            
            return certifications
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Response text: {response_text[:500]}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error parsing response: {e}")
            return []
    
    def _merge_enrichments(self, contractors: List[Dict], enrichments: List[Dict]) -> List[Dict]:
        """Merge certification data AND Gemini-selected emails back into contractor objects"""
        enriched = []
        
        for i, contractor in enumerate(contractors):
            enriched_contractor = contractor.copy()
            
            # Find matching enrichment by index
            matching_enrichment = None
            for enrichment in enrichments:
                if enrichment.get('contractor_index') == i + 1:
                    matching_enrichment = enrichment
                    break
            
            if matching_enrichment:
                # Use Gemini's selected email
                selected_email = matching_enrichment.get('selected_email')
                if selected_email and selected_email != 'null':
                    enriched_contractor['email'] = selected_email
                    logger.info(f"📧 Selected email for {contractor.get('name')}: {selected_email}")
                
                # Add AI-generated description
                ai_description = matching_enrichment.get('ai_description')
                if ai_description and ai_description != 'null':
                    enriched_contractor['ai_description'] = ai_description
                
                # Add certification signals with email metadata
                enriched_contractor['signals'] = {
                    'insurance_stated': matching_enrichment.get('insurance_stated'),
                    'hwk_listed': matching_enrichment.get('hwk_listed'),
                    'kfw_certified': matching_enrichment.get('kfw_certified'),
                    'meisterbetrieb': matching_enrichment.get('meisterbetrieb'),
                    'hwk_chamber': matching_enrichment.get('hwk_chamber'),
                    'confidence': matching_enrichment.get('confidence', 'low'),
                    'certification_reasoning': matching_enrichment.get('reasoning', ''),
                    'email_confidence': matching_enrichment.get('email_confidence', 'none'),
                    'email_source': 'hunter.io + gemini selection',
                    'email_reasoning': matching_enrichment.get('email_reasoning', 'Not available'),
                    'altbau_experience': None,  # Cannot infer from this data
                    'denkmal_experience': None,  # Cannot infer from this data
                    'languages': ['German']
                }
            else:
                # Default signals
                enriched_contractor['signals'] = self._default_signals()
            
            # Clean up temporary Hunter.io data
            if '_hunter_emails' in enriched_contractor:
                del enriched_contractor['_hunter_emails']
            
            enriched.append(enriched_contractor)
        
        return enriched
    
    def _add_default_enrichments(self, contractors: List[Dict]) -> List[Dict]:
        """Add default enrichment values when enrichment fails"""
        enriched = []
        for contractor in contractors:
            enriched_contractor = contractor.copy()
            enriched_contractor['signals'] = self._default_signals()
            # Keep original email if any
            if not enriched_contractor.get('email'):
                enriched_contractor['email'] = ''
            enriched.append(enriched_contractor)
        return enriched
    
    def _default_signals(self) -> Dict:
        """Default signals when no enrichment possible"""
        return {
            'insurance_stated': None,
            'hwk_listed': None,
            'kfw_certified': None,
            'meisterbetrieb': None,
            'hwk_chamber': None,
            'confidence': 'low',
            'certification_reasoning': 'Insufficient data for verification',
            'email_confidence': 'none',
            'email_source': 'not searched',
            'email_reasoning': 'No email data available',
            'altbau_experience': None,
            'denkmal_experience': None,
            'languages': ['German']
        }
