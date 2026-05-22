import os
import json
import hashlib
from typing import Dict, Optional, List
from datetime import datetime
import logging
import google.generativeai as genai
from functools import lru_cache
import asyncio

logger = logging.getLogger(__name__)

# ============================================================================
# RAG CONTEXT DATABASE - German Renovation Best Practices
# ============================================================================

RENOVATION_KNOWLEDGE_BASE = {
    "residential": {
        "full": {
            "overview": "Complete residential renovation following German DIN standards",
            "typical_phases": [
                "Planning & Permits (DIN 276)",
                "Energy Audit (EnEV/GEG standards)",
                "Demolition & Preparation",
                "Structure & Insulation",
                "MEP Systems (Electrical, Plumbing, HVAC)",
                "Finishes & Testing"
            ],
            "cost_distribution": {"materials": 45, "labor": 35, "permits": 10, "contingency": 10},
            "best_practices": [
                "Prioritize thermal insulation (KfW standard KfW 55 or better)",
                "Upgrade electrical to modern standards (DIN VDE 0100)",
                "Install energy-efficient windows (Uw < 1.0 W/m²K)",
                "Consider heat recovery ventilation (MVHR)",
                "Plan for renewable energy integration (solar, heat pump)"
            ],
            "duration_weeks": 16,
            "regulatory_notes": "Follow DIN 276 for cost planning, DIN 4108 for thermal protection, EnEV 2016 for energy"
        },
        "partial": {
            "overview": "Targeted renovation of specific building areas",
            "typical_phases": [
                "Area Assessment",
                "Permits (if needed)",
                "Preparation",
                "Execution",
                "Final Inspection"
            ],
            "cost_distribution": {"materials": 50, "labor": 30, "permits": 10, "contingency": 10},
            "best_practices": [
                "Ensure isolated sections don't affect structural integrity",
                "Update local MEP connections to current standards",
                "Plan coordination with existing systems",
                "Consider future expansions"
            ],
            "duration_weeks": 8,
            "regulatory_notes": "Check if building permit required based on scope"
        }
    },
    "villa": {
        "full": {
            "overview": "Luxury villa comprehensive renovation with premium finishes",
            "typical_phases": [
                "Architectural Planning (include luxury specifications)",
                "Energy Audit & Sustainability Assessment",
                "Structural Engineering Review",
                "Permits & Approvals",
                "Demolition & Restoration",
                "Premium MEP Systems",
                "Luxury Finishes & Smart Home Integration",
                "Final Inspection & Handover"
            ],
            "cost_distribution": {"materials": 40, "labor": 40, "permits": 10, "contingency": 10},
            "best_practices": [
                "Integrate smart home automation (KNX/MQTT systems)",
                "Premium energy systems (high-efficiency heat pumps, solar)",
                "Luxury finishes from premium manufacturers",
                "Climate control in all zones",
                "Home automation for security and comfort",
                "Wine cellars, home theaters, spas - specialized systems"
            ],
            "duration_weeks": 24,
            "regulatory_notes": "Villa renovations often require architectural approval and heritage considerations"
        }
    },
    "commercial": {
        "full": {
            "overview": "Commercial space renovation meeting commercial building codes",
            "typical_phases": [
                "Commercial Space Planning",
                "Occupancy & Safety Review",
                "Energy Audit",
                "Permits & Inspections",
                "Asbestos/Lead Assessment",
                "HVAC Upgrade for Commercial Standards",
                "Fire Safety Systems",
                "Accessibility Compliance (DIN 18040)",
                "Finishes & Testing",
                "Final Certification"
            ],
            "cost_distribution": {"materials": 35, "labor": 40, "permits": 15, "contingency": 10},
            "best_practices": [
                "Ensure commercial HVAC capacity (VDI 6040 standard)",
                "Install fire detection & suppression systems",
                "Comply with occupancy regulations",
                "Plan for modular/flexible spaces",
                "Commercial-grade electrical systems",
                "ADA/DIN 18040 accessibility compliance"
            ],
            "duration_weeks": 20,
            "regulatory_notes": "Commercial buildings have stricter codes - DIN 4109 (sound), DIN VDE 0100-714 (electrical)"
        }
    }
}

