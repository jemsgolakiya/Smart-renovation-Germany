"""
Offer Service - Handles offer extraction, analysis, and comparison
"""
import os
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from google.protobuf.json_format import MessageToDict

from core.models import (
    ContractorOffer,
    OfferAnalysis,
    ContractingPlanning,
    Contractor
)
from core.services.gemini_service.gemini_service import get_gemini_service
from core.services.contracting_service.gmail_service import GmailService
import google.generativeai as genai

logger = logging.getLogger(__name__)


def convert_to_serializable(obj: Any) -> Any:
    """
    Convert protobuf and non-JSON-serializable objects to native Python types.

    Args:
        obj: Object to convert

    Returns:
        JSON-serializable Python object
    """
    from datetime import datetime, date
    
    # Handle datetime objects
    if isinstance(obj, datetime):
        return obj.isoformat()
    
    # Handle date objects
    if isinstance(obj, date):
        return obj.isoformat()
    
    # Handle protobuf repeated fields (RepeatedComposite, RepeatedScalar)
    if hasattr(obj, '__class__') and 'Repeated' in obj.__class__.__name__:
        return [convert_to_serializable(item) for item in obj]

    # Handle protobuf messages
    if hasattr(obj, 'DESCRIPTOR'):
        return MessageToDict(obj, preserving_proto_field_name=True)

    # Handle dictionaries
    if isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}

    # Handle lists
    if isinstance(obj, (list, tuple)):
        return [convert_to_serializable(item) for item in obj]

    # Handle other types (str, int, float, bool, None)
    return obj


