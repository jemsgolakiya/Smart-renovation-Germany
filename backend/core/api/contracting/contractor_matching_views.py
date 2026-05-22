"""
API views for Contractor Matching with Gemini AI integration
Handles enrichment, ranking, and guidance generation
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging
import os
import json
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)


class ContractorMatchingGeminiService:
    """Service for Gemini AI integration in contractor matching"""
    
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY') or settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def enrich_contractor(self, contractor_data: dict) -> dict:
        """
        Enrich contractor data with structured tags and attributes
        Returns: { tags[], confidence, trade_tags[], service_area_normalized[], specialties[] }
        """
        try:
            prompt = f"""
You are analyzing contractor data for a German renovation platform.
Extract and normalize the following information into structured JSON:

Contractor Data:
- Services: {contractor_data.get('services', 'N/A')}
- Specializations: {contractor_data.get('specializations', 'N/A')}
- Description: {contractor_data.get('description', 'N/A')}
- Additional Info: {contractor_data.get('additional_info', 'N/A')}

Return ONLY valid JSON with this structure:
{{
  "tags": ["keyword1", "keyword2"],
  "confidence": 0.85,
  "trade_tags": ["SHK", "Plumbing", "Heating"],
  "service_area_normalized": ["Berlin", "Brandenburg"],
  "specialties": ["Altbau", "Bathroom renovation", "Solar thermal"]
}}

Rules:
- Extract 3-7 relevant tags
- Trade tags should match German construction trades
- Service areas should be German cities/regions
- Specialties should be specific capabilities
- Confidence should reflect data quality (0.0-1.0)

CRITICAL: Do NOT suggest any questions, document requests, or scope clarifications.
Focus ONLY on extracting and normalizing tags from the provided data.
This is for browsing/selection only. Invitation details come later.
"""
            
            response = self.model.generate_content(prompt)
            result = self._parse_json_response(response.text)
            return result
            
        except Exception as e:
            logger.error(f"Contractor enrichment failed: {e}")
            return {
                "tags": [],
                "confidence": 0,
                "trade_tags": [],
                "service_area_normalized": [],
                "specialties": []
            }
    
    def generate_why_match(self, contractor_summary: dict, plan_summary: dict, active_role: str) -> str:
        """
        Generate a short "Why this match" explanation (max 140 chars)
        """
        try:
            prompt = f"""
Generate a concise "Why this match" explanation for a contractor recommendation.

Contractor:
- Distance: {contractor_summary.get('distance_km', 'N/A')} km
- Experience: {contractor_summary.get('years_in_business', 'N/A')} years
- Rating: {contractor_summary.get('rating', 'N/A')}
- KfW: {contractor_summary.get('kfw_eligible', False)}
- Insurance: {contractor_summary.get('signals', {}).get('insurance_stated', False)}
- Altbau: {contractor_summary.get('signals', {}).get('altbau_experience', False)}

Project:
- Complexity: {plan_summary.get('complexity_level', 'N/A')}
- Funding: {plan_summary.get('funding_readiness', 'N/A')}
- Duration: {plan_summary.get('total_duration', 'N/A')}

Role: {active_role}

Return ONLY a single concise sentence (max 140 characters) explaining why this contractor matches the project.
Focus on 2-3 key factors: distance, experience, ratings, or relevant certifications.

Example: "15km away | 18y experience | 4.8★ rated | KfW-ready | Altbau specialist"

CRITICAL: Do NOT suggest any questions, document requests, or scope clarifications.
Focus ONLY on the match explanation. This is for browsing/selection only.
"""
            
            response = self.model.generate_content(prompt)
            why_match = response.text.strip()
            
            # Ensure max 140 chars
            if len(why_match) > 140:
                why_match = why_match[:137] + "..."
            
            return why_match
            
        except Exception as e:
            logger.error(f"Why-match generation failed: {e}")
            return "Good match for your project"
    
    def generate_risk_flags(self, profile: dict) -> list:
        """
        Generate risk flags for a contractor
        Returns: [{ type, message, confidence }]
        """
        try:
            prompt = f"""
Analyze this contractor profile and identify potential risk factors.

Profile:
- Insurance stated: {profile.get('insurance_stated', False)}
- HWK listed: {profile.get('hwk_listed', False)}
- Has rating: {profile.get('has_rating', False)}
- Reviews count: {profile.get('reviews_count', 0)}
- Has contact info: {profile.get('has_contact_info', True)}
- Availability: {profile.get('availability_date', 'Unknown')}

Return ONLY valid JSON array of risk flags:
[
  {{
    "type": "warning" or "info" or "error",
    "message": "Clear, concise risk description",
    "confidence": 0.85
  }}
]