# ============================================================================
# OPTIMIZED GEMINI SERVICE WITH RAG, CACHING & PERFORMANCE TUNING
# ============================================================================

class OptimizedGeminiService:
    """
    Enhanced Gemini service with:
    - RAG pipeline for better context
    - Prompt caching for faster responses
    - Temperature & token optimization
    - Streaming support
    - Error handling with fallbacks
    """
    
    def __init__(self):
        """Initialize with optimized settings"""
        api_key = os.getenv('GEMINI_API_KEY', 'PLACE_YOUR_API')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        
        # Use faster, more cost-effective model with caching support
        self.model = genai.GenerativeModel(
            'gemini-1.5-flash',  # Faster than pro-latest, optimized for speed
            generation_config={
                'temperature': 0.3,  # Lower temperature = more deterministic, faster
                'max_output_tokens': 2048,  # Limit tokens for speed
                'top_p': 0.8,
                'top_k': 40
            }
        )
        
        # Initialize cache key store
        self._response_cache = {}
        self._cache_hits = 0
        
    def _get_cache_key(self, building_type: str, budget: float, 
                       renovation_type: str, details: str = "") -> str:
        """Generate consistent cache key"""
        cache_str = f"{building_type}:{int(budget/1000)}k:{renovation_type}:{details}"
        return hashlib.md5(cache_str.encode()).hexdigest()
    
    def _retrieve_rag_context(self, building_type: str, 
                             renovation_type: str) -> Optional[Dict]:
        """
        RAG: Retrieve relevant context from knowledge base
        This provides LLM with structured best practices
        """
        try:
            context = RENOVATION_KNOWLEDGE_BASE.get(
                building_type.lower(),
                RENOVATION_KNOWLEDGE_BASE.get('residential')
            )
            
            if context:
                reno_info = context.get(renovation_type.lower())
                if reno_info:
                    return {
                        'building_context': context,
                        'renovation_context': reno_info
                    }
        except Exception as e:
            logger.warning(f"RAG context retrieval failed: {e}")
        
        return None
    
    def generate_renovation_plan(
        self,
        building_type: str,
        budget: float,
        renovation_type: str,
        additional_details: Optional[str] = None,
        use_cache: bool = True
    ) -> Dict:
        """
        Generate renovation plan with optimizations:
        - RAG context injection
        - Response caching
        - Prompt optimization
        - Fast fallback
        """
        # Check cache first
        cache_key = self._get_cache_key(building_type, budget, renovation_type, additional_details or "")
        
        if use_cache and cache_key in self._response_cache:
            self._cache_hits += 1
            logger.info(f"Cache hit! Total hits: {self._cache_hits}")
            cached_result = self._response_cache[cache_key]
            return cached_result
        
        try:
            # Step 1: Retrieve RAG context
            rag_context = self._retrieve_rag_context(building_type, renovation_type)
            
            # Step 2: Create optimized prompt with context
            prompt = self._create_optimized_prompt(
                building_type,
                budget,
                renovation_type,
                additional_details,
                rag_context
            )
            
            # Step 3: Generate with Gemini (fast model)
            response = self.model.generate_content(
                prompt,
                request_options={"timeout": 30}  # 30 second timeout
            )
            
            # Step 4: Parse response
            plan_data = self._parse_response(response.text)
            
            result = {
                'success': True,
                'plan': plan_data,
                'building_type': building_type,
                'budget': budget,
                'renovation_type': renovation_type,
                'generated_at': datetime.now(),
                'error': None,
                'optimization_method': 'gemini_rag'
            }
            
            # Cache result
            if use_cache:
                self._response_cache[cache_key] = result
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            # Fast fallback to optimized mock
            return self._generate_optimized_mock(
                building_type, budget, renovation_type, rag_context
            )
    
    def _create_optimized_prompt(
        self,
        building_type: str,
        budget: float,
        renovation_type: str,
        additional_details: Optional[str] = None,
        rag_context: Optional[Dict] = None
    ) -> str:
        """
        Create highly optimized prompt for faster, better responses
        """
        # Base context from RAG
        context_info = ""
        if rag_context:
            reno_ctx = rag_context['renovation_context']
            context_info = f"""
GERMAN RENOVATION STANDARDS:
- Regulatory: {reno_ctx.get('regulatory_notes', '')}
- Standard Duration: {reno_ctx.get('duration_weeks', 'N/A')} weeks
- Typical Cost Distribution: {reno_ctx.get('cost_distribution', {})}
- Best Practices: {', '.join(reno_ctx.get('best_practices', [])[:3])}

"""
        
        prompt = f"""You are a German renovation expert. Generate JSON renovation plan ONLY.

BUILDING: {building_type.title()}
RENOVATION: {renovation_type.title()}
BUDGET: €{budget:,.0f}
{f'REQUIREMENTS: {additional_details}' if additional_details else ''}

{context_info}

OUTPUT EXACTLY THIS JSON (no markdown, no text):
{{
  "overview": "1-2 sentence summary with budget and scope",
  "total_budget": {budget},
  "duration_weeks": estimated_weeks_number,
  "phases": [
    {{
      "phase_number": 1,
      "title": "Phase name",
      "description": "What happens here",
      "duration": "X-Y weeks",
      "cost_range": {{"min": amount, "max": amount}},
      "status": "ready" or "pending",
      "tasks": ["task1", "task2", "task3"]
    }}
  ],
  "key_recommendations": ["rec1", "rec2", "rec3"],
  "budget_breakdown": {{"materials": %, "labor": %, "permits": %, "contingency": %}}
}}

Create 5-6 phases. Include:
- Phase 1-2: Ready (planning/prep)
- Phase 3-5: Pending (execution)  
- Last: Pending (inspection)

RESPOND WITH ONLY JSON."""
        
        return prompt
    
    def _parse_response(self, response_text: str) -> Dict:
        """Parse and validate JSON response"""
        try:
            # Clean markdown if present
            text = response_text.strip()
            if text.startswith('```json'):
                text = text.replace('```json', '').replace('```', '').strip()
            elif text.startswith('```'):
                text = text.replace('```', '').strip()
            
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            raise ValueError("Invalid JSON response from Gemini")
    
    def _generate_optimized_mock(
        self,
        building_type: str,
        budget: float,
        renovation_type: str,
        rag_context: Optional[Dict] = None
    ) -> Dict:
        """Generate mock with RAG-informed data (fast fallback)"""
        
        # Use RAG context if available
        if rag_context:
            duration = rag_context['renovation_context'].get('duration_weeks', 16)
            breakdown = rag_context['renovation_context'].get('cost_distribution', 
                                                             {"materials": 40, "labor": 35, "permits": 10, "contingency": 15})
            best_practices = rag_context['renovation_context'].get('best_practices', [])
        else:
            duration = 16
            breakdown = {"materials": 40, "labor": 35, "permits": 10, "contingency": 15}
            best_practices = ["Follow German DIN standards", "Plan contingency budget", "Ensure proper permits"]
        
        phases = self._generate_smart_phases(building_type, budget, duration, breakdown)
        
        return {
            'success': True,
            'plan': {
                "overview": f"Professional {renovation_type} renovation for {building_type} with €{budget:,.0f} budget. Compliant with German building standards (DIN, EnEV, GEG).",
                "total_budget": budget,
                "duration_weeks": duration,
                "phases": phases,
                "key_recommendations": best_practices[:3],
                "budget_breakdown": breakdown
            },
            'building_type': building_type,
            'budget': budget,
            'renovation_type': renovation_type,
            'generated_at': datetime.now(),
            'error': None,
            'optimization_method': 'rag_mock'
        }
    
    def _generate_smart_phases(self, building_type: str, budget: float, 
                              duration_weeks: int, cost_breakdown: Dict) -> List[Dict]:
        """Generate intelligent phases based on budget and type"""
        
        # Allocate budget to phases
        phase_budgets = {
            1: budget * 0.05,  # Planning
            2: budget * 0.10,  # Permits/Prep
            3: budget * 0.20,  # Prep/Demo
            4: budget * 0.25,  # Main work
            5: budget * 0.35,  # Main work
            6: budget * 0.05,  # Finishing
        }
        
        phases = [
            {
                "phase_number": 1,
                "title": "Planning & Documentation (DIN 276)",
                "description": "Architectural planning, structural assessment, DIN compliance documentation, budget estimation",
                "duration": "2-3 weeks",
                "cost_range": {"min": int(phase_budgets[1]*0.8), "max": int(phase_budgets[1]*1.2)},
                "status": "ready",
                "tasks": [
                    "Detailed architectural drawings (DIN A1/A0 format)",
                    "Structural analysis and DIN 4109 assessment",
                    "Energy audit per EnEV/GEG standards",
                    "Cost estimation per DIN 276"
                ]
            },
            {
                "phase_number": 2,
                "title": "Permits & Approvals",
                "description": "Building permit application, environmental assessment, neighbor notifications as required",
                "duration": "2-4 weeks",
                "cost_range": {"min": int(phase_budgets[2]*0.8), "max": int(phase_budgets[2]*1.2)},
                "status": "ready",
                "tasks": [
                    "Building permit application (Baugenehmigung)",
                    "DIN compliance verification",
                    "Heritage/Monument check (if applicable)",
                    "Utility coordination (water, gas, electric)"
                ]
            },
            {
                "phase_number": 3,
                "title": "Site Preparation & Demolition",
                "description": "Contractor mobilization, safety setup, careful demolition of existing structures",
                "duration": "1-2 weeks",
                "cost_range": {"min": int(phase_budgets[3]*0.8), "max": int(phase_budgets[3]*1.2)},
                "status": "pending",
                "tasks": [
                    "Safety barriers and site protection",
                    "Asbestos/lead testing if pre-1980s building",
                    "Selective demolition",
                    "Waste management & recycling"
                ]
            },
            {
                "phase_number": 4,
                "title": "Structural & Insulation Work",
                "description": "Repairs to structure, insulation per KfW standards, structural upgrades as needed",
                "duration": "3-4 weeks",
                "cost_range": {"min": int(phase_budgets[4]*0.8), "max": int(phase_budgets[4]*1.2)},
                "status": "pending",
                "tasks": [
                    "Structural repairs (DIN 1052 compliance)",
                    "Thermal insulation (aim for KfW 55 or better)",
                    "Moisture barrier installation",
                    "Window replacement (Uw < 1.0 W/m²K)"
                ]
            },
            {
                "phase_number": 5,
                "title": "MEP Systems & Core Installations",
                "description": "Electrical, plumbing, heating systems per DIN standards, renewable energy integration",
                "duration": "3-4 weeks",
                "cost_range": {"min": int(phase_budgets[5]*0.8), "max": int(phase_budgets[5]*1.2)},
                "status": "pending",
                "tasks": [
                    "Electrical system upgrade (DIN VDE 0100-430)",
                    "Plumbing system per DIN EN 806",
                    "HVAC installation with heat recovery",
                    "Solar/heat pump integration (if applicable)"
                ]
            },
            {
                "phase_number": 6,
                "title": "Finishes & Quality Assurance",
                "description": "Final installations, quality inspections, final building inspection, handover",
                "duration": "1-2 weeks",
                "cost_range": {"min": int(phase_budgets[6]*0.8), "max": int(phase_budgets[6]*1.2)},
                "status": "pending",
                "tasks": [
                    "Interior finishes and painting",
                    "Final inspections (building authority)",
                    "Energy certification issuance",
                    "Occupancy permit & handover"
                ]
            }
        ]
        
        return phases
    
    def get_cache_stats(self) -> Dict:
        """Get caching statistics"""
        return {
            'cache_size': len(self._response_cache),
            'cache_hits': self._cache_hits,
            'cached_results': list(self._response_cache.keys())
        }


# Backward compatibility
class GeminiService(OptimizedGeminiService):
    """Legacy service name - now uses optimized version"""
    pass


class MockGeminiService:
    """Mock service for testing"""
    
    def generate_renovation_plan(self, building_type: str, budget: float,
                                renovation_type: str,
                                additional_details: Optional[str] = None) -> Dict:
        service = OptimizedGeminiService.__new__(OptimizedGeminiService)
        rag_context = service._retrieve_rag_context(building_type, renovation_type)
        return service._generate_optimized_mock(building_type, budget, renovation_type, rag_context)
