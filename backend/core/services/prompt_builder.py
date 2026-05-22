"""
Prompt Builder Service
Constructs detailed prompts for Gemini API based on user's financing form data
"""


class PromptBuilder:
	"""
	Builds structured prompts for Gemini AI based on user's renovation form data
	"""

	def build_cost_estimation_prompt(self, form_data):
		"""
		Build a detailed prompt for cost estimation

		Args:
			form_data (dict): User's form responses including:
				- renovationType: string
				- bathroomSize: string (optional)
				- bathroomElements: list (optional)
				- bathroomAccessibility: string (optional)
				- bathroomPlumbing: string (optional)
				- bathroomCondition: string (optional)

		Returns:
			str: Formatted prompt for Gemini API
		"""
		renovation_type = form_data.get('renovationType', 'general')

		# Base prompt structure
		prompt = f"""As a German renovation cost expert, analyze this project and provide a DETAILED cost estimate in JSON format.

PROJECT DATA:
- Renovation Type: {renovation_type}
- Property: Standard German residential property
- Location: Germany
"""

		# Add renovation-specific details based on type
		if renovation_type == 'bathroom':
			prompt += self._add_bathroom_details(form_data)
		elif renovation_type == 'kitchen':
			prompt += self._add_kitchen_details(form_data)
		elif renovation_type == 'basement':
			prompt += self._add_basement_details(form_data)
		elif renovation_type == 'roofing':
			prompt += self._add_roofing_details(form_data)
		elif renovation_type == 'electrical':
			prompt += self._add_electrical_details(form_data)
		elif renovation_type == 'plumbing':
			prompt += self._add_plumbing_details(form_data)
		elif renovation_type == 'hvac':
			prompt += self._add_hvac_details(form_data)
		elif renovation_type == 'flooring':
			prompt += self._add_flooring_details(form_data)
		elif renovation_type == 'windows_doors':
			prompt += self._add_windows_doors_details(form_data)
		elif renovation_type == 'exterior':
			prompt += self._add_exterior_details(form_data)
		elif renovation_type == 'general':
			prompt += self._add_general_details(form_data)

		# Add JSON format requirements with specific German bathroom cost guidance
		prompt += """
GERMAN BATHROOM RENOVATION COST GUIDELINES (2025):

LABOR COSTS (Handwerker - German Market Rates):
- Demolition (Abbruch): 20-40 EUR per m² (older buildings cost more due to disposal requirements)
- Plumbing (Sanitär): 60-90 EUR per hour (full day: 500-700 EUR)
- Electrical (Elektrik): 50-80 EUR per hour (full day: 400-600 EUR)
- Waterproofing (Abdichtung): 40-60 EUR per m²
- Tiling (Fliesenleger):
  * Basic ceramic tiles: 30-50 EUR per m² (labor only)
  * Large format porcelain: 60-80 EUR per m² (labor only)
  * Natural stone/premium: 80-120 EUR per m² (labor only)

MATERIAL COSTS BY QUALITY LEVEL (German Market 2025):

BUDGET-FRIENDLY Materials:
- Tiles: 15-30 EUR per m² (basic ceramic from Baumarkt)
- Toilet: 150-300 EUR (standard brands like Keramag, basic models)
- Washbasin: 80-150 EUR (standard ceramic)
- Shower faucet: 80-150 EUR (basic chrome mixer)
- Basin faucet: 50-120 EUR (basic chrome)
- Bathtub (acrylic): 300-600 EUR (standard acrylic, 170cm)
- Vanity unit: 200-400 EUR (basic laminate)
- Mirror: 50-100 EUR (standard glass)
- Lighting: 30-80 EUR per fixture (basic LED)

STANDARD QUALITY - German Brands:
- Tiles: 35-60 EUR per m² (quality porcelain, German brands)
- Toilet: 300-600 EUR (Villeroy & Boch, Duravit standard lines)
- Washbasin: 150-350 EUR (Villeroy & Boch, Duravit)
- Shower faucet: 200-500 EUR (Grohe - most popular in Germany)
- Basin faucet: 150-400 EUR (Grohe)
- Bathtub (steel enamel): 600-1200 EUR (Bette/Kaldewei - German specialty)
- Countertop (quartz): 200-400 EUR per linear meter
- Vanity unit: 400-900 EUR (quality wood/lacquer)
- Mirror (LED-backlit): 200-450 EUR (with integrated lighting)
- Lighting: 80-200 EUR per fixture (branded LED, good CRI)
- Heated towel radiator: 300-700 EUR (Kermi, German brand)

PREMIUM QUALITY - Designer/High-End:
- Tiles: 70-150 EUR per m² (large format porcelain, premium finishes)
- Toilet: 600-1500 EUR (Duravit designer series, advanced features)
- Washbasin: 350-900 EUR (Duravit designer models, unique shapes)
- Shower faucet: 500-1200 EUR (Hansgrohe - premium line)
- Basin faucet: 400-1000 EUR (Hansgrohe)
- Bathtub (cast iron): 1200-2500 EUR (exceptional quality, long-lasting)
- Countertop (granite/marble): 400-800 EUR per linear meter
- Vanity unit: 900-2000 EUR (high-end wood, custom design)
- Mirror (smart): 450-900 EUR (touchscreen, Bluetooth, defogging)
- Lighting: 200-500 EUR per fixture (designer LED, smart control)
- Heated towel radiator: 700-1500 EUR (Zehnder - Swiss-German premium)
- Underfloor heating: 60-100 EUR per m² (electric), 80-120 EUR per m² (water-based)

LUXURY Materials:
- Tiles: 150-400+ EUR per m² (natural stone - marble, slate, travertine)
- Toilet: 1500-5000+ EUR (smart toilets with full bidet, Japanese tech)
- Shower faucet: 1200-3000+ EUR (Dornbracht - architectural quality)
- Basin faucet: 1000-2500+ EUR (Dornbracht - ultra-premium)
- Bathtub (stone resin): 2500-6000+ EUR (luxury freestanding, designer brands)
- Countertop (marble): 800-1500+ EUR per linear meter (Carrara, Calacatta)
- Vanity unit: 2000-5000+ EUR (bespoke cabinetry, exotic wood)
- Heated towel radiator: 1500-3500+ EUR (Vasco - designer statement pieces)

CRITICAL RULES:
1. Respond ONLY with valid JSON (no markdown, no code blocks, no extra text)
2. Do NOT use apostrophes or quotes inside description text
3. Use simple words without special characters
4. ANALYZE THE USER'S SPECIFIC CHOICES - Standard vs Medium vs High-End quality affects costs significantly
5. Consider bathroom size (m²) - larger bathrooms cost more
6. Consider building age - older buildings need more pipe/electrical work
7. Consider complexity - walk-in showers, underfloor heating, shower toilets add significant costs

COST BREAKDOWN CATEGORIES (use these):
1. "Demolition and Disposal" - Removing old bathroom, waste disposal
2. "Plumbing Work" - All pipe work, fixtures installation
3. "Electrical Work" - Lighting, ventilation, shower toilet electrical (if applicable)
4. "Waterproofing and Tiling" - Wall and floor prep, tiling labor and materials
5. "Fixtures and Fittings" - Shower/tub, toilet, sink, vanity, faucets, mirror
6. "Heating and Ventilation" - Radiator/underfloor heating, ventilation system
7. "Contingency Reserve" - 15% buffer for unexpected costs

EXACT format (Professional Consultant-Style with DETAILED Line Items):
{
  "totalEstimatedCost": 28500,
  "renovationType": "Bathroom Renovation",
  "qualityLevel": "Premium",
  "estimatedDuration": "3-4 weeks",
  "locationAssumption": "Germany (2025 prices)",
  "breakdown": [
    {
      "category": "Demolition and Disposal",
      "cost": 1500,
      "description": "Complete removal of existing bathroom fixtures, tiles, and waste disposal",
      "subcategories": [
        {
          "name": "Demolition Work",
          "subtotal": 1100,
          "items": [
            {"item": "Remove existing sanitary fixtures (toilet, sink, bathtub)", "quantity": 1, "unit": "set", "unitPrice": 350, "cost": 350},
            {"item": "Remove wall tiles", "quantity": 15, "unit": "sqm", "unitPrice": 25, "cost": 375},
            {"item": "Remove floor tiles", "quantity": 8, "unit": "sqm", "unitPrice": 30, "cost": 240},
            {"item": "Remove old plumbing connections", "quantity": 1, "unit": "set", "unitPrice": 135, "cost": 135}
          ]
        },
        {
          "name": "Waste Disposal",
          "subtotal": 400,
          "items": [
            {"item": "Container rental (5 cubic meter)", "quantity": 1, "unit": "piece", "unitPrice": 250, "cost": 250},
            {"item": "Disposal fees (mixed construction waste)", "quantity": 1, "unit": "load", "unitPrice": 150, "cost": 150}
          ]
        }
      ]
    },
    {
      "category": "Plumbing Work",
      "cost": 7500,
      "description": "Complete plumbing installation including fixtures and connections",
      "subcategories": [
        {
          "name": "Sanitary Fixtures",
          "subtotal": 3200,
          "items": [
            {"item": "Wall-hung toilet (Villeroy and Boch Subway 2.0)", "quantity": 1, "unit": "piece", "unitPrice": 650, "cost": 650, "note": "Rimless design, DirectFlush"},
            {"item": "Concealed cistern frame (Geberit Duofix)", "quantity": 1, "unit": "piece", "unitPrice": 380, "cost": 380, "note": "Including actuator plate"},
            {"item": "Washbasin (Duravit D-Neo 60cm)", "quantity": 1, "unit": "piece", "unitPrice": 320, "cost": 320},
            {"item": "Basin mixer tap (Grohe Eurosmart)", "quantity": 1, "unit": "piece", "unitPrice": 185, "cost": 185, "note": "Chrome finish, ceramic cartridge"},
            {"item": "Shower mixer (Hansgrohe ShowerSelect)", "quantity": 1, "unit": "piece", "unitPrice": 520, "cost": 520, "note": "Thermostatic, concealed"},
            {"item": "Rain shower head 300mm (Hansgrohe Raindance)", "quantity": 1, "unit": "piece", "unitPrice": 380, "cost": 380},
            {"item": "Hand shower set with holder", "quantity": 1, "unit": "set", "unitPrice": 165, "cost": 165},
            {"item": "Floor drain (linear, stainless steel)", "quantity": 1, "unit": "piece", "unitPrice": 280, "cost": 280},
            {"item": "Shut-off valves and connectors", "quantity": 1, "unit": "set", "unitPrice": 120, "cost": 120},
            {"item": "Siphons and waste fittings", "quantity": 1, "unit": "set", "unitPrice": 80, "cost": 80},
            {"item": "Silicone sealant (sanitary grade)", "quantity": 2, "unit": "tube", "unitPrice": 15, "cost": 30},
            {"item": "Connection hoses and fittings", "quantity": 1, "unit": "set", "unitPrice": 90, "cost": 90}
          ]
        },
        {
          "name": "Pipe Work",
          "subtotal": 1800,
          "items": [
            {"item": "Hot water pipes (copper/PEX)", "quantity": 8, "unit": "meter", "unitPrice": 45, "cost": 360},
            {"item": "Cold water pipes (copper/PEX)", "quantity": 8, "unit": "meter", "unitPrice": 40, "cost": 320},
            {"item": "Drain pipes (HT-pipes DN50/DN100)", "quantity": 6, "unit": "meter", "unitPrice": 35, "cost": 210},
            {"item": "Wall chasing for concealed pipes", "quantity": 12, "unit": "meter", "unitPrice": 55, "cost": 660},
            {"item": "Pipe insulation", "quantity": 16, "unit": "meter", "unitPrice": 8, "cost": 128},
            {"item": "Fittings and connectors", "quantity": 1, "unit": "set", "unitPrice": 122, "cost": 122}
          ]
        },
        {
          "name": "Labor - Plumber",
          "subtotal": 2500,
          "items": [
            {"item": "Master plumber (Sanitaerinstallateur)", "quantity": 24, "unit": "hour", "unitPrice": 75, "cost": 1800, "note": "German certified tradesman"},
            {"item": "Plumber assistant", "quantity": 16, "unit": "hour", "unitPrice": 45, "cost": 720, "note": "Including travel time"}
          ]
        }
      ]
    },
    {
      "category": "Electrical Work",
      "cost": 3500,
      "description": "Complete electrical installation for lighting, ventilation and outlets",
      "subcategories": [
        {
          "name": "Lighting Fixtures",
          "subtotal": 950,
          "items": [
            {"item": "LED recessed downlights IP65", "quantity": 4, "unit": "piece", "unitPrice": 85, "cost": 340, "note": "Dimmable, 3000K warm white"},
            {"item": "LED mirror light bar 60cm", "quantity": 1, "unit": "piece", "unitPrice": 180, "cost": 180, "note": "IP44 rated"},
            {"item": "Shower niche LED strip", "quantity": 1, "unit": "meter", "unitPrice": 65, "cost": 65, "note": "Waterproof IP67"},
            {"item": "Dimmer switch (Busch-Jaeger)", "quantity": 1, "unit": "piece", "unitPrice": 95, "cost": 95},
            {"item": "Light switches (Busch-Jaeger Reflex SI)", "quantity": 2, "unit": "piece", "unitPrice": 35, "cost": 70},
            {"item": "LED driver/transformer", "quantity": 2, "unit": "piece", "unitPrice": 65, "cost": 130},
            {"item": "Wiring accessories", "quantity": 1, "unit": "set", "unitPrice": 70, "cost": 70}
          ]
        },
        {
          "name": "Electrical Outlets and Ventilation",
          "subtotal": 650,
          "items": [
            {"item": "GFCI protected outlets (Schuko)", "quantity": 3, "unit": "piece", "unitPrice": 45, "cost": 135, "note": "IP44 splash-proof"},
            {"item": "Shaver socket (transformer isolated)", "quantity": 1, "unit": "piece", "unitPrice": 85, "cost": 85},
            {"item": "Exhaust fan (Maico ECA 100)", "quantity": 1, "unit": "piece", "unitPrice": 185, "cost": 185, "note": "Timer and humidity sensor"},
            {"item": "Fan ducting (100mm)", "quantity": 3, "unit": "meter", "unitPrice": 25, "cost": 75},
            {"item": "External wall vent", "quantity": 1, "unit": "piece", "unitPrice": 45, "cost": 45},
            {"item": "Junction boxes IP65", "quantity": 3, "unit": "piece", "unitPrice": 18, "cost": 54},
            {"item": "Electrical cables NYM-J", "quantity": 25, "unit": "meter", "unitPrice": 2.84, "cost": 71}
          ]
        },
        {
          "name": "Labor - Electrician",
          "subtotal": 1900,
          "items": [
            {"item": "Master electrician (Elektromeister)", "quantity": 20, "unit": "hour", "unitPrice": 70, "cost": 1400, "note": "German certified tradesman"},
            {"item": "Wall chasing for cables", "quantity": 15, "unit": "meter", "unitPrice": 25, "cost": 375},
            {"item": "Electrical inspection certificate", "quantity": 1, "unit": "piece", "unitPrice": 125, "cost": 125}
          ]
        }
      ]
    },
    {
      "category": "Waterproofing and Tiling",
      "cost": 10000,
      "description": "Professional waterproofing and premium tile installation",
      "subcategories": [
        {
          "name": "Waterproofing Materials",
          "subtotal": 850,
          "items": [
            {"item": "Liquid waterproofing membrane (Sopro FDF)", "quantity": 15, "unit": "sqm", "unitPrice": 28, "cost": 420, "note": "2-coat application"},
            {"item": "Waterproofing tape for corners", "quantity": 12, "unit": "meter", "unitPrice": 8, "cost": 96},
            {"item": "Sealing collar for pipes", "quantity": 6, "unit": "piece", "unitPrice": 15, "cost": 90},
            {"item": "Floor drain sealing set", "quantity": 1, "unit": "piece", "unitPrice": 65, "cost": 65},
            {"item": "Primer for substrate", "quantity": 5, "unit": "liter", "unitPrice": 18, "cost": 90},
            {"item": "Leveling compound", "quantity": 2, "unit": "bag 25kg", "unitPrice": 35, "cost": 70},
            {"item": "Screed repair mortar", "quantity": 1, "unit": "bag", "unitPrice": 19, "cost": 19}
          ]
        },
        {
          "name": "Floor Tiles and Materials",
          "subtotal": 1680,
          "items": [
            {"item": "Porcelain floor tiles 60x60cm (Villeroy and Boch)", "quantity": 10, "unit": "sqm", "unitPrice": 75, "cost": 750, "note": "R10 slip resistance, natural stone effect"},
            {"item": "Tile adhesive flex (Sopro No.1)", "quantity": 4, "unit": "bag 25kg", "unitPrice": 32, "cost": 128},
            {"item": "Epoxy grout (Mapei Kerapoxy)", "quantity": 3, "unit": "kg", "unitPrice": 45, "cost": 135, "note": "Anthracite gray"},
            {"item": "Tile spacers 2mm", "quantity": 2, "unit": "pack", "unitPrice": 8, "cost": 16},
            {"item": "Tile cutting allowance (10%)", "quantity": 1, "unit": "sqm", "unitPrice": 75, "cost": 75},
            {"item": "Movement joint profiles", "quantity": 4, "unit": "meter", "unitPrice": 18, "cost": 72},
            {"item": "Silicone sealant color matched", "quantity": 3, "unit": "tube", "unitPrice": 18, "cost": 54},
            {"item": "Floor heating matting (electric)", "quantity": 8, "unit": "sqm", "unitPrice": 56, "cost": 448, "note": "Optional underfloor heating"}
          ]
        },
        {
          "name": "Wall Tiles and Materials",
          "subtotal": 2970,
          "items": [
            {"item": "Large format wall tiles 30x90cm", "quantity": 25, "unit": "sqm", "unitPrice": 65, "cost": 1625, "note": "Rectified edges, matte finish"},
            {"item": "Glass mosaic accent tiles", "quantity": 3, "unit": "sqm", "unitPrice": 145, "cost": 435, "note": "Feature wall behind basin"},
            {"item": "Tile adhesive for large format", "quantity": 6, "unit": "bag 25kg", "unitPrice": 38, "cost": 228},
            {"item": "Wall tile grout (cement-based)", "quantity": 4, "unit": "kg", "unitPrice": 22, "cost": 88},
            {"item": "Tile trim profiles (stainless)", "quantity": 8, "unit": "meter", "unitPrice": 24, "cost": 192},
            {"item": "Tile cutting allowance (15%)", "quantity": 4, "unit": "sqm", "unitPrice": 65, "cost": 260},
            {"item": "Niche waterproofing insert", "quantity": 1, "unit": "piece", "unitPrice": 85, "cost": 85},
            {"item": "Corner protection profiles", "quantity": 6, "unit": "meter", "unitPrice": 9.50, "cost": 57}
          ]
        },
        {
          "name": "Labor - Tiler",
          "subtotal": 4500,
          "items": [
            {"item": "Master tiler (Fliesenlegermeister)", "quantity": 40, "unit": "hour", "unitPrice": 65, "cost": 2600, "note": "German certified tradesman"},
            {"item": "Tiler assistant", "quantity": 24, "unit": "hour", "unitPrice": 42, "cost": 1008},
            {"item": "Waterproofing application", "quantity": 15, "unit": "sqm", "unitPrice": 35, "cost": 525, "note": "Specialized wet room sealing"},
            {"item": "Mosaic tile installation premium", "quantity": 3, "unit": "sqm", "unitPrice": 95, "cost": 285, "note": "Higher labor for detailed work"},
            {"item": "Final cleaning and sealing", "quantity": 1, "unit": "job", "unitPrice": 82, "cost": 82}
          ]
        }
      ]
    },
    {
      "category": "Fixtures and Fittings",
      "cost": 3000,
      "description": "Bathroom furniture, mirror, and accessories installation",
      "subcategories": [
        {
          "name": "Bathroom Furniture",
          "subtotal": 1850,
          "items": [
            {"item": "Vanity unit 80cm (Duravit L-Cube)", "quantity": 1, "unit": "piece", "unitPrice": 890, "cost": 890, "note": "2 drawers, soft-close"},
            {"item": "Countertop (quartz composite)", "quantity": 1, "unit": "piece", "unitPrice": 380, "cost": 380, "note": "Cut-out for basin"},
            {"item": "Tall cabinet 40x35x176cm", "quantity": 1, "unit": "piece", "unitPrice": 580, "cost": 580, "note": "Matching finish"}
          ]
        },
        {
          "name": "Mirror and Accessories",
          "subtotal": 780,
          "items": [
            {"item": "LED mirror cabinet 80cm", "quantity": 1, "unit": "piece", "unitPrice": 420, "cost": 420, "note": "Anti-fog, 3 doors, socket inside"},
            {"item": "Towel rail 60cm (chrome)", "quantity": 1, "unit": "piece", "unitPrice": 85, "cost": 85},
            {"item": "Toilet brush holder (wall mounted)", "quantity": 1, "unit": "piece", "unitPrice": 65, "cost": 65},
            {"item": "Toilet paper holder", "quantity": 1, "unit": "piece", "unitPrice": 45, "cost": 45},
            {"item": "Robe hooks (set of 2)", "quantity": 1, "unit": "set", "unitPrice": 55, "cost": 55},
            {"item": "Soap dispenser (wall mounted)", "quantity": 1, "unit": "piece", "unitPrice": 58, "cost": 58},
            {"item": "Shower glass squeegee holder", "quantity": 1, "unit": "piece", "unitPrice": 32, "cost": 32},
            {"item": "Bath mat", "quantity": 1, "unit": "piece", "unitPrice": 20, "cost": 20}
          ]
        },
        {
          "name": "Installation Labor",
          "subtotal": 370,
          "items": [
            {"item": "Furniture assembly and mounting", "quantity": 4, "unit": "hour", "unitPrice": 55, "cost": 220},
            {"item": "Mirror and accessory installation", "quantity": 3, "unit": "hour", "unitPrice": 50, "cost": 150}
          ]
        }
      ]
    },
    {
      "category": "Heating and Ventilation",
      "cost": 1000,
      "description": "Heated towel rail and ventilation improvements",
      "subcategories": [
        {
          "name": "Heating Equipment",
          "subtotal": 680,
          "items": [
            {"item": "Heated towel radiator (Kermi Credo)", "quantity": 1, "unit": "piece", "unitPrice": 520, "cost": 520, "note": "1200x500mm, white"},
            {"item": "Radiator valves and fittings", "quantity": 1, "unit": "set", "unitPrice": 85, "cost": 85},
            {"item": "Thermostat head (programmable)", "quantity": 1, "unit": "piece", "unitPrice": 75, "cost": 75}
          ]
        },
        {
          "name": "Installation Labor",
          "subtotal": 320,
          "items": [
            {"item": "Radiator installation", "quantity": 3, "unit": "hour", "unitPrice": 70, "cost": 210},
            {"item": "System balancing and testing", "quantity": 1, "unit": "job", "unitPrice": 110, "cost": 110}
          ]
        }
      ]
    },
    {
      "category": "Contingency Reserve",
      "cost": 2500,
      "description": "15 percent buffer for unexpected issues during renovation",
      "subcategories": [
        {
          "name": "Risk Allowances",
          "subtotal": 2500,
          "items": [
            {"item": "Hidden damage discovery allowance", "quantity": 1, "unit": "allowance", "unitPrice": 800, "cost": 800, "note": "Pipes, wiring, structure"},
            {"item": "Material price fluctuation buffer", "quantity": 1, "unit": "allowance", "unitPrice": 500, "cost": 500},
            {"item": "Design change contingency", "quantity": 1, "unit": "allowance", "unitPrice": 400, "cost": 400},
            {"item": "Additional labor reserve", "quantity": 1, "unit": "allowance", "unitPrice": 500, "cost": 500},
            {"item": "Unforeseen permit or inspection costs", "quantity": 1, "unit": "allowance", "unitPrice": 300, "cost": 300}
          ]
        }
      ]
    }
  ],
  "contingency": 2500,
  "explanation": "Detailed line-item estimate based on German market prices for 2025. All costs include VAT (19%). Labor rates reflect certified German tradesmen (Meisterbetrieb). Material selections based on user quality preferences.",
  "executiveSummary": {
    "overview": "This premium bathroom renovation involves a complete modernization of an 8 sqm bathroom with high-quality German fixtures and materials. The project scope includes a walk-in shower, wall-hung toilet, designer vanity unit, full-height tiling with mosaic accents, and modern LED lighting. Total investment of 28500 EUR reflects premium quality choices suitable for long-term value.",
    "keyHighlights": [
      "Waterproofing and tiling represent 35% of total cost (10000 EUR) - largest expense due to premium porcelain tiles and glass mosaic accent wall",
      "Plumbing fixtures from German brands (Villeroy and Boch, Grohe, Hansgrohe) ensure 15-25 year lifespan",
      "Labor costs account for approximately 40% of total - reflects certified German tradesman rates (Meisterbetrieb)",
      "15% contingency reserve (2500 EUR) recommended for older buildings",
      "Electric underfloor heating adds comfort but increases electrical costs"
    ],
    "costDrivers": "The main cost drivers are: (1) Premium tile selection with mosaic accent walls requiring specialized installation, (2) German brand sanitary fixtures with superior quality and warranty, (3) Concealed plumbing installation for wall-hung toilet, and (4) Full waterproofing as per German DIN standards. Choosing standard quality tier would reduce costs by approximately 35%.",
    "recommendation": "For this premium renovation, I recommend proceeding with the KfW 159 financing option if accessibility features are included, or standard renovation loan for the remaining amount. The investment in quality German fixtures will provide excellent durability and maintain property value. Consider obtaining 3 contractor quotes before finalizing.",
    "savingsTips": [
      "Switch from glass mosaic to premium porcelain accent tiles - saves 800-1200 EUR",
      "Choose Grohe over Hansgrohe for shower fixtures - saves 300-500 EUR with similar quality",
      "Reduce wall tiling height from full to 3/4 height - saves 1500-2000 EUR",
      "Use standard LED lighting instead of designer fixtures - saves 400-600 EUR",
      "DIY demolition if physically capable - saves 800-1000 EUR in labor"
    ]
  },
  "assumptions": [
    "Standard German residential apartment (Altbau or Neubau)",
    "Bathroom size approximately 6-10 sqm",
    "No major structural wall changes required",
    "Existing plumbing routes can be partially reused",
    "Mid-to-large German city pricing (Munich, Frankfurt, Hamburg level)",
    "Material availability within 4-6 weeks",
    "Access for material delivery available",
    "Working during normal business hours (no weekend surcharges)"
  ],
  "risks": [
    {"factor": "Hidden water damage behind tiles", "impact": "+800-2000 EUR", "likelihood": "medium"},
    {"factor": "Asbestos in old floor materials (pre-1993)", "impact": "+1500-3500 EUR", "likelihood": "low"},
    {"factor": "Outdated electrical wiring requiring upgrade", "impact": "+500-1500 EUR", "likelihood": "medium"},
    {"factor": "Structural issues with floor or walls", "impact": "+20-40%", "likelihood": "low"},
    {"factor": "Supply chain delays for specific fixtures", "impact": "+2-4 weeks", "likelihood": "medium"},
    {"factor": "Permit requirements for major plumbing changes", "impact": "+300-800 EUR", "likelihood": "low"}
  ],
  "financingInsights": [
    {"text": "Eligible for KfW 159 (Age-appropriate conversion) if accessibility features included", "eligible": true},
    {"text": "KfW 261/262 available if combined with energy efficiency measures", "eligible": true},
    {"text": "Labor costs tax-deductible up to 6000 EUR per year (Paragraph 35a EStG - 20% of labor)", "eligible": true},
    {"text": "VAT reduction possible for renovation of buildings older than 2 years", "eligible": true},
    {"text": "BAFA subsidy available if heat pump or solar thermal water heating included", "eligible": false},
    {"text": "Final contractor quotes required for bank loan applications", "eligible": false}
  ],
  "qualityTiers": [
    {
      "tier": "standard",
      "totalCost": 18500,
      "highlights": [
        "Basic ceramic tiles (30-40 EUR per sqm)",
        "Standard brand fixtures (basic Grohe or similar)",
        "Chrome finish faucets",
        "Basic LED lighting",
        "Standard vanity unit",
        "Simple mirror without lighting"
      ]
    },
    {
      "tier": "premium",
      "totalCost": 28500,
      "highlights": [
        "Quality porcelain tiles (60-80 EUR per sqm)",
        "German brand fixtures (Villeroy and Boch, Duravit)",
        "Brushed nickel or matte black finish",
        "Designer LED with dimming",
        "Soft-close furniture",
        "LED mirror cabinet",
        "Glass mosaic accent wall"
      ]
    },
    {
      "tier": "luxury",
      "totalCost": 45000,
      "highlights": [
        "Natural stone or large format tiles (100+ EUR per sqm)",
        "Smart toilet with bidet function",
        "Dornbracht or Axor designer faucets",
        "Underfloor heating",
        "Custom vanity with stone countertop",
        "Smart mirror with Bluetooth",
        "Freestanding designer bathtub"
      ]
    }
  ]
}

CRITICAL RULES FOR GENERATING DETAILED RESPONSE:
1. ALWAYS include subcategories with individual line items and costs for EVERY breakdown category
2. Each line item MUST have: item name, quantity, unit, unitPrice (where applicable), and cost
3. Subcategory subtotals MUST add up to the category total cost
4. Include realistic German market prices for 2025 - reference actual brands and products
5. Labor costs should reflect certified German tradesman rates (Meister): plumber 65-85 EUR/hour, electrician 60-80 EUR/hour, tiler 55-75 EUR/hour
6. Include notes for important items explaining brand choices or specifications
7. ALL of these fields are REQUIRED: executiveSummary, assumptions, risks, financingInsights, qualityTiers
8. qualityTiers should show realistic price differences with specific product differences
9. All amounts should include German VAT (19%)
10. Be SPECIFIC to the users selections - different quality choices should show different brands and prices
11. executiveSummary MUST include: overview (2-3 sentences), keyHighlights (5 bullets explaining where money goes), costDrivers (main factors), recommendation (financing advice), savingsTips (5 ways to reduce costs)
"""

		return prompt

	def _add_bathroom_details(self, form_data):
		"""Add comprehensive bathroom-specific details to the prompt based on German standards and quality selections"""
		details = "\nBATHROOM RENOVATION DETAILS (German Market - Quality-Based Analysis):\n"

		# STEP 1: Selected Renovation Areas
		renovation_areas = form_data.get('bathroomRenovationAreas', [])
		if renovation_areas:
			details += "\nSELECTED RENOVATION AREAS:\n"
			area_labels = {
				'shower_area': 'Shower Area',
				'bathtub': 'Bathtub',
				'toilet_area': 'Toilet/WC Area',
				'washbasin_area': 'Washbasin/Sink Area',
				'tiles_surfaces': 'Tiles & Surfaces',
				'electrical_lighting': 'Electrical & Lighting',
				'plumbing': 'Plumbing',
				'water_pressure': 'Water Pressure',
				'heating': 'Heating',
				'ventilation': 'Ventilation',
				'accessories': 'Accessories',
				'waterproofing': 'Waterproofing'
			}
			for area in renovation_areas:
				label = area_labels.get(area, area)
				details += f"- {label}\n"

		# RENOVATION GOALS & SCOPE
		renovation_goal = form_data.get('renovationGoal', [])
		if renovation_goal:
			details += "\nRENOVATION SCOPE:\n"
			for goal in renovation_goal:
				details += f"- {goal.replace('_', ' ').title()}\n"

		# BATHROOM CHARACTERISTICS
		details += "\nBATHROOM CHARACTERISTICS:\n"

		bathroom_type = form_data.get('bathroomType')
		if bathroom_type:
			details += f"- Type: {bathroom_type.replace('_', ' ').title()}\n"

		design_style = form_data.get('designStyle')
		if design_style:
			details += f"- Design Style: {design_style.title()}\n"

		metal_finish = form_data.get('metalFinish')
		if metal_finish:
			details += f"- Metal Finish: {metal_finish.title()}\n"

		color_main = form_data.get('colorSchemeMain')
		color_accent = form_data.get('colorSchemeAccent')
		if color_main or color_accent:
			details += f"- Color Scheme: Main={color_main or 'N/A'}, Accent={color_accent or 'N/A'}\n"

		# SHOWER AREA DETAILS (if selected)
		if 'shower_area' in renovation_areas:
			details += "\nSHOWER AREA - QUALITY & SPECIFICATIONS:\n"

			shower_type = form_data.get('showerType')
			if shower_type:
				shower_labels = {
					'walk_in': 'Walk-in shower (barrier-free, modern)',
					'enclosure': 'Shower enclosure (glass-enclosed)',
					'bath_shower': 'Bath + shower combo',
					'wet_room': 'Wet room (fully waterproofed)'
				}
				details += f"- Type: {shower_labels.get(shower_type, shower_type)}\n"

			# CRITICAL: Shower fixture quality selection
			shower_quality = form_data.get('showerFixtureQuality')
			if shower_quality:
				quality_map = {
					'budget': 'Budget-Friendly (basic functionality, standard features)',
					'standard': 'Standard Quality (German brands like Grohe, good durability, excellent value)',
					'premium': 'Premium Quality (Hansgrohe, Dornbracht - exceptional durability, innovative features)'
				}
				details += f"- Fixture Quality Level: {quality_map.get(shower_quality, shower_quality)}\n"
				details += f"  **This affects fixture costs significantly**\n"

			shower_fixtures = form_data.get('showerFixtures', [])
			if shower_fixtures:
				details += f"- Features: {', '.join(shower_fixtures)}\n"

			glass_type = form_data.get('showerEnclosureGlass')
			if glass_type:
				details += f"- Glass: {glass_type.title()}\n"

			glass_thickness = form_data.get('showerEnclosureThickness')
			if glass_thickness:
				details += f"- Glass Thickness: {glass_thickness}mm\n"

			frame_type = form_data.get('showerEnclosureFrame')
			if frame_type:
				details += f"- Frame: {frame_type.title()}\n"

			drain_type = form_data.get('drainType')
			if drain_type:
				details += f"- Drain Type: {drain_type.title()}\n"

		# BATHTUB DETAILS (if selected)
		if 'bathtub' in renovation_areas:
			details += "\nBATHTUB - QUALITY & SPECIFICATIONS:\n"

			bathtub_wanted = form_data.get('bathtubWanted')
			if bathtub_wanted == 'yes':
				bathtub_type = form_data.get('bathtubType')
				if bathtub_type:
					tub_labels = {
						'freestanding': 'Freestanding (standalone, luxurious)',
						'built_in': 'Built-in (alcove/drop-in, space-efficient)',
						'jacuzzi': 'Jacuzzi/Whirlpool (massage jets, spa experience)',
						'soaking': 'Deep soaking (extra deep, relaxation)'
					}
					details += f"- Type: {tub_labels.get(bathtub_type, bathtub_type)}\n"

				# CRITICAL: Bathtub material quality selection
				bathtub_quality = form_data.get('bathtubMaterialQuality')
				if bathtub_quality:
					quality_map = {
						'acrylic_budget': 'Acrylic - Budget (lightweight, affordable, standard insulation)',
						'acrylic_premium': 'Acrylic - Premium (thicker, reinforced, German brands like Bette/Kaldewei)',
						'steel_enamel': 'Steel Enamel - Standard (German specialty, Bette/Kaldewei titanium steel, 30-year warranty)',
						'cast_iron': 'Cast Iron - Premium (heavy-duty, exceptional heat retention, lasts generations)',
						'stone_resin': 'Stone Resin - Luxury (high-end composite, warm touch, contemporary luxury)'
					}
					details += f"- Material & Quality: {quality_map.get(bathtub_quality, bathtub_quality)}\n"
					details += f"  **Material choice significantly affects cost**\n"

				bathtub_size = form_data.get('bathtubSize')
				if bathtub_size:
					details += f"- Size: {bathtub_size}\n"
			else:
				details += "- No bathtub wanted\n"

		# TOILET AREA DETAILS (if selected)
		if 'toilet_area' in renovation_areas:
			details += "\nTOILET/WC - QUALITY & SPECIFICATIONS:\n"

			toilet_type = form_data.get('toiletType')
			if toilet_type:
				toilet_labels = {
					'floor_mounted': 'Floor-mounted (traditional, easier installation)',
					'wall_mounted': 'Wall-mounted/Wall-hung (modern, space-saving, easy floor cleaning)',
					'smart': 'Smart toilet (bidet, heated seat, advanced features)'
				}
				details += f"- Type: {toilet_labels.get(toilet_type, toilet_type)}\n"

			# CRITICAL: Toilet quality selection
			toilet_quality = form_data.get('toiletQuality')
			if toilet_quality:
				quality_map = {
					'budget': 'Budget-Friendly (standard brands, basic features, reliable)',
					'standard': 'Standard Quality - German Brands (Villeroy & Boch, Duravit - excellent ceramics)',
					'premium': 'Premium Quality - Designer Lines (Duravit designer series, advanced rim tech, superior hygiene)',
					'luxury_smart': 'Luxury - Smart Toilets (heated seat, auto lid, integrated bidet, air dryer, deodorizer)'
				}
				details += f"- Quality Level: {quality_map.get(toilet_quality, toilet_quality)}\n"
				details += f"  **Quality level affects ceramic quality and features**\n"

			flush_system = form_data.get('flushSystem')
			if flush_system:
				details += f"- Flush System: {flush_system.replace('_', ' ').title()}\n"

		# WASHBASIN AREA DETAILS (if selected)
		if 'washbasin_area' in renovation_areas:
			details += "\nWASHBASIN/SINK AREA - QUALITY & SPECIFICATIONS:\n"

			basin_count = form_data.get('basinCount')
			if basin_count:
				details += f"- Basin Count: {basin_count.title()}\n"

			basin_type = form_data.get('basinType')
			if basin_type:
				basin_labels = {
					'countertop': 'Countertop vessel (bowl on counter, modern design)',
					'undermount': 'Undermount (integrated under counter, clean minimalist)',
					'wall_mounted': 'Wall-mounted (floating sink, space-saving)',
					'integrated': 'Integrated sink-countertop (seamless one-piece, easy clean)'
				}
				details += f"- Type: {basin_labels.get(basin_type, basin_type)}\n"

			# CRITICAL: Basin quality selection
			basin_quality = form_data.get('basinQuality')
			if basin_quality:
				quality_map = {
					'budget': 'Budget-Friendly (standard ceramic/porcelain, functional)',
					'standard': 'Standard Quality - German Brands (Villeroy & Boch, Duravit - high-quality ceramics)',
					'premium': 'Premium Quality - Designer Basins (Duravit designer series, unique shapes, architectural quality)'
				}
				details += f"- Basin Quality: {quality_map.get(basin_quality, basin_quality)}\n"

			# CRITICAL: Faucet quality selection
			faucet_quality = form_data.get('faucetQuality')
			if faucet_quality:
				quality_map = {
					'budget': 'Budget-Friendly (standard faucets, basic chrome, basic features)',
					'standard_grohe': 'Standard Quality - Grohe (German brand, wide design range, reliable, excellent value)',
					'premium_hansgrohe': 'Premium Quality - Hansgrohe (exceptional durability, water-saving tech, elegant design)',
					'luxury_dornbracht': 'Luxury - Dornbracht (ultra-premium, architectural design, precision engineering)'
				}
				details += f"- Faucet Quality: {quality_map.get(faucet_quality, faucet_quality)}\n"
				details += f"  **Faucet brand significantly affects price (Budget: €50-150, Grohe: €150-400, Hansgrohe: €300-800, Dornbracht: €800-2000+)**\n"

			# CRITICAL: Countertop material quality
			countertop_quality = form_data.get('countertopMaterialQuality')
			if countertop_quality:
				quality_map = {
					'laminate': 'Laminate - Budget (affordable, variety of patterns, water-resistant with sealing)',
					'solid_surface': 'Solid Surface/Corian - Standard (non-porous, seamless, repairable)',
					'quartz': 'Quartz - Premium (engineered stone, non-porous, highly durable, low maintenance)',
					'granite': 'Granite - Premium (natural stone, heat/scratch resistant, periodic sealing needed)',
					'marble': 'Marble - Luxury (natural marble, unique veining, requires maintenance, premium aesthetic)'
				}
				details += f"- Countertop Material: {quality_map.get(countertop_quality, countertop_quality)}\n"
				details += f"  **Countertop material greatly affects cost**\n"

		# TILES & SURFACES DETAILS (if selected)
		if 'tiles_surfaces' in renovation_areas:
			details += "\nTILES & SURFACES - QUALITY & SPECIFICATIONS:\n"

			# CRITICAL: Floor tile quality
			floor_tile_quality = form_data.get('floorTileQuality')
			if floor_tile_quality:
				quality_map = {
					'ceramic_budget': 'Ceramic - Budget (standard ceramic, versatile, cost-effective)',
					'ceramic_standard': 'Ceramic - Standard (enhanced ceramic, better water resistance, durable)',
					'porcelain_standard': 'Porcelain - Standard (45% market share in Germany, frost resistant, low water absorption)',
					'porcelain_premium': 'Porcelain - Premium (through-body color, large formats, premium finishes, natural stone effects)',
					'natural_stone': 'Natural Stone - Luxury (marble/slate/travertine, unique appearance, requires sealing)'
				}
				details += f"- Floor Tile Quality: {quality_map.get(floor_tile_quality, floor_tile_quality)}\n"
				details += f"  **Tile quality affects material cost per m²**\n"

			floor_tile_size = form_data.get('floorTileSize')
			if floor_tile_size:
				details += f"- Floor Tile Size: {floor_tile_size} mm\n"

			# CRITICAL: Wall tile quality
			wall_tile_quality = form_data.get('wallTilesQuality')
			if wall_tile_quality:
				quality_map = {
					'ceramic_budget': 'Ceramic - Budget (basic ceramic, variety of colors)',
					'ceramic_premium': 'Ceramic - Premium (textured/glossy finishes, better quality)',
					'porcelain': 'Porcelain (superior moisture resistance, excellent for wet areas)',
					'glass_mosaic': 'Glass Mosaic - Premium (elegant, reflective, accent walls)',
					'marble_luxury': 'Marble/Natural Stone - Luxury (unique veining, requires sealing)'
				}
				details += f"- Wall Tile Quality: {quality_map.get(wall_tile_quality, wall_tile_quality)}\n"

			wall_tiles_height = form_data.get('wallTilesHeight')
			if wall_tiles_height:
				height_labels = {
					'full': 'Full height (floor to ceiling - complete coverage, best moisture protection)',
					'half': 'Half height (~1.2m - partial coverage, paint above)',
					'shower_only': 'Shower area only (tile wet areas, paint elsewhere)'
				}
				details += f"- Wall Tiling Coverage: {height_labels.get(wall_tiles_height, wall_tiles_height)}\n"
				details += f"  **Tiling height significantly affects total tile area and cost**\n"

			accent_wall = form_data.get('accentWall')
			if accent_wall:
				details += f"- Accent/Feature Wall: {accent_wall}\n"

			# Grout quality
			grout_quality = form_data.get('groutQuality')
			if grout_quality:
				quality_map = {
					'cement_budget': 'Cement-based - Budget (traditional, requires sealing)',
					'cement_premium': 'Premium cement with polymers (better flexibility, stain resistance)',
					'epoxy': 'Epoxy - Premium (waterproof, no sealing needed, superior for wet areas)'
				}
				details += f"- Grout Quality: {quality_map.get(grout_quality, grout_quality)}\n"

			grout_color = form_data.get('groutColor')
			if grout_color:
				details += f"- Grout Color: {grout_color.title()}\n"

		# ELECTRICAL & LIGHTING DETAILS (if selected)
		if 'electrical_lighting' in renovation_areas:
			details += "\nELECTRICAL & LIGHTING - QUALITY & SPECIFICATIONS:\n"

			ceiling_lights = form_data.get('ceilingLights', [])
			if ceiling_lights:
				details += f"- Ceiling Lights: {', '.join([light.replace('_', ' ').title() for light in ceiling_lights])}\n"

			# CRITICAL: Lighting quality
			lighting_quality = form_data.get('lightingQuality')
			if lighting_quality:
				quality_map = {
					'budget': 'Budget-Friendly (standard LED, functional, IP44 rated)',
					'standard': 'Standard Quality (branded LED, better light quality CRI 80+, dimmable, IP65 rated)',
					'premium': 'Premium Quality (designer LED, CRI 90+, smart control, architectural quality)'
				}
				details += f"- Lighting Fixture Quality: {quality_map.get(lighting_quality, lighting_quality)}\n"

			mirror_lights = form_data.get('mirrorLights', [])
			if mirror_lights:
				details += f"- Mirror Lights: {', '.join(mirror_lights)}\n"

			# Mirror quality
			mirror_quality = form_data.get('mirrorQuality')
			if mirror_quality:
				quality_map = {
					'budget': 'Standard Mirror (basic glass, optional fog-resistant coating)',
					'standard': 'LED-Backlit Mirror (built-in lighting, anti-fog heating)',
					'premium': 'Smart Mirror (touchscreen, Bluetooth speakers, defogging, luxury)'
				}
				details += f"- Mirror Quality: {quality_map.get(mirror_quality, mirror_quality)}\n"

			smart_features = form_data.get('smartFeatures', [])
			if smart_features:
				details += f"- Smart Features: {', '.join(smart_features)}\n"

		# PLUMBING DETAILS (if selected)
		if 'plumbing' in renovation_areas:
			details += "\nPLUMBING WORK:\n"

			plumbing_issues = form_data.get('plumbingIssues', [])
			if plumbing_issues:
				details += f"- Existing Issues: {', '.join(plumbing_issues)}\n"

			replace_pipes = form_data.get('replacePipes')
			if replace_pipes:
				details += f"- Replace Pipes: {replace_pipes.title()}\n"

			hot_water = form_data.get('hotWaterSystem')
			if hot_water:
				details += f"- Hot Water System: {hot_water}\n"

			pipe_material = form_data.get('pipeMaterial')
			if pipe_material:
				details += f"- Pipe Material Preference: {pipe_material.upper()}\n"

		# WATER PRESSURE DETAILS (if selected)
		if 'water_pressure' in renovation_areas:
			details += "\nWATER PRESSURE IMPROVEMENTS:\n"

			current_pressure = form_data.get('currentWaterPressure')
			if current_pressure:
				details += f"- Current Pressure: {current_pressure.title()}\n"

			low_pressure_location = form_data.get('lowPressureLocation', [])
			if low_pressure_location:
				details += f"- Low Pressure Locations: {', '.join(low_pressure_location)}\n"

			water_supply_type = form_data.get('waterSupplyType')
			if water_supply_type:
				details += f"- Water Supply Type: {water_supply_type.replace('_', ' ').title()}\n"

			want_stronger = form_data.get('wantStrongerPressure')
			if want_stronger:
				details += f"- Want Stronger Pressure: {want_stronger.title()}\n"

			booster_pump = form_data.get('boosterPumpOk')
			if booster_pump:
				details += f"- Booster Pump Acceptable: {booster_pump.title()}\n"

		# HEATING DETAILS (if selected)
		if 'heating' in renovation_areas:
			details += "\nHEATING SYSTEM:\n"

			heating_type = form_data.get('heatingType', [])
			if heating_type:
				heating_labels = {
					'radiator': 'Wall radiator (traditional Heizkörper)',
					'towel_radiator': 'Heated towel radiator (Handtuchheizkörper - dual function)',
					'underfloor_electric': 'Electric underfloor heating (heating mats)',
					'underfloor_water': 'Water underfloor heating (hydronic, most efficient)',
					'infrared_heater': 'Infrared panel heater (modern, efficient)'
				}
				for heating in heating_type:
					label = heating_labels.get(heating, heating)
					details += f"- {label}\n"

			# CRITICAL: Heated towel rail quality
			towel_rail_quality = form_data.get('heatedTowelRailQuality')
			if towel_rail_quality:
				quality_map = {
					'budget_standard': 'Budget - Standard brands (functional, basic models)',
					'kermi': 'Standard - Kermi (German quality, energy-efficient, good value)',
					'zehnder': 'Premium - Zehnder (Swiss-German, excellent design, superior build)',
					'vasco': 'Luxury - Vasco (designer radiators, statement pieces, premium finishes)'
				}
				details += f"- Towel Rail Quality: {quality_map.get(towel_rail_quality, towel_rail_quality)}\n"

		# VENTILATION DETAILS (if selected)
		if 'ventilation' in renovation_areas:
			details += "\nVENTILATION SYSTEM (DIN 18017 compliance):\n"

			ventilation_type = form_data.get('ventilationType')
			if ventilation_type:
				vent_labels = {
					'window_only': 'Window ventilation only (natural, no mechanical system)',
					'basic_exhaust': 'Basic exhaust fan (simple, manually controlled)',
					'humidity_sensor': 'Humidity sensor fan (auto-activates when moisture detected)',
					'timer_fan': 'Timer-controlled fan (runs after bathroom use)',
					'heat_recovery': 'Heat recovery ventilation/HRV (energy-efficient, recovers heat)'
				}
				details += f"- Type: {vent_labels.get(ventilation_type, ventilation_type)}\n"

			ventilation_capacity = form_data.get('ventilationCapacity')
			if ventilation_capacity:
				details += f"- Capacity: {ventilation_capacity}\n"

		# WATERPROOFING DETAILS (if selected)
		if 'waterproofing' in renovation_areas:
			details += "\nWATERPROOFING:\n"

			waterproofing_required = form_data.get('waterproofingRequired')
			if waterproofing_required:
				details += f"- Scope: {waterproofing_required.replace('_', ' ').title()}\n"

			waterproofing_issues = form_data.get('waterproofingIssues', [])
			if waterproofing_issues:
				details += f"- Existing Issues: {', '.join([issue.replace('_', ' ') for issue in waterproofing_issues])}\n"

			waterproofing_pref = form_data.get('waterproofingPreference')
			if waterproofing_pref:
				details += f"- Quality Preference: {waterproofing_pref.replace('_', ' ').title()}\n"

		# ACCESSORIES (if selected)
		if 'accessories' in renovation_areas:
			details += "\nACCESSORIES:\n"

			accessories = form_data.get('accessoriesWanted', [])
			if accessories:
				for accessory in accessories:
					details += f"- {accessory.replace('_', ' ').title()}\n"

		details += "\n" + "="*80 + "\n"
		details += "CRITICAL COST CALCULATION INSTRUCTIONS:\n"
		details += "="*80 + "\n"
		details += "1. ANALYZE ALL QUALITY SELECTIONS ABOVE - Budget/Standard/Premium/Luxury choices directly impact costs\n"
		details += "2. CALCULATE REALISTIC GERMAN MARKET PRICES for each quality level\n"
		details += "3. CONSIDER TOTAL AREA for tiling (floor + wall coverage affects total m²)\n"
		details += "4. FACTOR IN LABOR COSTS (German hourly rates: Plumbing 60-90 EUR/hr, Electrical 50-80 EUR/hr, Tiling 30-100 EUR/m²)\n"
		details += "5. ADD COMPLEXITY FACTORS (walk-in showers, underfloor heating, smart features increase labor and material costs)\n"
		details += "6. PROVIDE DETAILED, SPECIFIC COST BREAKDOWN for THIS EXACT PROJECT\n"
		details += "="*80 + "\n"

		return details

	def _add_kitchen_details(self, form_data):
		"""Add comprehensive kitchen-specific details to the prompt"""
		details = "\nKITCHEN RENOVATION DETAILS:\n"

		# Renovation Goal
		kitchen_goal = form_data.get('kitchenRenovationGoal', [])
		if kitchen_goal:
			details += "\nRENOVATION GOALS:\n"
			for goal in kitchen_goal:
				details += f"- {goal.replace('_', ' ').title()}\n"

		# Kitchen Type
		kitchen_type = form_data.get('kitchenType')
		if kitchen_type:
			details += f"\nKitchen Type: {kitchen_type.replace('_', ' ').title()}\n"

		# Layout Preference
		layout_pref = form_data.get('layoutPreference')
		if layout_pref:
			details += f"Layout: {layout_pref.replace('_', ' ').title()}\n"

		# Cabinets & Storage
		cabinet_work = form_data.get('cabinetWorkRequired')
		if cabinet_work:
			details += f"\nCABINETS & STORAGE:\n"
			details += f"- Work Required: {cabinet_work.replace('_', ' ').title()}\n"

		cabinet_material = form_data.get('cabinetMaterial')
		if cabinet_material:
			details += f"- Cabinet Material: {cabinet_material.replace('_', ' ').title()}\n"

		cabinet_type = form_data.get('cabinetType', [])
		if cabinet_type:
			details += f"- Cabinet Types: {', '.join([t.replace('_', ' ').title() for t in cabinet_type])}\n"

		storage_accessories = form_data.get('storageAccessories', [])
		if storage_accessories:
			details += f"- Storage Accessories: {', '.join([a.replace('_', ' ').title() for a in storage_accessories])}\n"

		# Countertops
		countertop_material = form_data.get('countertopMaterial')
		if countertop_material:
			details += f"\nCOUNTERTOPS:\n"
			details += f"- Material: {countertop_material.replace('_', ' ').title()}\n"

		counter_length = form_data.get('counterLength')
		if counter_length:
			details += f"- Length: {counter_length}\n"

		island_countertop = form_data.get('islandCountertop')
		if island_countertop:
			details += f"- Island Countertop: {island_countertop.title()}\n"

		backsplash = form_data.get('backsplashPreference')
		if backsplash:
			details += f"- Backsplash: {backsplash.replace('_', ' ').title()}\n"

		# Sink & Faucet
		sink_type = form_data.get('sinkType')
		if sink_type:
			details += f"\nSINK & FAUCET:\n"
			details += f"- Sink Type: {sink_type.replace('_', ' ').title()}\n"

		sink_material = form_data.get('sinkMaterial')
		if sink_material:
			details += f"- Sink Material: {sink_material.replace('_', ' ').title()}\n"

		faucet_features = form_data.get('faucetFeatures', [])
		if faucet_features:
			details += f"- Faucet Features: {', '.join([f.replace('_', ' ').title() for f in faucet_features])}\n"

		# Cooking Appliances
		hob_type = form_data.get('hobType')
		if hob_type:
			details += f"\nCOOKING APPLIANCES:\n"
			details += f"- Hob Type: {hob_type.replace('_', ' ').title()}\n"

		num_burners = form_data.get('numberOfBurners')
		if num_burners:
			details += f"- Number of Burners: {num_burners}\n"

		brand_pref = form_data.get('brandPreference')
		if brand_pref:
			details += f"- Brand Preference: {brand_pref}\n"

		hood_type = form_data.get('hoodType')
		if hood_type:
			details += f"- Hood Type: {hood_type.replace('_', ' ').title()}\n"

		suction_power = form_data.get('suctionPower')
		if suction_power:
			details += f"- Suction Power: {suction_power}\n"

		ducting = form_data.get('ductingAvailable')
		if ducting:
			details += f"- Ducting Available: {ducting.title()}\n"

		appliances = form_data.get('additionalAppliances', [])
		if appliances:
			details += f"- Additional Appliances: {', '.join([a.replace('_', ' ').title() for a in appliances])}\n"

		# Flooring
		flooring_type = form_data.get('kitchenFlooringType')
		if flooring_type:
			details += f"\nFLOORING:\n"
			details += f"- Type: {flooring_type.replace('_', ' ').title()}\n"

		# Wall Finishes
		wall_finishes = form_data.get('kitchenWallFinishes')
		if wall_finishes:
			details += f"\nWALL FINISHES: {wall_finishes.replace('_', ' ').title()}\n"

		# Lighting
		ceiling_lights = form_data.get('kitchenCeilingLights', [])
		if ceiling_lights:
			details += f"\nLIGHTING:\n"
			details += f"- Ceiling Lights: {', '.join([l.replace('_', ' ').title() for l in ceiling_lights])}\n"

		under_cabinet_lights = form_data.get('underCabinetLights')
		if under_cabinet_lights:
			details += f"- Under Cabinet Lights: {under_cabinet_lights.title()}\n"

		# Electrical
		electrical_outlets = form_data.get('electricalOutlets', [])
		if electrical_outlets:
			details += f"\nELECTRICAL:\n"
			details += f"- Outlets: {', '.join([o.replace('_', ' ').title() for o in electrical_outlets])}\n"

		smart_features = form_data.get('kitchenSmartFeatures', [])
		if smart_features:
			details += f"- Smart Features: {', '.join([f.replace('_', ' ').title() for f in smart_features])}\n"

		# Plumbing
		plumbing_issues = form_data.get('kitchenPlumbingIssues', [])
		if plumbing_issues:
			details += f"\nPLUMBING:\n"
			details += f"- Issues: {', '.join([i.replace('_', ' ').title() for i in plumbing_issues])}\n"

		replace_plumbing = form_data.get('replaceKitchenPlumbing')
		if replace_plumbing:
			details += f"- Replace Plumbing: {replace_plumbing.title()}\n"

		hot_water = form_data.get('kitchenHotWater')
		if hot_water:
			details += f"- Hot Water: {hot_water.replace('_', ' ').title()}\n"

		water_pressure = form_data.get('kitchenWaterPressure')
		if water_pressure:
			details += f"- Water Pressure: {water_pressure.replace('_', ' ').title()}\n"

		# Gas Connection
		gas_connection = form_data.get('gasConnection')
		if gas_connection:
			details += f"\nGAS CONNECTION:\n"
			details += f"- Available: {gas_connection.title()}\n"

		gas_type = form_data.get('gasType')
		if gas_type:
			details += f"- Gas Type: {gas_type.replace('_', ' ').title()}\n"

		change_gas_line = form_data.get('changeGasLine')
		if change_gas_line:
			details += f"- Change Gas Line: {change_gas_line.title()}\n"

		# Window Work
		window_work = form_data.get('windowWork', [])
		if window_work:
			details += f"\nWINDOW WORK: {', '.join([w.replace('_', ' ').title() for w in window_work])}\n"

		# Accessories
		accessories = form_data.get('kitchenAccessories', [])
		if accessories:
			details += f"\nACCESSORIES: {', '.join([a.replace('_', ' ').title() for a in accessories])}\n"

		# Waterproofing
		waterproofing = form_data.get('kitchenWaterproofing')
		if waterproofing:
			details += f"\nWATERPROOFING: {waterproofing.replace('_', ' ').title()}\n"

		waterproofing_issues = form_data.get('kitchenWaterproofingIssues', [])
		if waterproofing_issues:
			details += f"- Issues: {', '.join([i.replace('_', ' ').title() for i in waterproofing_issues])}\n"

		return details

	def _add_basement_details(self, form_data):
		"""Add comprehensive basement-specific details to the prompt"""
		details = "\nBASEMENT RENOVATION DETAILS:\n"

		# Renovation Goal
		basement_goal = form_data.get('basementRenovationGoal')
		if basement_goal:
			details += f"\nRenovation Goal: {basement_goal.replace('_', ' ').title()}\n"

		# Current Condition
		basement_finished = form_data.get('basementFinished')
		if basement_finished:
			details += f"Current State: {basement_finished.replace('_', ' ').title()}\n"

		basement_issues = form_data.get('basementIssues', [])
		if basement_issues:
			details += f"Existing Issues: {', '.join([i.replace('_', ' ').title() for i in basement_issues])}\n"

		# Structural Details
		ceiling_height = form_data.get('basementCeilingHeight')
		if ceiling_height:
			details += f"Ceiling Height: {ceiling_height}\n"

		# Usage
		basement_use = form_data.get('basementUse', [])
		if basement_use:
			details += f"\nIntended Use: {', '.join([u.replace('_', ' ').title() for u in basement_use])}\n"

		basement_bathroom = form_data.get('basementBathroom')
		if basement_bathroom:
			details += f"Add Bathroom: {basement_bathroom.title()}\n"

		basement_kitchen = form_data.get('basementKitchen')
		if basement_kitchen:
			details += f"Add Kitchen: {basement_kitchen.title()}\n"

		# Design
		design_style = form_data.get('basementDesignStyle')
		if design_style:
			details += f"\nDesign Style: {design_style.replace('_', ' ').title()}\n"

		color_pref = form_data.get('basementColorPreference')
		if color_pref:
			details += f"Color Preference: {color_pref.replace('_', ' ').title()}\n"

		comfort_level = form_data.get('basementComfortLevel')
		if comfort_level:
			details += f"Comfort Level: {comfort_level.replace('_', ' ').title()}\n"

		# Lighting
		natural_light = form_data.get('basementNaturalLight')
		if natural_light:
			details += f"\nNatural Light: {natural_light.replace('_', ' ').title()}\n"

		improve_light = form_data.get('improveNaturalLight', [])
		if improve_light:
			details += f"Improve Natural Light: {', '.join([l.replace('_', ' ').title() for l in improve_light])}\n"

		lighting_pref = form_data.get('basementLightingPreference', [])
		if lighting_pref:
			details += f"Lighting Preference: {', '.join([l.replace('_', ' ').title() for l in lighting_pref])}\n"

		# Ventilation
		ventilation = form_data.get('basementVentilationRequired')
		if ventilation:
			details += f"\nVentilation Required: {ventilation.title()}\n"

		# Flooring
		flooring_pref = form_data.get('basementFlooringPreference')
		if flooring_pref:
			details += f"Flooring: {flooring_pref.replace('_', ' ').title()}\n"

		# Walls
		wall_finish = form_data.get('basementWallFinish')
		if wall_finish:
			details += f"Wall Finish: {wall_finish.replace('_', ' ').title()}\n"

		# Plumbing
		plumbing_issues = form_data.get('basementPlumbingIssues', [])
		if plumbing_issues:
			details += f"\nPlumbing Issues: {', '.join([i.replace('_', ' ').title() for i in plumbing_issues])}\n"

		add_plumbing = form_data.get('addBasementPlumbing', [])
		if add_plumbing:
			details += f"Add Plumbing: {', '.join([p.replace('_', ' ').title() for p in add_plumbing])}\n"

		# Electrical
		electrical_condition = form_data.get('basementElectricalCondition')
		if electrical_condition:
			details += f"\nElectrical Condition: {electrical_condition.replace('_', ' ').title()}\n"

		power_req = form_data.get('basementPowerRequirements')
		if power_req:
			details += f"Power Requirements: {power_req.replace('_', ' ').title()}\n"

		smart_features = form_data.get('basementSmartFeatures', [])
		if smart_features:
			details += f"Smart Features: {', '.join([f.replace('_', ' ').title() for f in smart_features])}\n"

		# Waterproofing
		waterproofing = form_data.get('basementWaterproofing')
		if waterproofing:
			details += f"\nWaterproofing: {waterproofing.replace('_', ' ').title()}\n"

		moisture_control = form_data.get('basementMoistureControl', [])
		if moisture_control:
			details += f"Moisture Control: {', '.join([m.replace('_', ' ').title() for m in moisture_control])}\n"

		# Access
		access_type = form_data.get('basementAccessType')
		if access_type:
			details += f"\nAccess Type: {access_type.replace('_', ' ').title()}\n"

		# Safety
		safety = form_data.get('basementSafety', [])
		if safety:
			details += f"Safety Features: {', '.join([s.replace('_', ' ').title() for s in safety])}\n"

		# Storage
		storage = form_data.get('basementStorage', [])
		if storage:
			details += f"Storage Solutions: {', '.join([s.replace('_', ' ').title() for s in storage])}\n"

		return details

	def _add_roofing_details(self, form_data):
		"""Add comprehensive roofing-specific details to the prompt"""
		details = "\nROOFING RENOVATION DETAILS:\n"

		# Renovation Goal
		roofing_goal = form_data.get('roofingRenovationGoal')
		if roofing_goal:
			details += f"\nRenovation Goal: {roofing_goal.replace('_', ' ').title()}\n"

		# Current Roof
		current_roof_type = form_data.get('currentRoofType')
		if current_roof_type:
			details += f"Current Roof Type: {current_roof_type.replace('_', ' ').title()}\n"

		current_roof_material = form_data.get('currentRoofMaterial')
		if current_roof_material:
			details += f"Current Material: {current_roof_material.replace('_', ' ').title()}\n"

		# Problems
		roof_problems = form_data.get('roofProblems', [])
		if roof_problems:
			details += f"\nRoof Problems: {', '.join([p.replace('_', ' ').title() for p in roof_problems])}\n"

		# Waterproofing
		roof_waterproofing = form_data.get('roofWaterproofing')
		if roof_waterproofing:
			details += f"\nWaterproofing: {roof_waterproofing.replace('_', ' ').title()}\n"

		waterproofing_condition = form_data.get('roofWaterproofingCondition')
		if waterproofing_condition:
			details += f"Waterproofing Condition: {waterproofing_condition.replace('_', ' ').title()}\n"

		# Drainage
		rainwater_drainage = form_data.get('rainwaterDrainage')
		if rainwater_drainage:
			details += f"\nRainwater Drainage: {rainwater_drainage.replace('_', ' ').title()}\n"

		drainage_type = form_data.get('drainageType')
		if drainage_type:
			details += f"Drainage Type: {drainage_type.replace('_', ' ').title()}\n"

		# Insulation
		heat_problem = form_data.get('heatProblem')
		if heat_problem:
			details += f"\nHeat Problem: {heat_problem.title()}\n"

		thermal_insulation = form_data.get('thermalInsulation')
		if thermal_insulation:
			details += f"Thermal Insulation: {thermal_insulation.replace('_', ' ').title()}\n"

		insulation_solution = form_data.get('insulationSolution')
		if insulation_solution:
			details += f"Insulation Solution: {insulation_solution.replace('_', ' ').title()}\n"

		# Structural
		structural_issues = form_data.get('structuralIssues', [])
		if structural_issues:
			details += f"\nStructural Issues: {', '.join([i.replace('_', ' ').title() for i in structural_issues])}\n"

		future_load_plans = form_data.get('futureLoadPlans', [])
		if future_load_plans:
			details += f"Future Load Plans: {', '.join([p.replace('_', ' ').title() for p in future_load_plans])}\n"

		# Skylights
		skylights_wanted = form_data.get('skylightsWanted')
		if skylights_wanted:
			details += f"\nSkylights Wanted: {skylights_wanted.title()}\n"

		skylight_type = form_data.get('skylightType')
		if skylight_type:
			details += f"Skylight Type: {skylight_type.replace('_', ' ').title()}\n"

		skylight_purpose = form_data.get('skylightPurpose', [])
		if skylight_purpose:
			details += f"Skylight Purpose: {', '.join([p.replace('_', ' ').title() for p in skylight_purpose])}\n"

		# Access & Safety
		roof_access_type = form_data.get('roofAccessType')
		if roof_access_type:
			details += f"\nRoof Access: {roof_access_type.replace('_', ' ').title()}\n"

		roof_safety = form_data.get('roofSafety', [])
		if roof_safety:
			details += f"Safety Features: {', '.join([s.replace('_', ' ').title() for s in roof_safety])}\n"

		# Solar & Sustainability
		solar_system = form_data.get('solarSystem')
		if solar_system:
			details += f"\nSolar System: {solar_system.title()}\n"

		rainwater_harvesting = form_data.get('rainwaterHarvesting')
		if rainwater_harvesting:
			details += f"Rainwater Harvesting: {rainwater_harvesting.title()}\n"

		# Finish
		roof_finish = form_data.get('roofFinish')
		if roof_finish:
			details += f"\nRoof Finish: {roof_finish.replace('_', ' ').title()}\n"

		roof_color = form_data.get('roofColor')
		if roof_color:
			details += f"Roof Color: {roof_color.replace('_', ' ').title()}\n"

		return details

	def _add_electrical_details(self, form_data):
		"""Add comprehensive electrical-specific details to the prompt"""
		details = "\nELECTRICAL RENOVATION DETAILS:\n"

		# Renovation Goal
		electrical_goal = form_data.get('electricalRenovationGoal')
		if electrical_goal:
			details += f"\nRenovation Goal: {electrical_goal.replace('_', ' ').title()}\n"

		# Current Condition
		electrical_condition = form_data.get('electricalCondition')
		if electrical_condition:
			details += f"Current Condition: {electrical_condition.replace('_', ' ').title()}\n"

		wiring_age = form_data.get('wiringAge')
		if wiring_age:
			details += f"Wiring Age: {wiring_age.replace('_', ' ').title()}\n"

		# Power Points
		add_power_points = form_data.get('addPowerPoints')
		if add_power_points:
			details += f"\nAdd Power Points: {add_power_points.title()}\n"

		num_power_points = form_data.get('numberOfPowerPoints')
		if num_power_points:
			details += f"Number of Power Points: {num_power_points}\n"

		switch_type = form_data.get('switchType')
		if switch_type:
			details += f"Switch Type: {switch_type.replace('_', ' ').title()}\n"

		# Lighting
		lighting_upgrade = form_data.get('lightingUpgrade')
		if lighting_upgrade:
			details += f"\nLighting Upgrade: {lighting_upgrade.title()}\n"

		lighting_types = form_data.get('lightingTypes', [])
		if lighting_types:
			details += f"Lighting Types: {', '.join([l.replace('_', ' ').title() for l in lighting_types])}\n"

		lighting_control = form_data.get('lightingControl', [])
		if lighting_control:
			details += f"Lighting Control: {', '.join([c.replace('_', ' ').title() for c in lighting_control])}\n"

		# High Load Appliances
		high_load_appliances = form_data.get('highLoadAppliances', [])
		if high_load_appliances:
			details += f"\nHigh Load Appliances: {', '.join([a.replace('_', ' ').title() for a in high_load_appliances])}\n"

		separate_circuits = form_data.get('separateCircuits')
		if separate_circuits:
			details += f"Separate Circuits: {separate_circuits.title()}\n"

		# Smart Features
		smart_features = form_data.get('electricalSmartFeatures', [])
		if smart_features:
			details += f"\nSmart Features: {', '.join([f.replace('_', ' ').title() for f in smart_features])}\n"

		# Safety
		safety_upgrades = form_data.get('safetyUpgrades', [])
		if safety_upgrades:
			details += f"\nSafety Upgrades: {', '.join([u.replace('_', ' ').title() for u in safety_upgrades])}\n"

		past_accidents = form_data.get('pastElectricalAccidents')
		if past_accidents:
			details += f"Past Electrical Accidents: {past_accidents.title()}\n"

		# Distribution Board
		db_condition = form_data.get('distributionBoardCondition')
		if db_condition:
			details += f"\nDistribution Board Condition: {db_condition.replace('_', ' ').title()}\n"

		db_location = form_data.get('distributionBoardLocation')
		if db_location:
			details += f"Distribution Board Location: {db_location.replace('_', ' ').title()}\n"

		# Power Backup
		power_backup = form_data.get('powerBackupSystem', [])
		if power_backup:
			details += f"\nPower Backup: {', '.join([b.replace('_', ' ').title() for b in power_backup])}\n"

		# Solar Integration
		solar_integration = form_data.get('solarPowerIntegration')
		if solar_integration:
			details += f"Solar Power Integration: {solar_integration.title()}\n"

		# Wiring Type
		wiring_type = form_data.get('wiringType')
		if wiring_type:
			details += f"\nWiring Type: {wiring_type.replace('_', ' ').title()}\n"

		wall_work_allowed = form_data.get('wallWorkAllowed')
		if wall_work_allowed:
			details += f"Wall Work Allowed: {wall_work_allowed.title()}\n"

		return details

	def _add_plumbing_details(self, form_data):
		"""Add comprehensive plumbing-specific details to the prompt"""
		details = "\nPLUMBING RENOVATION DETAILS:\n"

		# Renovation Goal
		plumbing_goal = form_data.get('plumbingRenovationGoal')
		if plumbing_goal:
			details += f"\nRenovation Goal: {plumbing_goal.replace('_', ' ').title()}\n"

		# Current Condition
		plumbing_condition = form_data.get('plumbingCondition')
		if plumbing_condition:
			details += f"Current Condition: {plumbing_condition.replace('_', ' ').title()}\n"

		plumbing_age = form_data.get('plumbingAge')
		if plumbing_age:
			details += f"Plumbing Age: {plumbing_age.replace('_', ' ').title()}\n"

		# Water Supply
		water_supply_source = form_data.get('waterSupplySource')
		if water_supply_source:
			details += f"\nWater Supply Source: {water_supply_source.replace('_', ' ').title()}\n"

		storage_system = form_data.get('storageSystem', [])
		if storage_system:
			details += f"Storage System: {', '.join([s.replace('_', ' ').title() for s in storage_system])}\n"

		# Water Pressure
		water_pressure = form_data.get('waterPressure')
		if water_pressure:
			details += f"\nWater Pressure: {water_pressure.replace('_', ' ').title()}\n"

		low_pressure_areas = form_data.get('lowPressureAreas', [])
		if low_pressure_areas:
			details += f"Low Pressure Areas: {', '.join([a.replace('_', ' ').title() for a in low_pressure_areas])}\n"

		improve_pressure = form_data.get('improvePressure')
		if improve_pressure:
			details += f"Improve Pressure: {improve_pressure.title()}\n"

		# Drainage
		drainage_issues = form_data.get('drainageIssues', [])
		if drainage_issues:
			details += f"\nDrainage Issues: {', '.join([i.replace('_', ' ').title() for i in drainage_issues])}\n"

		drainage_system_type = form_data.get('drainageSystemType', [])
		if drainage_system_type:
			details += f"Drainage System Type: {', '.join([t.replace('_', ' ').title() for t in drainage_system_type])}\n"

		# Pipe Replacement
		replace_pipes_plumbing = form_data.get('replacePipesPlumbing')
		if replace_pipes_plumbing:
			details += f"\nReplace Pipes: {replace_pipes_plumbing.title()}\n"

		preferred_pipe_material = form_data.get('preferredPipeMaterial')
		if preferred_pipe_material:
			details += f"Preferred Pipe Material: {preferred_pipe_material.upper()}\n"

		# Hot Water
		hot_water_available = form_data.get('hotWaterAvailable')
		if hot_water_available:
			details += f"\nHot Water Available: {hot_water_available.title()}\n"

		hot_water_system_type = form_data.get('hotWaterSystemType')
		if hot_water_system_type:
			details += f"Hot Water System Type: {hot_water_system_type.replace('_', ' ').title()}\n"

		# Work Areas
		plumbing_work_areas = form_data.get('plumbingWorkAreas', [])
		if plumbing_work_areas:
			details += f"\nPlumbing Work Areas: {', '.join([a.replace('_', ' ').title() for a in plumbing_work_areas])}\n"

		new_plumbing_points = form_data.get('newPlumbingPoints')
		if new_plumbing_points:
			details += f"New Plumbing Points: {new_plumbing_points.title()}\n"

		# Waterproofing
		waterproofing_issues_plumbing = form_data.get('waterproofingIssuesPlumbing')
		if waterproofing_issues_plumbing:
			details += f"\nWaterproofing Issues: {waterproofing_issues_plumbing.title()}\n"

		waterproofing_work_required = form_data.get('waterproofingWorkRequired')
		if waterproofing_work_required:
			details += f"Waterproofing Work Required: {waterproofing_work_required.replace('_', ' ').title()}\n"

		# Sustainability
		water_filtration = form_data.get('waterFiltrationSystem')
		if water_filtration:
			details += f"\nWater Filtration System: {water_filtration.title()}\n"

		rainwater_harvesting_plumbing = form_data.get('rainwaterHarvestingPlumbing')
		if rainwater_harvesting_plumbing:
			details += f"Rainwater Harvesting: {rainwater_harvesting_plumbing.title()}\n"

		return details

	def _add_hvac_details(self, form_data):
		"""Add comprehensive HVAC-specific details to the prompt"""
		details = "\nHVAC RENOVATION DETAILS:\n"

		# Renovation Goal
		hvac_goal = form_data.get('hvacRenovationGoal')
		if hvac_goal:
			details += f"\nRenovation Goal: {hvac_goal.replace('_', ' ').title()}\n"

		# Property Details
		property_type = form_data.get('propertyType')
		if property_type:
			details += f"Property Type: {property_type.replace('_', ' ').title()}\n"

		hvac_areas = form_data.get('hvacAreas')
		if hvac_areas:
			details += f"Area: {hvac_areas} sqm\n"

		hvac_ceiling_height = form_data.get('hvacCeilingHeight')
		if hvac_ceiling_height:
			details += f"Ceiling Height: {hvac_ceiling_height}\n"

		# Existing System
		existing_hvac = form_data.get('existingHVACSystem')
		if existing_hvac:
			details += f"\nExisting HVAC System: {existing_hvac.title()}\n"

		current_system_type = form_data.get('currentSystemType')
		if current_system_type:
			details += f"Current System Type: {current_system_type.replace('_', ' ').title()}\n"

		existing_system_issues = form_data.get('existingSystemIssues', [])
		if existing_system_issues:
			details += f"Existing System Issues: {', '.join([i.replace('_', ' ').title() for i in existing_system_issues])}\n"

		# Requirements
		cooling_requirement = form_data.get('coolingRequirement')
		if cooling_requirement:
			details += f"\nCooling Requirement: {cooling_requirement.title()}\n"

		heating_requirement = form_data.get('heatingRequirement')
		if heating_requirement:
			details += f"Heating Requirement: {heating_requirement.title()}\n"

		# Air Distribution
		air_distribution_type = form_data.get('airDistributionType')
		if air_distribution_type:
			details += f"\nAir Distribution Type: {air_distribution_type.replace('_', ' ').title()}\n"

		ductwork_condition = form_data.get('ductworkCondition')
		if ductwork_condition:
			details += f"Ductwork Condition: {ductwork_condition.replace('_', ' ').title()}\n"

		# Air Quality
		air_quality_concerns = form_data.get('airQualityConcerns', [])
		if air_quality_concerns:
			details += f"\nAir Quality Concerns: {', '.join([c.replace('_', ' ').title() for c in air_quality_concerns])}\n"

		air_quality_solutions = form_data.get('airQualitySolutions', [])
		if air_quality_solutions:
			details += f"Air Quality Solutions: {', '.join([s.replace('_', ' ').title() for s in air_quality_solutions])}\n"

		# Preferences
		noise_sensitivity = form_data.get('noiseSensitivity')
		if noise_sensitivity:
			details += f"\nNoise Sensitivity: {noise_sensitivity.replace('_', ' ').title()}\n"

		hvac_priority = form_data.get('hvacPriority')
		if hvac_priority:
			details += f"Priority: {hvac_priority.replace('_', ' ').title()}\n"

		# Controls
		control_preference = form_data.get('controlPreference')
		if control_preference:
			details += f"\nControl Preference: {control_preference.replace('_', ' ').title()}\n"

		zoning_control = form_data.get('zoningControl')
		if zoning_control:
			details += f"Zoning Control: {zoning_control.title()}\n"

		# Installation Considerations
		electrical_readiness = form_data.get('electricalReadiness')
		if electrical_readiness:
			details += f"\nElectrical Readiness: {electrical_readiness.replace('_', ' ').title()}\n"

		outdoor_unit_placement = form_data.get('outdoorUnitPlacement')
		if outdoor_unit_placement:
			details += f"Outdoor Unit Placement: {outdoor_unit_placement.replace('_', ' ').title()}\n"

		wall_ceiling_modification = form_data.get('wallCeilingModification')
		if wall_ceiling_modification:
			details += f"Wall/Ceiling Modification: {wall_ceiling_modification.title()}\n"

		space_constraints = form_data.get('spaceConstraints', [])
		if space_constraints:
			details += f"Space Constraints: {', '.join([c.replace('_', ' ').title() for c in space_constraints])}\n"

		return details

	def _add_flooring_details(self, form_data):
		"""Add comprehensive flooring-specific details to the prompt"""
		details = "\nFLOORING RENOVATION DETAILS:\n"

		# Renovation Goal
		flooring_goal = form_data.get('flooringRenovationGoal')
		if flooring_goal:
			details += f"\nRenovation Goal: {flooring_goal.replace('_', ' ').title()}\n"

		# Work Areas
		flooring_work_areas = form_data.get('flooringWorkAreas', [])
		if flooring_work_areas:
			details += f"Work Areas: {', '.join([a.replace('_', ' ').title() for a in flooring_work_areas])}\n"

		flooring_property_type = form_data.get('flooringPropertyType')
		if flooring_property_type:
			details += f"Property Type: {flooring_property_type.replace('_', ' ').title()}\n"

		# Existing Flooring
		existing_flooring_type = form_data.get('existingFlooringType')
		if existing_flooring_type:
			details += f"\nExisting Flooring Type: {existing_flooring_type.replace('_', ' ').title()}\n"

		existing_flooring_issues = form_data.get('existingFlooringIssues', [])
		if existing_flooring_issues:
			details += f"Existing Issues: {', '.join([i.replace('_', ' ').title() for i in existing_flooring_issues])}\n"

		# Preferred Flooring
		preferred_flooring_material = form_data.get('preferredFlooringMaterial')
		if preferred_flooring_material:
			details += f"\nPreferred Material: {preferred_flooring_material.replace('_', ' ').title()}\n"

		flooring_finish = form_data.get('flooringFinish')
		if flooring_finish:
			details += f"Finish: {flooring_finish.replace('_', ' ').title()}\n"

		tile_plank_size = form_data.get('tilePlankSize')
		if tile_plank_size:
			details += f"Tile/Plank Size: {tile_plank_size}\n"

		pattern_layout = form_data.get('patternLayout')
		if pattern_layout:
			details += f"Pattern Layout: {pattern_layout.replace('_', ' ').title()}\n"

		# Performance Requirements
		slip_resistance = form_data.get('slipResistance')
		if slip_resistance:
			details += f"\nSlip Resistance: {slip_resistance.title()}\n"

		water_resistance = form_data.get('waterResistance')
		if water_resistance:
			details += f"Water Resistance: {water_resistance.title()}\n"

		comfort_preference = form_data.get('comfortPreference', [])
		if comfort_preference:
			details += f"Comfort Preference: {', '.join([c.replace('_', ' ').title() for c in comfort_preference])}\n"

		# Subfloor
		subfloor_condition = form_data.get('subfloorCondition')
		if subfloor_condition:
			details += f"\nSubfloor Condition: {subfloor_condition.replace('_', ' ').title()}\n"

		existing_flooring_removal = form_data.get('existingFlooringRemoval')
		if existing_flooring_removal:
			details += f"Existing Flooring Removal: {existing_flooring_removal.title()}\n"

		# Aesthetics
		flooring_color_preference = form_data.get('flooringColorPreference')
		if flooring_color_preference:
			details += f"\nColor Preference: {flooring_color_preference.replace('_', ' ').title()}\n"

		grout_preference = form_data.get('groutPreference')
		if grout_preference:
			details += f"Grout Preference: {grout_preference.replace('_', ' ').title()}\n"

		# Special Areas
		staircase_flooring = form_data.get('staircaseFlooring')
		if staircase_flooring:
			details += f"\nStaircase Flooring: {staircase_flooring.title()}\n"

		balcony_flooring = form_data.get('balconyFlooring')
		if balcony_flooring:
			details += f"Balcony Flooring: {balcony_flooring.title()}\n"

		return details

	def _add_windows_doors_details(self, form_data):
		"""Add comprehensive windows and doors-specific details to the prompt"""
		details = "\nWINDOWS & DOORS RENOVATION DETAILS:\n"

		# Renovation Goal
		windows_doors_goal = form_data.get('windowsDoorsRenovationGoal')
		if windows_doors_goal:
			details += f"\nRenovation Goal: {windows_doors_goal.replace('_', ' ').title()}\n"

		# Work Areas
		windows_doors_work_areas = form_data.get('windowsDoorsWorkAreas', [])
		if windows_doors_work_areas:
			details += f"Work Areas: {', '.join([a.replace('_', ' ').title() for a in windows_doors_work_areas])}\n"

		windows_doors_property_type = form_data.get('windowsDoorsPropertyType')
		if windows_doors_property_type:
			details += f"Property Type: {windows_doors_property_type.replace('_', ' ').title()}\n"

		# Existing Condition
		existing_frame_material = form_data.get('existingFrameMaterial')
		if existing_frame_material:
			details += f"\nExisting Frame Material: {existing_frame_material.replace('_', ' ').title()}\n"

		existing_windows_doors_issues = form_data.get('existingWindowsDoorsIssues', [])
		if existing_windows_doors_issues:
			details += f"Existing Issues: {', '.join([i.replace('_', ' ').title() for i in existing_windows_doors_issues])}\n"

		# Windows
		window_type = form_data.get('windowType')
		if window_type:
			details += f"\nWindow Type: {window_type.replace('_', ' ').title()}\n"

		glass_type = form_data.get('glassType')
		if glass_type:
			details += f"Glass Type: {glass_type.replace('_', ' ').title()}\n"

		window_function_priority = form_data.get('windowFunctionPriority', [])
		if window_function_priority:
			details += f"Window Function Priority: {', '.join([p.replace('_', ' ').title() for p in window_function_priority])}\n"

		# Doors
		door_type = form_data.get('doorType')
		if door_type:
			details += f"\nDoor Type: {door_type.replace('_', ' ').title()}\n"

		door_material = form_data.get('doorMaterial')
		if door_material:
			details += f"Door Material: {door_material.replace('_', ' ').title()}\n"

		door_core_preference = form_data.get('doorCorePreference')
		if door_core_preference:
			details += f"Door Core Preference: {door_core_preference.replace('_', ' ').title()}\n"

		# Security
		locking_system = form_data.get('lockingSystem')
		if locking_system:
			details += f"\nLocking System: {locking_system.replace('_', ' ').title()}\n"

		additional_security_features = form_data.get('additionalSecurityFeatures', [])
		if additional_security_features:
			details += f"Additional Security Features: {', '.join([f.replace('_', ' ').title() for f in additional_security_features])}\n"

		# Performance
		sound_insulation = form_data.get('soundInsulation')
		if sound_insulation:
			details += f"\nSound Insulation: {sound_insulation.replace('_', ' ').title()}\n"

		thermal_insulation_windows_doors = form_data.get('thermalInsulationWindowsDoors')
		if thermal_insulation_windows_doors:
			details += f"Thermal Insulation: {thermal_insulation_windows_doors.replace('_', ' ').title()}\n"

		# Aesthetics
		frame_color_preference = form_data.get('frameColorPreference')
		if frame_color_preference:
			details += f"\nFrame Color Preference: {frame_color_preference.replace('_', ' ').title()}\n"

		finish_type = form_data.get('finishType')
		if finish_type:
			details += f"Finish Type: {finish_type.replace('_', ' ').title()}\n"

		# Installation
		wall_modification_allowed = form_data.get('wallModificationAllowed')
		if wall_modification_allowed:
			details += f"\nWall Modification Allowed: {wall_modification_allowed.title()}\n"

		change_size_opening = form_data.get('changeSizeOpening')
		if change_size_opening:
			details += f"Change Size/Opening: {change_size_opening.title()}\n"

		return details

	def _add_exterior_details(self, form_data):
		"""Add comprehensive exterior-specific details to the prompt"""
		details = "\nEXTERIOR RENOVATION DETAILS:\n"

		# Renovation Goal
		exterior_goal = form_data.get('exteriorRenovationGoal')
		if exterior_goal:
			details += f"\nRenovation Goal: {exterior_goal.replace('_', ' ').title()}\n"

		# Work Areas
		exterior_areas = form_data.get('exteriorAreas', [])
		if exterior_areas:
			details += f"Work Areas: {', '.join([a.replace('_', ' ').title() for a in exterior_areas])}\n"

		exterior_property_type = form_data.get('exteriorPropertyType')
		if exterior_property_type:
			details += f"Property Type: {exterior_property_type.replace('_', ' ').title()}\n"

		# Existing Condition
		existing_exterior_finish = form_data.get('existingExteriorFinish')
		if existing_exterior_finish:
			details += f"\nExisting Finish: {existing_exterior_finish.replace('_', ' ').title()}\n"

		exterior_issues = form_data.get('exteriorIssues', [])
		if exterior_issues:
			details += f"Existing Issues: {', '.join([i.replace('_', ' ').title() for i in exterior_issues])}\n"

		# Preferred Finish
		preferred_exterior_finish = form_data.get('preferredExteriorFinish')
		if preferred_exterior_finish:
			details += f"\nPreferred Finish: {preferred_exterior_finish.replace('_', ' ').title()}\n"

		exterior_color_preference = form_data.get('exteriorColorPreference')
		if exterior_color_preference:
			details += f"Color Preference: {exterior_color_preference.replace('_', ' ').title()}\n"

		# Waterproofing
		water_seepage = form_data.get('waterSeepage')
		if water_seepage:
			details += f"\nWater Seepage: {water_seepage.title()}\n"

		exterior_waterproofing = form_data.get('exteriorWaterproofing')
		if exterior_waterproofing:
			details += f"Waterproofing: {exterior_waterproofing.replace('_', ' ').title()}\n"

		protection_needed = form_data.get('protectionNeeded', [])
		if protection_needed:
			details += f"Protection Needed: {', '.join([p.replace('_', ' ').title() for p in protection_needed])}\n"

		# Insulation
		exterior_thermal_insulation = form_data.get('exteriorThermalInsulation')
		if exterior_thermal_insulation:
			details += f"\nThermal Insulation: {exterior_thermal_insulation.replace('_', ' ').title()}\n"

		exterior_shading = form_data.get('exteriorShading', [])
		if exterior_shading:
			details += f"Shading Solutions: {', '.join([s.replace('_', ' ').title() for s in exterior_shading])}\n"

		# Security
		security_upgrades_exterior = form_data.get('securityUpgradesExterior', [])
		if security_upgrades_exterior:
			details += f"\nSecurity Upgrades: {', '.join([u.replace('_', ' ').title() for u in security_upgrades_exterior])}\n"

		# Lighting
		exterior_lighting_types = form_data.get('exteriorLightingTypes', [])
		if exterior_lighting_types:
			details += f"\nLighting Types: {', '.join([l.replace('_', ' ').title() for l in exterior_lighting_types])}\n"

		exterior_lighting_control = form_data.get('exteriorLightingControl')
		if exterior_lighting_control:
			details += f"Lighting Control: {exterior_lighting_control.replace('_', ' ').title()}\n"

		# Outdoor Elements
		outdoor_elements = form_data.get('outdoorElements', [])
		if outdoor_elements:
			details += f"\nOutdoor Elements: {', '.join([e.replace('_', ' ').title() for e in outdoor_elements])}\n"

		# Structural
		structural_repairs = form_data.get('structuralRepairs')
		if structural_repairs:
			details += f"\nStructural Repairs: {structural_repairs.title()}\n"

		access_limitations = form_data.get('accessLimitations', [])
		if access_limitations:
			details += f"Access Limitations: {', '.join([l.replace('_', ' ').title() for l in access_limitations])}\n"

		return details

	def _add_general_details(self, form_data):
		"""Add comprehensive general renovation-specific details to the prompt"""
		details = "\nGENERAL RENOVATION DETAILS:\n"

		# Renovation Goal
		general_goal = form_data.get('generalRenovationGoal')
		if general_goal:
			details += f"\nRenovation Goal: {general_goal.replace('_', ' ').title()}\n"

		# Property Details
		general_property_usage = form_data.get('generalPropertyUsage')
		if general_property_usage:
			details += f"Property Usage: {general_property_usage.replace('_', ' ').title()}\n"

		property_age = form_data.get('propertyAge')
		if property_age:
			details += f"Property Age: {property_age.replace('_', ' ').title()}\n"

		areas_included = form_data.get('areasIncluded', [])
		if areas_included:
			details += f"Areas Included: {', '.join([a.replace('_', ' ').title() for a in areas_included])}\n"

		# Current Condition
		overall_condition = form_data.get('overallCondition')
		if overall_condition:
			details += f"\nOverall Condition: {overall_condition.replace('_', ' ').title()}\n"

		general_existing_issues = form_data.get('generalExistingIssues', [])
		if general_existing_issues:
			details += f"Existing Issues: {', '.join([i.replace('_', ' ').title() for i in general_existing_issues])}\n"

		# Design Preferences
		preferred_design_style = form_data.get('preferredDesignStyle')
		if preferred_design_style:
			details += f"\nPreferred Design Style: {preferred_design_style.replace('_', ' ').title()}\n"

		general_color_preference = form_data.get('generalColorPreference')
		if general_color_preference:
			details += f"Color Preference: {general_color_preference.replace('_', ' ').title()}\n"

		# Structural Changes
		structural_changes = form_data.get('structuralChanges')
		if structural_changes:
			details += f"\nStructural Changes: {structural_changes.title()}\n"

		structural_change_types = form_data.get('structuralChangeTypes', [])
		if structural_change_types:
			details += f"Structural Change Types: {', '.join([t.replace('_', ' ').title() for t in structural_change_types])}\n"

		# Improvements
		comfort_improvements = form_data.get('comfortImprovements', [])
		if comfort_improvements:
			details += f"\nComfort Improvements: {', '.join([c.replace('_', ' ').title() for c in comfort_improvements])}\n"

		smart_features_desired = form_data.get('smartFeaturesDesired', [])
		if smart_features_desired:
			details += f"Smart Features: {', '.join([f.replace('_', ' ').title() for f in smart_features_desired])}\n"

		safety_improvements = form_data.get('safetyImprovements', [])
		if safety_improvements:
			details += f"Safety Improvements: {', '.join([s.replace('_', ' ').title() for s in safety_improvements])}\n"

		# System Upgrades
		system_upgrades = form_data.get('systemUpgrades', [])
		if system_upgrades:
			details += f"\nSystem Upgrades: {', '.join([u.replace('_', ' ').title() for u in system_upgrades])}\n"

		# Renovation Approach
		renovation_approach = form_data.get('renovationApproach')
		if renovation_approach:
			details += f"\nRenovation Approach: {renovation_approach.replace('_', ' ').title()}\n"

		return details

	def build_financing_options_prompt(self, original_prompt, cost_estimate, form_data):
		"""
		Build financing options prompt based on original prompt and cost estimate

		Args:
			original_prompt (str): The original prompt sent for cost estimation
			cost_estimate (dict): The cost estimate response from Gemini
			form_data (dict): Original form data

		Returns:
			str: Formatted prompt for financing options generation
		"""
		total_cost = cost_estimate.get('totalEstimatedCost', 0)
		renovation_type = form_data.get('renovationType', 'general')

		prompt = f"""As a German home renovation financing expert, analyze this renovation project and provide personalized financing recommendations.

PROJECT COST ANALYSIS:
Total Estimated Cost: €{total_cost:,}

COST BREAKDOWN:
"""
		# Add breakdown details
		for item in cost_estimate.get('breakdown', []):
			prompt += f"- {item['category']}: €{item['cost']:,} ({item['description']})\n"

		prompt += f"""

ORIGINAL PROJECT DETAILS:
{original_prompt[:1500]}

===================================================================================
YOUR TASK: Generate personalized financing recommendations for this German renovation project.
===================================================================================

GERMAN FINANCING OPTIONS KNOWLEDGE BASE (2025):

1. MODERNISIERUNGSKREDIT (Modernization Loan)
   - Type: Unsecured personal loan
   - Amount: €1,000 - €80,000
   - Interest Rate: 3.5% - 8.5% (varies by creditworthiness)
   - Term: 12 - 120 months
   - Best For: Mid-sized renovations without property collateral
   - Major Providers: Deutsche Bank, Commerzbank, ING, Santander Consumer Bank
   - Requirements: Good credit score (SCHUFA), stable income
   - Advantages: Quick approval (2-7 days), no property collateral needed
   - Disadvantages: Higher interest than mortgage-based loans

2. BAUFINANZIERUNG / NACHFINANZIERUNG (Construction/Follow-up Financing)
   - Type: Mortgage-secured loan
   - Amount: €50,000 - €500,000+
   - Interest Rate: 2.5% - 4.5% (10-year fixed)
   - Term: 10 - 30 years
   - Best For: Large-scale renovations, structural work
   - Major Providers: Interhyp, Dr. Klein, local Sparkassen, Volksbanken
   - Requirements: Property ownership, property valuation, stable income
   - Advantages: Low interest rates, large amounts, long terms
   - Disadvantages: Requires property collateral, slower approval process

3. KFW FÖRDERKREDIT 261 - BEG WG (Energy-Efficient Renovation Credit)
   - Type: State-subsidized low-interest loan
   - Amount: Up to €150,000 per residential unit
   - Interest Rate: 0.01% - 1.5% (highly subsidized)
   - Repayment Grant: Up to 45% debt relief for best efficiency levels
   - Best For: Energy-efficient renovations (insulation, windows, heating, renewable energy)
   - Requirements:
     * Apply BEFORE starting construction
     * Energy consultant (Energieberater) certification required
     * Must achieve specific efficiency standards (e.g., KfW 85, KfW 70, KfW 55)
   - Application: Through local bank (Hausbank), not directly with KfW
   - Advantages: Extremely low interest, debt relief grants, long repayment terms
   - Disadvantages: Strict requirements, energy consultant costs (€500-2000), paperwork intensive

4. KFW FÖRDERKREDIT 159 - Barrier-Free Conversion
   - Type: State-subsidized loan
   - Amount: Up to €50,000
   - Interest Rate: 0.75% - 1.5%
   - Best For: Accessibility improvements (bathrooms, elevators, ramps, door widening)
   - Requirements: Apply before starting, no age/disability requirement
   - Advantages: Low interest, easier than energy efficiency loans
   - Disadvantages: Lower maximum amount

5. BAFA ZUSCHUSS - Renewable Energy Heating Grant
   - Type: Direct cash grant (non-repayable)
   - Amount: Up to €70,000 (covers up to 40% of costs)
   - Best For: Heat pumps, solar thermal systems, biomass heating, hybrid systems
   - Requirements:
     * Professional installation
     * Certified systems only
     * Apply through BAFA portal
   - Advantages: Free money, no repayment, can combine with KfW loans
   - Disadvantages: Limited to heating systems only, pre-approval required

6. WOHN-RIESTER (Home Ownership Riester Pension)
   - Type: Government-subsidized savings/loan
   - Best For: Homeowners under 50 using pension savings for renovations
   - Requirements: Riester pension contract, own property
   - Advantages: Tax benefits, government bonuses
   - Disadvantages: Complex tax implications, penalties for early withdrawal

RESPONSE FORMAT (JSON):
{{
  "recommendations": [
    {{
      "optionName": "string",
      "type": "loan|grant|subsidy",
      "provider": "string",
      "priority": 1-5,
      "estimatedAmount": "€X - €Y",
      "interestRate": "X% - Y%",
      "term": "X months/years",
      "eligibility": "Brief description",
      "pros": ["advantage 1", "advantage 2", "advantage 3"],
      "cons": ["disadvantage 1", "disadvantage 2"],
      "applicationSteps": ["step 1", "step 2", "step 3"],
      "recommendationReason": "Why this is recommended for THIS specific project"
    }}
  ],
  "summary": "2-3 sentence summary of the overall financing strategy",
  "totalFinancingNeeded": {total_cost},
  "recommendedSplit": "Brief explanation of how to combine options",
  "importantNotes": ["critical note 1", "critical note 2"],
  "nextSteps": ["immediate action 1", "immediate action 2", "immediate action 3"]
}}

CRITICAL INSTRUCTIONS:
1. Analyze the SPECIFIC PROJECT DETAILS and cost breakdown
2. Recommend 3-5 most suitable financing options for THIS exact project
3. Consider project size (€{total_cost:,}) when recommending options
4. For energy-related work (heating, insulation), STRONGLY recommend KfW/BAFA options
5. Explain WHY each option suits THIS particular renovation
6. Provide realistic interest rates and amounts for {renovation_type} renovation
7. Include step-by-step application process for each option
8. Return ONLY valid JSON (no markdown, no code blocks)

Generate the recommendations now:"""

		return prompt

	def build_image_generation_prompt(self, original_prompt, cost_estimate, form_data):
		"""
		Build image description prompt for renovation visualization

		Args:
			original_prompt (str): The original prompt sent for cost estimation
			cost_estimate (dict): The cost estimate response
			form_data (dict): Original form data

		Returns:
			str: Formatted prompt for image description generation
		"""
		renovation_type = form_data.get('renovationType', 'general')
		total_cost = cost_estimate.get('totalEstimatedCost', 0)

		# Extract key details from form_data
		design_style = form_data.get('designStyle', 'modern')
		color_main = form_data.get('colorSchemeMain', 'neutral')
		color_accent = form_data.get('colorSchemeAccent', '')

		prompt = f"""You are a renovation visualization expert. Create a detailed image description for AI image generation based on this renovation project.

PROJECT TYPE: {renovation_type.upper()} Renovation
BUDGET: €{total_cost:,}
DESIGN STYLE: {design_style}
COLOR SCHEME: Main={color_main}, Accent={color_accent}

PROJECT DETAILS:
{original_prompt[:1000]}

===================================================================================
CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no code blocks.
===================================================================================

Create a vivid, detailed description that could be used with AI image generators (like DALL-E, Midjourney, Stable Diffusion) to visualize this renovation.

REQUIRED JSON FORMAT - Copy this structure EXACTLY:
{{
  "imagePrompt": "Your detailed prompt for AI image generator (100-150 words) using photorealistic, architectural visualization style",
  "style": "Photorealistic",
  "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "colorPalette": ["color 1", "color 2", "color 3"],
  "materials": ["material 1", "material 2", "material 3"],
  "lighting": "Description of lighting",
  "mood": "Overall atmosphere",
  "viewpoint": "Camera angle",
  "technicalNote": "Image quality specifications"
}}

MANDATORY REQUIREMENTS:
1. The "imagePrompt" field is REQUIRED and must contain a detailed 100-150 word description
2. Include SPECIFIC details from the project (materials, finishes, colors)
3. Make the imagePrompt suitable for professional architectural visualization
4. Respond with ONLY the JSON object - NO additional text, NO markdown code blocks, NO explanations
5. The JSON must be valid and parseable

Your response must start with {{ and end with }}

Generate the JSON now:"""

		return prompt

