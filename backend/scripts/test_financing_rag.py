"""
Test Script for Financing RAG System
Tests the RAG implementation with real-world scenarios

Run after ingesting documents:
    python scripts/test_financing_rag.py
"""

import os
import sys
from pathlib import Path
import json
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
import django
django.setup()

from core.services.financing_rag_service import get_financing_rag_service


# Test scenarios for different renovation types
TEST_SCENARIOS = [
    {
        "name": "Small Bathroom Renovation - Munich",
        "form_data": {
            "renovationType": "bathroom",
            "bathroomRenovationAreas": ["shower_area", "toilet_area", "tiles_surfaces"],
            "qualityPreference": "standard",
            "bathroomSize": 6,
            "location": "Munich",
            "propertyAge": "25",
            "renovationGoal": ["full_renovation"]
        }
    },
    {
        "name": "Kitchen Renovation - Berlin",
        "form_data": {
            "renovationType": "kitchen",
            "kitchenRenovationGoal": ["full_demolition", "add_island"],
            "qualityPreference": "premium",
            "kitchenType": "main_kitchen",
            "location": "Berlin"
        }
    },
    {
        "name": "Heat Pump Installation - Rural Area",
        "form_data": {
            "renovationType": "hvac",
            "hvacRenovationGoal": "replace_heating_system",
            "coolingRequirement": "no",
            "heatingRequirement": "yes",
            "location": "Rural Germany"
        }
    },
    {
        "name": "Complete House Renovation - Hamburg",
        "form_data": {
            "renovationType": "general",
            "generalRenovationGoal": "complete_modernization",
            "propertyAge": "40",
            "areasIncluded": ["kitchen", "bathroom", "living_room", "bedrooms"],
            "location": "Hamburg",
            "qualityPreference": "standard"
        }
    }
]


def print_section(title: str):
    """Print a formatted section header"""
    print()
    print("="*80)
    print(title.center(80))
    print("="*80)
    print()


def print_cost_estimate(cost_estimate: dict):
    """Print cost estimate details"""
    print("COST ESTIMATE:")
    print(f"  Total: €{cost_estimate.get('totalEstimatedCost', 0):,}")
    print(f"  Contingency: €{cost_estimate.get('contingency', 0):,}")
    print()

    breakdown = cost_estimate.get('breakdown', [])
    if breakdown:
        print("  Breakdown:")
        for item in breakdown:
            print(f"    - {item.get('category', 'Unknown')}: €{item.get('cost', 0):,}")
            desc = item.get('description', '')
            if desc:
                # Wrap long descriptions
                if len(desc) > 70:
                    desc = desc[:70] + '...'
                print(f"      {desc}")
        print()

    explanation = cost_estimate.get('explanation', '')
    if explanation:
        print("  Explanation:")
        # Wrap explanation
        words = explanation.split()
        line = "    "
        for word in words:
            if len(line) + len(word) + 1 > 78:
                print(line)
                line = "    " + word
            else:
                line += " " + word if line != "    " else word
        if line.strip():
            print(line)
        print()


def print_recommendations(recommendations: list):
    """Print financing recommendations"""
    print(f"FINANCING RECOMMENDATIONS: {len(recommendations)} options")
    print()

    for i, rec in enumerate(recommendations, 1):
        print(f"  {i}. {rec.get('name', 'Unknown')} ({rec.get('type', 'unknown')})")
        print(f"     Max Amount: {rec.get('maxAmount', 'N/A')}")
        print(f"     Interest Rate: {rec.get('interestRate', 'N/A')}")
        print(f"     Match Score: {rec.get('matchScore', 0)}/100")

        pros = rec.get('pros', [])
        if pros:
            print(f"     Pros: {', '.join(pros[:2])}")

        sources = rec.get('sources', [])
        if sources:
            print(f"     Sources: {', '.join(sources)}")

        print()


def print_metadata(metadata: dict):
    """Print metadata information"""
    print("METADATA:")
    print(f"  RAG Enabled: {metadata.get('rag_enabled', False)}")
    print(f"  Documents Retrieved: {metadata.get('documents_retrieved', 0)}")
    print(f"  Backend: {metadata.get('backend', 'Unknown')}")
    print(f"  Cached: {metadata.get('cached', False)}")
    print(f"  Fallback: {metadata.get('fallback', False)}")

    sources = metadata.get('sources_used', [])
    if sources:
        print(f"  Sources Used: {', '.join(sources)}")

    print()


