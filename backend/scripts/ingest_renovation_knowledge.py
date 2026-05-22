"""
RAG Knowledge Base Ingestion Script
Populates ChromaDB with German renovation financing knowledge

This script ingests renovation cost data, German market prices,
and financing program information into the RAG system.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

from core.services.financing_rag_service import get_financing_rag_service, Document


def create_german_renovation_documents():
    """Create comprehensive German renovation knowledge base documents"""

    documents = []

    # ==========================================================================
    # BATHROOM RENOVATION - German Market 2026
    # ==========================================================================

    bathroom_doc = """
# Bathroom Renovation Costs - Germany 2026

## Average Costs by Size
- Small Bathroom (4-6 m²): €8,000 - €15,000
- Medium Bathroom (6-10 m²): €15,000 - €28,000
- Large Bathroom (10-15 m²): €28,000 - €50,000

## Cost Breakdown

### Premium Quality Materials (2026 Prices)
- Tiles (Villeroy & Boch): €45-80/m²
- Walk-in Shower (Grohe Rainshower): €2,500 - €4,500
- Bathtub (Duravit): €1,200 - €3,500
- Toilet (Grohe, wall-mounted): €800 - €1,500
- Washbasin with Cabinet (Villeroy & Boch): €1,200 - €2,800
- Faucets (Hansgrohe): €350 - €800 per unit

### Standard Quality
- Tiles: €25-40/m²
- Shower Enclosure: €800 - €1,500
- Bathtub: €500 - €1,200
- Toilet: €300 - €600
- Washbasin: €400 - €900

### Labor Costs (Germany 2026)
- Plumber: €80 - €120/hour
- Tile Layer: €70 - €100/hour
- Electrician: €75 - €110/hour
- General Handyman: €50 - €75/hour

### Regional Price Factors
- Munich/Bavaria: +15-20% above national average
- Frankfurt: +10-15%
- Berlin: +5-10%
- Hamburg: +8-12%
- Rural areas: -10-15%

## Detailed Work Items

### Demolition & Preparation (€800-2,500)
- Remove old fixtures and tiles
- Dispose of debris
- Prepare surfaces
- Duration: 1-2 days

### Plumbing Work (€2,000-6,000)
- Install new pipes (modern PEX or copper)
- Water supply connections
- Drainage system
- Floor heating preparation
- Duration: 2-4 days

### Electrical Work (€800-2,500)
- New wiring for lighting
- Outlets (splash-protected)
- Bathroom ventilation
- Mirror lighting
- Heated towel rail connection
- Duration: 1-2 days

### Waterproofing (€500-1,500)
- Professional waterproofing membrane
- Shower area sealed to DIN 18534 standard
- Bathtub surround
- Duration: 1 day

### Tiling (€3,000-8,000)
- Floor tiles installation
- Wall tiles (full height or partial)
- Cutting and fitting
- Grouting (epoxy grout recommended)
- Duration: 3-5 days

### Fixture Installation (€1,500-4,000)
- Toilet installation
- Shower/bathtub installation
- Washbasin and cabinet
- Mirror and accessories
- Duration: 2-3 days

## Contingency Reserve
Always add 15-20% for:
- Unexpected plumbing issues
- Structural surprises
- Material price fluctuations
- Extended timeline
"""

    documents.append(Document(
        page_content=bathroom_doc,
        metadata={'source': 'German Bathroom Renovation Guide 2026', 'type': 'bathroom', 'category': 'costs'}
    ))

    # ==========================================================================
    # KITCHEN RENOVATION - German Market 2026
    # ==========================================================================

    kitchen_doc = """
# Kitchen Renovation Costs - Germany 2026

## Average Costs by Size
- Small Kitchen (6-10 m²): €12,000 - €25,000
- Medium Kitchen (10-15 m²): €25,000 - €45,000
- Large Kitchen (15-20 m²): €45,000 - €80,000

## Premium Brands (German Market)
- Cabinets: Nobilia, Nolte, Poggenpohl, Bulthaup
- Appliances: Miele, Siemens, Bosch, Gaggenau
- Countertops: Silestone, Dekton, Granite

