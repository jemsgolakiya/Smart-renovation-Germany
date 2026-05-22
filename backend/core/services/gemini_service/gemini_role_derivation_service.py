"""
Gemini Service for Contractor Role Derivation
Analyzes PlanData to intelligently determine required contractor roles
"""

import os
import json
import logging
import google.generativeai as genai
from django.conf import settings
from typing import List, Dict

logger = logging.getLogger(__name__)


class GeminiRoleDerivationService:
    """Service for deriving contractor roles from PlanData using Gemini AI"""
    
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY') or getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def derive_roles_from_plan(self, plan_data: Dict) -> List[Dict]:
        """
        Analyze PlanData and derive required contractor roles
        
        Args:
            plan_data: The renovation plan data containing stakeholders, phases, tasks
        
        Returns:
            List of role dictionaries with structure:
            [
                {
                    "role": "SHK",
                    "label": "Plumber/Heating (SHK)",
                    "required": true,
                    "target_count": 3,
                    "reasoning": "Bathroom renovation requires plumbing work"
                }
            ]
        """
        try:
            # Extract relevant information from plan_data
            stakeholders = plan_data.get('stakeholders', [])
            phases = plan_data.get('phases', [])
            project_summary = plan_data.get('project_summary', {})
            
            # Find implementation phase (typically phase 5)
            implementation_tasks = []
            for phase in phases:
                if phase.get('id') == 5 or 'implementation' in phase.get('title', '').lower():
                    implementation_tasks = phase.get('tasks', [])
                    break
            
            # Build context for Gemini
            stakeholder_list = [s.get('role', s.get('name', '')) for s in stakeholders]
            task_list = [t.get('task_name', '') for t in implementation_tasks]
            
            prompt = f"""
You are an expert in German construction and renovation projects.

Analyze this renovation project and determine which contractor roles are needed.

Project Summary:
- Complexity: {project_summary.get('complexity_level', 'Unknown')}
- Duration: {project_summary.get('total_duration', 'Unknown')}
- Budget: {project_summary.get('total_estimated_cost', 'Unknown')}

Stakeholders identified in plan:
{json.dumps(stakeholder_list, indent=2)}

Implementation tasks:
{json.dumps(task_list, indent=2)}

Available contractor role types:
- SHK: Plumber/Heating/Climate (Sanitär-Heizung-Klima)
- Electrician: Electrical work
- Tiler: Tiling and flooring
- Painter: Painting and decorating
- Carpenter: Woodwork, doors, windows
- Mason: Masonry and brickwork
- Roofer: Roofing work
- Demolition: Demolition and removal
- General Contractor: Overall project coordination
- Architect: Design and planning
- Engineer: Structural engineering
- Energy Consultant: Energy efficiency consulting

Return ONLY valid JSON array with this structure:
[
  {{
    "role": "SHK",
    "label": "Plumber/Heating (SHK)",
    "required": true,
    "target_count": 3,
    "reasoning": "Brief explanation why this role is needed"
  }}
]

Rules:
1. Only include roles that are actually needed for this specific project
2. Mark as "required: true" if essential, "required: false" if optional/nice-to-have
3. target_count: Recommend 3-5 contractors for critical roles, 2-3 for less critical
4. reasoning: One sentence explaining why this role is needed (max 100 chars)
5. Be specific - don't include roles that aren't relevant to the work described
6. Consider German construction practices (e.g., SHK for bathroom work)

CRITICAL: Do NOT suggest any questions, document requests, or scope clarifications.
Focus ONLY on identifying which contractor types are needed for this project.
"""
            
            response = self.model.generate_content(prompt)
            result = self._parse_json_response(response.text)
            
            if not result or not isinstance(result, list):
                logger.warning("Gemini returned invalid role data, using fallback")
                return self._get_fallback_roles(stakeholder_list, task_list)
            
            logger.info(f"Derived {len(result)} contractor roles from plan")
            return result
            
        except Exception as e:
            logger.error(f"Gemini role derivation failed: {e}")
            # Return fallback based on basic heuristics
            return self._get_fallback_roles(stakeholder_list, task_list)
    
    def _get_fallback_roles(self, stakeholders: List[str], tasks: List[str]) -> List[Dict]:
        """
        Fallback role derivation using simple heuristics
        """
        roles = []
        roles_set = set()
        
        # Combine stakeholders and tasks for analysis
        text = ' '.join(stakeholders + tasks).lower()
        
        # Simple keyword-based detection
        role_keywords = {
            'SHK': ['plumb', 'heating', 'bathroom', 'sanitary', 'water', 'hvac', 'shk'],
            'Electrician': ['electric', 'wiring', 'lighting', 'power'],
            'Tiler': ['tile', 'tiling', 'floor', 'ceramic'],
            'Painter': ['paint', 'painting', 'decorat'],
            'Carpenter': ['carpenter', 'joinery', 'window', 'door', 'wood'],
            'Mason': ['mason', 'brick', 'wall', 'masonry'],
            'Roofer': ['roof', 'roofing'],
            'Demolition': ['demolition', 'demolish', 'removal', 'remove'],
        }
        
        role_labels = {
            'SHK': 'Plumber/Heating (SHK)',
            'Electrician': 'Electrician',
            'Tiler': 'Tiler',
            'Painter': 'Painter',
            'Carpenter': 'Carpenter',
            'Mason': 'Mason',
            'Roofer': 'Roofer',
            'Demolition': 'Demolition',
        }
        
        for role, keywords in role_keywords.items():
            if any(kw in text for kw in keywords):
                if role not in roles_set:
                    roles_set.add(role)
                    roles.append({
                        'role': role,
                        'label': role_labels[role],
                        'required': True,
                        'target_count': 3,
                        'reasoning': 'Required based on project tasks'
                    })
        
        # Always include General Contractor as fallback if nothing else matched
        if len(roles) == 0:
            roles.append({
                'role': 'General Contractor',
                'label': 'General Contractor',
                'required': True,
                'target_count': 3,
                'reasoning': 'General renovation work'
            })
        
        logger.info(f"Fallback derivation found {len(roles)} roles")
        return roles
    
    def _parse_json_response(self, text: str) -> List[Dict]:
        """Parse JSON array from Gemini response, handling markdown code blocks"""
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
            result = json.loads(text)
            if isinstance(result, list):
                return result
            logger.error("Gemini response is not a JSON array")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.error(f"Response text: {text}")
            return []