class OfferService:
    """
    Service for extracting, analyzing, and comparing contractor offers.
    Designed to be RAG-ready for future integration with vector databases.
    """
    
    def __init__(self):
        """Initialize the offer service with Gemini."""
        self.gemini_service = get_gemini_service()
        self.rag_enabled = False  # Feature flag for RAG pipeline
    
    def detect_and_extract_offer(
        self,
        emails: List[Dict],
        contractor_id: int,
        access_token: str
    ) -> Optional[Dict]:
        """
        Detect if emails contain an offer and extract structured data.
        
        Args:
            emails: List of email dictionaries with message data
            contractor_id: ID of the contractor
            access_token: Gmail API access token for downloading attachments
            
        Returns:
            Dictionary with extracted offer data, or None if no offer detected
        """
        if not emails:
            return None
        
        try:
            # Analyze the most recent email first
            most_recent_email = emails[0]
            
            # Check if there's a PDF attachment (likely an offer)
            pdf_attachment = None
            if most_recent_email.get('attachments'):
                for att in most_recent_email['attachments']:
                    if att.get('mimeType') == 'application/pdf':
                        pdf_attachment = att
                        break
            
            # Load the offer detection prompt
            detection_prompt = self._load_prompt('offer_extraction_prompt.md')
            
            # Build detection context
            email_content = most_recent_email.get('body', '')
            email_subject = most_recent_email.get('subject', '')
            
            context = f"""
Email Subject: {email_subject}
Email Body:
{email_content[:2000]}  # Limit to first 2000 chars
"""
            
            # Prepare content for Gemini
            content_parts = [detection_prompt.replace('{email_content}', context)]
            
            # If PDF attachment exists, upload it to Gemini for analysis
            if pdf_attachment:
                try:
                    # Download the PDF attachment
                    pdf_data = GmailService.download_attachment(
                        access_token=access_token,
                        message_id=most_recent_email['message_id'],
                        attachment_id=pdf_attachment['attachmentId']
                    )
                    
                    # Save temporarily and upload to Gemini
                    import tempfile
                    with tempfile.NamedTemporaryFile(
                        delete=False,
                        suffix='.pdf',
                        mode='wb'
                    ) as tmp_file:
                        tmp_file.write(pdf_data)
                        tmp_path = tmp_file.name
                    
                    # Upload to Gemini
                    uploaded_file = genai.upload_file(
                        path=tmp_path,
                        display_name=pdf_attachment.get('filename', 'offer.pdf')
                    )
                    content_parts.append(uploaded_file)
                    
                    # Clean up temp file
                    os.unlink(tmp_path)
                    
                    logger.info(f"Uploaded PDF attachment for offer analysis: {pdf_attachment.get('filename')}")
                except Exception as e:
                    logger.error(f"Error processing PDF attachment: {str(e)}")
            
            # Call Gemini to detect and extract offer
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(content_parts)
            
            if response.text:
                # Parse the JSON response
                response_text = response.text.strip()
                
                # Remove markdown code blocks if present
                if response_text.startswith('```'):
                    lines = response_text.split('\n')
                    if len(lines) > 2:
                        # Remove first and last lines (``` markers)
                        response_text = '\n'.join(lines[1:-1])
                        # Also remove the 'json' language identifier if present
                        if response_text.startswith('json'):
                            response_text = response_text[4:].strip()
                
                extracted_data = json.loads(response_text)
                
                # Check if an offer was detected
                if not extracted_data.get('is_offer', False):
                    logger.info("No offer detected in email")
                    return None
                
                # Add metadata
                extracted_data['gmail_message_id'] = most_recent_email['message_id']
                extracted_data['contractor_id'] = contractor_id
                extracted_data['email_received_at'] = most_recent_email.get('received_at')
                if pdf_attachment:
                    extracted_data['pdf_attachment_id'] = pdf_attachment['attachmentId']
                
                logger.info(f"Offer detected and extracted from email {most_recent_email['message_id']}")
                return extracted_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error detecting/extracting offer: {str(e)}", exc_info=True)
            return None
    
    def store_offer(
        self,
        extracted_data: Dict,
        planning: ContractingPlanning
    ) -> ContractorOffer:
        """
        Store extracted offer data in the database.
        
        Args:
            extracted_data: Dictionary with extracted offer data
            planning: ContractingPlanning instance
            
        Returns:
            Created ContractorOffer instance
        """
        try:
            # Convert any protobuf objects to JSON-serializable types
            extracted_data = convert_to_serializable(extracted_data)
            
            # Parse dates safely
            def parse_date(date_str):
                if not date_str:
                    return None
                try:
                    return datetime.strptime(date_str, '%Y-%m-%d').date()
                except:
                    return None
            
            # Parse datetime safely (handles ISO format strings)
            def parse_datetime(dt_value):
                if not dt_value:
                    return None
                if isinstance(dt_value, datetime):
                    return dt_value
                if isinstance(dt_value, str):
                    try:
                        return datetime.fromisoformat(dt_value.replace('Z', '+00:00'))
                    except:
                        return None
                return None
            
            # Create the offer
            offer = ContractorOffer.objects.create(
                contracting_planning=planning,
                contractor_id=extracted_data.get('contractor_id'),
                gmail_message_id=extracted_data.get('gmail_message_id'),
                email_received_at=parse_datetime(extracted_data.get('email_received_at')),
                
                # Financial data
                total_price=Decimal(str(extracted_data.get('total_price', 0))) if extracted_data.get('total_price') else None,
                currency=extracted_data.get('currency', 'EUR'),
                
                # Timeline
                timeline_start=parse_date(extracted_data.get('timeline_start')),
                timeline_end=parse_date(extracted_data.get('timeline_end')),
                timeline_duration_days=extracted_data.get('timeline_duration_days'),
                
                # Details
                scope_of_work=extracted_data.get('scope_of_work', ''),
                materials_included=convert_to_serializable(extracted_data.get('materials_included', [])),
                labor_breakdown=convert_to_serializable(extracted_data.get('labor_breakdown', {})),
                payment_terms=extracted_data.get('payment_terms', ''),
                payment_schedule=convert_to_serializable(extracted_data.get('payment_schedule', [])),
                
                # Additional info
                warranty_period=extracted_data.get('warranty_period'),
                warranty_details=extracted_data.get('warranty_details', ''),
                insurance_details=extracted_data.get('insurance_details', ''),
                special_conditions=extracted_data.get('special_conditions', ''),
                misc_details=convert_to_serializable(extracted_data.get('misc_details', {})),
                
                # Metadata
                offer_date=parse_date(extracted_data.get('offer_date')),
                valid_until=parse_date(extracted_data.get('valid_until')),
                extracted_data=extracted_data,
                pdf_attachment_id=extracted_data.get('pdf_attachment_id'),
            )
            
            logger.info(f"Stored offer {offer.id} from contractor {offer.contractor_id}")
            return offer
            
        except Exception as e:
            logger.error(f"Error storing offer: {str(e)}", exc_info=True)
            raise
    
    def analyze_single_offer(
        self,
        offer: ContractorOffer,
        planning: ContractingPlanning,
        conversation_history: Optional[str] = None
    ) -> OfferAnalysis:
        """
        Analyze a single offer with project context and conversation history.
        
        RAG Pipeline (placeholder for future):
        1. Fetch relevant project documents (files, requirements)
        2. Generate embeddings (using vector DB)
        3. Retrieve relevant context
        4. Generate analysis using Gemini + context
        
        Args:
            offer: ContractorOffer instance to analyze
            planning: ContractingPlanning instance
            conversation_history: Optional conversation history for re-analysis context
            
        Returns:
            OfferAnalysis instance with analysis report
        """
        try:
            # Get relevant context (RAG-ready)
            context = self._get_relevant_context(offer, planning)
            
            # Add conversation history to context if provided
            if conversation_history:
                context['conversation_history'] = conversation_history
            
            # Load analysis prompt
            analysis_prompt_template = self._load_prompt('offer_analysis_prompt.md')
            
            # Build the analysis prompt
            analysis_prompt = self._build_analysis_prompt(
                analysis_prompt_template,
                offer,
                planning,
                context
            )
            
            # Generate analysis using Gemini
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(analysis_prompt)
            
            if response.text:
                response_text = response.text.strip()
                
                # Try to parse JSON response
                structured_data = None
                analysis_report = response_text
                
                try:
                    # Extract JSON from code blocks if present
                    if '```json' in response_text:
                        json_start = response_text.find('```json') + 7
                        json_end = response_text.find('```', json_start)
                        json_str = response_text[json_start:json_end].strip()
                    elif response_text.startswith('{'):
                        json_str = response_text
                    else:
                        json_str = None
                    
                    if json_str:
                        parsed_response = json.loads(json_str)
                        if 'structured_data' in parsed_response:
                            structured_data = parsed_response['structured_data']
                            # Store structured_data as JSON string in analysis_report
                            analysis_report = json.dumps(structured_data, ensure_ascii=False)
                            logger.info(f"Successfully parsed structured analysis data for offer {offer.id}")
                        else:
                            logger.warning(f"Response JSON missing 'structured_data' field for offer {offer.id}")
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Could not parse JSON from Gemini response for offer {offer.id}: {str(e)}")
                    # Fall back to using the full response as text
                    analysis_report = response_text
                
                # Prepare analysis_data
                analysis_data = {
                    'offer_id': offer.id,
                    'analyzed_at': timezone.now().isoformat(),
                    'context_used': list(context.keys()),
                    'has_conversation_context': bool(conversation_history)
                }
                
                # Add structured data if available
                if structured_data:
                    analysis_data['structured_data'] = structured_data
                
                # Create and save analysis
                analysis = OfferAnalysis.objects.create(
                    offer=offer,
                    analysis_type='single',
                    analysis_report=analysis_report,
                    analysis_data=analysis_data,
                    documents_used=context.get('document_ids', []),
                )
                
                logger.info(f"Created analysis {analysis.id} for offer {offer.id}")
                return analysis
            else:
                raise ValueError("No analysis generated by Gemini")
                
        except Exception as e:
            logger.error(f"Error analyzing offer: {str(e)}", exc_info=True)
            raise
    
    def compare_offers(
        self,
        primary_offer: ContractorOffer,
        comparison_offers: Optional[List[ContractorOffer]] = None
    ) -> OfferAnalysis:
        """
        Compare multiple offers.
        
        If comparison_offers is None, compare with all offers for the same project.
        
        RAG Pipeline (placeholder for future):
        1. Fetch all offer documents
        2. Retrieve project requirements
        3. Generate comparative analysis with context
        
        Args:
            primary_offer: Primary offer to compare
            comparison_offers: Optional list of offers to compare against
            
        Returns:
            OfferAnalysis instance with comparison report
        """
        try:
            planning = primary_offer.contracting_planning
            
            # If no comparison offers specified, get all offers for this project
            if comparison_offers is None:
                comparison_offers = list(
                    ContractorOffer.objects.filter(
                        contracting_planning=planning
                    ).exclude(id=primary_offer.id)
                )
            
            if not comparison_offers:
                raise ValueError("No other offers available for comparison")
            
            # Get relevant context
            context = self._get_relevant_context(primary_offer, planning)
            
            # Load comparison prompt
            comparison_prompt_template = self._load_prompt('offer_comparison_prompt.md')
            
            # Build the comparison prompt
            comparison_prompt = self._build_comparison_prompt(
                comparison_prompt_template,
                primary_offer,
                comparison_offers,
                planning,
                context
            )
            
            # Generate comparison using Gemini
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(comparison_prompt)
            
            if response.text:
                response_text = response.text.strip()
                
                # Try to parse JSON response
                structured_data = None
                comparison_report = response_text
                
                try:
                    # Extract JSON from code blocks if present
                    if '```json' in response_text:
                        json_start = response_text.find('```json') + 7
                        json_end = response_text.find('```', json_start)
                        json_str = response_text[json_start:json_end].strip()
                    elif response_text.startswith('{'):
                        json_str = response_text
                    else:
                        json_str = None
                    
                    if json_str:
                        parsed_response = json.loads(json_str)
                        if 'structured_data' in parsed_response:
                            structured_data = parsed_response['structured_data']
                            # Store structured_data as JSON string in comparison_report
                            comparison_report = json.dumps(structured_data, ensure_ascii=False)
                            logger.info(f"Successfully parsed structured comparison data for offer {primary_offer.id}")
                        else:
                            logger.warning(f"Response JSON missing 'structured_data' field for offer {primary_offer.id}")
                except (json.JSONDecodeError, ValueError) as e:
                    logger.warning(f"Could not parse JSON from Gemini response for offer {primary_offer.id}: {str(e)}")
                    # Fall back to using the full response as text
                    comparison_report = response_text
                
                # Prepare analysis_data
                analysis_data = {
                    'primary_offer_id': primary_offer.id,
                    'compared_offer_ids': [o.id for o in comparison_offers],
                    'analyzed_at': timezone.now().isoformat(),
                    'comparison_count': len(comparison_offers)
                }
                
                # Add structured data if available
                if structured_data:
                    analysis_data['structured_data'] = structured_data
                
                # Create and save comparison analysis
                analysis = OfferAnalysis.objects.create(
                    offer=primary_offer,
                    analysis_type='comparison',
                    analysis_report=comparison_report,
                    analysis_data=analysis_data,
                    compared_offer_ids=[o.id for o in comparison_offers],
                    documents_used=context.get('document_ids', []),
                )
                
                logger.info(f"Created comparison analysis {analysis.id} for offer {primary_offer.id}")
                return analysis
            else:
                raise ValueError("No comparison generated by Gemini")
                
        except Exception as e:
            logger.error(f"Error comparing offers: {str(e)}", exc_info=True)
            raise
    
    def _get_relevant_context(
        self,
        offer: ContractorOffer,
        planning: ContractingPlanning
    ) -> Dict:
        """
        Get relevant context for offer analysis.
        
        RAG Pipeline (placeholder for future):
        1. Generate query embedding from offer
        2. Search vector store for relevant docs
        3. Retrieve project requirements
        4. Return combined context
        
        Args:
            offer: ContractorOffer instance
            planning: ContractingPlanning instance
            
        Returns:
            Dictionary with context data
        """
        if self.rag_enabled:
            # TODO: Implement RAG pipeline
            # 1. Generate embedding for offer
            # 2. Query vector store for similar documents
            # 3. Retrieve and rank relevant context
            # 4. Return enriched context
            pass
        
        # For now: return basic context
        project = planning.project
        
        context = {
            'project_name': project.name or "Renovation Project",
            'project_type': project.project_type or "Not specified",
            'project_location': f"{project.address}, {project.postal_code} {project.city}" if project.address else "Not specified",
            'project_budget': float(project.budget) if project.budget else None,
            'project_description': planning.description or "No description",
            'user_answers': planning.user_answers or {},
            'ai_summary': planning.ai_summary or "",
            'document_ids': [],  # Placeholder for RAG
        }
        
        return context
    
    def _load_prompt(self, prompt_filename: str) -> str:
        """Load a prompt template from file."""
        prompt_path = os.path.join(
            settings.BASE_DIR,
            'core',
            'services',
            'gemini_service',
            'prompts',
            'contracting',
            prompt_filename
        )
        
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template not found at {prompt_path}")
            raise
    
    def _build_analysis_prompt(
        self,
        template: str,
        offer: ContractorOffer,
        planning: ContractingPlanning,
        context: Dict
    ) -> str:
        """Build the complete prompt for offer analysis."""
        # Get contractor info
        try:
            contractor = Contractor.objects.get(id=offer.contractor_id)
            contractor_name = contractor.name
        except:
            contractor_name = f"Contractor {offer.contractor_id}"
        
        # Format offer data
        offer_summary = f"""
**Contractor:** {contractor_name}
**Total Price:** €{offer.total_price:,.2f} {offer.currency} 
**Timeline:** {offer.timeline_duration_days} days ({offer.timeline_start} to {offer.timeline_end})
**Scope:** {offer.scope_of_work[:500]}...
**Payment Terms:** {offer.payment_terms}
**Warranty:** {offer.warranty_period} - {offer.warranty_details}
"""
        
        # Get conversation history if available
        conversation_history = context.get('conversation_history', 'No conversation history available.')
        
        # Replace placeholders
        prompt = template
        replacements = {
            '{project_name}': context['project_name'],
            '{project_type}': context['project_type'],
            '{project_location}': context['project_location'],
            '{project_budget}': f"€{context['project_budget']:,.0f}" if context['project_budget'] else "Not specified",
            '{project_description}': context['project_description'],
            '{offer_summary}': offer_summary,
            '{offer_details_json}': json.dumps(offer.extracted_data, indent=2),
            '{conversation_history}': conversation_history,
        }
        
        for key, value in replacements.items():
            prompt = prompt.replace(key, str(value))
        
        return prompt
    
    def _build_comparison_prompt(
        self,
        template: str,
        primary_offer: ContractorOffer,
        comparison_offers: List[ContractorOffer],
        planning: ContractingPlanning,
        context: Dict
    ) -> str:
        """Build the complete prompt for offer comparison."""
        # Format all offers
        def format_offer(offer: ContractorOffer, label: str) -> str:
            try:
                contractor = Contractor.objects.get(id=offer.contractor_id)
                contractor_name = contractor.name
            except:
                contractor_name = f"Contractor {offer.contractor_id}"
            
            return f"""
### {label}: {contractor_name}
- **Price:** €{offer.total_price:,.2f} {offer.currency}
- **Timeline:** {offer.timeline_duration_days} days
- **Warranty:** {offer.warranty_period}
- **Scope:** {offer.scope_of_work[:300]}...
"""
        
        primary_summary = format_offer(primary_offer, "Primary Offer")
        
        comparison_summaries = "\n".join([
            format_offer(offer, f"Offer {i+2}")
            for i, offer in enumerate(comparison_offers)
        ])
        
        # Replace placeholders
        prompt = template
        replacements = {
            '{project_name}': context['project_name'],
            '{project_type}': context['project_type'],
            '{project_budget}': f"€{context['project_budget']:,.0f}" if context['project_budget'] else "Not specified",
            '{primary_offer_summary}': primary_summary,
            '{comparison_offers_summary}': comparison_summaries,
            '{offer_count}': str(len(comparison_offers) + 1),
        }
        
        for key, value in replacements.items():
            prompt = prompt.replace(key, str(value))
        
        return prompt
    
    def generate_structured_comparison(
        self,
        planning: ContractingPlanning
    ) -> Dict:
        """
        Generate structured comparison data for the interactive dashboard.
        
        This method creates a comprehensive JSON response with:
        - Executive summary and recommendations
        - Scoring metrics for each offer
        - Missing items and issues
        - Detailed comparisons in markdown format
        
        Args:
            planning: ContractingPlanning instance
            
        Returns:
            Dictionary with structured comparison data for frontend dashboard
        """
        try:
            # Get all offers for this project
            offers = list(
                ContractorOffer.objects.filter(
                    contracting_planning=planning
                ).select_related('contracting_planning__project')
            )
            
            if len(offers) < 2:
                raise ValueError("Need at least 2 offers to generate comparison")
            
            # Get project context
            context = self._get_relevant_context(offers[0], planning)
            
            # Load structured comparison prompt
            comparison_prompt_template = self._load_prompt('offer_comparison_structured.md')
            
            # Build all offers JSON
            all_offers_data = []
            for offer in offers:
                try:
                    contractor = Contractor.objects.get(id=offer.contractor_id)
                    contractor_name = contractor.name
                except:
                    contractor_name = f"Contractor {offer.contractor_id}"
                
                offer_data = {
                    "offer_id": offer.id,
                    "contractor_id": offer.contractor_id,
                    "contractor_name": contractor_name,
                    "total_price": float(offer.total_price) if offer.total_price else None,
                    "currency": offer.currency,
                    "timeline": {
                        "start": str(offer.timeline_start) if offer.timeline_start else None,
                        "end": str(offer.timeline_end) if offer.timeline_end else None,
                        "duration_days": offer.timeline_duration_days
                    },
                    "warranty_period": offer.warranty_period,
                    "warranty_details": offer.warranty_details,
                    "payment_terms": offer.payment_terms,
                    "payment_schedule": offer.payment_schedule,
                    "scope_of_work": offer.scope_of_work,
                    "materials_included": offer.materials_included,
                    "labor_breakdown": offer.labor_breakdown,
                    "insurance_details": offer.insurance_details,
                    "special_conditions": offer.special_conditions,
                    "misc_details": offer.misc_details,
                    "offer_date": str(offer.offer_date) if offer.offer_date else None,
                    "valid_until": str(offer.valid_until) if offer.valid_until else None,
                }
                all_offers_data.append(offer_data)
            
            # Build the prompt
            prompt = comparison_prompt_template
            replacements = {
                '{project_name}': context['project_name'],
                '{project_type}': context['project_type'],
                '{project_budget}': f"€{context['project_budget']:,.0f}" if context['project_budget'] else "Not specified",
                '{all_offers_json}': json.dumps(all_offers_data, indent=2),
                '{offer_count}': str(len(offers)),
            }
            
            for key, value in replacements.items():
                prompt = prompt.replace(key, str(value))
            
            # Generate structured comparison using Gemini
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(prompt)
            
            if response.text:
                response_text = response.text.strip()
                
                # Remove markdown code blocks if present
                if response_text.startswith('```'):
                    lines = response_text.split('\n')
                    if len(lines) > 2:
                        response_text = '\n'.join(lines[1:-1])
                        if response_text.startswith('json'):
                            response_text = response_text[4:].strip()
                
                # Parse the structured comparison
                structured_comparison = json.loads(response_text)
                
                # Add metadata
                structured_comparison['lastUpdated'] = timezone.now().isoformat()
                structured_comparison['projectName'] = context['project_name']
                structured_comparison['offerCount'] = len(offers)
                
                # Transform to match frontend format
                dashboard_data = {
                    "offers": [],
                    "scoring": structured_comparison.get('scoring', {}),
                    "aiInsights": {
                        "summary": structured_comparison.get('summary', ''),
                        "recommendation": structured_comparison.get('recommendation', {}),
                        "highlights": structured_comparison.get('highlights', []),
                        "missingItems": structured_comparison.get('missingItems', []),
                        "detailedComparisons": structured_comparison.get('detailedComparisons', {}),
                    },
                    "lastUpdated": structured_comparison['lastUpdated'],
                }
                
                # Build offer data for dashboard
                for offer in offers:
                    try:
                        contractor = Contractor.objects.get(id=offer.contractor_id)
                        contractor_name = contractor.name
                    except:
                        contractor_name = f"Contractor {offer.contractor_id}"
                    
                    dashboard_offer = {
                        "id": offer.id,
                        "contractorId": offer.contractor_id,
                        "contractorName": contractor_name,
                        "totalPrice": float(offer.total_price) if offer.total_price else 0,
                        "currency": offer.currency or "EUR",
                        "timeline": {
                            "startDate": str(offer.timeline_start) if offer.timeline_start else None,
                            "endDate": str(offer.timeline_end) if offer.timeline_end else None,
                            "durationDays": offer.timeline_duration_days,
                        },
                        "warranty": {
                            "period": offer.warranty_period,
                            "details": offer.warranty_details or "",
                        },
                        "paymentTerms": offer.payment_terms or "Not specified",
                        "paymentSchedule": offer.payment_schedule or [],
                        "breakdown": {
                            "labor": offer.labor_breakdown.get('labor', 0) if isinstance(offer.labor_breakdown, dict) else 0,
                            "materials": offer.labor_breakdown.get('materials', 0) if isinstance(offer.labor_breakdown, dict) else 0,
                            "other": offer.labor_breakdown.get('other', 0) if isinstance(offer.labor_breakdown, dict) else 0,
                            "vat": offer.labor_breakdown.get('vat', 19) if isinstance(offer.labor_breakdown, dict) else 19,
                        },
                        "scopeOfWork": offer.scope_of_work or "",
                        "materialsIncluded": offer.materials_included or [],
                        "insurance": offer.insurance_details or "",
                        "specialConditions": offer.special_conditions or "",
                        "offerDate": str(offer.offer_date) if offer.offer_date else None,
                        "validUntil": str(offer.valid_until) if offer.valid_until else None,
                        "riskScore": self._calculate_risk_score(offer),
                        "extractedData": offer.extracted_data,
                    }
                    dashboard_data["offers"].append(dashboard_offer)
                
                logger.info(f"Generated structured comparison for planning {planning.id}")
                return dashboard_data
            else:
                raise ValueError("No structured comparison generated by Gemini")
                
        except Exception as e:
            logger.error(f"Error generating structured comparison: {str(e)}", exc_info=True)
            raise
    
    def _calculate_risk_score(self, offer: ContractorOffer) -> int:
        """
        Calculate a risk score for an offer (0-100, lower is better).
        
        Args:
            offer: ContractorOffer instance
            
        Returns:
            Risk score (0-100)
        """
        score = 0
        
        # Missing warranty
        if not offer.warranty_period:
            score += 20
        
        # Missing payment terms
        if not offer.payment_terms or offer.payment_terms == 'Not specified':
            score += 15
        
        # Missing insurance
        if not offer.insurance_details:
            score += 15
        
        # Missing timeline
        if not offer.timeline_duration_days:
            score += 20
        
        # Missing price breakdown
        if not offer.labor_breakdown or (isinstance(offer.labor_breakdown, dict) and len(offer.labor_breakdown) == 0):
            score += 10
        
        # Unrealistic timeline (less than 7 days for most renovations)
        if offer.timeline_duration_days and offer.timeline_duration_days < 7:
            score += 20
        
        # Missing scope details
        if not offer.scope_of_work or len(offer.scope_of_work) < 50:
            score += 10
        
        return min(score, 100)
    
    def offer_already_analyzed(self, gmail_message_id: str) -> bool:
        """
        Check if an offer from this email has already been analyzed.
        
        Args:
            gmail_message_id: Gmail message ID
            
        Returns:
            True if offer exists, False otherwise
        """
        return ContractorOffer.objects.filter(gmail_message_id=gmail_message_id).exists()
    
    def get_recent_analysis_for_contractor(
        self,
        contractor_id: int,
        planning: ContractingPlanning,
        analysis_type: Optional[str] = None
    ) -> Optional['OfferAnalysis']:
        """
        Get the most recent analysis for offers from a specific contractor.
        
        Args:
            contractor_id: ID of the contractor
            planning: ContractingPlanning instance
            analysis_type: Optional filter ('single' or 'comparison')
            
        Returns:
            Most recent OfferAnalysis or None
        """
        # Get offers from this contractor for this planning
        offers = ContractorOffer.objects.filter(
            contracting_planning=planning,
            contractor_id=contractor_id
        ).values_list('id', flat=True)
        
        if not offers:
            return None
        
        # Query for analyses
        analyses_query = OfferAnalysis.objects.filter(
            offer__id__in=offers
        )
        
        # Filter by analysis type if specified
        if analysis_type:
            analyses_query = analyses_query.filter(analysis_type=analysis_type)
        
        # Get the most recent analysis
        analysis = analyses_query.order_by('-created_at').first()
        
        return analysis