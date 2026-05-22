"""
Document Ingestion Script for Financing RAG System
Loads knowledge base documents into ChromaDB with Gemini embeddings

Run this script once to initialize the knowledge base:
    python scripts/ingest_financing_knowledge.py

Or to reset and rebuild:
    python scripts/ingest_financing_knowledge.py --reset
"""

import os
import sys
from pathlib import Path
import argparse
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
import django
django.setup()

from core.services.financing_rag_service import (
    FinancingRAGService,
    Document,
    logger
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def load_documents_from_directory(directory_path: Path) -> list[Document]:
    """Load all .txt files from directory as Documents"""
    documents = []

    if not directory_path.exists():
        logger.error(f"Directory not found: {directory_path}")
        return documents

    txt_files = list(directory_path.glob("*.txt"))

    if not txt_files:
        logger.warning(f"No .txt files found in {directory_path}")
        return documents

    logger.info(f"Found {len(txt_files)} document files")

    for txt_file in txt_files:
        try:
            logger.info(f"Loading: {txt_file.name}")

            with open(txt_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Create document with metadata
            doc = Document(
                page_content=content,
                metadata={
                    'source': txt_file.stem,  # filename without extension
                    'filename': txt_file.name,
                    'file_path': str(txt_file),
                    'document_type': 'knowledge_base',
                    'language': 'en',  # English content about German programs
                    'created_date': txt_file.stat().st_mtime
                }
            )

            documents.append(doc)
            logger.info(f"[OK] Loaded: {txt_file.name} ({len(content):,} characters)")

        except Exception as e:
            logger.error(f"[ERROR] Error loading {txt_file.name}: {e}")

    return documents


def reset_collection(rag_service: FinancingRAGService):
    """Reset the ChromaDB collection"""
    try:
        logger.info("Resetting ChromaDB collection...")

        # Delete existing collection
        if rag_service.collection is not None:
            rag_service.chroma_client.delete_collection(
                name=rag_service.collection_name
            )
            logger.info(f"[OK] Deleted existing collection: {rag_service.collection_name}")

        # Create new collection
        rag_service.collection = rag_service.chroma_client.create_collection(
            name=rag_service.collection_name,
            metadata={"description": "German renovation financing knowledge base 2026"}
        )
        logger.info(f"[OK] Created new collection: {rag_service.collection_name}")

    except Exception as e:
        logger.error(f"Error resetting collection: {e}")
        raise


def main():
    """Main ingestion process"""
    parser = argparse.ArgumentParser(
        description='Ingest knowledge base documents into ChromaDB'
    )
    parser.add_argument(
        '--reset',
        action='store_true',
        help='Reset and rebuild the entire collection'
    )
    parser.add_argument(
        '--chunk-size',
        type=int,
        default=1500,
        help='Chunk size for text splitting (default: 1500)'
    )
    parser.add_argument(
        '--chunk-overlap',
        type=int,
        default=300,
        help='Chunk overlap for text splitting (default: 300)'
    )

    args = parser.parse_args()

    print("="*80)
    print("FINANCING KNOWLEDGE BASE INGESTION")
    print("="*80)
    print()

    # Initialize RAG service
    try:
        print("Initializing RAG service...")
        rag_service = FinancingRAGService()
        print("[OK] RAG service initialized")
        print()
    except Exception as e:
        print(f"[ERROR] Error initializing RAG service: {e}")
        print("\nMake sure:")
        print("1. GEMINI_API_KEY is set in environment variables")
        print("2. chromadb is installed: pip install chromadb")
        print("3. google-generativeai is installed: pip install google-generativeai")
        return 1

    # Reset collection if requested
    if args.reset:
        confirm = input("[WARNING]  Reset will delete all existing documents. Continue? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Cancelled.")
            return 0
        reset_collection(rag_service)
        print()

    # Check existing documents
    if rag_service.collection is not None:
        existing_count = rag_service.collection.count()
        print(f"Existing documents in collection: {existing_count}")
        if existing_count > 0 and not args.reset:
            print("[WARNING]  Collection already has documents.")
            print("    Use --reset to rebuild from scratch, or proceed to add more.")
            proceed = input("Continue adding documents? (yes/no): ")
            if proceed.lower() != 'yes':
                print("Cancelled.")
                return 0
        print()

    # Load documents
    docs_directory = Path(__file__).parent.parent / "data" / "financing_kb" / "documents"
    print(f"Loading documents from: {docs_directory}")
    print()

    documents = load_documents_from_directory(docs_directory)

    if not documents:
        print("[ERROR] No documents loaded. Check the documents directory.")
        return 1

    print()
    print(f"Loaded {len(documents)} documents:")
    for doc in documents:
        print(f"  - {doc.metadata['filename']}")
    print()

    # Ingest documents
    print("Starting document ingestion...")
    print(f"Chunk size: {args.chunk_size} characters")
    print(f"Chunk overlap: {args.chunk_overlap} characters")
    print()
    print("This may take several minutes depending on document size...")
    print("Generating embeddings with Gemini text-embedding-004...")
    print()

    try:
        num_chunks = rag_service.add_documents(
            documents,
            chunk_size=args.chunk_size,
            chunk_overlap=args.chunk_overlap
        )

        print()
        print("="*80)
        print("INGESTION COMPLETE")
        print("="*80)
        print(f"[OK] Documents processed: {len(documents)}")
        print(f"[OK] Total chunks created: {num_chunks}")
        print(f"[OK] Collection: {rag_service.collection_name}")
        print(f"[OK] Storage: {rag_service.persist_directory}")
        print()

        # Verify
        final_count = rag_service.collection.count()
        print(f"Verification: Collection now contains {final_count} document chunks")
        print()

        # Test query
        print("Testing retrieval...")
        test_query = "bathroom renovation costs"
        test_results = rag_service.retrieve_relevant_docs(test_query, k=3)
        print(f"[OK] Test query '{test_query}' returned {len(test_results)} results")

        if test_results:
            print("\nSample result:")
            print(f"  Source: {test_results[0].metadata.get('source', 'Unknown')}")
            print(f"  Preview: {test_results[0].page_content[:150]}...")

        print()
        print("="*80)
        print("[OK] Knowledge base ready for use!")
        print("="*80)
        print()
        print("Next steps:")
        print("1. The RAG system is now ready to use")
        print("2. Test it with: python scripts/test_financing_rag.py")
        print("3. Or use it in your application via the financing API")
        print()

        return 0

    except Exception as e:
        print()
        print("="*80)
        print("[ERROR] INGESTION FAILED")
        print("="*80)
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
