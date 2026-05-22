"""
RAG Service with Qdrant Vector Database
Place this file at: backend/core/api/planning_work/rag_service.py
"""
import os
import logging
from typing import List, Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    from PyPDF2 import PdfReader
    from sentence_transformers import SentenceTransformer
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"RAG dependencies not available: {e}")
    DEPENDENCIES_AVAILABLE = False


class QdrantRAGService:
    """
    RAG Service using Qdrant vector database
    Handles PDF indexing and semantic search
    """
    
    def __init__(
        self, 
        pdf_directory: str,
        collection_name: str = "renovation_knowledge",
        embedding_model: str = "all-MiniLM-L6-v2",
        qdrant_url: str = None,
        qdrant_api_key: str = None
    ):
        if not DEPENDENCIES_AVAILABLE:
            raise ImportError(
                "Install dependencies: pip install qdrant-client pypdf2 sentence-transformers"
            )
        
        self.pdf_directory = Path(pdf_directory)
        self.collection_name = collection_name
        
        logger.info(f"Loading embedding model: {embedding_model}")
        self.embedder = SentenceTransformer(embedding_model)
        self.embedding_dim = self.embedder.get_sentence_embedding_dimension()
        
        if qdrant_url and qdrant_api_key:
            print(f"[RAG] Connecting to Qdrant Cloud at {qdrant_url}")
            logger.info(f"Initializing Qdrant Cloud at {qdrant_url}")
            self.client = QdrantClient(
                url=qdrant_url,
                api_key=qdrant_api_key
            )
        else:
            qdrant_path = str(self.pdf_directory.parent / "qdrant_storage")
            logger.info(f"Initializing Qdrant Local at {qdrant_path}")
            self.client = QdrantClient(path=qdrant_path)
        
        self._setup_collection()
        
    def _setup_collection(self):
        """Create or load Qdrant collection"""
        print("[RAG] Checking Qdrant collections...")
        collections = self.client.get_collections().collections
        collection_names = [col.name for col in collections]
        
        if self.collection_name not in collection_names:
            print(f"[RAG] Creating new collection: {self.collection_name}")
            logger.info(f"Creating new collection: {self.collection_name}")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dim,
                    distance=Distance.COSINE
                )
            )
            print(f"[RAG] Collection '{self.collection_name}' created successfully")
            logger.info("Collection created successfully")
        else:
            print(f"[RAG] Collection '{self.collection_name}' already exists")
            logger.info(f"Collection {self.collection_name} already exists")
    
    def is_indexed(self) -> bool:
        """Check if PDFs are already indexed"""
        try:
            collection = self.client.get_collection(self.collection_name)
            count = collection.points_count
            print(f"[RAG] Collection contains {count} indexed vectors")
            return count > 0
        except:
            print("[RAG] Unable to check collection status")
            return False
    
    def get_pdf_metadata(self) -> Dict[str, float]:
        """Get metadata of current PDF files (name and modification time)"""
        pdf_files = list(self.pdf_directory.glob("*.pdf"))
        metadata = {}
        for pdf_file in pdf_files:
            mod_time = pdf_file.stat().st_mtime
            metadata[pdf_file.name] = mod_time
        return metadata
    
    def check_needs_reindex(self) -> bool:
        """
        Check if PDFs need to be re-indexed by comparing with stored metadata
        
        Returns:
            True if reindexing needed, False otherwise
        """
        try:
            current_metadata = self.get_pdf_metadata()
            
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                limit=1
            )
            
            if not scroll_result[0]:
                print("[RAG] No existing data found")
                return True
            
            first_point = scroll_result[0][0]
            stored_metadata = first_point.payload.get('pdf_metadata', {})
            
            if stored_metadata != current_metadata:
                print("[RAG] PDF files have changed, re-indexing required")
                print(f"[RAG] Stored PDFs: {list(stored_metadata.keys())}")
                print(f"[RAG] Current PDFs: {list(current_metadata.keys())}")
                return True
            else:
                print("[RAG] PDFs unchanged, using existing index")
                return False
                
        except Exception as e:
            print(f"[RAG] Unable to check metadata: {e}")
            return True
    
    def clear_collection(self):
        """Clear all data from the collection"""
        try:
            print("[RAG] Clearing existing collection data")
            self.client.delete_collection(collection_name=self.collection_name)
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.embedding_dim,
                    distance=Distance.COSINE
                )
            )
            print("[RAG] Collection cleared successfully")
        except Exception as e:
            print(f"[RAG] Error clearing collection: {e}")
    
    def index_pdfs(self, force_reindex: bool = False):
        """
        Extract text from PDFs, chunk, embed, and store in Qdrant

        Args:
            force_reindex: If True, clear existing data and re-index
        """
        # IMPORTANT: First check if Qdrant Cloud already has indexed data
        # If yes and not forcing reindex, skip PDF processing entirely
        if not force_reindex and self.is_indexed():
            print("[RAG] Collection already has indexed data in Qdrant Cloud")
            print("[RAG] Skipping PDF indexing - using existing cloud data")
            return

        # Only check for PDF files if we actually need to index
        pdf_files = list(self.pdf_directory.glob("*.pdf"))

        if not pdf_files:
            # No local PDFs - check if cloud has data
            if self.is_indexed():
                print("[RAG] No local PDFs, but Qdrant Cloud has data - using cloud data")
                return
            raise ValueError(f"No PDF files found in {self.pdf_directory} and Qdrant collection is empty")

        if self.is_indexed():
            self.clear_collection()
        
        print(f"\n[RAG] Found {len(pdf_files)} PDF files to process")
        logger.info(f"Found {len(pdf_files)} PDF files to process")
        
        pdf_metadata = self.get_pdf_metadata()
        
        all_points = []
        point_id = 0
        
        for idx, pdf_file in enumerate(pdf_files, 1):
            print(f"[RAG] Processing [{idx}/{len(pdf_files)}] {pdf_file.name}")
            logger.info(f"Processing {pdf_file.name}")
            
            # Extract text
            text = self._extract_pdf_text(pdf_file)
            
            # Chunk text
            chunks = self._chunk_text(text, source_file=pdf_file.name)
            print(f"[RAG] Created {len(chunks)} chunks from {pdf_file.name}")
            
            # Create embeddings and points
            for chunk_text, metadata in chunks:
                # Generate embedding
                embedding = self.embedder.encode(chunk_text).tolist()
                
                # Create point with PDF metadata
                point = PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "text": chunk_text,
                        "source_file": metadata["source_file"],
                        "chunk_index": metadata["chunk_index"],
                        "pdf_metadata": pdf_metadata  # Store metadata for version tracking
                    }
                )
                all_points.append(point)
                point_id += 1
        
        # Upload to Qdrant in batches
        print(f"\n[RAG] Uploading {len(all_points)} chunks to Qdrant Cloud")
        logger.info(f"Uploading {len(all_points)} chunks to Qdrant")
        batch_size = 100
        
        for i in range(0, len(all_points), batch_size):
            batch = all_points[i:i+batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(all_points) + batch_size - 1) // batch_size
            print(f"[RAG] Uploading batch {batch_num}/{total_batches}")
            self.client.upsert(
                collection_name=self.collection_name,
                points=batch
            )
        
        print(f"[RAG] Successfully indexed {len(all_points)} chunks\n")
        logger.info(f"Successfully indexed {len(all_points)} chunks")
        
    def _extract_pdf_text(self, pdf_path: Path) -> str:
        """Extract text from PDF"""
        try:
            reader = PdfReader(str(pdf_path))
            text = ""
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                text += f"\n[Page {page_num}]\n{page_text}\n"
            return text
        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path}: {e}")
            return ""
    
    def _chunk_text(self, text: str, source_file: str, 
                   chunk_size: int = 1000, overlap: int = 200) -> List[tuple]:
        """
        Split text into overlapping chunks
        
        Returns:
            List of (chunk_text, metadata) tuples
        """
        chunks = []
        start = 0
        chunk_index = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + chunk_size
            chunk_text = text[start:end]
            
            metadata = {
                'source_file': source_file,
                'chunk_index': chunk_index
            }
            
            chunks.append((chunk_text, metadata))
            start += (chunk_size - overlap)
            chunk_index += 1
        
        return chunks
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Search for relevant chunks using semantic similarity
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of results with text and metadata
        """
        from qdrant_client.models import NamedVector
        
        print(f"[RAG] Searching for top {top_k} relevant chunks")
        
        query_vector = self.embedder.encode(query).tolist()
        
        try:
            search_results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=top_k
            ).points
            print(f"[RAG] Found {len(search_results)} relevant chunks")
        except AttributeError:
            from qdrant_client.models import SearchRequest
            search_results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k
            )
            print(f"[RAG] Found {len(search_results)} relevant chunks (using legacy API)")
        
        results = []
        for idx, hit in enumerate(search_results, 1):
            source = hit.payload['source_file']
            score = hit.score if hasattr(hit, 'score') else 0.0
            print(f"[RAG]   {idx}. {source} (relevance: {score:.3f})")
            
            results.append({
                'text': hit.payload['text'],
                'source_file': source,
                'chunk_index': hit.payload['chunk_index'],
                'score': score
            })
        
        return results
    
    def get_context(
        self,
        building_type: str,
        location: str,
        budget: float,
        goals: List[str],
        top_k: int = 6
    ) -> str:
        """
        Get relevant context for renovation planning
        
        Args:
            building_type: Type of building
            location: Location/Bundesland
            budget: Budget in euros
            goals: Renovation goals
            top_k: Number of chunks to retrieve
            
        Returns:
            Formatted context string for LLM
        """
        query = f"""
        Building type: {building_type}
        Location: {location}
        Budget: {budget} EUR
        Goals: {', '.join(goals)}
        
        German renovation standards, KfW financing programs, permit requirements,
        materials planning, cost estimation, energy efficiency requirements, GEG standards.
        """
        
        results = self.search(query, top_k=top_k)
        
        context = "=== RELEVANT KNOWLEDGE FROM GERMAN RENOVATION STANDARDS ===\n\n"
        
        for i, result in enumerate(results, 1):
            context += f"[Source {i}: {result['source_file']}]\n"
            context += f"{result['text']}\n"
            context += "---\n\n"
        
        return context
    
    def get_collection_info(self) -> Dict:
        """Get information about the collection"""
        try:
            collection_info = self.client.get_collection(self.collection_name)
            return {
                'name': self.collection_name,
                'vectors_count': collection_info.vectors_count,
                'points_count': collection_info.points_count,
                'indexed': collection_info.points_count > 0
            }
        except Exception as e:
            return {
                'name': self.collection_name,
                'error': str(e),
                'indexed': False
            }


_rag_instance = None

def get_rag_service(
    pdf_directory: str = None,
    qdrant_url: str = None,
    qdrant_api_key: str = None
) -> Optional[QdrantRAGService]:
    """
    Get or create RAG service singleton
    
    Args:
        pdf_directory: Path to PDF directory (required on first call)
        qdrant_url: Qdrant Cloud URL (optional, for cloud usage)
        qdrant_api_key: Qdrant Cloud API key (optional, for cloud usage)
    
    Returns:
        QdrantRAGService instance or None if dependencies not available
    """
    global _rag_instance
    
    if not DEPENDENCIES_AVAILABLE:
        print("[RAG] Dependencies not available")
        return None
    
    if _rag_instance is None:
        if pdf_directory is None:
            raise ValueError("pdf_directory required for first initialization")
        
        print("\n" + "="*60)
        print("[RAG] Initializing RAG Service")
        print("="*60)
        
        _rag_instance = QdrantRAGService(
            pdf_directory=pdf_directory,
            qdrant_url=qdrant_url,
            qdrant_api_key=qdrant_api_key
        )
        
        _rag_instance.index_pdfs(force_reindex=False)
        
        print("="*60 + "\n")
    else:
        print("[RAG] Using existing RAG instance")
    
    return _rag_instance