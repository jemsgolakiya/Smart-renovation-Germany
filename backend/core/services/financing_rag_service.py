"""
RAG Service for Financing Module
Uses ChromaDB + Gemini Embeddings for German renovation financing knowledge

This service is specifically designed for the financing module and handles:
- Cost estimation for all renovation types
- German financing programs (KfW, BAFA, etc.)
- Regional price adjustments
- Quality tier pricing
"""

import os
import logging
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Don't import chromadb at module level to avoid Python 3.14 compatibility issues
# Import will happen lazily inside the class when needed
DEPENDENCIES_AVAILABLE = None  # Will be checked lazily


class Document:
    """Simple document class for RAG"""
    def __init__(self, page_content: str, metadata: Dict[str, Any] = None):
        self.page_content = page_content
        self.metadata = metadata or {}


class SimpleTextSplitter:
    """Text splitter for chunking documents with intelligent overlap"""
    def __init__(self, chunk_size: int = 1500, chunk_overlap: int = 300):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + self.chunk_size

            # Try to break at sentence boundary
            if end < text_len:
                # Look for sentence ending within last 200 chars
                sentence_end = text.rfind('.', end - 200, end)
                if sentence_end > start:
                    end = sentence_end + 1

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - self.chunk_overlap if end < text_len else end

        return chunks

    def split_documents(self, documents: List[Document]) -> List[Document]:
        """Split documents into chunks while preserving metadata"""
        chunked_docs = []

        for doc in documents:
            chunks = self.split_text(doc.page_content)
            for i, chunk in enumerate(chunks):
                chunked_doc = Document(
                    page_content=chunk,
                    metadata={
                        **doc.metadata,
                        'chunk_index': i,
                        'chunk_count': len(chunks)
                    }
                )
                chunked_docs.append(chunked_doc)

        return chunked_docs


class FinancingRAGService:
    """
    Production-ready RAG system for German renovation financing

    Features:
    - ChromaDB for vector storage
    - Gemini embeddings (text-embedding-004)
    - Response caching for performance
    - Support for all 11 renovation types
    - Regional price adjustments
    - Quality tier pricing
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize RAG service"""
        # Lazy import to avoid Python 3.14 compatibility issues at module load time
        self._chromadb = None
        self._genai = None
        self._dependencies_checked = False

        self.api_key = api_key or os.getenv('GEMINI_API_KEY')

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        # ChromaDB setup (will be initialized lazily)
        self.persist_directory = Path(__file__).parent.parent.parent / "data" / "financing_kb" / "chromadb"
        self.collection_name = "german_financing_2026"
        self.chroma_client = None
        self.collection = None
        self.gemini_model = None

        # Response cache (in-memory with TTL)
        self._cache = {}
        self._cache_ttl = timedelta(hours=24)

        logger.info("[Financing RAG] Service initialized (lazy loading enabled)")

    def _ensure_dependencies(self):
        """Lazy load dependencies when first needed"""
        if self._dependencies_checked:
            return

        self._dependencies_checked = True
        print("\n" + "="*70)
        print("[Financing RAG] INITIALIZING RAG SERVICE")
        print("="*70)

        try:
            import google.generativeai as genai

            self._genai = genai

            # Configure Gemini
            print("[Financing RAG] Configuring Gemini AI...")
            genai.configure(api_key=self.api_key)
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
            print("[Financing RAG] Gemini Model: gemini-2.0-flash-exp ✓")

            # Try to initialize ChromaDB
            try:
                print("[Financing RAG] Initializing ChromaDB vector database...")
                import chromadb
                self._chromadb = chromadb

                # Check if we have the full chromadb package or just chromadb-client
                # chromadb-client only supports HTTP client mode
                has_persistent_client = hasattr(chromadb, 'PersistentClient')

                if has_persistent_client:
                    # Full chromadb package - use PersistentClient
                    from chromadb.config import Settings
                    self._Settings = Settings

                    # ChromaDB setup
                    self.persist_directory.mkdir(parents=True, exist_ok=True)
                    print(f"[Financing RAG] ChromaDB Path: {self.persist_directory}")

                    self.chroma_client = chromadb.PersistentClient(
                        path=str(self.persist_directory),
                        settings=Settings(
                            anonymized_telemetry=False,
                            allow_reset=True
                        )
                    )
                    print("[Financing RAG] ChromaDB PersistentClient initialized ✓")

                    # Initialize collection
                    try:
                        self.collection = self.chroma_client.get_collection(name=self.collection_name)
                        doc_count = self.collection.count()
                        print(f"[Financing RAG] Collection '{self.collection_name}' loaded with {doc_count} document chunks ✓")
                        logger.info(f"[Financing RAG] Loaded collection with {doc_count} document chunks")
                    except Exception:
                        self.collection = None
                        print(f"[Financing RAG] WARNING: Collection '{self.collection_name}' not found. Run ingestion script first.")
                        logger.warning("[Financing RAG] Collection not found. Run ingestion script first.")

                    logger.info("[Financing RAG] Full ChromaDB initialized with PersistentClient")
                else:
                    # chromadb-client package - HTTP only, cannot use local persistence
                    logger.warning(
                        "[Financing RAG] chromadb-client (HTTP-only) detected. "
                        "Local persistence not available. Install full 'chromadb' package: "
                        "pip uninstall chromadb-client && pip install chromadb"
                    )
                    self.chroma_client = None
                    self.collection = None

            except ImportError as e:
                logger.warning(f"[Financing RAG] ChromaDB not available: {e}. RAG will use fallback mode.")
                self._chromadb = None
                self.chroma_client = None
                self.collection = None

            logger.info("[Financing RAG] Dependencies loaded (ChromaDB: %s)",
                       "available" if self.chroma_client else "fallback mode")

        except ImportError as e:
            logger.error(f"[Financing RAG] Core dependencies not available: {e}")
            raise ImportError(
                "Google Generative AI not available. "
                "Please install: pip install google-generativeai. "
                "Original error: " + str(e)
            )

    def _generate_cache_key(self, form_data: Dict[str, Any]) -> str:
        """Generate cache key from form data"""
        # Create deterministic hash from relevant form fields
        relevant_fields = {
            'renovationType': form_data.get('renovationType'),
            'propertySize': form_data.get('propertySize'),
            'qualityPreference': form_data.get('qualityPreference'),
            # Add other relevant fields
        }
        data_str = json.dumps(relevant_fields, sort_keys=True)
        return hashlib.md5(data_str.encode()).hexdigest()

    def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached response if still valid"""
        if cache_key in self._cache:
            cached_data, timestamp = self._cache[cache_key]
            if datetime.now() - timestamp < self._cache_ttl:
                logger.info(f"[Financing RAG] Cache hit for key: {cache_key[:8]}...")
                return cached_data
            else:
                # Expired
                del self._cache[cache_key]
        return None

    def _cache_response(self, cache_key: str, response: Dict[str, Any]):
        """Cache response with timestamp"""
        self._cache[cache_key] = (response, datetime.now())
        logger.info(f"[Financing RAG] Cached response for key: {cache_key[:8]}...")

    def _embed_text(self, text: str) -> List[float]:
        """Generate embedding for text using Gemini"""
        self._ensure_dependencies()
        try:
            result = self._genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"[Financing RAG] Error generating embedding: {e}")
            raise

    def _embed_query(self, query: str) -> List[float]:
        """Generate embedding for search query"""
        self._ensure_dependencies()
        try:
            result = self._genai.embed_content(
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"[Financing RAG] Error generating query embedding: {e}")
            raise

    def add_documents(
        self,
        documents: List[Document],
        chunk_size: int = 1500,
        chunk_overlap: int = 300
    ) -> int:
        """Add documents to ChromaDB collection"""
        self._ensure_dependencies()

        try:
            # Split documents into chunks
            splitter = SimpleTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            chunks = splitter.split_documents(documents)

            # Prepare data for ChromaDB
            ids = []
            texts = []
            embeddings = []
            metadatas = []

            logger.info(f"[Financing RAG] Generating embeddings for {len(chunks)} chunks...")
            for i, doc in enumerate(chunks):
                doc_id = f"doc_{datetime.now().strftime('%Y%m%d')}_{i}"
                ids.append(doc_id)
                texts.append(doc.page_content)
                embeddings.append(self._embed_text(doc.page_content))
                metadatas.append(doc.metadata)

                if (i + 1) % 10 == 0:
                    logger.info(f"[Financing RAG] Processed {i + 1}/{len(chunks)} chunks")

            # Create or get collection
            if self.collection is None:
                self.collection = self.chroma_client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "German renovation financing knowledge base 2026"}
                )

            # Add to ChromaDB
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas
            )

            logger.info(f"[Financing RAG] Successfully added {len(chunks)} document chunks")
            return len(chunks)

        except Exception as e:
            logger.error(f"[Financing RAG] Error adding documents: {e}")
            raise

    def retrieve_relevant_docs(
        self,
        query: str,
        k: int = 6,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """Retrieve relevant documents using semantic search"""
        self._ensure_dependencies()

        try:
            if self.collection is None:
                print("[Financing RAG] Collection not initialized")
                logger.warning("[Financing RAG] Collection not initialized")
                return []

            print(f"\n{'='*60}")
            print(f"[Financing RAG] Searching for top {k} relevant chunks")
            print(f"[Financing RAG] Query: {query[:100]}...")

            # Generate query embedding
            query_embedding = self._embed_query(query)

            # Search with optional metadata filter
            where_filter = filter_metadata if filter_metadata else None

            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k,
                where=where_filter,
                include=['documents', 'metadatas', 'distances']
            )

            # Convert to Document objects
            docs = []
            if results and results['documents'] and len(results['documents']) > 0:
                print(f"[Financing RAG] Found {len(results['documents'][0])} relevant chunks")
                for i in range(len(results['documents'][0])):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results.get('distances') else 0
                    relevance = 1 - distance  # Convert distance to relevance score
                    source = metadata.get('source', 'Unknown')

                    print(f"[Financing RAG]   {i+1}. {source} (relevance: {relevance:.3f})")

                    doc = Document(
                        page_content=results['documents'][0][i],
                        metadata=metadata
                    )
                    docs.append(doc)

            logger.info(f"[Financing RAG] Retrieved {len(docs)} relevant documents")
            return docs

        except Exception as e:
            logger.error(f"[Financing RAG] Error retrieving documents: {e}")
            return []

    def _build_search_query(self, form_data: Dict[str, Any], planning_data: Dict[str, Any] = None) -> str:
        """Build intelligent search query based on form data and planning data"""
        parts = []

        # Renovation type is most important
        renovation_type = form_data.get('renovationType', '')
        if renovation_type:
            parts.append(renovation_type)

            # Add type-specific keywords for better retrieval
            type_keywords = {
                'bathroom': 'tiles fixtures plumbing waterproofing shower toilet',
                'kitchen': 'cabinets countertops appliances backsplash',
                'basement': 'moisture waterproofing insulation finishing',
                'roofing': 'shingles insulation drainage gutters',
                'electrical': 'wiring outlets switches circuit breaker',
                'plumbing': 'pipes drainage water supply fixtures',
                'hvac': 'heating cooling ventilation air conditioning',
                'flooring': 'tiles laminate parquet installation',
                'windows_doors': 'glazing frames insulation security',
                'exterior': 'facade render insulation painting',
                'general': 'renovation modernization upgrading'
            }

            for key, keywords in type_keywords.items():
                if key in renovation_type.lower():
                    parts.append(keywords)
                    break

        # Add location for regional pricing
        location = form_data.get('location', '')
        if location:
            parts.append(f"regional prices {location}")

        # Add quality keywords
        quality = form_data.get('qualityPreference', 'standard')
        parts.append(f"{quality} quality materials")

        # Add cost estimation keywords
        parts.append("2026 German market prices cost estimation materials labor")

        # Add financing keywords
        parts.append("KfW BAFA financing programs grants subsidies loans")

        # INTEGRATION: Add planning data context to search query for more accurate retrieval
        if planning_data:
            project_plan = planning_data.get('projectPlan', {})
            api_plan = planning_data.get('apiPlanData', {})

            # Add building type for context
            building_type = project_plan.get('buildingType', '')
            if building_type:
                parts.append(f"{building_type} building")

            # Add location from planning if not already specified
            bundesland = project_plan.get('bundesland', '')
            if bundesland and not location:
                parts.append(f"regional prices {bundesland}")

            # Add goals for relevant financing programs
            goals = project_plan.get('goals', [])
            for goal in goals:
                goal_lower = goal.lower()
                if 'energy' in goal_lower or 'insulation' in goal_lower:
                    parts.append("energy efficiency KfW BEG BAFA")
                if 'solar' in goal_lower:
                    parts.append("solar photovoltaic subsidy")
                if 'heating' in goal_lower:
                    parts.append("heat pump heating system subsidy")
                if 'bathroom' in goal_lower:
                    parts.append("bathroom renovation accessibility")
                if 'kitchen' in goal_lower:
                    parts.append("kitchen renovation appliances")

            # Add financing preference
            financing_pref = project_plan.get('financingPreference', '')
            if financing_pref:
                if 'loan' in financing_pref.lower():
                    parts.append("renovation loan bank financing credit")
                elif 'self' in financing_pref.lower():
                    parts.append("savings tax deduction Handwerkerleistungen")

            # Add timeline urgency if specified
            timeline = project_plan.get('timeline', '')
            if timeline and 'urgent' in timeline.lower():
                parts.append("fast renovation quick turnaround")

            logger.info(f"[Financing RAG] Planning data integrated into search query: budget={project_plan.get('budget')}, location={bundesland}")

        return " ".join(parts)

    def build_augmented_prompt(
        self,
        query: str,
        form_data: Dict[str, Any],
        retrieved_docs: List[Document],
        planning_data: Dict[str, Any] = None  # INTEGRATION: Planning data from Planning module
    ) -> str:
        """Build comprehensive augmented prompt with retrieved context and planning data"""
        # Build context from retrieved documents
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            source = doc.metadata.get('source', 'Unknown')
            context_parts.append(
                f"[Source {i}] ({source}):\n{doc.page_content}\n"
            )

        context = "\n".join(context_parts)

        # Extract relevant form data
        renovation_type = form_data.get('renovationType', 'Not specified')
        quality_preference = form_data.get('qualityPreference', 'standard')
        bathroom_size = form_data.get('bathroomSize', 8)

        # INTEGRATION: Build planning data context section
        planning_context = ""
        if planning_data:
            project_plan = planning_data.get('projectPlan', {})
            api_plan = planning_data.get('apiPlanData', {})

            planning_context = f"""