## Cost Breakdown

### Cabinets & Storage (€5,000-25,000)
- Budget: IKEA (€3,000-8,000)
- Mid-range: Nobilia, Nolte (€8,000-18,000)
- Premium: Poggenpohl, Bulthaup (€20,000-50,000+)

### Countertops (€1,500-8,000)
- Laminate: €50-80/m (running meter)
- Solid Surface (Corian): €250-400/m
- Granite/Marble: €300-600/m
- Dekton/Silestone: €350-700/m

### Appliances (€3,000-15,000)
Premium Package (Miele/Siemens):
- Induction Hob: €1,200-2,500
- Oven: €1,500-3,000
- Dishwasher: €1,000-2,000
- Refrigerator: €1,500-4,000
- Hood: €800-2,000

### Labor Costs
- Kitchen Fitter: €70-100/hour
- Plumber: €80-120/hour
- Electrician: €75-110/hour
- Full installation: €3,000-8,000

### Flooring (€1,000-4,000)
- Laminate: €20-40/m²
- Tiles: €30-80/m²
- Natural Stone: €60-150/m²

## Regional Variations
- Munich: Most expensive (+20%)
- Frankfurt/Stuttgart: +15%
- Berlin/Hamburg: +10%
- Cologne/Düsseldorf: +8%

## Typical Timeline
- Planning & Design: 2-4 weeks
- Manufacturing: 4-8 weeks
- Installation: 1-2 weeks
"""

    documents.append(Document(
        page_content=kitchen_doc,
        metadata={'source': 'German Kitchen Renovation Guide 2026', 'type': 'kitchen', 'category': 'costs'}
    ))

    # ==========================================================================
    # KfW FINANCING PROGRAMS 2026
    # ==========================================================================

    kfw_doc = """
# KfW Financing Programs for Renovations - 2026

## KfW Programme 261 - Energy-Efficient Buildings
**Type:** Subsidized Loan
**Amount:** Up to €150,000
**Interest Rate:** 0.01% - 1.5% (depends on efficiency standard)
**Repayment Grant:** Up to 25% of loan amount

### Eligibility:
- Comprehensive energy-efficient renovation
- Must achieve Efficiency House 85, 70, 55, or 40 standard
- Energy consultant certification required
- Application BEFORE construction starts

### What's Covered:
- Insulation (walls, roof, basement)
- Window and door replacement
- Heating system upgrade
- Ventilation system
- Solar thermal/photovoltaic

### Application Process:
1. Hire certified energy consultant
2. Get renovation plan and efficiency certificate
3. Apply through local bank (Hausbank)
4. Get approval BEFORE starting work
5. Complete work within 36 months
6. Submit completion certificate

### Contact:
Website: https://www.kfw.de/inlandsfoerderung/Privatpersonen/Bestandsimmobilie/

## KfW Programme 262 - Energy-Efficient Buildings (Grant)
**Type:** Direct Grant
**Amount:** Up to €75,000 (max 50% subsidy)
**No Repayment:** This is a grant, not a loan

### Grant Rates:
- Efficiency House 85: 5% of eligible costs (max €7,500)
- Efficiency House 70: 10% (max €15,000)
- Efficiency House 55: 15% (max €22,500)
- Efficiency House 40: 20% (max €30,000)
- Individual Measures: 15-20% (max €12,000)

### Can Be Combined:
- Can combine with KfW 261 loan
- Can stack with BAFA grants for heating
- Can use with regional programs

## KfW Programme 159 - Barrier-Free Conversion
**Type:** Subsidized Loan
**Amount:** Up to €50,000
**Interest Rate:** 0.75% - 1.5%
**Repayment Grant:** Up to €6,250 (12.5%)

### What's Covered:
- Bathroom accessibility (walk-in shower, grab bars)
- Stairlifts and ramps
- Door widening
- Flooring for wheelchairs
- Emergency call systems