def run_test_scenario(rag_service, scenario: dict, scenario_num: int):
    """Run a single test scenario"""
    print_section(f"TEST {scenario_num}: {scenario['name']}")

    print("Input Form Data:")
    for key, value in scenario['form_data'].items():
        print(f"  {key}: {value}")
    print()

    print("Analyzing with RAG...")
    start_time = datetime.now()

    try:
        result = rag_service.analyze_financing(
            form_data=scenario['form_data'],
            use_cache=True,
            debug_mode=False
        )

        elapsed = (datetime.now() - start_time).total_seconds()
        print(f"✓ Analysis completed in {elapsed:.2f} seconds")
        print()

        # Print results
        cost_estimate = result.get('costEstimate', {})
        if cost_estimate:
            print_cost_estimate(cost_estimate)

        recommendations = result.get('recommendations', [])
        if recommendations:
            print_recommendations(recommendations)

        summary = result.get('summary', '')
        if summary:
            print("SUMMARY:")
            print(f"  {summary}")
            print()

        next_steps = result.get('nextSteps', [])
        if next_steps:
            print("NEXT STEPS:")
            for i, step in enumerate(next_steps[:3], 1):
                print(f"  {i}. {step}")
            print()

        metadata = result.get('metadata', {})
        if metadata:
            print_metadata(metadata)

        # Check if it's fallback
        if metadata.get('fallback', False):
            print("⚠️  WARNING: This is a fallback response (RAG retrieval failed)")
            print()

        # Check if cost looks reasonable
        total_cost = cost_estimate.get('totalEstimatedCost', 0)
        if total_cost == 35000 or total_cost == 50000:
            print("⚠️  WARNING: Cost estimate appears generic (possible fallback value)")
            print()

        return True

    except Exception as e:
        print(f"✗ Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main test execution"""
    print_section("FINANCING RAG SYSTEM - TEST SUITE")

    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Number of test scenarios: {len(TEST_SCENARIOS)}")
    print()

    # Initialize RAG service
    print("Initializing Financing RAG Service...")
    try:
        rag_service = get_financing_rag_service()
        # Ensure dependencies are loaded (ChromaDB, etc.)
        rag_service._ensure_dependencies()
        print("✓ RAG service initialized")
        print()

        # Check collection status
        if rag_service.collection is not None:
            doc_count = rag_service.collection.count()
            print(f"✓ Knowledge base contains {doc_count} document chunks")
            if doc_count == 0:
                print()
                print("⚠️  WARNING: Knowledge base is empty!")
                print("   Run: python scripts/ingest_financing_knowledge.py")
                print()
                return 1
        else:
            print("✗ No collection found. Please run ingestion script first.")
            print("   Run: python scripts/ingest_financing_knowledge.py")
            return 1

    except Exception as e:
        print(f"✗ Error initializing RAG service: {e}")
        import traceback
        traceback.print_exc()
        return 1

    # Run test scenarios
    results = []
    for i, scenario in enumerate(TEST_SCENARIOS, 1):
        success = run_test_scenario(rag_service, scenario, i)
        results.append({
            'scenario': scenario['name'],
            'success': success
        })

        # Pause between tests
        if i < len(TEST_SCENARIOS):
            print()
            input("Press Enter to continue to next test...")
            print()

    # Summary
    print_section("TEST SUMMARY")

    successes = sum(1 for r in results if r['success'])
    failures = len(results) - successes

    print(f"Total Tests: {len(results)}")
    print(f"Successful: {successes} ✓")
    print(f"Failed: {failures} ✗")
    print()

    if failures > 0:
        print("Failed scenarios:")
        for result in results:
            if not result['success']:
                print(f"  - {result['scenario']}")
        print()

    # Cache stats
    cache_size = len(rag_service._cache)
    print(f"Response cache: {cache_size} entries")
    print()

    # Overall result
    if failures == 0:
        print("="*80)
        print("✓ ALL TESTS PASSED".center(80))
        print("="*80)
        print()
        print("The RAG system is working correctly!")
        print()
        return 0
    else:
        print("="*80)
        print("⚠️  SOME TESTS FAILED".center(80))
        print("="*80)
        print()
        print("Please review the errors above and check:")
        print("1. Gemini API key is valid")
        print("2. Knowledge base is properly ingested")
        print("3. Network connectivity")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
