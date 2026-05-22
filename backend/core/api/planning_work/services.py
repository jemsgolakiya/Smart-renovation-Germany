import os
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import google.generativeai as genai

from django.conf import settings
from .rag_service import get_rag_service


class GeminiService:
    """Service for interacting with Google's Gemini AI"""
    
    def __init__(self):
        """Initialize the Gemini service with API key"""
        api_key = os.getenv('GEMINI_API_KEY')
        
        if not api_key:
            api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        # Using gemini-2.5-flash for Planning module
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.model = genai.GenerativeModel('gemini-2.5-pro')

    def generate_next_question(self, current_answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate the next contextual question based on current answers
        """
        max_retries = 3
        prompt = self._build_question_generation_prompt(current_answers)

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    wait_time = 2 ** attempt
                    print(f"[RETRY {attempt}/{max_retries}] Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)

                print(f"[Attempt {attempt + 1}/{max_retries}] Generating next question...")
                response = self.model.generate_content(prompt)
                return self._parse_json_response(response.text)

            except Exception as e:
                error_str = str(e).lower()
                print(f"[EXCEPTION - Attempt {attempt + 1}/{max_retries}]: {e}")

                # Check if it's a quota/rate limit error
                if "429" in error_str or "quota" in error_str or "rate" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = 10 * (attempt + 1)
                        print(f"[RATE LIMIT] Waiting {wait_time}s before retry...")
                        time.sleep(wait_time - (2 ** attempt))
                    else:
                        # Return fallback question with quota error info
                        print("[QUOTA EXCEEDED] Returning fallback question")
                        return {
                            "question_text": "Are there any other specific details about the property you would like to add?",
                            "explanation": "We want to ensure we cover all bases.",
                            "input_type": "text",
                            "options": [],
                            "error": "API quota exceeded. Your response will still be processed."
                        }

                # If this is the last attempt
                if attempt == max_retries - 1:
                    print(f"Question generation failed after {max_retries} attempts: {e}")
                    return {
                        "question_text": "Are there any other specific details about the property you would like to add?",
                        "explanation": "We want to ensure we cover all bases.",
                        "input_type": "text",
                        "options": []
                    }

        # Fallback (should never reach here)
        return {
            "question_text": "Are there any other specific details about the property you would like to add?",
            "explanation": "We want to ensure we cover all bases.",
            "input_type": "text",
            "options": []
        }

    def generate_renovation_plan(
        self,
        building_type: str,
        budget: float,
        location: str,
        building_size: int,
        renovation_goals: list,
        dynamic_context: Dict[str, Any] = None,
        **kwargs
    ) -> dict:
        """
        Generate a comprehensive renovation plan using Gemini AI,
        incorporating both static and dynamic context.
        """
        max_retries = 3
        last_error = None

        context = dynamic_context if dynamic_context else {}
        context.update({
            "building_type": building_type,
            "budget": budget,
            "location": location,
            "building_size": building_size,
            "renovation_goals": renovation_goals,
            **kwargs
        })

        prompt = self._build_renovation_prompt_dynamic(context)

        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    # Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
                    wait_time = 2 ** attempt
                    print(f"[RETRY {attempt}/{max_retries}] Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)

                print(f"[Attempt {attempt + 1}/{max_retries}] Generating renovation plan...")
                response = self.model.generate_content(prompt)

                plan_data = self._parse_json_response(response.text)
                print('Plan data parsed successfully.')

                return {
                    'success': True,
                    'plan': plan_data,
                    'building_type': building_type,
                    'budget': budget,
                    'location': location,
                    'error': None,
                    'generated_at': datetime.now().isoformat()
                }

            except Exception as e:
                last_error = str(e)
                error_str = str(e).lower()

                print(f"[EXCEPTION - Attempt {attempt + 1}/{max_retries}]")
                print(f"Error: {e}")

                # Check if it's a quota/rate limit error
                if "429" in error_str or "quota" in error_str or "rate" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = 10 * (attempt + 1)  # Wait longer for rate limits (10s, 20s, 30s)
                        print(f"[RATE LIMIT] Waiting {wait_time}s before retry...")
                        time.sleep(wait_time - (2 ** attempt))  # Subtract already-planned wait
                    else:
                        # Final attempt failed - return user-friendly error
                        return {
                            'success': False,
                            'plan': None,
                            'building_type': building_type,
                            'budget': budget,
                            'location': location,
                            'error': 'API quota exceeded. Please try again in a few minutes or upgrade your Gemini API plan at https://ai.google.dev',
                            'error_type': 'QUOTA_EXCEEDED',
                            'generated_at': datetime.now().isoformat()
                        }

                # If this is the last attempt and not a quota error
                if attempt == max_retries - 1:
                    return {
                        'success': False,
                        'plan': None,
                        'building_type': building_type,
                        'budget': budget,
                        'location': location,
                        'error': f'Failed to generate plan after {max_retries} attempts: {last_error}',
                        'generated_at': datetime.now().isoformat()
                    }

        # Should never reach here
        return {
            'success': False,
            'plan': None,
            'building_type': building_type,
            'budget': budget,
            'location': location,
            'error': f'Unexpected error: {last_error}',
            'generated_at': datetime.now().isoformat()
        }
    
    def _build_question_generation_prompt(self, current_answers: Dict[str, Any]) -> str:
        return f"""
You are an expert renovation consultant in Germany (specializing in GEG, KfW funding, and construction).
The user is planning a renovation. Here is what we know so far:

{json.dumps(current_answers, indent=2)}

Your task: Identify the SINGLE most critical missing piece of information needed to create a precise renovation plan, timeline, or compliance check.
Generate ONE follow-up question to ask the user.

**IMPORTANT LANGUAGE REQUIREMENT:** The "question_text", "explanation", and any "label" in options **MUST BE IN ENGLISH**. 
Do not output German text, even though the context is Germany.

Return EXACT JSON format:
{{
    "question_id": "unique_string_id",
    "question_text": "The question string (in English)",
    "explanation": "Brief reason why this info is needed (e.g., 'Required for KfW 261 eligibility') (in English)",
    "input_type": "select" OR "text" OR "number" OR "date",
    "options": [  // Only if input_type is 'select'
        {{"value": "opt1", "label": "Option Label 1 (in English)"}},
        {{"value": "opt2", "label": "Option Label 2 (in English)"}}
    ]
}}
"""

    def _build_renovation_prompt_dynamic(self, context: Dict[str, Any]) -> str:
        """Build a prompt using the full dynamic context"""
        
        rag_context = ""
        try:
            rag = get_rag_service(
                    pdf_directory=settings.PDF_DIRECTORY,
                    qdrant_url=settings.QDRANT_URL,
                    qdrant_api_key=settings.QDRANT_API_KEY
                )
            if rag:
                rag_context = rag.get_context(
                    building_type=context.get('building_type', ''),
                    location=context.get('location', ''),
                    budget=float(context.get('budget', 0)),
                    goals=context.get('renovation_goals', []),
                    top_k=6
                )
            print('RAG context retrieved successfully.', rag_context)
        except Exception as e:
            print(f"RAG failed, continuing without: {e}")
        return f"""
You are an expert renovation consultant specializing in German building regulations (GEG), KfW grants, and construction planning.

{rag_context}

Generate a comprehensive, structured renovation plan in JSON format based on these project details:

{json.dumps(context, indent=2)}

**IMPORTANT LANGUAGE REQUIREMENT:**
All text content in the JSON (titles, descriptions, tasks, reasons, suggestions) **MUST BE IN ENGLISH**.

**CRITICAL: Follow this EXACT JSON structure for frontend compatibility:**

{{
    "project_summary": {{
        "total_estimated_cost": "€X - €Y",
        "total_duration": "X-Y months",
        "funding_readiness": "Good Match/Partial Match/Needs Review",
        "complexity_level": "Low/Medium/High",
        "key_considerations": ["point1", "point2"]
    }},
    
    "phases": [
        {{
            "id": 1,
            "title": "Analysis & Planning",
            "icon": "Search", 
            "duration": "1-2 weeks",
            "cost": "€500 - €1,200",
            "status": "ready",
            "color": "emerald",
            "tasks": [
                {{
                    "task_name": "Site inspection and assessment",
                    "estimated_time": "2 days",
                    "estimated_cost": "€300",
                    "required_by": "Energy consultant"
                }}
            ],
            "required_documents": ["Building plans", "Energy certificate"],
            "stakeholders": ["Energy consultant", "Architect"]
        }},
        {{
            "id": 2,
            "title": "Detail Planning & Tendering",
            "icon": "FileText",
            "duration": "2-4 weeks",
            "cost": "€1,000 - €3,000",
            "status": "pending",
            "color": "blue",
            "tasks": [],
            "required_documents": [],
            "stakeholders": []
        }},
        {{
            "id": 3,
            "title": "Permitting & Financing",
            "icon": "Zap",
            "duration": "2-3 weeks",
            "cost": "€1,000 - €2,000",
            "status": "pending",
            "color": "amber",
            "tasks": [],
            "required_documents": [],
            "stakeholders": []
        }},
        {{
            "id": 4,
            "title": "Contractor Selection",
            "icon": "Users",
            "duration": "2-4 weeks",
            "cost": "Variable",
            "status": "pending",
            "color": "purple",
            "tasks": [],
            "required_documents": [],
            "stakeholders": []
        }},
        {{
            "id": 5,
            "title": "Implementation",
            "icon": "Wrench",
            "duration": "8-12 weeks",
            "cost": "€XX,XXX - €XX,XXX",
            "status": "pending",
            "color": "rose",
            "tasks": [],
            "required_documents": [],
            "stakeholders": []
        }},
        {{
            "id": 6,
            "title": "Acceptance & Handover",
            "icon": "CheckCircle2",
            "duration": "1 week",
            "cost": "€300 - €600",
            "status": "pending",
            "color": "gray",
            "tasks": [],
            "required_documents": [],
            "stakeholders": []
        }}
    ],
    
    "gantt_chart": [
        {{
            "id": 1,
            "name": "Analysis & Planning",
            "start": 0,
            "duration": 10,
            "color": "bg-emerald-500"
        }},
        {{
            "id": 2,
            "name": "Detail Planning & Tendering",
            "start": 10,
            "duration": 21,
            "color": "bg-blue-500"
        }},
        {{
            "id": 3,
            "name": "Permitting & Financing",
            "start": 31,
            "duration": 17,
            "color": "bg-amber-500"
        }},
        {{
            "id": 4,
            "name": "Contractor Selection",
            "start": 48,
            "duration": 21,
            "color": "bg-purple-500"
        }},
        {{
            "id": 5,
            "name": "Implementation",
            "start": 69,
            "duration": 70,
            "color": "bg-rose-500"
        }},
        {{
            "id": 6,
            "name": "Acceptance & Handover",
            "start": 139,
            "duration": 7,
            "color": "bg-gray-500"
        }}
    ],
    
    "permits": [
        {{
            "id": "geg",
            "name": "GEG Energy Compliance",
            "description": "Compliance with German Building Energy Act",
            "checked": true
        }},
         {{
            "id": "baug",
            "name": "Baugenehmigung",
            "description": "Building permit",
            "checked": false
        }},
        {{
            "id": "architect",
            "name": "Architect Approval",
            "description": "Architect review",
            "checked": false
        }},
        {{
            "id": "energy-cert",
            "name": "Energy Certificate",
            "description": "Energy performance certificate",
            "checked": false
        }},
        {{
            "id": "heritage",
            "name": "Heritage Protection Check",
            "description": "Denkmalschutz check",
            "checked": false
        }}
    ],
    
    "stakeholders": [
        {{
            "name": "Energy Consultant",
            "role": "GEG compliance and energy audit",
            "when_needed": "Phase 1-2",
            "estimated_cost": "€1,500 - €3,000",
            "how_to_find": "BAFA certified consultant list"
        }},
        {{
            "name": "Architect",
            "role": "Planning and building permit",
            "when_needed": "Phase 1-3",
            "estimated_cost": "10-15% of construction",
            "how_to_find": "Local chamber of architects"
        }}
    ],

    "ai_suggestions": [
        "Consider applying for KfW 261 program for up to 45,000€ subsidy",
        "Schedule energy audit within 2 weeks to qualify for funding",
        "Plan construction to avoid winter months (November-February)"
    ]
}}

**CRITICAL RULES FOR GANTT CHART:**
1. gantt_chart MUST have exactly 6 items matching the 6 phases
2. 'id' must match phase id (1-6)
3. 'name' must exactly match phase title
4. 'start' is cumulative days from project start (Phase 1 starts at 0, Phase 2 starts after Phase 1 ends)
5. 'duration' is in days (convert weeks to days: 1-2 weeks = 10 days, 8-12 weeks = 70 days)
6. 'color' must be one of: "bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-gray-500"
7. Calculate 'start' as sum of all previous durations

**OTHER RULES:**
1. Use RAG context above for accurate German standards, KfW programs, costs
2. phases icons must be one of: "Search", "Zap", "FileText", "Users", "Wrench", "CheckCircle2"
3. permits must include the 5 specific IDs listed above
4. Provide ONLY valid JSON, no markdown blocks
"""

    def _parse_json_response(self, response_text: str) -> dict:
        """Helper to parse JSON from AI response, handling markdown blocks"""
        try:
            cleaned_text = response_text.strip()
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]
            return json.loads(cleaned_text.strip())
        except json.JSONDecodeError:
            return {}