### Eligibility:
- No age restriction
- No medical certificate required
- Owner-occupied or rental properties
- Application through Hausbank

### Special Benefits:
- No energy consultant needed
- Can start work before approval (check with bank)
- Combines with care insurance benefits

## KfW Programme 270 - Standard Renovation Loan
**Type:** Standard Loan
**Amount:** Up to €100,000
**Interest Rate:** 3.5% - 5.5% (market rate)
**Term:** Up to 30 years

### Flexibility:
- No specific requirements
- Any renovation work
- Can be used for modernization
- Quick approval process

## Application Tips

### Before Applying:
1. Get multiple quotes from contractors
2. Check if energy consultant needed
3. Gather property documents
4. Check credit score (SCHUFA)
5. Contact local bank early

### Required Documents:
- Property ownership proof
- ID/Passport
- Income statements (last 3 months)
- Tax returns (last 2 years)
- Building plans
- Cost estimates from contractors
- Energy certificate (for Programme 261/262)

### Processing Time:
- Application review: 1-2 weeks
- Approval: 2-4 weeks
- Total: 3-6 weeks on average

### Important Deadlines:
- Programme 261/262: Apply BEFORE work starts
- Programme 159: Can apply during work
- Programme 270: Flexible timing
"""

    documents.append(Document(
        page_content=kfw_doc,
        metadata={'source': 'KfW Official Guide 2026', 'type': 'financing', 'category': 'programs'}
    ))

    # ==========================================================================
    # BAFA HEATING GRANTS 2026
    # ==========================================================================

    bafa_doc = """
# BAFA Grants for Heating Systems - 2026

## Overview
BAFA (Federal Office for Economic Affairs and Export Control) provides direct grants for renewable heating systems.

## Grant Rates 2026

### Heat Pumps
**Air-Source Heat Pump:** 25-40% subsidy
- Basic grant: 25%
- Bonus for oil boiler replacement: +10%
- Efficiency bonus: +5%
- **Maximum: 40% of eligible costs**
- **Eligible costs cap: €60,000**
- **Maximum grant: €24,000**

**Ground-Source/Water Heat Pump:** 30-45% subsidy
- Basic grant: 30%
- Oil replacement bonus: +10%
- Efficiency bonus: +5%
- **Maximum grant: €27,000**

### Biomass Heating
**Pellet Boiler:** 10-20% subsidy
- Basic grant: 10%
- PM dust filter bonus: +2.5%
- Efficiency bonus: +7.5%
- **Maximum: 20%**
- **Max grant: €12,000**

### Solar Thermal
**Solar Collectors:** 25-30% subsidy
- Basic grant: 25%
- Efficiency bonus: +5%
- **Max grant: €15,000**

### Hybrid Systems
**Renewable Ready Gas Boiler + Solar:** 20-35%
- Must be prepared for heat pump integration
- Solar thermal included

## Eligible Costs
- Equipment and installation
- Water buffer tank
- Integration into existing system
- Hydraulic balancing
- Smart controls
- Building insulation (if needed)

## Application Process

### 1. Before Installation:
- Choose certified installer
- Get written quote
- Select eligible system from BAFA list

### 2. Submit Application:
- Apply online at: https://www.bafa.de
- Upload quotes and property documents
- Wait for approval letter (2-4 weeks)

### 3. After Approval:
- Start installation
- Complete within 9 months
- Get final invoice and certificate

### 4. Claim Grant:
- Submit completion documents
- Include installer certificate
- Receive payment (4-8 weeks)

## Combination with KfW
- ✅ Can combine with KfW 262 grant
- ✅ Can use with KfW 261 loan
- ⚠️ Cannot double-subsidize same item
- Total subsidy limit: 60% of costs

## 2026 Updates
- Increased grants for heat pumps
- New efficiency bonuses
- Simplified application process
- Faster approval times
- Extended eligible products list

## Contact
Website: https://www.bafa.de/DE/Energie/Heizen_mit_Erneuerbaren_Energien/
Phone: 06196 908-1001
Email: heizen@bafa.bund.de