PLANNING MODULE DATA (Use this for MORE ACCURATE cost estimation):
- Building Type: {project_plan.get('buildingType', 'Not specified')}
- Building Size: {project_plan.get('buildingSize', 'Not specified')} sqm
- Building Age: {project_plan.get('buildingAge', 'Not specified')}
- Location (Bundesland): {project_plan.get('bundesland', 'Not specified')}
- User Budget: {project_plan.get('budget', 'Not specified'):,} EUR
- Financing Preference: {project_plan.get('financingPreference', 'Not specified')}
- Timeline: {project_plan.get('timeline', 'Not specified')}
- Renovation Goals: {', '.join(project_plan.get('goals', ['Not specified']))}
"""
            # Add generated plan phases if available
            if api_plan and api_plan.get('plan'):
                plan_data = api_plan.get('plan', {})
                phases = plan_data.get('phases', [])
                if phases:
                    planning_context += f"\nGENERATED PLAN ({len(phases)} Phases):\n"
                    for i, phase in enumerate(phases[:5], 1):  # Show first 5 phases
                        phase_title = phase.get('phase_title', 'Unknown')
                        cost_min = phase.get('cost_estimate_min', 0)
                        cost_max = phase.get('cost_estimate_max', 0)
                        planning_context += f"  {i}. {phase_title}: EUR {cost_min:,} - EUR {cost_max:,}\n"
                    if len(phases) > 5:
                        planning_context += f"  ... and {len(phases) - 5} more phases\n"

                # Add permits if available
                permits = plan_data.get('permits', [])
                if permits:
                    planning_context += f"\nREQUIRED PERMITS ({len(permits)}):\n"
                    for permit in permits[:3]:
                        planning_context += f"  - {permit.get('permit_name', 'Unknown')}\n"

            planning_context += """
IMPORTANT INSTRUCTIONS FOR PLANNING DATA:
1. Use the USER BUDGET to calibrate your cost estimates - aim to be within this budget if realistic
2. Use the BUILDING AGE to estimate additional costs (older buildings typically need more work)
3. Use the LOCATION (Bundesland) for regional price adjustments
4. Consider the FINANCING PREFERENCE when suggesting financing options
5. Align your cost breakdown with the GENERATED PLAN phases if available
6. If user budget seems unrealistic, provide honest feedback about expected costs
"""
            logger.info(f"[Financing RAG] Planning context added to prompt: budget={project_plan.get('budget')}, building_type={project_plan.get('buildingType')}")

        prompt = f"""You are an expert German home renovation cost estimator and financing advisor with access to 2026 market data.
{planning_context}

RETRIEVED KNOWLEDGE BASE (use this for accurate calculations):
{context}

USER PROJECT DETAILS:
- Renovation Type: {renovation_type}
- Quality Preference: {quality_preference}
{self._format_form_data(form_data)}

GERMAN RENOVATION COST GUIDELINES (2025-2026):

LABOR COSTS (German Market Rates):
- Demolition (Abbruch): 20-40 EUR per m² (older buildings cost more)
- Plumbing (Sanitär): 60-90 EUR per hour
- Electrical (Elektrik): 50-80 EUR per hour
- Tiling (Fliesenleger): 30-80 EUR per m² (labor only, depends on tile type)

MATERIAL COSTS BY QUALITY:
- Budget: 15-30 EUR per m² tiles, 150-300 EUR toilet, 80-150 EUR faucet
- Standard: 35-60 EUR per m² tiles, 300-600 EUR toilet (Villeroy & Boch), 150-400 EUR faucet (Grohe)
- Premium: 70-150 EUR per m² tiles, 600-1500 EUR toilet (Duravit designer), 400-1000 EUR faucet (Hansgrohe)
- Luxury: 150-400+ EUR per m² tiles (natural stone), 1500-5000+ EUR smart toilet

CRITICAL INSTRUCTIONS:

1. COST ESTIMATION - MUST INCLUDE DETAILED BREAKDOWN:
   - Calculate realistic costs based on German market data
   - Apply regional price factors if location is provided
   - Consider property size, quality level, and renovation scope
   - Provide DETAILED breakdown with subcategories and line items
   - Include 15% contingency reserve for unexpected costs

2. EXECUTIVE SUMMARY - REQUIRED:
   - Provide comprehensive overview of the project
   - List 4-5 key cost highlights with percentages
   - Explain main cost drivers
   - Give AI recommendation for financing
   - Provide 4-5 cost saving tips

3. QUALITY TIERS - REQUIRED:
   - Provide cost estimates for standard, premium, and luxury tiers
   - List key features included in each tier

4. ASSUMPTIONS AND RISKS - REQUIRED:
   - List all cost assumptions made
   - Identify potential cost risks with impact and likelihood

5. FINANCING INSIGHTS - REQUIRED:
   - Identify eligible financing programs (KfW, BAFA, tax deductions)
   - Mark each as eligible (true) or not applicable (false)

RESPOND IN EXACT JSON FORMAT (DETAILED PROFESSIONAL CONSULTANT-STYLE):
{{
  "costEstimate": {{
    "totalEstimatedCost": <calculated_number>,
    "renovationType": "{renovation_type.title()} Renovation",
    "qualityLevel": "{quality_preference.title() if quality_preference else 'Standard'}",
    "estimatedDuration": "3-5 weeks",
    "locationAssumption": "Germany (2026 prices, mid-to-large city)",
    "breakdown": [
      {{
        "category": "Category name (e.g., Demolition and Disposal)",
        "cost": <calculated_number>,
        "description": "Brief description of this category",
        "subcategories": [
          {{
            "name": "Subcategory name (e.g., Demolition Work)",
            "subtotal": <calculated_number>,
            "items": [
              {{"item": "Specific item description", "quantity": 1, "unit": "piece/sqm/hour", "unitPrice": 100, "cost": 100, "note": "Optional note"}}
            ]
          }}
        ]
      }}
    ],
    "contingency": <15_percent_of_total>,
    "explanation": "Detailed cost methodology explanation with German market references",
    "executiveSummary": {{
      "overview": "2-3 sentence comprehensive project overview describing the renovation scope and key features",
      "keyHighlights": [
        "Category X represents Y% of total cost (Z EUR) - reason",
        "Labor costs account for approximately 40% of total project",
        "15% contingency reserve recommended for older buildings",
        "Quality fixtures from German brands ensure durability"
      ],
      "costDrivers": "The main cost drivers are: (1) Description of primary driver, (2) Second driver, (3) Third driver. Choosing standard quality tier would reduce costs by approximately X%.",
      "recommendation": "Based on this estimate, I recommend exploring KfW financing programs if applicable. The investment in quality materials ensures durability and property value. Consider obtaining 3 contractor quotes before finalizing.",
      "savingsTips": [
        "Opt for standard porcelain tiles instead of premium - saves X EUR",
        "Choose mid-range fixtures with similar quality - saves Y EUR",
        "Reduce tiling height from full to 3/4 height - saves Z EUR",
        "Consider partial DIY for demolition if capable - saves W EUR"
      ]
    }},
    "assumptions": [
      "Standard German residential property",
      "Bathroom/room size approximately X sqm",
      "No major structural wall changes required",
      "Existing plumbing routes can be partially reused",
      "Mid-to-large German city pricing",
      "Material availability within 4-6 weeks",
      "Work performed during normal business hours"
    ],
    "risks": [
      {{"factor": "Hidden water damage behind walls", "impact": "+1000-3000 EUR", "likelihood": "medium"}},
      {{"factor": "Asbestos in old materials (pre-1993)", "impact": "+2000-4000 EUR", "likelihood": "low"}},
      {{"factor": "Outdated electrical wiring requiring upgrade", "impact": "+500-1500 EUR", "likelihood": "medium"}},
      {{"factor": "Supply chain delays for fixtures", "impact": "+2-4 weeks", "likelihood": "medium"}}
    ],
    "financingInsights": [
      {{"text": "Eligible for KfW 159 (Age-appropriate conversion) if accessibility features included", "eligible": true}},
      {{"text": "KfW 261/262 available if combined with energy efficiency measures", "eligible": true}},
      {{"text": "Labor costs tax-deductible up to 6000 EUR per year (Paragraph 35a EStG)", "eligible": true}},
      {{"text": "BAFA subsidy available if heat pump or solar thermal included", "eligible": false}}
    ],
    "qualityTiers": [
      {{
        "tier": "standard",
        "totalCost": <70_percent_of_premium>,
        "highlights": ["Basic ceramic tiles", "Standard brand fixtures", "Chrome finish faucets", "Basic LED lighting"]
      }},
      {{
        "tier": "premium",
        "totalCost": <main_estimate>,
        "highlights": ["Quality porcelain tiles", "German brand fixtures (Villeroy & Boch)", "Designer LED lighting", "Soft-close furniture"]
      }},
      {{
        "tier": "luxury",
        "totalCost": <150_percent_of_premium>,
        "highlights": ["Natural stone tiles", "Smart toilet with bidet", "Designer faucets (Dornbracht)", "Underfloor heating", "Custom vanity"]
      }}
    ]
  }},
  "metadata": {{
    "rag_enabled": true
  }}
}}