Types:
- "error": Critical missing information (license, insurance)
- "warning": Important but not critical (no reviews, unclear availability)
- "info": Minor observations (HWK not stated)

Rules:
- Max 5 flags
- Messages in English, max 50 chars
- Confidence 0.6-0.95
- Focus on missing/unclear information, not speculation

CRITICAL: Do NOT suggest any questions, document requests, or scope clarifications.
Focus ONLY on observational risk flags (e.g., "Insurance not stated").
These are non-actionable observations for browsing/selection only.
"""
            
            response = self.model.generate_content(prompt)
            flags = self._parse_json_response(response.text)
            
            if isinstance(flags, list):
                return flags
            return []
            
        except Exception as e:
            logger.error(f"Risk flags generation failed: {e}")
            return []
    
    def generate_coverage_guidance(self, plan_summary: dict, required_roles: list, shortlist_counts: dict) -> dict:
        """
        Generate coverage guidance and recommendations
        """
        try:
            prompt = f"""
Analyze contractor coverage for a renovation project and provide guidance.

Project:
- Complexity: {plan_summary.get('complexity_level', 'N/A')}
- Required roles: {required_roles}
- Current shortlist counts: {shortlist_counts}

Return ONLY valid JSON:
{{
  "overall_progress": 65,
  "recommendations": [
    {{
      "type": "info" or "warning" or "success",
      "message": "Specific actionable recommendation",
      "role": "SHK" or null
    }}
  ]
}}

Rules:
- overall_progress: 0-100% based on coverage
- 3-5 recommendations
- Messages in English, max 80 chars
- Type: warning if role not covered, info for suggestions, success if complete

CRITICAL: Do NOT suggest any questions, document requests, or scope clarifications.
Focus ONLY on coverage status and shortlist recommendations.
This is for browsing/selection guidance only. Invitation details come later.
"""
            
            response = self.model.generate_content(prompt)
            guidance = self._parse_json_response(response.text)
            return guidance
            
        except Exception as e:
            logger.error(f"Coverage guidance generation failed: {e}")
            return {
                "overall_progress": 0,
                "recommendations": []
            }
    
    def _parse_json_response(self, text: str) -> dict:
        """Parse JSON from Gemini response, handling markdown code blocks"""
        text = text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Response text: {text}")
            return {}


# API Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enrich_contractor(request):
    """
    Enrich contractor data using Gemini AI
    POST /api/contracting/enrich-contractor/
    Body: { contractor_id, services, specializations, description, additional_info }
    """
    try:
        service = ContractorMatchingGeminiService()
        enrichment = service.enrich_contractor(request.data)
        
        return Response(enrichment, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Enrichment endpoint error: {e}")
        return Response(
            {
                "tags": [],
                "confidence": 0,
                "trade_tags": [],
                "service_area_normalized": [],
                "specialties": []
            },
            status=status.HTTP_200_OK
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_why_match(request):
    """
    Generate "Why this match" explanation
    POST /api/contracting/generate-why-match/
    Body: { contractor_summary, plan_summary, active_role }
    """
    try:
        service = ContractorMatchingGeminiService()
        
        contractor_summary = request.data.get('contractor_summary', {})
        plan_summary = request.data.get('plan_summary', {})
        active_role = request.data.get('active_role', '')
        
        why_match = service.generate_why_match(contractor_summary, plan_summary, active_role)
        
        return Response({'whyMatch': why_match}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Why-match endpoint error: {e}")
        return Response({'whyMatch': 'Good match for your project'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_risk_flags(request):
    """
    Generate risk flags for a contractor
    POST /api/contracting/generate-risk-flags/
    Body: { contractor_id, profile }
    """
    try:
        service = ContractorMatchingGeminiService()
        profile = request.data.get('profile', {})
        
        flags = service.generate_risk_flags(profile)
        
        return Response({'flags': flags}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Risk flags endpoint error: {e}")
        return Response({'flags': []}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_coverage_guidance(request):
    """
    Generate coverage guidance
    POST /api/contracting/generate-coverage-guidance/
    Body: { plan_summary, required_roles, shortlist_counts }
    """
    try:
        service = ContractorMatchingGeminiService()
        
        plan_summary = request.data.get('plan_summary', {})
        required_roles = request.data.get('required_roles', [])
        shortlist_counts = request.data.get('shortlist_counts', {})
        
        guidance = service.generate_coverage_guidance(plan_summary, required_roles, shortlist_counts)
        
        return Response(guidance, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Coverage guidance endpoint error: {e}")
        return Response(
            {
                "overall_progress": 0,
                "recommendations": []
            },
            status=status.HTTP_200_OK
        )
