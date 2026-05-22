"""
Gemini Service for German Trade Query Generation
Generates German search terms for Google Places API based on contractor roles
"""

import os
import json
import logging
import google.generativeai as genai
from django.conf import settings
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)


class GeminiPlacesQueryService:
    """Service for generating German trade search terms using Gemini AI"""
    
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def generate_german_search_terms(self, role: str) -> List[str]:
        """
        Generate German search terms for a contractor role
        
        Args:
            role: Contractor role (e.g., "SHK", "Electrician", "Tiler")
        
        Returns:
            List of German search terms (2-5 terms)
        """
        try:
            prompt = f"""
You are an expert in German construction trades.

Given the contractor role: "{role}"

Generate appropriate German search terms for finding contractors in Germany via text search.

Return ONLY valid JSON with this exact structure:
{{
  "german_terms": ["term1", "term2", "term3", "term4"],
  "explanation": "Brief explanation of the terms"
}}

Requirements:
1. german_terms: 3-5 German trade names and variations
   - Use proper German trade terminology
   - Include both formal and colloquial terms
   - Include regional variations if relevant
   - Include related search terms that contractors might use
   - Examples: "Sanitärinstallateur", "Klempner", "Heizungsbau", "SHK-Fachbetrieb"

2. explanation: One sentence explaining the term choices

Examples:

Role: "SHK"
Response:
{{
  "german_terms": ["Sanitärinstallateur", "Heizungsbau", "Klempner", "SHK-Fachbetrieb", "Sanitär"],
  "explanation": "SHK covers plumbing, heating, and climate - includes formal, colloquial, and abbreviation"
}}

Role: "Electrician"
Response:
{{
  "german_terms": ["Elektriker", "Elektroinstallateur", "Elektrofachbetrieb", "Elektro"],
  "explanation": "Electrical work specialists with formal and colloquial terms"
}}

Role: "Tiler"
Response:
{{
  "german_terms": ["Fliesenleger", "Fliesenfachbetrieb", "Fliesen"],
  "explanation": "Tiling specialists with trade name and short form"
}}

Role: "Painter"
Response:
{{
  "german_terms": ["Maler", "Malerbetrieb", "Maler und Lackierer", "Malermeister"],
  "explanation": "Painting and coating specialists with various professional designations"
}}

Role: "Carpenter"
Response:
{{
  "german_terms": ["Tischler", "Schreiner", "Zimmermann", "Schreinerei"],
  "explanation": "Carpentry trade with regional variations (Tischler in North, Schreiner in South)"
}}

Role: "Roofer"
Response:
{{
  "german_terms": ["Dachdecker", "Dachdeckerbetrieb", "Dachdeckermeister", "Bedachung"],
  "explanation": "Roofing specialists with professional designations"
}}

Role: "Architect"
Response:
{{
  "german_terms": ["Architekt", "Architekturbüro", "Architektur", "Bauplanung"],
  "explanation": "Architectural design and planning services"
}}

Role: "Engineer"
Response:
{{
  "german_terms": ["Ingenieur", "Ingenieurbüro", "Bauingenieur", "Statiker", "Tragwerksplanung"],
  "explanation": "Engineering services including structural engineers and planning"
}}

Role: "Energy Consultant"
Response:
{{
  "german_terms": ["Energieberater", "Energieberatung", "KfW-Effizienzexperte", "Energieeffizienz"],
  "explanation": "Energy efficiency consulting including KfW-certified experts"
}}

CRITICAL: Do NOT suggest any questions, document requests, or scope clarifications.
Focus ONLY on generating search terms for finding contractors.
These are for browsing/selection only. Invitation details come later.

Now generate for role: "{role}"
"""
            
            response = self.model.generate_content(prompt)
            result = self._parse_json_response(response.text)
            
            german_terms = result.get("german_terms", [])
            
            if not german_terms:
                logger.warning(f"No German terms generated for role: {role}, using fallback")
                german_terms = self._get_fallback_terms(role)
            
            logger.info(f"Generated search terms for {role}: {german_terms}")
            return german_terms
            
        except Exception as e:
            logger.error(f"Gemini query generation failed: {e}")
            # Return fallback terms
            return self._get_fallback_terms(role)
    
    def _get_fallback_terms(self, role: str) -> List[str]:
        """
        Fallback hardcoded mapping when Gemini fails
        Returns only German search terms (no types)
        """
        fallback_map = {
            "SHK": ["Sanitärinstallateur", "Heizungsbau", "Klempner", "SHK-Fachbetrieb", "Sanitär"],
            "Electrician": ["Elektriker", "Elektroinstallateur", "Elektrofachbetrieb", "Elektro"],
            "Tiler": ["Fliesenleger", "Fliesenfachbetrieb", "Fliesen"],
            "Painter": ["Maler", "Malerbetrieb", "Maler und Lackierer", "Malermeister"],
            "Carpenter": ["Tischler", "Schreiner", "Zimmermann", "Schreinerei"],
            "Mason": ["Maurer", "Maurermeister", "Mauerwerksbau", "Maurerei"],
            "Roofer": ["Dachdecker", "Dachdeckerbetrieb", "Dachdeckermeister", "Bedachung"],
            "Demolition": ["Abbruch", "Abbruchunternehmen", "Entrümpelung", "Abrissarbeiten"],
            "General Contractor": ["Generalunternehmer", "Bauunternehmen", "Baufirma", "Bauträger"],
            "Architect": ["Architekt", "Architekturbüro", "Architektur", "Bauplanung"],
            "Engineer": ["Ingenieur", "Ingenieurbüro", "Bauingenieur", "Statiker", "Tragwerksplanung"],
            "Energy Consultant": ["Energieberater", "Energieberatung", "KfW-Effizienzexperte", "Energieeffizienz"],
        }
        
        return fallback_map.get(role, ["Bauunternehmen", "Handwerker", "Handwerksbetrieb"])
    
    def _parse_json_response(self, text: str) -> Dict:
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