CRITICAL RULES:
1. Return ONLY valid JSON, no markdown, no code blocks, no extra text
2. Do NOT use apostrophes or special quotes inside strings - use simple quotes or avoid them
3. ALL numeric values must be numbers (not strings) except for formatted amounts like "3-4 weeks"
4. The breakdown MUST have detailed subcategories with line items for professional analysis
5. executiveSummary, assumptions, risks, financingInsights, and qualityTiers are ALL REQUIRED
6. Calculate realistic German market prices based on the quality preference and project scope"""

        return prompt

    def _format_form_data(self, form_data: Dict[str, Any]) -> str:
        """Format form data for prompt"""
        lines = []

        # Add all relevant fields
        field_labels = {
            'qualityPreference': 'Quality Preference',
            'bathroomRenovationAreas': 'Renovation Areas',
            'renovationGoal': 'Renovation Goals',
            'bathroomSize': 'Bathroom Size (m²)',
            'propertyAge': 'Property Age',
            'location': 'Location',
            # Add more fields as needed
        }

        for field, label in field_labels.items():
            value = form_data.get(field)
            if value:
                if isinstance(value, list):
                    lines.append(f"- {label}: {', '.join(str(v) for v in value)}")
                else:
                    lines.append(f"- {label}: {value}")

        return "\n".join(lines) if lines else "- No additional details provided"

    def analyze_financing(
        self,
        form_data: Dict[str, Any],
        use_cache: bool = True,
        debug_mode: bool = False,
        planning_data: Dict[str, Any] = None  # INTEGRATION: Planning data from Planning module
    ) -> Dict[str, Any]:
        """
        Perform comprehensive RAG analysis for financing

        Args:
            form_data: User's renovation form data
            use_cache: Whether to use response caching
            debug_mode: Whether to include debug information
            planning_data: Optional planning data from Planning module containing
                          projectPlan (user inputs) and apiPlanData (generated plan)

        Returns:
            Dict containing cost estimate, financing recommendations, and metadata
        """
        # Ensure dependencies are loaded
        self._ensure_dependencies()

        try:
            # Check cache first
            if use_cache:
                cache_key = self._generate_cache_key(form_data)
                cached = self._get_cached_response(cache_key)
                if cached:
                    cached['metadata']['cached'] = True
                    return cached

            # Build search query with planning data integration
            query = self._build_search_query(form_data, planning_data)
            logger.info(f"[Financing RAG] Search query: {query[:100]}...")

            # Retrieve relevant documents
            relevant_docs = self.retrieve_relevant_docs(query=query, k=6)

            if not relevant_docs:
                logger.warning("[Financing RAG] No relevant documents found, using fallback")
                return self._generate_fallback_response(form_data)

            # Build augmented prompt with planning data integration
            prompt = self.build_augmented_prompt(query, form_data, relevant_docs, planning_data)

            # Generate response using Gemini
            logger.info("[Financing RAG] Generating AI response...")
            response = self.gemini_model.generate_content(prompt)

            # Parse JSON response
            result = json.loads(self._clean_json_response(response.text))

            # Add metadata
            result['metadata'] = {
                'documents_retrieved': len(relevant_docs),
                'sources_used': list(set(doc.metadata.get('source', 'Unknown') for doc in relevant_docs)),
                'rag_enabled': True,
                'backend': 'ChromaDB + Gemini',
                'model': 'gemini-2.0-flash-exp',
                'cached': False,
                'timestamp': datetime.now().isoformat(),
                'planning_data_integrated': planning_data is not None  # INTEGRATION: Track planning data usage
            }

            # Add debug information if requested
            if debug_mode:
                result['debug'] = {
                    'form_data': form_data,
                    'search_query': query,
                    'retrieved_documents': [
                        {
                            'content_preview': doc.page_content[:200] + '...',
                            'source': doc.metadata.get('source', 'Unknown'),
                            'chunk_index': doc.metadata.get('chunk_index', 0)
                        }
                        for doc in relevant_docs
                    ],
                    'prompt_length': len(prompt),
                    'raw_response_preview': response.text[:500] + '...'
                }

            # Cache the result
            if use_cache:
                self._cache_response(cache_key, result)

            logger.info("[Financing RAG] Analysis completed successfully")
            return result

        except json.JSONDecodeError as e:
            logger.error(f"[Financing RAG] JSON parsing error: {e}")
            return self._generate_fallback_response(form_data, error="JSON parsing failed")
        except Exception as e:
            logger.error(f"[Financing RAG] Error in analysis: {e}", exc_info=True)
            return self._generate_fallback_response(form_data, error=str(e))

    def analyze_financing_options_only(
        self,
        form_data: Dict[str, Any],
        cost_estimate: Dict[str, Any],
        original_prompt: str,
        photo_analysis: Dict[str, Any] = None,
        user_answers: Dict[str, Any] = None,
        planning_data: Dict[str, Any] = None,  # INTEGRATION: Planning data from Planning module
        use_cache: bool = False,
        debug_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Generate comprehensive financing options based on cost estimate, photo analysis, and user answers.

        This method provides extremely detailed financing analysis using RAG-enhanced knowledge
        from the German financing database combined with:
        - Photo analysis insights (detected issues, conditions, accessibility features)
        - User's answers to 15 budget/financing questions
        - Cost estimation data

        Args:
            form_data: User's renovation form data
            cost_estimate: Previously generated cost estimate
            original_prompt: Original prompt used for cost estimation
            photo_analysis: Photo analysis results from Smart Photo Analysis (optional)
            user_answers: User's answers to 15 budget questions (optional)
            use_cache: Whether to use response caching
            debug_mode: Whether to include debug information

        Returns:
            Dict containing comprehensive financing recommendations including:
            - financingSummary: Executive overview
            - recommendations: 5-8 detailed financing programs
            - eligibilityMatrix: User eligibility analysis
            - comparisonTable: Side-by-side program comparison
            - optimalStrategy: Recommended combination of programs
            - documentChecklist: Required documents by category
            - taxBenefits: Tax deduction opportunities
            - actionPlan: Week-by-week timeline
            - riskAssessment: Risk analysis and mitigation
            - nextSteps: Immediate action items
        """
        # Ensure dependencies are loaded
        self._ensure_dependencies()

        try:
            print("\n" + "="*60)
            print("[Financing Options RAG] Starting comprehensive financing analysis...")
            print("="*60)
            logger.info("[Financing Options RAG] Starting comprehensive financing analysis...")

            # Log input data summary
            renovation_type = form_data.get('renovationType', 'Unknown')
            total_cost = cost_estimate.get('totalEstimatedCost', 0)
            print(f"[Financing Options RAG] Renovation Type: {renovation_type}")
            print(f"[Financing Options RAG] Estimated Cost: €{total_cost:,.2f}")
            if photo_analysis:
                issues_count = len(photo_analysis.get('detectedIssues', []))
                features_count = len(photo_analysis.get('detectedFeatures', []))
                print(f"[Financing Options RAG] Photo Analysis: {issues_count} issues, {features_count} features detected")
            if user_answers:
                print(f"[Financing Options RAG] User Answers: {len(user_answers)} responses provided")
            if planning_data:
                print(f"[Financing Options RAG] Planning Data: Integrated from Planning module")

            # Build enhanced search query focused on financing programs
            query = self._build_financing_search_query(form_data, cost_estimate)
            print(f"[Financing Options RAG] Building search query for financing programs...")

            # Add photo analysis context to query if available
            if photo_analysis:
                detected_issues = photo_analysis.get('detectedIssues', [])
                if detected_issues:
                    # Check for issues that might affect financing (mold, water damage, etc.)
                    issue_types = [i.get('issue', '').lower() for i in detected_issues]
                    if any('water' in i or 'mold' in i or 'damage' in i for i in issue_types):
                        query += " renovation repair insurance claims water damage"

                # Check for accessibility features (KfW 159 eligibility)
                detected_features = photo_analysis.get('detectedFeatures', [])
                accessibility_features = [f for f in detected_features if any(
                    kw in f.get('feature', '').lower()
                    for kw in ['grab', 'barrier', 'accessible', 'walk-in', 'wide']
                )]
                if accessibility_features:
                    query += " KfW 159 accessibility barrier-free altersgerecht DIN 18040"

            # Add user preferences to query if available
            if user_answers:
                kfw_interest = user_answers.get('rag_kfw_programs', [])
                if isinstance(kfw_interest, list) and kfw_interest:
                    query += " " + " ".join(kfw_interest)

                energy_goals = user_answers.get('rag_energy_efficiency', [])
                if isinstance(energy_goals, list) and energy_goals and energy_goals != ['none']:
                    query += " energy efficiency BEG KfW 261 262"

            # INTEGRATION: Add planning data context to query if available
            if planning_data:
                project_plan = planning_data.get('projectPlan', {})
                # Add financing preference to query
                financing_pref = project_plan.get('financingPreference', '')
                if financing_pref:
                    if 'loan' in financing_pref.lower():
                        query += " renovation loan bank financing credit"
                    elif 'self' in financing_pref.lower():
                        query += " savings tax deduction Handwerkerleistungen"
                # Add goals to query for relevant financing programs
                goals = project_plan.get('goals', [])
                for goal in goals:
                    goal_lower = goal.lower()
                    if 'energy' in goal_lower or 'insulation' in goal_lower:
                        query += " KfW 261 262 BEG energy efficiency BAFA"
                    if 'solar' in goal_lower:
                        query += " BAFA solar subsidy photovoltaic"
                    if 'heating' in goal_lower:
                        query += " KfW heat pump heating system subsidy"
                logger.info(f"[Financing Options RAG] Planning data integrated: budget={project_plan.get('budget')}, location={project_plan.get('bundesland')}")

            print(f"[Financing Options RAG] Enhanced search query: {query[:150]}...")
            logger.info(f"[Financing Options RAG] Enhanced search query: {query[:150]}...")

            # Retrieve more documents for comprehensive analysis
            relevant_docs = self.retrieve_relevant_docs(query=query, k=12)

            if not relevant_docs:
                print("[Financing Options RAG] No relevant documents found, using fallback")
                logger.warning("[Financing Options RAG] No relevant documents found, using fallback")
                return self._generate_financing_options_fallback(form_data, cost_estimate)

            print(f"[Financing Options RAG] Retrieved {len(relevant_docs)} documents for analysis")
            logger.info(f"[Financing Options RAG] Retrieved {len(relevant_docs)} documents for analysis")

            # Print RAG context summary
            print("\n" + "="*60)
            print("[Financing Options RAG] RAG CONTEXT RETRIEVED SUCCESSFULLY")
            print("="*60)
            print("=== RELEVANT KNOWLEDGE FROM GERMAN FINANCING DATABASE ===\n")
            for idx, doc in enumerate(relevant_docs[:6], 1):  # Show first 6 docs
                source = doc.metadata.get('source', 'Unknown')
                content_preview = doc.page_content[:200].replace('\n', ' ')
                print(f"[Source {idx}: {source}]")
                print(f"{content_preview}...")
                print("---")

            # Build comprehensive financing-focused prompt
            # INTEGRATION: Pass planning data to enhance the prompt
            prompt = self._build_financing_options_prompt(
                form_data=form_data,
                cost_estimate=cost_estimate,
                retrieved_docs=relevant_docs,
                photo_analysis=photo_analysis,
                user_answers=user_answers,
                planning_data=planning_data  # INTEGRATION: Include planning data
            )

            print(f"\n[Financing Options RAG] Built comprehensive prompt ({len(prompt)} chars)")
            logger.info(f"[Financing Options RAG] Built comprehensive prompt ({len(prompt)} chars)")

            # Generate response using Gemini with increased token limit for detailed response
            print("[Financing Options RAG] Generating comprehensive AI response...")
            logger.info("[Financing Options RAG] Generating comprehensive AI response...")

            generation_config = {
                "temperature": 0.3,  # Lower temperature for more factual responses
                "max_output_tokens": 8192,  # Allow longer response for detailed analysis
            }

            print("[Financing Options RAG] Sending request to Gemini 2.0 Flash...")
            print(f"[Financing Options RAG] Model: gemini-2.0-flash-exp")
            print(f"[Financing Options RAG] Temperature: 0.3 (factual mode)")
            print(f"[Financing Options RAG] Max tokens: 8192")

            response = self.gemini_model.generate_content(
                prompt,
                generation_config=generation_config
            )

            print(f"\n[Financing Options RAG] AI Response received!")
            print(f"[Financing Options RAG] Response length: {len(response.text)} characters")
            print(f"[Financing Options RAG] Response preview: {response.text[:200]}...")

            # Parse JSON response with retry mechanism
            print("\n[Financing Options RAG] Parsing JSON response...")
            cleaned_response = self._clean_json_response(response.text)
            try:
                result = json.loads(cleaned_response)
                print("[Financing Options RAG] JSON parsed successfully ✓")
            except json.JSONDecodeError as parse_error:
                print(f"[Financing Options RAG] JSON parse failed: {parse_error}")
                print("[Financing Options RAG] Attempting AI-assisted JSON repair...")
                # Try one more time with a simpler repair prompt
                repair_prompt = f"""The following JSON has syntax errors. Fix ONLY the JSON syntax errors and return valid JSON.
Do not change any content, just fix missing commas, brackets, or quotes.
Return ONLY the fixed JSON, no explanations.

{cleaned_response[:15000]}"""

                repair_response = self.gemini_model.generate_content(
                    repair_prompt,
                    generation_config={"temperature": 0.1, "max_output_tokens": 8192}
                )
                repaired_json = self._clean_json_response(repair_response.text)
                result = json.loads(repaired_json)
                print("[Financing Options RAG] JSON successfully repaired ✓")

            # Ensure all required sections are present
            required_sections = [
                'financingSummary', 'recommendations', 'eligibilityMatrix',
                'comparisonTable', 'optimalStrategy', 'documentChecklist',
                'taxBenefits', 'actionPlan', 'riskAssessment', 'nextSteps'
            ]

            print("\n[Financing Options RAG] Validating response sections...")
            sections_found = 0
            sections_missing = 0
            for section in required_sections:
                if section in result:
                    sections_found += 1
                    print(f"[Financing Options RAG]   ✓ {section}")
                else:
                    sections_missing += 1
                    print(f"[Financing Options RAG]   ✗ {section} (MISSING)")
                    logger.warning(f"[Financing Options RAG] Missing section: {section}")
            print(f"[Financing Options RAG] Sections: {sections_found}/{len(required_sections)} found")

            # Add comprehensive metadata
            result['metadata'] = {
                'documents_retrieved': len(relevant_docs),
                'sources_used': list(set(doc.metadata.get('source', 'Unknown') for doc in relevant_docs)),
                'rag_enabled': True,
                'backend': 'ChromaDB + Gemini',
                'model': 'gemini-2.0-flash-exp',
                'cached': False,
                'timestamp': datetime.now().isoformat(),
                'photo_analysis_used': photo_analysis is not None,
                'user_answers_used': user_answers is not None,
                'analysis_type': 'comprehensive',
                'prompt_length': len(prompt)
            }

            # Add debug information if requested
            if debug_mode:
                result['debug'] = {
                    'form_data': form_data,
                    'search_query': query,
                    'photo_analysis_summary': {
                        'condition_score': photo_analysis.get('photoAnalysis', {}).get('conditionScore') if photo_analysis else None,
                        'issues_count': len(photo_analysis.get('detectedIssues', [])) if photo_analysis else 0,
                        'features_count': len(photo_analysis.get('detectedFeatures', [])) if photo_analysis else 0
                    } if photo_analysis else None,
                    'user_answers_summary': {
                        key: user_answers.get(key) for key in [
                            'rag_budget_range', 'rag_financing_method', 'rag_kfw_programs'
                        ]
                    } if user_answers else None,
                    'retrieved_documents': [
                        {
                            'content_preview': doc.page_content[:300] + '...',
                            'source': doc.metadata.get('source', 'Unknown'),
                            'chunk_index': doc.metadata.get('chunk_index', 0)
                        }
                        for doc in relevant_docs
                    ],
                    'prompt_length': len(prompt),
                    'response_length': len(response.text)
                }

            # Print detailed summary of the result
            recommendations = result.get('recommendations', [])
            print("\n" + "="*70)
            print("[Financing Options RAG] ✓ COMPREHENSIVE FINANCING ANALYSIS COMPLETED!")
            print("="*70)
            print(f"\n[Financing Options RAG] RESULT SUMMARY:")
            print(f"[Financing Options RAG]   • Financing Recommendations: {len(recommendations)}")
            for i, rec in enumerate(recommendations[:5], 1):
                prog_name = rec.get('programName', rec.get('name', 'Unknown'))
                max_amount = rec.get('maxAmount', rec.get('maxFunding', 'N/A'))
                print(f"[Financing Options RAG]     {i}. {prog_name} (Max: €{max_amount})")
            if len(recommendations) > 5:
                print(f"[Financing Options RAG]     ... and {len(recommendations) - 5} more")

            # Show other sections
            if 'financingSummary' in result:
                total_available = result['financingSummary'].get('totalFinancingAvailable', 'N/A')
                print(f"[Financing Options RAG]   • Total Financing Available: €{total_available}")
            if 'taxBenefits' in result:
                print(f"[Financing Options RAG]   • Tax Benefits: Included")
            if 'actionPlan' in result:
                steps = len(result['actionPlan'].get('steps', result['actionPlan'].get('timeline', [])))
                print(f"[Financing Options RAG]   • Action Plan Steps: {steps}")

            print(f"\n[Financing Options RAG] Metadata:")
            print(f"[Financing Options RAG]   • RAG Documents Used: {len(relevant_docs)}")
            print(f"[Financing Options RAG]   • Response Length: {len(response.text)} chars")
            print(f"[Financing Options RAG]   • Model: gemini-2.0-flash-exp")
            print("="*70 + "\n")
            logger.info("[Financing Options RAG] Comprehensive financing analysis completed successfully")
            return result

        except json.JSONDecodeError as e:
            # Log more details about the JSON error for debugging
            error_context = ""
            if hasattr(e, 'pos') and hasattr(e, 'doc'):
                start = max(0, e.pos - 50)
                end = min(len(e.doc), e.pos + 50)
                error_context = f" | Context: ...{e.doc[start:end]}..."
            print(f"[Financing Options RAG] JSON parsing error after all repair attempts: {e}{error_context}")
            logger.error(f"[Financing Options RAG] JSON parsing error after all repair attempts: {e}{error_context}")
            return self._generate_financing_options_fallback(form_data, cost_estimate, error="JSON parsing failed")
        except Exception as e:
            print(f"[Financing Options RAG] Error in analysis: {e}")
            logger.error(f"[Financing Options RAG] Error in analysis: {e}", exc_info=True)
            return self._generate_financing_options_fallback(form_data, cost_estimate, error=str(e))

    def _build_financing_search_query(self, form_data: Dict[str, Any], cost_estimate: Dict[str, Any]) -> str:
        """Build search query specifically for financing programs"""
        print("\n[Financing RAG] Building search query for financing programs...")
        parts = []

        # Add renovation type
        reno_type = form_data.get('renovationType', '')
        if reno_type:
            parts.append(reno_type + " renovation financing")
            print(f"[Financing RAG]   + Renovation type: {reno_type}")

        # Add cost range
        total_cost = cost_estimate.get('totalEstimatedCost', 0)
        if total_cost > 0:
            if total_cost < 25000:
                parts.append("small renovation financing microloans")
                print(f"[Financing RAG]   + Cost range: Small (<€25,000) - microloans")
            elif total_cost < 75000:
                parts.append("medium renovation financing bank loans KfW")
                print(f"[Financing RAG]   + Cost range: Medium (€25,000-€75,000) - bank loans, KfW")
            else:
                parts.append("large renovation financing KfW BAFA subsidies")
                print(f"[Financing RAG]   + Cost range: Large (>€75,000) - KfW, BAFA subsidies")

        # Add location for state-specific programs
        location = form_data.get('propertyLocation', '')
        if location:
            parts.append(f"{location} state programs regional financing")
            print(f"[Financing RAG]   + Location: {location} (state-specific programs)")

        # Add energy efficiency keywords
        if 'energy' in str(form_data).lower() or 'insulation' in str(form_data).lower():
            parts.append("energy efficiency KfW 261 KfW 262 BAFA BEG subsidies grants")
            print("[Financing RAG]   + Energy efficiency keywords added (KfW 261/262, BAFA, BEG)")

        # Add general financing keywords
        parts.append("KfW programs BAFA grants bank loans subsidies interest rates 2026")
        print("[Financing RAG]   + General financing keywords added")

        query = " ".join(parts)
        print(f"[Financing RAG] Final search query ({len(query)} chars)")
        return query

    def _build_financing_options_prompt(
        self,
        form_data: Dict[str, Any],
        cost_estimate: Dict[str, Any],
        retrieved_docs: List[Document],
        photo_analysis: Dict[str, Any] = None,
        user_answers: Dict[str, Any] = None,
        planning_data: Dict[str, Any] = None  # INTEGRATION: Planning data from Planning module
    ) -> str:
        """
        Build comprehensive prompt for detailed financing options generation.

        This method creates an extensive prompt that leverages:
        - RAG-retrieved German financing knowledge
        - Photo analysis insights (detected issues, conditions)
        - User's budget question answers (15 questions)
        - Cost estimation data
        - Planning data from Planning module (if available)
        """
        print("\n" + "="*70)
        print("[Financing RAG] BUILDING COMPREHENSIVE FINANCING PROMPT")
        print("="*70)

        # Build context from retrieved documents
        print(f"[Financing RAG] Processing {len(retrieved_docs)} RAG documents...")
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            source = doc.metadata.get('source', 'Unknown')
            content_preview = doc.page_content[:100].replace('\n', ' ')
            print(f"[Financing RAG]   Doc {i}: {source} - '{content_preview}...'")
            context_parts.append(
                f"[Source {i}] ({source}):\n{doc.page_content}\n"
            )

        context = "\n".join(context_parts)
        print(f"[Financing RAG] RAG context built: {len(context)} characters")

        # Extract core data
        renovation_type = form_data.get('renovationType', 'general')
        total_cost = cost_estimate.get('totalEstimatedCost', 0)
        location = form_data.get('propertyLocation', 'Germany')
        quality_level = cost_estimate.get('qualityLevel', 'standard')
        estimated_duration = cost_estimate.get('estimatedDuration', 'Not specified')
        contingency = cost_estimate.get('contingency', int(total_cost * 0.15))

        # INTEGRATION: Extract detailed cost breakdown from cost estimate
        cost_breakdown_details = ""
        breakdown = cost_estimate.get('breakdown', [])
        if breakdown:
            cost_breakdown_details = "\n================================================================================\nDETAILED COST BREAKDOWN (from Cost Overview):\n================================================================================\n"
            for category in breakdown:
                cat_name = category.get('category', 'Unknown')
                cat_cost = category.get('cost', 0)
                cat_desc = category.get('description', '')
                cost_breakdown_details += f"\n{cat_name}: €{cat_cost:,}\n"
                cost_breakdown_details += f"  Description: {cat_desc}\n"
                # Add subcategories if available
                subcategories = category.get('subcategories', [])
                for subcat in subcategories[:3]:  # Limit to first 3 subcategories
                    sub_name = subcat.get('name', 'Unknown')
                    sub_total = subcat.get('subtotal', 0)
                    cost_breakdown_details += f"    - {sub_name}: €{sub_total:,}\n"
                    # Add line items if available
                    items = subcat.get('items', [])
                    for item in items[:3]:  # Limit to first 3 items
                        item_name = item.get('item', 'Unknown')
                        item_cost = item.get('cost', 0)
                        cost_breakdown_details += f"        * {item_name}: €{item_cost:,}\n"

        # INTEGRATION: Extract quality tiers from cost estimate for financing options per tier
        # There are 4 quality tiers: Budget, Standard, Premium, Luxury
        quality_tiers_details = ""
        quality_tiers = cost_estimate.get('qualityTiers', [])
        if quality_tiers:
            quality_tiers_details = "\n================================================================================\nQUALITY TIER OPTIONS (IMPORTANT - Provide financing for ALL 4 tiers):\n================================================================================\n"
            for tier in quality_tiers:
                tier_name = tier.get('tier', 'Unknown').upper()
                tier_cost = tier.get('totalCost', 0)
                tier_highlights = tier.get('highlights', [])
                quality_tiers_details += f"\n{tier_name} TIER: €{tier_cost:,}\n"
                quality_tiers_details += f"  Features included:\n"
                for highlight in tier_highlights:
                    quality_tiers_details += f"    - {highlight}\n"
            quality_tiers_details += """
CRITICAL INSTRUCTION:
You MUST provide financing recommendations and calculations for ALL FOUR quality tiers:
1. BUDGET tier - financing options, monthly payments, recommended programs
2. STANDARD tier - financing options, monthly payments, recommended programs
3. PREMIUM tier - financing options, monthly payments, recommended programs
4. LUXURY tier - financing options, monthly payments, recommended programs

Each tier must have complete financing details so users can compare all options.
"""
        else:
            # Create estimated tiers if not provided (all 4 tiers)
            budget_cost = int(total_cost * 0.5)
            standard_cost = int(total_cost * 0.7)
            premium_cost = total_cost
            luxury_cost = int(total_cost * 1.5)
            quality_tiers_details = f"""
================================================================================
QUALITY TIER OPTIONS (Estimated - Provide financing for ALL 4 tiers):
================================================================================

BUDGET TIER: €{budget_cost:,}
  - Economy materials from hardware stores
  - Basic fixtures and fittings
  - Functional but minimal features

STANDARD TIER: €{standard_cost:,}
  - Good quality materials
  - Standard brand fixtures and fittings
  - Essential features with better finish

PREMIUM TIER: €{premium_cost:,}
  - Quality brand materials (Villeroy & Boch, Grohe)
  - Enhanced fixtures and features
  - Better durability and finish

LUXURY TIER: €{luxury_cost:,}
  - High-end designer materials
  - Premium brands (Hansgrohe, Duravit designer)
  - Smart features and luxury finishes

CRITICAL INSTRUCTION:
You MUST provide financing recommendations and calculations for ALL FOUR quality tiers:
1. BUDGET tier - financing options, monthly payments, recommended programs
2. STANDARD tier - financing options, monthly payments, recommended programs
3. PREMIUM tier - financing options, monthly payments, recommended programs
4. LUXURY tier - financing options, monthly payments, recommended programs

Each tier must have complete financing details so users can compare all options.
"""

        # INTEGRATION: Extract executive summary if available
        executive_summary_details = ""
        exec_summary = cost_estimate.get('executiveSummary', {})
        if exec_summary:
            executive_summary_details = "\n================================================================================\nEXECUTIVE SUMMARY (from Cost Overview):\n================================================================================\n"
            overview = exec_summary.get('overview', '')
            if overview:
                executive_summary_details += f"Overview: {overview}\n"
            cost_drivers = exec_summary.get('costDrivers', '')
            if cost_drivers:
                executive_summary_details += f"Cost Drivers: {cost_drivers}\n"
            key_highlights = exec_summary.get('keyHighlights', [])
            if key_highlights:
                executive_summary_details += "Key Highlights:\n"
                for highlight in key_highlights[:5]:
                    executive_summary_details += f"  - {highlight}\n"

        # Extract photo analysis insights if available
        photo_insights = ""
        if photo_analysis:
            detected_issues = photo_analysis.get('detectedIssues', [])
            detected_features = photo_analysis.get('detectedFeatures', [])
            condition_score = photo_analysis.get('photoAnalysis', {}).get('conditionScore', 5)

            photo_insights = f"""
PHOTO ANALYSIS INSIGHTS:
- Overall Condition Score: {condition_score}/10
- Detected Issues: {len(detected_issues)} issues found
"""
            if detected_issues:
                photo_insights += "  Issues requiring attention:\n"
                for issue in detected_issues[:5]:
                    photo_insights += f"    - {issue.get('issue', 'Unknown')}: {issue.get('severity', 'N/A')} severity\n"

            if detected_features:
                photo_insights += f"- Detected Features: {len(detected_features)} features identified\n"
                # Check for accessibility-related features (KfW 159 eligibility)
                accessibility_features = [f for f in detected_features if any(
                    kw in f.get('feature', '').lower()
                    for kw in ['grab', 'barrier', 'accessible', 'walk-in', 'wide door']
                )]
                if accessibility_features:
                    photo_insights += f"  Accessibility features detected: {len(accessibility_features)} (potential KfW 159 eligibility)\n"

        # Extract user's budget answers if available
        budget_insights = ""
        if user_answers:
            budget_insights = "\nUSER BUDGET & FINANCING PREFERENCES (from 15-question assessment):\n"

            # Budget range
            budget_range = user_answers.get('rag_budget_range', {})
            if isinstance(budget_range, dict):
                budget_insights += f"- Budget Range: {budget_range.get('value', 'Not specified')}\n"
            elif budget_range:
                budget_insights += f"- Budget Range: {budget_range}\n"

            # Budget flexibility
            flexibility = user_answers.get('rag_budget_flexibility', {})
            if isinstance(flexibility, dict):
                budget_insights += f"- Budget Flexibility: {flexibility.get('value', 'Not specified')}\n"
            elif flexibility:
                budget_insights += f"- Budget Flexibility: {flexibility}\n"

            # Financing method preference
            financing_method = user_answers.get('rag_financing_method', {})
            if isinstance(financing_method, dict):
                budget_insights += f"- Preferred Financing Method: {financing_method.get('value', 'Not specified')}\n"
            elif financing_method:
                budget_insights += f"- Preferred Financing Method: {financing_method}\n"

            # KfW programs interest
            kfw_interest = user_answers.get('rag_kfw_programs', [])
            if kfw_interest:
                if isinstance(kfw_interest, list):
                    budget_insights += f"- Interested in German Programs: {', '.join(kfw_interest)}\n"
                else:
                    budget_insights += f"- Interested in German Programs: {kfw_interest}\n"

            # Accessibility requirements
            accessibility = user_answers.get('rag_accessibility', [])
            if accessibility and accessibility != ['none']:
                if isinstance(accessibility, list):
                    budget_insights += f"- Accessibility Features Needed: {', '.join(accessibility)}\n"
                else:
                    budget_insights += f"- Accessibility Features Needed: {accessibility}\n"

            # Energy efficiency goals
            energy_goals = user_answers.get('rag_energy_efficiency', [])
            if energy_goals and energy_goals != ['none']:
                if isinstance(energy_goals, list):
                    budget_insights += f"- Energy Efficiency Goals: {', '.join(energy_goals)}\n"
                else:
                    budget_insights += f"- Energy Efficiency Goals: {energy_goals}\n"

            # Quality tier preference
            quality_tier = user_answers.get('rag_quality_tier', {})
            if isinstance(quality_tier, dict):
                budget_insights += f"- Quality Preference: {quality_tier.get('value', 'standard')}\n"
            elif quality_tier:
                budget_insights += f"- Quality Preference: {quality_tier}\n"

            # Property type
            property_type = user_answers.get('rag_property_type', {})
            if isinstance(property_type, dict):
                budget_insights += f"- Property Type: {property_type.get('value', 'Not specified')}\n"
            elif property_type:
                budget_insights += f"- Property Type: {property_type}\n"

            # Timeline
            timeline = user_answers.get('rag_timeline', {})
            if isinstance(timeline, dict):
                budget_insights += f"- Timeline: {timeline.get('value', 'Not specified')}\n"
            elif timeline:
                budget_insights += f"- Timeline: {timeline}\n"

            # DIY preference
            diy_pref = user_answers.get('rag_diy_preference', {})
            if isinstance(diy_pref, dict):
                budget_insights += f"- DIY vs Professional: {diy_pref.get('value', 'Not specified')}\n"
            elif diy_pref:
                budget_insights += f"- DIY vs Professional: {diy_pref}\n"

        # INTEGRATION: Extract planning data insights if available
        planning_insights = ""
        if planning_data:
            project_plan = planning_data.get('projectPlan', {})
            api_plan = planning_data.get('apiPlanData', {})

            planning_insights = f"""
================================================================================
PLANNING MODULE DATA (User completed Planning phase):
================================================================================
PROJECT DETAILS:
- Building Type: {project_plan.get('buildingType', 'Not specified')}
- Planned Budget: €{project_plan.get('budget', 0):,}
- Location: {project_plan.get('bundesland', 'Not specified')}, Germany
- Building Size: {project_plan.get('buildingSize', 'Not specified')} m²
- Renovation Goals: {', '.join(project_plan.get('goals', ['Not specified']))}
- Target Start Date: {project_plan.get('startDate', 'Not specified')}
- Financing Preference: {project_plan.get('financingPreference', 'Not specified')}
- Incentive Interest: {project_plan.get('incentiveIntent', 'Not specified')}
- Heritage Protection: {project_plan.get('heritageProtection', 'Not specified')}
- Energy Certificate: {project_plan.get('energyCertificateRating', 'Not specified')}
- Known Issues: {', '.join(project_plan.get('knownMajorIssues', ['None known']))}
"""
            # Add generated plan phases if available
            if api_plan.get('plan', {}).get('phases'):
                phases = api_plan['plan']['phases']
                planning_insights += f"\nGENERATED PLAN ({len(phases)} Phases):\n"
                total_planned = 0
                for i, phase in enumerate(phases[:3], 1):
                    phase_title = phase.get('phase_title', f'Phase {i}')
                    cost_range = phase.get('cost_range', {})
                    cost_min = cost_range.get('min', 0)
                    cost_max = cost_range.get('max', 0)
                    total_planned += (cost_min + cost_max) // 2
                    planning_insights += f"  {i}. {phase_title}: €{cost_min:,}-€{cost_max:,}\n"
                if len(phases) > 3:
                    planning_insights += f"  ... and {len(phases) - 3} more phases\n"

            # Add permits if available
            if api_plan.get('plan', {}).get('permits_required'):
                permits = api_plan['plan']['permits_required']
                planning_insights += f"\nREQUIRED PERMITS ({len(permits)}):\n"
                for permit in permits[:3]:
                    planning_insights += f"  - {permit.get('permit_name', 'Unknown')}\n"

            planning_insights += """
IMPORTANT: Use this planning data to:
1. Align financing recommendations with stated budget and preferences
2. Recommend programs that match their renovation goals
3. Consider their financing preference (self-financing vs loans)
4. Account for any heritage protection requirements
================================================================================
"""

        prompt = f"""You are a German home renovation financing expert and certified financial advisor (Finanzberater) with comprehensive knowledge of all 2026 German financing programs, subsidies, grants, and tax benefits.

Your task is to provide an EXTREMELY DETAILED financing analysis that helps the user understand EXACTLY how to finance their renovation project in the most cost-effective way.

================================================================================
RETRIEVED GERMAN FINANCING KNOWLEDGE BASE (2026 Data):
================================================================================
{context}

================================================================================
PROJECT FINANCIAL SUMMARY (from Cost Overview):
================================================================================
- Total Estimated Cost: €{total_cost:,}
- Renovation Type: {renovation_type.replace('_', ' ').title()}
- Location: {location}
- Quality Level: {quality_level}
- Estimated Duration: {estimated_duration}
- Contingency Reserve: €{contingency:,} (15% recommended)
- Total with Contingency: €{int(total_cost + contingency):,}
{executive_summary_details}
{cost_breakdown_details}
{quality_tiers_details}
{photo_insights}
{budget_insights}
{planning_insights}
================================================================================
FORM DATA DETAILS:
================================================================================
{self._format_form_data(form_data)}

================================================================================
ANALYSIS REQUIREMENTS - YOU MUST PROVIDE ALL OF THE FOLLOWING:
================================================================================

1. **EXECUTIVE FINANCING SUMMARY** (financingSummary):
   - Brief overview of the user's financing situation
   - Total financing amount needed
   - Recommended financing strategy (combination of programs)
   - Potential total savings from optimal financing choice
   - Key eligibility factors identified

2. **DETAILED PROGRAM RECOMMENDATIONS** (recommendations - at least 5-8 programs):
   For EACH recommended program, provide:

   a) **Program Identification**:
      - Official program name (in German and English)
      - Program code (e.g., KfW 159, BAFA BEG EM)
      - Provider (KfW, BAFA, state government, bank)
      - Program type (grant, subsidy, low-interest loan, tax benefit)

   b) **Financial Details**:
      - Maximum funding amount
      - Estimated amount for THIS specific project
      - Interest rate (for loans) or subsidy percentage (for grants)
      - Repayment term and conditions
      - Tilgungszuschuss (repayment bonus) if applicable
      - Combination possibilities with other programs

   c) **Eligibility Analysis**:
      - Detailed eligibility requirements
      - User's eligibility status (eligible/likely eligible/needs verification/not eligible)
      - Specific requirements the user meets
      - Requirements that need attention/documentation
      - Income limits if applicable
      - Property requirements

   d) **Application Process**:
      - Step-by-step application guide (5-8 detailed steps)
      - Required documents list
      - Estimated processing time
      - Where to apply (exact office/website)
      - Application deadlines if any
      - CRITICAL: Application must be submitted BEFORE work begins for most programs

   e) **Cost-Benefit Analysis**:
      - Total potential savings/benefit
      - Effective interest rate after subsidies
      - Comparison with standard bank loan
      - Break-even analysis if relevant

   f) **Pros and Cons** (4-5 each):
      - Specific advantages for this user's situation
      - Potential limitations or challenges

   g) **Match Score** (0-100):
      - Score based on: project fit, eligibility likelihood, benefit amount, ease of application
      - Explanation of score factors

3. **ELIGIBILITY MATRIX** (eligibilityMatrix):
   A detailed matrix showing:
   - Each program vs. user's eligibility factors
   - Clear YES/NO/NEEDS VERIFICATION for each criterion
   - Total eligibility score per program

4. **FINANCING COMPARISON TABLE** (comparisonTable):
   Side-by-side comparison of:
   - Total cost with each financing option
   - Monthly payment estimates
   - Total interest paid
   - Effective annual cost
   - Total savings vs. standard bank loan

5. **OPTIMAL FINANCING STRATEGY** (optimalStrategy):
   - Recommended combination of programs
   - Order of application (which to apply for first)
   - Timeline for applications
   - Total combined benefit
   - Risk mitigation strategies

6. **DOCUMENT CHECKLIST** (documentChecklist):
   Categorized list of all documents needed:
   - Personal documents (ID, income proof, etc.)
   - Property documents (ownership, floor plans, etc.)
   - Project documents (cost estimates, contractor quotes, etc.)
   - Energy certificates if required
   - Specialist certificates (Energieberater) if required

7. **TAX BENEFITS** (taxBenefits):
   - Handwerkerleistungen (Paragraph 35a EStG) - up to 20% of labor costs
   - Haushaltsnahe Dienstleistungen
   - Depreciation possibilities
   - VAT considerations
   - Estimated tax savings

8. **TIMELINE & ACTION PLAN** (actionPlan):
   Week-by-week action plan:
   - Week 1-2: Document gathering
   - Week 3-4: Applications submission
   - Week 5-8: Processing period
   - Expected approval timeline
   - When work can begin

9. **RISK ASSESSMENT** (riskAssessment):
   - Application rejection risks and mitigation
   - Funding gap scenarios
   - Alternative financing if primary options fail
   - Market rate changes impact

10. **NEXT STEPS** (nextSteps):
    - Immediate actions (this week)
    - Short-term actions (next 2-4 weeks)
    - Pre-application checklist
    - Contact information for advisors

================================================================================
RESPOND IN THIS EXACT JSON FORMAT:
================================================================================
{{
  "financingSummary": {{
    "overview": "Comprehensive 3-4 sentence summary of financing situation based on the Cost Overview data",
    "totalFinancingNeeded": {total_cost},
    "recommendedStrategy": "Brief description of optimal approach",
    "potentialTotalSavings": 0,
    "keyEligibilityFactors": ["factor1", "factor2", "factor3"],
    "urgentConsiderations": ["consideration1", "consideration2"]
  }},

  "qualityTierFinancing": {{
    "budget": {{
      "totalCost": 0,
      "financingNeeded": 0,
      "recommendedPrograms": ["Program 1"],
      "monthlyPayment": "€XXX (with KfW loan)",
      "totalInterest": "€X,XXX",
      "loanTerm": "5-10 years recommended",
      "savingsVsStandard": "€X,XXX less than standard tier",
      "note": "Most affordable option - basic materials and fixtures"
    }},
    "standard": {{
      "totalCost": 0,
      "financingNeeded": 0,
      "recommendedPrograms": ["Program 1", "Program 2"],
      "monthlyPayment": "€XXX (with KfW loan)",
      "totalInterest": "€X,XXX",
      "loanTerm": "10-15 years recommended",
      "savingsVsPremium": "€X,XXX less than premium tier",
      "note": "Good balance of quality and cost"
    }},
    "premium": {{
      "totalCost": {total_cost},
      "financingNeeded": {total_cost},
      "recommendedPrograms": ["Program 1", "Program 2", "Program 3"],
      "monthlyPayment": "€XXX (with KfW loan)",
      "totalInterest": "€X,XXX",
      "loanTerm": "15-20 years recommended",
      "recommendation": "Best value for money - quality materials with reasonable cost",
      "note": "Recommended choice for long-term value"
    }},
    "luxury": {{
      "totalCost": 0,
      "financingNeeded": 0,
      "recommendedPrograms": ["Program 1", "Program 2", "Program 3", "Additional financing"],
      "monthlyPayment": "€XXX (with KfW loan + bank loan)",
      "totalInterest": "€X,XXX",
      "loanTerm": "20-30 years recommended",
      "additionalFinancingNeeded": "May require combination of KfW + bank loan",
      "savingsVsStandard": "€X,XXX more than standard tier",
      "note": "Premium experience with designer materials"
    }},
    "comparisonNote": "Detailed comparison explaining the financing differences between all four tiers and which tier offers best value for your situation"
  }},

  "recommendations": [
    {{
      "id": "unique_id",
      "name": "Program Name (German)",
      "nameEnglish": "Program Name (English)",
      "programCode": "KfW 159",
      "type": "grant|subsidy|loan|tax_benefit",
      "provider": "KfW|BAFA|State|Bank",
      "priority": 1,

      "financialDetails": {{
        "maxAmount": "€50,000",
        "estimatedAmountForProject": "€35,000",
        "interestRate": "0.01% - 2.50%",
        "effectiveRate": "1.25%",
        "term": "10-30 years",
        "repaymentBonus": "Up to 50% Tilgungszuschuss",
        "monthlyPayment": "€XXX (estimated)",
        "totalInterestPaid": "€X,XXX",
        "combinableWith": ["Program A", "Program B"]
      }},

      "eligibility": {{
        "status": "eligible|likely_eligible|needs_verification|not_eligible",
        "requirements": [
          {{"requirement": "Requirement description", "userMeets": true, "notes": "Additional info"}}
        ],
        "incomeLimit": "No limit / €XX,XXX",
        "propertyRequirements": "Description",
        "specialConditions": ["condition1", "condition2"]
      }},

      "applicationProcess": {{
        "steps": [
          {{"step": 1, "action": "Detailed action", "duration": "1-2 days", "tips": "Helpful tip"}},
          {{"step": 2, "action": "Next action", "duration": "3-5 days", "tips": "Another tip"}}
        ],
        "requiredDocuments": ["Document 1", "Document 2", "Document 3"],
        "processingTime": "2-4 weeks",
        "applicationUrl": "https://official-url.de/application",
        "infoUrl": "https://official-url.de/info",
        "deadline": "None / Specific date",
        "criticalNote": "MUST apply BEFORE starting renovation work!"
      }},

      "costBenefit": {{
        "totalBenefit": "€X,XXX",
        "savingsVsStandardLoan": "€X,XXX",
        "effectiveCostReduction": "X%",
        "breakEvenMonths": 0,
        "netPresentValue": "€X,XXX"
      }},

      "pros": ["Specific advantage 1", "Specific advantage 2", "Specific advantage 3", "Specific advantage 4"],
      "cons": ["Limitation 1", "Limitation 2", "Limitation 3"],

      "matchScore": 85,
      "matchScoreBreakdown": {{
        "projectFit": 90,
        "eligibilityLikelihood": 80,
        "benefitAmount": 85,
        "applicationEase": 75
      }},

      "recommendationReason": "Detailed explanation why this program is recommended for this specific user",
      "sources": ["Source 1", "Source 2"]
    }}
  ],

  "eligibilityMatrix": {{
    "factors": ["Factor 1", "Factor 2", "Factor 3", "Factor 4"],
    "programs": [
      {{
        "programName": "Program Name",
        "scores": ["YES", "YES", "VERIFY", "NO"],
        "overallEligibility": "85%"
      }}
    ]
  }},

  "comparisonTable": {{
    "headers": ["Metric", "Program 1", "Program 2", "Standard Bank Loan"],
    "rows": [
      {{"metric": "Total Cost", "values": ["€XX,XXX", "€XX,XXX", "€XX,XXX"]}},
      {{"metric": "Monthly Payment", "values": ["€XXX", "€XXX", "€XXX"]}},
      {{"metric": "Total Interest", "values": ["€X,XXX", "€X,XXX", "€X,XXX"]}},
      {{"metric": "Savings vs Bank", "values": ["€X,XXX", "€X,XXX", "€0"]}}
    ]
  }},

  "qualityTierComparison": {{
    "headers": ["Metric", "Budget Tier", "Standard Tier", "Premium Tier", "Luxury Tier"],
    "rows": [
      {{"metric": "Total Project Cost", "values": ["€XX,XXX", "€XX,XXX", "€XX,XXX", "€XX,XXX"]}},
      {{"metric": "Recommended Loan Amount", "values": ["€XX,XXX", "€XX,XXX", "€XX,XXX", "€XX,XXX"]}},
      {{"metric": "Monthly Payment (KfW)", "values": ["€XXX", "€XXX", "€XXX", "€XXX"]}},
      {{"metric": "Monthly Payment (Bank)", "values": ["€XXX", "€XXX", "€XXX", "€XXX"]}},
      {{"metric": "Total Interest (10yr)", "values": ["€X,XXX", "€X,XXX", "€X,XXX", "€X,XXX"]}},
      {{"metric": "Total Interest (20yr)", "values": ["€X,XXX", "€X,XXX", "€X,XXX", "€X,XXX"]}},
      {{"metric": "Best Financing Option", "values": ["Personal savings", "KfW 159", "KfW 159 + BEG", "KfW + Bank combo"]}},
      {{"metric": "Value Rating", "values": ["Economy", "Good", "Best Value", "Premium"]}}
    ],
    "tierRecommendation": "Based on your budget and needs, we recommend the tier that best balances quality and financing options for your situation"
  }},

  "optimalStrategy": {{
    "recommendedCombination": ["Program 1", "Program 2"],
    "applicationOrder": ["Apply first: Program X", "Apply second: Program Y"],
    "timeline": "4-8 weeks total processing",
    "totalCombinedBenefit": "€X,XXX",
    "strategyExplanation": "Detailed explanation of why this combination is optimal",
    "riskMitigation": ["Backup plan 1", "Backup plan 2"]
  }},

  "documentChecklist": {{
    "personal": [
      {{"document": "Document name", "required": true, "notes": "How to obtain"}}
    ],
    "property": [
      {{"document": "Document name", "required": true, "notes": "Additional info"}}
    ],
    "project": [
      {{"document": "Document name", "required": true, "notes": "Who provides this"}}
    ],
    "specialist": [
      {{"document": "Energy certificate", "required": false, "notes": "Required for energy-related programs"}}
    ]
  }},

  "taxBenefits": {{
    "handwerkerleistungen": {{
      "eligible": true,
      "maxDeduction": "€6,000 per year (20% of €30,000 labor)",
      "estimatedBenefit": "€X,XXX",
      "requirements": ["Invoice with separate labor costs", "Bank transfer payment"],
      "howToClaim": "Enter in annual tax return (Anlage Haushaltsnahe)"
    }},
    "depreciation": {{
      "applicable": true,
      "method": "Description",
      "estimatedBenefit": "€X,XXX over X years"
    }},
    "totalTaxSavings": "€X,XXX"
  }},

  "actionPlan": {{
    "immediate": [
      {{"action": "Action description", "deadline": "This week", "priority": "high"}}
    ],
    "shortTerm": [
      {{"action": "Action description", "deadline": "Next 2-4 weeks", "priority": "medium"}}
    ],
    "applicationTimeline": [
      {{"week": "Week 1-2", "activities": ["Activity 1", "Activity 2"]}},
      {{"week": "Week 3-4", "activities": ["Activity 1", "Activity 2"]}},
      {{"week": "Week 5-8", "activities": ["Wait for approval", "Prepare for work start"]}}
    ],
    "expectedApprovalDate": "X weeks from application",
    "workCanBeginDate": "After approval received"
  }},

  "riskAssessment": {{
    "rejectionRisks": [
      {{"risk": "Risk description", "likelihood": "low|medium|high", "mitigation": "How to mitigate"}}
    ],
    "fundingGapScenario": {{
      "ifPrimaryRejected": "Alternative financing plan",
      "gapAmount": "€X,XXX",
      "solutions": ["Solution 1", "Solution 2"]
    }},
    "marketRisks": "Impact of interest rate changes"
  }},

  "nextSteps": [
    {{"step": 1, "action": "Immediate action", "deadline": "This week", "details": "Specific instructions"}},
    {{"step": 2, "action": "Next action", "deadline": "Next week", "details": "Specific instructions"}},
    {{"step": 3, "action": "Prepare applications", "deadline": "Week 2-3", "details": "Specific instructions"}},
    {{"step": 4, "action": "Submit applications", "deadline": "Week 3-4", "details": "Specific instructions"}},
    {{"step": 5, "action": "Follow up", "deadline": "Week 5+", "details": "Specific instructions"}}
  ],

  "sourcesReference": {{
    "Source 1": "Description and relevance",
    "Source 2": "Description and relevance"
  }},

  "metadata": {{
    "analysisDate": "{datetime.now().strftime('%Y-%m-%d')}",
    "dataVersion": "2026",
    "disclaimer": "This analysis is for informational purposes. Consult a certified financial advisor for final decisions."
  }}
}}

================================================================================
CRITICAL RULES:
================================================================================
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations before or after
2. ALL numeric values for costs/amounts must be numbers, not strings (except formatted displays)
3. Provide AT LEAST 5-8 financing recommendations, prioritized by benefit to user
4. ALWAYS include KfW programs, BAFA (if applicable), tax benefits, and standard bank loans for comparison
5. Be SPECIFIC to this user's situation - reference their actual project details
6. Include REAL program names, REAL eligibility requirements, REAL application URLs
7. Calculate actual monthly payments and total costs
8. Prioritize: Grants > Subsidies > Low-interest loans > Standard loans
9. ALWAYS note that applications must be submitted BEFORE work begins for most programs
10. Include state-specific programs for the user's location if available"""

        print(f"\n[Financing RAG] Prompt built successfully!")
        print(f"[Financing RAG] Total prompt length: {len(prompt)} characters")
        print(f"[Financing RAG] Prompt includes:")
        print(f"[Financing RAG]   - RAG context from {len(retrieved_docs)} documents")
        print(f"[Financing RAG]   - Photo analysis: {'Yes' if photo_analysis else 'No'}")
        print(f"[Financing RAG]   - User answers: {'Yes (' + str(len(user_answers or {})) + ' responses)' if user_answers else 'No'}")
        print(f"[Financing RAG]   - Planning data: {'Yes' if planning_data else 'No'}")
        print("="*70 + "\n")

        return prompt

    def _generate_financing_options_fallback(
        self,
        form_data: Dict[str, Any],
        cost_estimate: Dict[str, Any],
        error: str = None
    ) -> Dict[str, Any]:
        """Generate comprehensive fallback financing options when RAG fails"""
        total_cost = cost_estimate.get('totalEstimatedCost', 35000)
        quality_tiers = cost_estimate.get('qualityTiers', [])
        renovation_type = form_data.get('renovationType', 'general')

        # Calculate tier costs from cost estimate or estimate them
        budget_cost = 0
        standard_cost = 0
        premium_cost = total_cost
        luxury_cost = 0

        for tier in quality_tiers:
            tier_name = tier.get('tier', '').lower()
            tier_cost = tier.get('totalCost', 0)
            if tier_name == 'budget':
                budget_cost = tier_cost
            elif tier_name == 'standard':
                standard_cost = tier_cost
            elif tier_name == 'premium':
                premium_cost = tier_cost
            elif tier_name == 'luxury':
                luxury_cost = tier_cost

        # If tiers not found, estimate them
        if budget_cost == 0:
            budget_cost = int(total_cost * 0.5)
        if standard_cost == 0:
            standard_cost = int(total_cost * 0.7)
        if luxury_cost == 0:
            luxury_cost = int(total_cost * 1.5)

        # Calculate monthly payments (approximate, 10 year term, 2% interest)
        def calc_monthly(principal, years=10, rate=0.02):
            if principal <= 0:
                return 0
            monthly_rate = rate / 12
            n_payments = years * 12
            return int(principal * (monthly_rate * (1 + monthly_rate)**n_payments) / ((1 + monthly_rate)**n_payments - 1))

        budget_monthly = calc_monthly(budget_cost)
        standard_monthly = calc_monthly(standard_cost)
        premium_monthly = calc_monthly(premium_cost)
        luxury_monthly = calc_monthly(luxury_cost)

        return {
            'financingSummary': {
                'overview': f'For your {renovation_type.replace("_", " ")} renovation project with an estimated cost of €{total_cost:,}, we have identified multiple financing options. Based on your project scope and the Cost Overview, KfW programs offer the best value for energy-related improvements.',
                'totalFinancingNeeded': total_cost,
                'recommendedStrategy': 'Combine KfW low-interest loan with tax deductions for optimal savings',
                'potentialTotalSavings': int(total_cost * 0.15),
                'keyEligibilityFactors': [
                    'Property owner or authorized tenant',
                    'Project in Germany',
                    'Application before work begins',
                    'Licensed contractor required'
                ],
                'urgentConsiderations': [
                    'Apply for KfW/BAFA funding BEFORE starting any renovation work',
                    'Get energy consultant certification if required',
                    'Keep all invoices for tax deduction claims'
                ]
            },
            'qualityTierFinancing': {
                'budget': {
                    'totalCost': budget_cost,
                    'financingNeeded': budget_cost,
                    'recommendedPrograms': ['Personal Savings', 'KfW 159'],
                    'monthlyPayment': f'€{budget_monthly} (10yr KfW loan)',
                    'totalInterest': f'€{int(budget_cost * 0.12):,}',
                    'loanTerm': '5-10 years recommended',
                    'savingsVsStandard': f'€{standard_cost - budget_cost:,} less than Standard',
                    'note': 'Most affordable - basic materials, functional finish'
                },
                'standard': {
                    'totalCost': standard_cost,
                    'financingNeeded': standard_cost,
                    'recommendedPrograms': ['KfW 159', 'KfW 261'],
                    'monthlyPayment': f'€{standard_monthly} (10yr KfW loan)',
                    'totalInterest': f'€{int(standard_cost * 0.12):,}',
                    'loanTerm': '10-15 years recommended',
                    'savingsVsPremium': f'€{premium_cost - standard_cost:,} less than Premium',
                    'note': 'Good balance of quality and cost'
                },
                'premium': {
                    'totalCost': premium_cost,
                    'financingNeeded': premium_cost,
                    'recommendedPrograms': ['KfW 159', 'KfW 261', 'BAFA BEG'],
                    'monthlyPayment': f'€{premium_monthly} (15yr KfW loan)',
                    'totalInterest': f'€{int(premium_cost * 0.15):,}',
                    'loanTerm': '15-20 years recommended',
                    'recommendation': 'Best value - quality German brands with durability',
                    'note': 'Recommended for long-term value'
                },
                'luxury': {
                    'totalCost': luxury_cost,
                    'financingNeeded': luxury_cost,
                    'recommendedPrograms': ['KfW 159', 'KfW 261', 'Bank Loan'],
                    'monthlyPayment': f'€{calc_monthly(luxury_cost, 20)} (20yr combined)',
                    'totalInterest': f'€{int(luxury_cost * 0.20):,}',
                    'loanTerm': '20-30 years recommended',
                    'additionalFinancingNeeded': 'May need KfW + bank loan combination',
                    'savingsVsStandard': f'€{luxury_cost - standard_cost:,} more than Standard',
                    'note': 'Premium experience with designer materials'
                },
                'comparisonNote': f'Based on your Cost Overview, the Premium tier at €{premium_cost:,} offers the best balance of quality and financing options. Budget tier saves €{premium_cost - budget_cost:,} but uses basic materials.'
            },
            'qualityTierComparison': {
                'headers': ['Metric', 'Budget', 'Standard', 'Premium', 'Luxury'],
                'rows': [
                    {'metric': 'Total Project Cost', 'values': [f'€{budget_cost:,}', f'€{standard_cost:,}', f'€{premium_cost:,}', f'€{luxury_cost:,}']},
                    {'metric': 'Monthly Payment (10yr)', 'values': [f'€{budget_monthly}', f'€{standard_monthly}', f'€{premium_monthly}', f'€{calc_monthly(luxury_cost)}']},
                    {'metric': 'Monthly Payment (15yr)', 'values': [f'€{calc_monthly(budget_cost, 15)}', f'€{calc_monthly(standard_cost, 15)}', f'€{calc_monthly(premium_cost, 15)}', f'€{calc_monthly(luxury_cost, 15)}']},
                    {'metric': 'Total Interest (10yr)', 'values': [f'€{int(budget_cost*0.12):,}', f'€{int(standard_cost*0.12):,}', f'€{int(premium_cost*0.12):,}', f'€{int(luxury_cost*0.12):,}']},
                    {'metric': 'Best Financing', 'values': ['Savings/KfW', 'KfW 159', 'KfW 159+261', 'KfW+Bank']},
                    {'metric': 'Value Rating', 'values': ['Economy', 'Good', 'Best Value', 'Premium']}
                ],
                'tierRecommendation': f'Based on your budget and the Cost Overview, Premium tier (€{premium_cost:,}) offers the best long-term value with quality German brand materials.'
            },
            'recommendations': [
                {
                    'id': 'kfw_159',
                    'name': 'KfW 159 - Altersgerecht Umbauen',
                    'nameEnglish': 'Age-Appropriate Renovation',
                    'programCode': 'KfW 159',
                    'type': 'loan',
                    'provider': 'KfW',
                    'priority': 1,
                    'financialDetails': {
                        'maxAmount': '€50,000',
                        'estimatedAmountForProject': f'€{min(total_cost, 50000):,}',
                        'interestRate': '0.78% - 2.42%',
                        'effectiveRate': '1.5%',
                        'term': '4-30 years',
                        'repaymentBonus': 'None',
                        'monthlyPayment': f'€{calc_monthly(min(total_cost, 50000))} (10yr)',
                        'totalInterestPaid': f'€{int(min(total_cost, 50000) * 0.12):,}',
                        'combinableWith': ['Tax deductions', 'State programs']
                    },
                    'eligibility': {
                        'status': 'likely_eligible',
                        'requirements': [
                            {'requirement': 'Property owner or tenant with permission', 'userMeets': True, 'notes': 'Standard requirement'},
                            {'requirement': 'Work performed by licensed contractor', 'userMeets': True, 'notes': 'Required for all KfW'}
                        ],
                        'incomeLimit': 'No income limit',
                        'propertyRequirements': 'Residential property in Germany',
                        'specialConditions': ['Application before work begins', 'Barrier-reduction measures']
                    },
                    'applicationProcess': {
                        'steps': [
                            {'step': 1, 'action': 'Contact your house bank (Hausbank)', 'duration': '1-2 days', 'tips': 'Most German banks process KfW loans'},
                            {'step': 2, 'action': 'Submit KfW application through bank', 'duration': '1 week', 'tips': 'Provide project description and cost estimate'},
                            {'step': 3, 'action': 'Wait for approval', 'duration': '2-4 weeks', 'tips': 'Do NOT start work before approval'},
                            {'step': 4, 'action': 'Start renovation after approval', 'duration': 'Project duration', 'tips': 'Keep all invoices'}
                        ],
                        'requiredDocuments': ['ID/Passport', 'Property ownership proof', 'Cost estimate from contractor', 'Project description'],
                        'processingTime': '2-4 weeks',
                        'applicationUrl': 'https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilie/Barrierereduzierung/',
                        'infoUrl': 'https://www.kfw.de/159',
                        'deadline': 'None - Apply before starting work',
                        'criticalNote': 'MUST apply BEFORE starting any renovation work!'
                    },
                    'costBenefit': {
                        'totalBenefit': f'€{int(total_cost * 0.08):,}',
                        'savingsVsStandardLoan': f'€{int(total_cost * 0.08):,}',
                        'effectiveCostReduction': '8%',
                        'breakEvenMonths': 0,
                        'netPresentValue': f'€{int(total_cost * 0.92):,}'
                    },
                    'pros': ['Very low interest rates (0.78%)', 'Long repayment terms up to 30 years', 'No income requirements', 'Can combine with other programs'],
                    'cons': ['Must apply before starting work', 'Processing time 2-4 weeks', 'Requires licensed contractor'],
                    'matchScore': 85,
                    'matchScoreBreakdown': {
                        'projectFit': 90,
                        'eligibilityLikelihood': 85,
                        'benefitAmount': 80,
                        'applicationEase': 75
                    },
                    'recommendationReason': 'Best overall option for bathroom/accessibility renovations with very low interest rates',
                    'sources': ['KfW Official', 'German Government']
                },
                {
                    'id': 'kfw_261',
                    'name': 'KfW 261 - Wohngebäude Kredit',
                    'nameEnglish': 'Residential Building Credit',
                    'programCode': 'KfW 261',
                    'type': 'loan',
                    'provider': 'KfW',
                    'priority': 2,
                    'financialDetails': {
                        'maxAmount': '€150,000',
                        'estimatedAmountForProject': f'€{min(total_cost, 150000):,}',
                        'interestRate': '0.01% - 2.50%',
                        'effectiveRate': '1.25%',
                        'term': '10-30 years',
                        'repaymentBonus': 'Up to 45% Tilgungszuschuss',
                        'monthlyPayment': f'€{calc_monthly(min(total_cost, 150000))} (10yr)',
                        'totalInterestPaid': f'€{int(min(total_cost, 150000) * 0.10):,}',
                        'combinableWith': ['KfW 159', 'BAFA', 'State programs']
                    },
                    'eligibility': {
                        'status': 'needs_verification',
                        'requirements': [
                            {'requirement': 'Energy efficiency improvement required', 'userMeets': None, 'notes': 'Needs energy consultant verification'},
                            {'requirement': 'dena Energy Consultant certification', 'userMeets': None, 'notes': 'Consultant cost €500-1500'}
                        ],
                        'incomeLimit': 'No income limit',
                        'propertyRequirements': 'Building permit before 2002',
                        'specialConditions': ['Energy consultant required', 'Specific efficiency standards']
                    },
                    'applicationProcess': {
                        'steps': [
                            {'step': 1, 'action': 'Hire dena-certified energy consultant', 'duration': '1-2 weeks', 'tips': 'Find at energie-effizienz-experten.de'},
                            {'step': 2, 'action': 'Get energy efficiency confirmation', 'duration': '1-2 weeks', 'tips': 'Consultant prepares BzA'},
                            {'step': 3, 'action': 'Apply through house bank', 'duration': '1 week', 'tips': 'Include BzA document'},
                            {'step': 4, 'action': 'Start work after approval', 'duration': 'Project duration', 'tips': 'Consultant verifies completion'}
                        ],
                        'requiredDocuments': ['BzA from energy consultant', 'Property documents', 'Cost estimate', 'ID'],
                        'processingTime': '3-6 weeks',
                        'applicationUrl': 'https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilie/Energieeffizient-Sanieren/',
                        'infoUrl': 'https://www.kfw.de/261',
                        'deadline': 'None - Apply before starting work',
                        'criticalNote': 'Requires energy consultant - plan extra 2-4 weeks'
                    },
                    'costBenefit': {
                        'totalBenefit': f'€{int(total_cost * 0.20):,}',
                        'savingsVsStandardLoan': f'€{int(total_cost * 0.20):,}',
                        'effectiveCostReduction': '20%',
                        'breakEvenMonths': 24,
                        'netPresentValue': f'€{int(total_cost * 0.80):,}'
                    },
                    'pros': ['Highest savings potential (up to 45% grant)', 'Very low interest rates', 'Long terms available', 'Large loan amounts'],
                    'cons': ['Requires energy consultant (€500-1500)', 'Complex requirements', 'Longer processing time'],
                    'matchScore': 75,
                    'matchScoreBreakdown': {
                        'projectFit': 70,
                        'eligibilityLikelihood': 65,
                        'benefitAmount': 95,
                        'applicationEase': 50
                    },
                    'recommendationReason': 'Best for energy efficiency improvements with highest potential savings',
                    'sources': ['KfW Official', 'German Government']
                },
                {
                    'id': 'tax_35a',
                    'name': 'Handwerkerleistungen §35a EStG',
                    'nameEnglish': 'Craftsman Services Tax Deduction',
                    'programCode': '§35a EStG',
                    'type': 'tax_benefit',
                    'provider': 'German Tax Office',
                    'priority': 3,
                    'financialDetails': {
                        'maxAmount': '€6,000/year (20% of €30,000 labor)',
                        'estimatedAmountForProject': f'€{min(int(total_cost * 0.4 * 0.2), 6000):,}',
                        'interestRate': 'N/A - Tax refund',
                        'effectiveRate': 'N/A',
                        'term': 'Annual tax return',
                        'repaymentBonus': 'N/A',
                        'monthlyPayment': 'N/A - One-time refund',
                        'totalInterestPaid': '€0',
                        'combinableWith': ['All KfW programs', 'All BAFA programs']
                    },
                    'eligibility': {
                        'status': 'eligible',
                        'requirements': [
                            {'requirement': 'German tax resident', 'userMeets': True, 'notes': 'Standard requirement'},
                            {'requirement': 'Payment by bank transfer', 'userMeets': True, 'notes': 'No cash payments'}
                        ],
                        'incomeLimit': 'Must pay income tax to benefit',
                        'propertyRequirements': 'Own residence in Germany',
                        'specialConditions': ['Invoice must show labor costs separately', 'Bank transfer only']
                    },
                    'applicationProcess': {
                        'steps': [
                            {'step': 1, 'action': 'Request invoice with separate labor costs', 'duration': 'At project end', 'tips': 'Ask contractor upfront'},
                            {'step': 2, 'action': 'Pay by bank transfer only', 'duration': 'When due', 'tips': 'Keep transfer confirmation'},
                            {'step': 3, 'action': 'Enter in annual tax return (Anlage Haushaltsnahe)', 'duration': 'Tax season', 'tips': 'Use ELSTER or tax advisor'},
                            {'step': 4, 'action': 'Receive tax refund', 'duration': '2-6 months', 'tips': 'Usually with tax assessment'}
                        ],
                        'requiredDocuments': ['Invoice with labor costs', 'Bank transfer proof', 'Tax return'],
                        'processingTime': '2-6 months (with tax return)',
                        'applicationUrl': 'https://www.elster.de/',
                        'infoUrl': 'https://www.bundesfinanzministerium.de/',
                        'deadline': 'Submit with annual tax return',
                        'criticalNote': 'Keep all invoices - must show labor costs separately!'
                    },
                    'costBenefit': {
                        'totalBenefit': f'€{min(int(total_cost * 0.4 * 0.2), 6000):,}',
                        'savingsVsStandardLoan': f'€{min(int(total_cost * 0.4 * 0.2), 6000):,}',
                        'effectiveCostReduction': '8%',
                        'breakEvenMonths': 0,
                        'netPresentValue': 'N/A'
                    },
                    'pros': ['Easy to claim', 'Combinable with ALL other programs', 'Direct tax refund', 'No pre-approval needed'],
                    'cons': ['Limited to €6,000/year', 'Only labor costs (not materials)', 'Need to pay income tax to benefit'],
                    'matchScore': 95,
                    'matchScoreBreakdown': {
                        'projectFit': 100,
                        'eligibilityLikelihood': 95,
                        'benefitAmount': 70,
                        'applicationEase': 100
                    },
                    'recommendationReason': 'Easiest benefit to claim - combines with all other programs',
                    'sources': ['German Tax Code', 'BMF Guidelines']
                },
                {
                    'id': 'bank_loan',
                    'name': 'Renovierungskredit',
                    'nameEnglish': 'Renovation Loan',
                    'programCode': 'Bank Loan',
                    'type': 'loan',
                    'provider': 'Commercial Banks',
                    'priority': 4,
                    'financialDetails': {
                        'maxAmount': '€100,000',
                        'estimatedAmountForProject': f'€{min(total_cost, 100000):,}',
                        'interestRate': '4.5% - 8.0%',
                        'effectiveRate': '6.0%',
                        'term': '5-15 years',
                        'repaymentBonus': 'None',
                        'monthlyPayment': f'€{calc_monthly(total_cost, 10, 0.06)} (10yr at 6%)',
                        'totalInterestPaid': f'€{int(total_cost * 0.35):,}',
                        'combinableWith': ['Tax deductions only']
                    },
                    'eligibility': {
                        'status': 'eligible',
                        'requirements': [
                            {'requirement': 'Good SCHUFA score', 'userMeets': None, 'notes': 'Check at meineschufa.de'},
                            {'requirement': 'Stable income', 'userMeets': None, 'notes': 'Last 3 months payslips'}
                        ],
                        'incomeLimit': 'Based on creditworthiness',
                        'propertyRequirements': 'None specific',
                        'specialConditions': ['Credit check required']
                    },
                    'applicationProcess': {
                        'steps': [
                            {'step': 1, 'action': 'Check SCHUFA score', 'duration': '1-2 days', 'tips': 'Free once per year'},
                            {'step': 2, 'action': 'Compare offers online', 'duration': '1-2 days', 'tips': 'Use Check24, Verivox'},
                            {'step': 3, 'action': 'Submit application', 'duration': '1-3 days', 'tips': 'Often instant approval'},
                            {'step': 4, 'action': 'Receive funds', 'duration': '3-7 days', 'tips': 'Direct to your account'}
                        ],
                        'requiredDocuments': ['ID', 'Income proof', 'Bank statements'],
                        'processingTime': '1-7 days',
                        'applicationUrl': 'https://www.check24.de/kredit/',
                        'infoUrl': 'https://www.verbraucherzentrale.de/',
                        'deadline': 'None',
                        'criticalNote': 'Use only if KfW not available - higher interest rates'
                    },
                    'costBenefit': {
                        'totalBenefit': '€0',
                        'savingsVsStandardLoan': '€0 (this IS a standard loan)',
                        'effectiveCostReduction': '0%',
                        'breakEvenMonths': 0,
                        'netPresentValue': f'€{int(total_cost * 1.35):,}'
                    },
                    'pros': ['Fast approval (often same day)', 'Simple requirements', 'No specific project rules', 'Flexible use'],
                    'cons': ['Higher interest (4-8%)', 'Shorter terms', 'No subsidies', 'Total cost higher'],
                    'matchScore': 40,
                    'matchScoreBreakdown': {
                        'projectFit': 50,
                        'eligibilityLikelihood': 80,
                        'benefitAmount': 10,
                        'applicationEase': 90
                    },
                    'recommendationReason': 'Backup option if KfW programs not applicable - quick but expensive',
                    'sources': ['Consumer Centers', 'Bank Comparison Sites']
                }
            ],
            'optimalStrategy': {
                'recommendedCombination': ['KfW 159', '§35a Tax Deduction'],
                'applicationOrder': [
                    '1. Apply for KfW 159 through house bank (BEFORE work starts)',
                    '2. Start renovation after KfW approval',
                    '3. Request invoices with separate labor costs',
                    '4. Claim §35a tax deduction in annual return'
                ],
                'timeline': '4-8 weeks for approval, then project duration',
                'totalCombinedBenefit': f'€{int(total_cost * 0.08) + min(int(total_cost * 0.4 * 0.2), 6000):,}',
                'strategyExplanation': f'By combining KfW 159 low-interest loan with §35a tax deduction, you can reduce your effective cost by approximately €{int(total_cost * 0.08) + min(int(total_cost * 0.4 * 0.2), 6000):,}. Apply for KfW first since it must be approved before work begins.',
                'riskMitigation': [
                    'If KfW rejected, apply for commercial bank loan',
                    'Always claim §35a regardless of other financing'
                ]
            },
            'taxBenefits': {
                'handwerkerleistungen': {
                    'eligible': True,
                    'maxDeduction': '€6,000/year (20% of €30,000 labor)',
                    'estimatedBenefit': f'€{min(int(total_cost * 0.4 * 0.2), 6000):,}',
                    'requirements': ['Invoice with separate labor costs', 'Bank transfer payment', 'German tax resident'],
                    'howToClaim': 'Enter in annual tax return (Anlage Haushaltsnahe Dienstleistungen)'
                },
                'depreciation': {
                    'applicable': False,
                    'method': 'Not applicable for owner-occupied property',
                    'estimatedBenefit': '€0'
                },
                'totalTaxSavings': f'€{min(int(total_cost * 0.4 * 0.2), 6000):,}'
            },
            'documentChecklist': {
                'personal': [
                    {'document': 'Valid ID or Passport', 'required': True, 'notes': 'Required for all applications'},
                    {'document': 'Proof of residence (Meldebescheinigung)', 'required': True, 'notes': 'Not older than 3 months'}
                ],
                'property': [
                    {'document': 'Property ownership proof (Grundbuchauszug)', 'required': True, 'notes': 'Or rental agreement with permission'},
                    {'document': 'Building permit (if applicable)', 'required': False, 'notes': 'Only for structural changes'}
                ],
                'project': [
                    {'document': 'Detailed cost estimate', 'required': True, 'notes': 'From licensed contractor'},
                    {'document': 'Project description', 'required': True, 'notes': 'What will be renovated'}
                ],
                'financial': [
                    {'document': 'Income proof (last 3 payslips)', 'required': True, 'notes': 'For bank loans'},
                    {'document': 'Bank statements (last 3 months)', 'required': False, 'notes': 'May be requested'}
                ]
            },
            'actionPlan': {
                'immediate': [
                    {'action': 'Get contractor cost estimate', 'deadline': 'This week', 'priority': 'high'},
                    {'action': 'Contact house bank about KfW', 'deadline': 'This week', 'priority': 'high'}
                ],
                'shortTerm': [
                    {'action': 'Submit KfW application', 'deadline': 'Next 2 weeks', 'priority': 'high'},
                    {'action': 'Gather all required documents', 'deadline': 'Next 2 weeks', 'priority': 'medium'}
                ],
                'applicationTimeline': [
                    {'week': 'Week 1-2', 'activities': ['Get cost estimates', 'Contact bank', 'Submit KfW application']},
                    {'week': 'Week 3-4', 'activities': ['Wait for KfW approval', 'Finalize contractor agreement']},
                    {'week': 'Week 5+', 'activities': ['Start renovation after approval', 'Keep all invoices for tax']}
                ],
                'expectedApprovalDate': '2-4 weeks from application',
                'workCanBeginDate': 'After KfW approval received'
            },
            'nextSteps': [
                {'step': 1, 'action': 'Get detailed cost estimate from contractor', 'deadline': 'This week', 'details': 'Ask for labor costs to be shown separately on invoice'},
                {'step': 2, 'action': 'Contact your house bank about KfW 159', 'deadline': 'This week', 'details': 'Most German banks process KfW applications'},
                {'step': 3, 'action': 'Submit KfW application BEFORE starting work', 'deadline': 'Before renovation', 'details': 'This is critical - work cannot start before approval'},
                {'step': 4, 'action': 'After completion, claim §35a tax deduction', 'deadline': 'With tax return', 'details': 'Enter labor costs in Anlage Haushaltsnahe'}
            ],
            'sourcesReference': {
                'KfW Official': 'https://www.kfw.de/',
                'German Tax Code': 'https://www.gesetze-im-internet.de/estg/__35a.html',
                'Consumer Centers': 'https://www.verbraucherzentrale.de/'
            },
            'metadata': {
                'documents_retrieved': 0,
                'sources_used': [],
                'rag_enabled': False,
                'backend': 'Fallback',
                'error': error,
                'fallback': True,
                'analysisDate': datetime.now().strftime('%Y-%m-%d'),
                'dataVersion': '2026',
                'disclaimer': 'This analysis is generated from fallback data. For personalized advice, consult a certified financial advisor (Finanzberater).'
            }
        }

    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON"""
        # Remove markdown code blocks
        response = response.replace('```json', '').replace('```', '')

        # Find JSON object boundaries
        start = response.find('{')
        end = response.rfind('}') + 1

        if start != -1 and end > start:
            return response[start:end]

        return response

    def _generate_fallback_response(
        self,
        form_data: Dict[str, Any],
        error: str = None
    ) -> Dict[str, Any]:
        """Generate fallback response when RAG fails - with detailed professional format"""
        renovation_type = form_data.get('renovationType', 'general')
        quality_preference = form_data.get('qualityPreference', 'standard')
        bathroom_size = form_data.get('bathroomSize', 8)

        # Calculate base costs based on renovation type and quality
        base_costs = {
            'bathroom': {'standard': 18000, 'premium': 28000, 'luxury': 45000},
            'kitchen': {'standard': 15000, 'premium': 30000, 'luxury': 55000},
            'basement': {'standard': 20000, 'premium': 35000, 'luxury': 60000},
            'roofing': {'standard': 25000, 'premium': 45000, 'luxury': 80000},
            'electrical': {'standard': 8000, 'premium': 15000, 'luxury': 25000},
            'plumbing': {'standard': 10000, 'premium': 18000, 'luxury': 30000},
            'hvac': {'standard': 12000, 'premium': 25000, 'luxury': 45000},
            'flooring': {'standard': 8000, 'premium': 15000, 'luxury': 30000},
            'windows_doors': {'standard': 10000, 'premium': 20000, 'luxury': 35000},
            'exterior': {'standard': 15000, 'premium': 30000, 'luxury': 55000},
            'general': {'standard': 25000, 'premium': 45000, 'luxury': 80000}
        }

        reno_costs = base_costs.get(renovation_type, base_costs['general'])
        quality = quality_preference.lower() if quality_preference else 'standard'
        if quality not in ['standard', 'premium', 'luxury']:
            quality = 'standard'

        total_cost = reno_costs[quality]
        contingency = int(total_cost * 0.15)
        total_with_contingency = total_cost + contingency

        # Calculate breakdown percentages
        demolition_cost = int(total_cost * 0.06)
        plumbing_cost = int(total_cost * 0.25)
        electrical_cost = int(total_cost * 0.11)
        tiling_cost = int(total_cost * 0.33)
        fixtures_cost = int(total_cost * 0.12)
        heating_cost = int(total_cost * 0.03)

        return {
            'costEstimate': {
                'totalEstimatedCost': total_with_contingency,
                'renovationType': f'{renovation_type.replace("_", " ").title()} Renovation',
                'qualityLevel': quality.title(),
                'estimatedDuration': '3-5 weeks',
                'locationAssumption': 'Germany (2026 prices, mid-to-large city)',
                'breakdown': [
                    {
                        'category': 'Demolition and Disposal',
                        'cost': demolition_cost,
                        'description': 'Complete removal of existing fixtures, tiles, and waste disposal',
                        'subcategories': [
                            {
                                'name': 'Demolition Work',
                                'subtotal': int(demolition_cost * 0.7),
                                'items': [
                                    {'item': 'Remove existing fixtures', 'quantity': 1, 'unit': 'set', 'unitPrice': int(demolition_cost * 0.3), 'cost': int(demolition_cost * 0.3)},
                                    {'item': 'Remove wall and floor tiles', 'quantity': bathroom_size * 3, 'unit': 'sqm', 'unitPrice': 25, 'cost': int(demolition_cost * 0.4)}
                                ]
                            },
                            {
                                'name': 'Waste Disposal',
                                'subtotal': int(demolition_cost * 0.3),
                                'items': [
                                    {'item': 'Container rental and disposal fees', 'quantity': 1, 'unit': 'load', 'unitPrice': int(demolition_cost * 0.3), 'cost': int(demolition_cost * 0.3)}
                                ]
                            }
                        ]
                    },
                    {
                        'category': 'Plumbing Work',
                        'cost': plumbing_cost,
                        'description': 'Complete plumbing installation including fixtures and connections',
                        'subcategories': [
                            {
                                'name': 'Sanitary Fixtures',
                                'subtotal': int(plumbing_cost * 0.5),
                                'items': [
                                    {'item': 'Toilet (wall-hung)', 'quantity': 1, 'unit': 'piece', 'unitPrice': int(plumbing_cost * 0.12), 'cost': int(plumbing_cost * 0.12), 'note': 'German brand'},
                                    {'item': 'Washbasin with faucet', 'quantity': 1, 'unit': 'set', 'unitPrice': int(plumbing_cost * 0.15), 'cost': int(plumbing_cost * 0.15)},
                                    {'item': 'Shower system with enclosure', 'quantity': 1, 'unit': 'set', 'unitPrice': int(plumbing_cost * 0.23), 'cost': int(plumbing_cost * 0.23)}
                                ]
                            },
                            {
                                'name': 'Labor - Plumber',
                                'subtotal': int(plumbing_cost * 0.5),
                                'items': [
                                    {'item': 'Master plumber (Sanitaerinstallateur)', 'quantity': 24, 'unit': 'hour', 'unitPrice': 75, 'cost': int(plumbing_cost * 0.35), 'note': 'German certified tradesman'},
                                    {'item': 'Pipe work and connections', 'quantity': 1, 'unit': 'set', 'unitPrice': int(plumbing_cost * 0.15), 'cost': int(plumbing_cost * 0.15)}
                                ]
                            }
                        ]
                    },
                    {
                        'category': 'Electrical Work',
                        'cost': electrical_cost,
                        'description': 'Complete electrical installation for lighting, ventilation, and outlets',
                        'subcategories': [
                            {
                                'name': 'Lighting and Outlets',
                                'subtotal': int(electrical_cost * 0.45),
                                'items': [
                                    {'item': 'LED recessed downlights IP65', 'quantity': 4, 'unit': 'piece', 'unitPrice': 85, 'cost': 340},
                                    {'item': 'Outlets and switches', 'quantity': 5, 'unit': 'piece', 'unitPrice': 45, 'cost': 225},
                                    {'item': 'Exhaust fan', 'quantity': 1, 'unit': 'piece', 'unitPrice': 185, 'cost': 185}
                                ]
                            },
                            {
                                'name': 'Labor - Electrician',
                                'subtotal': int(electrical_cost * 0.55),
                                'items': [
                                    {'item': 'Master electrician', 'quantity': 16, 'unit': 'hour', 'unitPrice': 70, 'cost': 1120, 'note': 'German certified tradesman'}
                                ]
                            }
                        ]
                    },
                    {
                        'category': 'Waterproofing and Tiling',
                        'cost': tiling_cost,
                        'description': 'Professional waterproofing and tile installation',
                        'subcategories': [
                            {
                                'name': 'Materials',
                                'subtotal': int(tiling_cost * 0.55),
                                'items': [
                                    {'item': 'Floor tiles', 'quantity': bathroom_size, 'unit': 'sqm', 'unitPrice': 65, 'cost': bathroom_size * 65},
                                    {'item': 'Wall tiles', 'quantity': bathroom_size * 3, 'unit': 'sqm', 'unitPrice': 55, 'cost': bathroom_size * 3 * 55},
                                    {'item': 'Waterproofing membrane', 'quantity': bathroom_size + 5, 'unit': 'sqm', 'unitPrice': 28, 'cost': (bathroom_size + 5) * 28}
                                ]
                            },
                            {
                                'name': 'Labor - Tiler',
                                'subtotal': int(tiling_cost * 0.45),
                                'items': [
                                    {'item': 'Master tiler (Fliesenlegermeister)', 'quantity': 40, 'unit': 'hour', 'unitPrice': 65, 'cost': 2600, 'note': 'German certified tradesman'}
                                ]
                            }
                        ]
                    },
                    {
                        'category': 'Fixtures and Fittings',
                        'cost': fixtures_cost,
                        'description': 'Bathroom furniture, mirror, and accessories',
                        'subcategories': [
                            {
                                'name': 'Furniture and Accessories',
                                'subtotal': fixtures_cost,
                                'items': [
                                    {'item': 'Vanity unit', 'quantity': 1, 'unit': 'piece', 'unitPrice': int(fixtures_cost * 0.4), 'cost': int(fixtures_cost * 0.4)},
                                    {'item': 'LED mirror cabinet', 'quantity': 1, 'unit': 'piece', 'unitPrice': int(fixtures_cost * 0.25), 'cost': int(fixtures_cost * 0.25)},
                                    {'item': 'Accessories set', 'quantity': 1, 'unit': 'set', 'unitPrice': int(fixtures_cost * 0.2), 'cost': int(fixtures_cost * 0.2)},
                                    {'item': 'Installation labor', 'quantity': 4, 'unit': 'hour', 'unitPrice': int(fixtures_cost * 0.0375), 'cost': int(fixtures_cost * 0.15)}
                                ]
                            }
                        ]
                    },
                    {
                        'category': 'Heating and Ventilation',
                        'cost': heating_cost,
                        'description': 'Heated towel rail and ventilation',
                        'subcategories': [
                            {
                                'name': 'Heating Equipment',
                                'subtotal': heating_cost,
                                'items': [
                                    {'item': 'Heated towel radiator', 'quantity': 1, 'unit': 'piece', 'unitPrice': int(heating_cost * 0.65), 'cost': int(heating_cost * 0.65)},
                                    {'item': 'Installation and fittings', 'quantity': 1, 'unit': 'set', 'unitPrice': int(heating_cost * 0.35), 'cost': int(heating_cost * 0.35)}
                                ]
                            }
                        ]
                    },
                    {
                        'category': 'Contingency Reserve',
                        'cost': contingency,
                        'description': '15% buffer for unexpected issues during renovation',
                        'subcategories': [
                            {
                                'name': 'Risk Allowances',
                                'subtotal': contingency,
                                'items': [
                                    {'item': 'Hidden damage discovery allowance', 'quantity': 1, 'unit': 'allowance', 'unitPrice': int(contingency * 0.4), 'cost': int(contingency * 0.4)},
                                    {'item': 'Material price fluctuation buffer', 'quantity': 1, 'unit': 'allowance', 'unitPrice': int(contingency * 0.3), 'cost': int(contingency * 0.3)},
                                    {'item': 'Additional labor reserve', 'quantity': 1, 'unit': 'allowance', 'unitPrice': int(contingency * 0.3), 'cost': int(contingency * 0.3)}
                                ]
                            }
                        ]
                    }
                ],
                'contingency': contingency,
                'explanation': f'This is a {quality} quality estimate based on German market prices for 2026. All costs include VAT (19%). Labor rates reflect certified German tradesmen (Meisterbetrieb). For most accurate pricing, please ensure images are uploaded for visual analysis.',
                'executiveSummary': {
                    'overview': f'This {quality} {renovation_type.replace("_", " ")} renovation involves a comprehensive modernization with quality German fixtures and materials. The project includes all essential components for a functional and aesthetically pleasing result. Total investment of {total_with_contingency:,} EUR reflects {quality} quality choices.',
                    'keyHighlights': [
                        f'Waterproofing and tiling represent 33% of total cost ({tiling_cost:,} EUR) - largest expense due to full coverage',
                        f'Plumbing fixtures account for 25% ({plumbing_cost:,} EUR) - German brand sanitary fixtures ensure durability',
                        'Labor costs account for approximately 40-45% of total project - reflects certified German tradesman rates (Meisterbetrieb)',
                        f'15% contingency reserve ({contingency:,} EUR) recommended for unexpected issues',
                        'All costs include 19% German VAT'
                    ],
                    'costDrivers': f'The main cost drivers are: (1) Tile selection and installation requiring specialized labor, (2) German brand sanitary fixtures with superior quality and warranty, (3) Full waterproofing as per German DIN standards. Choosing a different quality tier would adjust costs by approximately 30-40%.',
                    'recommendation': f'For this {quality} renovation, I recommend exploring KfW 159 financing if accessibility features are included, or a standard renovation loan. The investment in quality German fixtures provides excellent durability and maintains property value. Consider obtaining 3 contractor quotes before finalizing.',
                    'savingsTips': [
                        'Switch from premium to standard porcelain tiles - saves 800-1500 EUR',
                        'Choose Grohe over Hansgrohe for fixtures - saves 300-500 EUR with similar quality',
                        'Reduce wall tiling height from full to 3/4 height - saves 1000-1500 EUR',
                        'Use standard LED lighting instead of designer fixtures - saves 300-500 EUR',
                        'DIY demolition if physically capable - saves 500-800 EUR in labor'
                    ]
                },
                'assumptions': [
                    'Standard German residential apartment (Altbau or Neubau)',
                    f'Room size approximately {bathroom_size} sqm',
                    'No major structural wall changes required',
                    'Existing plumbing routes can be partially reused',
                    'Mid-to-large German city pricing (Munich, Frankfurt, Hamburg level)',
                    'Material availability within 4-6 weeks',
                    'Access for material delivery available',
                    'Working during normal business hours (no weekend surcharges)'
                ],
                'risks': [
                    {'factor': 'Hidden water damage behind tiles', 'impact': '+800-2000 EUR', 'likelihood': 'medium'},
                    {'factor': 'Asbestos in old floor materials (pre-1993)', 'impact': '+1500-3500 EUR', 'likelihood': 'low'},
                    {'factor': 'Outdated electrical wiring requiring upgrade', 'impact': '+500-1500 EUR', 'likelihood': 'medium'},
                    {'factor': 'Structural issues with floor or walls', 'impact': '+20-40%', 'likelihood': 'low'},
                    {'factor': 'Supply chain delays for specific fixtures', 'impact': '+2-4 weeks', 'likelihood': 'medium'}
                ],
                'financingInsights': [
                    {'text': 'Eligible for KfW 159 (Age-appropriate conversion) if accessibility features included', 'eligible': True},
                    {'text': 'KfW 261/262 available if combined with energy efficiency measures', 'eligible': True},
                    {'text': 'Labor costs tax-deductible up to 6000 EUR per year (Paragraph 35a EStG - 20% of labor)', 'eligible': True},
                    {'text': 'VAT reduction possible for renovation of buildings older than 2 years', 'eligible': True},
                    {'text': 'BAFA subsidy available if heat pump or solar thermal water heating included', 'eligible': False}
                ],
                'qualityTiers': [
                    {
                        'tier': 'standard',
                        'totalCost': reno_costs['standard'] + int(reno_costs['standard'] * 0.15),
                        'highlights': [
                            'Basic ceramic tiles (30-40 EUR per sqm)',
                            'Standard brand fixtures',
                            'Chrome finish faucets',
                            'Basic LED lighting',
                            'Standard vanity unit'
                        ]
                    },
                    {
                        'tier': 'premium',
                        'totalCost': reno_costs['premium'] + int(reno_costs['premium'] * 0.15),
                        'highlights': [
                            'Quality porcelain tiles (60-80 EUR per sqm)',
                            'German brand fixtures (Villeroy & Boch, Duravit)',
                            'Brushed nickel or matte black finish',
                            'Designer LED with dimming',
                            'Soft-close furniture',
                            'LED mirror cabinet'
                        ]
                    },
                    {
                        'tier': 'luxury',
                        'totalCost': reno_costs['luxury'] + int(reno_costs['luxury'] * 0.15),
                        'highlights': [
                            'Natural stone or large format tiles (100+ EUR per sqm)',
                            'Smart toilet with bidet function',
                            'Dornbracht or Axor designer faucets',
                            'Underfloor heating',
                            'Custom vanity with stone countertop',
                            'Smart mirror with Bluetooth'
                        ]
                    }
                ]
            },
            'metadata': {
                'documents_retrieved': 0,
                'sources_used': [],
                'rag_enabled': False,
                'backend': 'Fallback (Direct Gemini)',
                'fallback': True,
                'error': error,
                'timestamp': datetime.now().isoformat()
            }
        }

    def clear_cache(self):
        """Clear the response cache"""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"[Financing RAG] Cleared {count} cached responses")


# Singleton instance
_financing_rag_instance = None

def get_financing_rag_service(api_key: Optional[str] = None) -> FinancingRAGService:
    """Get or create Financing RAG service singleton"""
    global _financing_rag_instance

    if _financing_rag_instance is None:
        _financing_rag_instance = FinancingRAGService(api_key=api_key)

    return _financing_rag_instance