## Common Combinations
1. **Heat Pump + Solar:** 40% BAFA + 15% KfW = 55% total
2. **Pellet + Solar:** 20% BAFA + 15% KfW = 35% total
3. **Heat Pump + Full Renovation:** 40% BAFA + 20% KfW 262 = 60% max
"""

    documents.append(Document(
        page_content=bafa_doc,
        metadata={'source': 'BAFA Official Guidelines 2026', 'type': 'financing', 'category': 'grants'}
    ))

    # ==========================================================================
    # REGIONAL PROGRAMS - BAVARIA
    # ==========================================================================

    bavaria_doc = """
# Regional Renovation Programs - Bavaria 2026

## BayernDarlehen - Renovation Loan
**Provider:** LfA Förderbank Bayern
**Amount:** Up to €250,000
**Interest Rate:** 0.45% - 2.5%
**Term:** Up to 20 years

### What's Covered:
- Energy-efficient renovations
- Modernization of rental properties
- Barrier-free conversions
- Historic building preservation

### Advantages:
- Can combine with KfW programs
- Interest rate subsidy from Bavaria
- Repayment holiday: up to 3 years
- No early repayment fees

### Eligibility:
- Property in Bavaria
- Owner or landlord
- Income limits apply for full subsidy

## 10,000 Häuser Programm
**Type:** Direct Grant + Bonus
**Amount:** €200 - €18,500 per measure
**Target:** Energy efficiency & storage

### Grant Components:

1. **Energy Systems Bonus:**
   - Heat pump: €2,400 base + €150/kW
   - Battery storage: €500/kWh (max €3,000)
   - PV system bonus: €500

2. **Tech Bonus (Smart Integration):**
   - Energy management system: €200-500
   - Smart meter: €100

3. **Total Potential:**
   - Full package: up to €18,500
   - Stacks with federal programs

### Application:
Website: https://www.energieatlas.bayern.de/
Processing: 6-10 weeks

## Munich City Programs

### Energiereferat München
- Additional €1,000-5,000 for energy renovations
- Solar panel grants
- E-mobility charging infrastructure
- Applies only to Munich properties

## Nuremberg Programs
- Altbauoffensive: €500-3,000
- Window replacement bonus
- Insulation grants

## Important Notes
- Regional programs can stack with federal
- Must meet Bavaria's building standards
- Some programs have income limits
- Application deadlines vary by program
- Always check current availability

## Contact
LfA Förderbank Bayern: www.lfa.de
Phone: 089 21 24-1
"""

    documents.append(Document(
        page_content=bavaria_doc,
        metadata={'source': 'Bavaria Regional Programs 2026', 'type': 'financing', 'category': 'regional'}
    ))

    return documents


def main():
    """Main ingestion function"""
    print("="*80)
    print("RAG Knowledge Base Ingestion")
    print("="*80)

    # Get API key
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found in environment variables")
        print("Please set it in your .env file or environment")
        return

    print(f"\n[INFO] API Key found: {api_key[:8]}...")

    # Get RAG service
    print("[INFO] Initializing RAG service...")
    rag_service = get_financing_rag_service(api_key=api_key)

    # Create documents
    print("[INFO] Creating knowledge base documents...")
    documents = create_german_renovation_documents()
    print(f"[INFO] Created {len(documents)} documents")

    # Ingest documents
    print("\n[INFO] Starting ingestion process...")
    print("[INFO] This will take several minutes (generating embeddings)...")

    try:
        num_chunks = rag_service.add_documents(
            documents=documents,
            chunk_size=1500,
            chunk_overlap=300
        )

        print("\n" + "="*80)
        print("SUCCESS!")
        print("="*80)
        print(f"✅ Ingested {num_chunks} document chunks")
        print(f"✅ Knowledge base ready for use")
        print(f"✅ Location: {rag_service.persist_directory}")
        print("\nYou can now use the RAG-enhanced cost estimation API!")

    except Exception as e:
        print(f"\n[ERROR] Ingestion failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
