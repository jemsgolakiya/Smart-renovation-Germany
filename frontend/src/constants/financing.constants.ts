/**
 * Constants for the Financing module
 * Centralized configuration and static data
 */

import { SelectOption, FinancingFormData } from '../types/financing.types';
// Import PROJECT_TYPES from projects service to ensure consistency
import { PROJECT_TYPES } from '../services/projects';

// ============================================================================
// Form Options
// ============================================================================

// Use the EXACT same project types as the Project creation form
// This ensures perfect 1:1 mapping when auto-filling from a selected project
export const RENOVATION_TYPE_OPTIONS: SelectOption[] = PROJECT_TYPES;

// All other form option constants have been removed as they are no longer needed
// The form now only uses renovationType

// ============================================================================
// Conditional Questions by Renovation Type
// ============================================================================

export interface QuestionOption {
  value: string;
  label: string;
  description?: string; // Description shown below the option
  qualityLevel?: 'budget' | 'standard' | 'premium' | 'luxury'; // Quality tier for materials
  qualityDescription?: string; // Detailed quality explanation
}

export interface Question {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'radio' | 'checkbox' | 'number' | 'text';
  options?: QuestionOption[];
  required?: boolean;
  placeholder?: string;
  unit?: string; // For number fields (e.g., "m²", "€")
  min?: number; // For number fields
  max?: number; // For number fields
  description?: string; // Overall field description/help text
  sectionTitle?: string; // For grouping questions into sections
  allowOther?: boolean; // Allow custom "Other" option
  otherPlaceholder?: string; // Placeholder for "Other" text input
}

// ============================================================================
// STEP 1: Area Selection
// ============================================================================
export const BATHROOM_AREA_SELECTION: Question[] = [
  {
    id: 'bathroomRenovationAreas',
    label: 'Which areas do you want to renovate?',
    type: 'multiselect',
    required: true,
    description: 'Select all the areas you want to include in your bathroom renovation project.',
    options: [
      { value: 'shower_area', label: 'Shower Area', description: 'Shower installation, tiles, fixtures, and drainage' },
      { value: 'bathtub', label: 'Bathtub', description: 'Bathtub installation, surrounding tiles, and fixtures' },
      { value: 'toilet_area', label: 'Toilet Area', description: 'Toilet/WC installation and surrounding area' },
      { value: 'washbasin_area', label: 'Washbasin Area', description: 'Sink, vanity, mirror, and storage' },
      { value: 'tiles_surfaces', label: 'Tiles & Surfaces', description: 'Wall and floor tiling' },
      { value: 'electrical_lighting', label: 'Electrical & Lighting', description: 'Wiring, outlets, and lighting' },
      { value: 'plumbing', label: 'Plumbing', description: 'Pipe work and water supply' },
      { value: 'water_pressure', label: 'Water Pressure', description: 'Pressure improvements' },
      { value: 'heating', label: 'Heating', description: 'Bathroom heating systems' },
      { value: 'ventilation', label: 'Ventilation', description: 'Ventilation and air quality' },
      { value: 'accessories', label: 'Accessories', description: 'Towel holders, shelves, etc.' },
      { value: 'waterproofing', label: 'Waterproofing', description: 'Moisture protection' }
    ]
  }
];

// ============================================================================
// STEP 2: Detailed Questions
// ============================================================================

// SECTION 1: Renovation Goal (Always shown)
export const RENOVATION_GOAL_QUESTIONS: Question[] = [
  {
    id: 'renovationGoal',
    label: 'Renovation Goal',
    type: 'radio',
    required: true,
    sectionTitle: 'Renovation Goal',
    description: 'What type of renovation are you planning?',
    allowOther: true,
    otherPlaceholder: 'Describe your specific renovation goal...',
    options: [
      { value: 'cosmetic_upgrade', label: 'Cosmetic upgrade', description: 'Paint, fixtures, minor updates' },
      { value: 'full_demolition', label: 'Full demolition + rebuild', description: 'Complete bathroom reconstruction' },
      { value: 'fixtures_only', label: 'Only fixtures replacement', description: 'Replace toilet, sink, shower, etc.' },
      { value: 'tiles_only', label: 'Only tiles replacement', description: 'New floor and wall tiles' },
      { value: 'structural_changes', label: 'Structural changes', description: 'Wall removal, layout changes' },
      { value: 'increase_space', label: 'Increase space', description: 'Expand bathroom area' }
    ]
  }
];

// SECTION 3: Common Fields (Always shown)
export const COMMON_FIELDS_QUESTIONS: Question[] = [
  {
    id: 'bathroomType',
    label: 'Bathroom Type',
    type: 'radio',
    required: true,
    sectionTitle: 'Common Fields',
    description: 'What type of bathroom is this?',
    options: [
      { value: 'master', label: 'Master bathroom', description: 'Primary bedroom bathroom' },
      { value: 'guest', label: 'Guest bathroom', description: 'For visitors' },
      { value: 'kids', label: 'Kids bathroom', description: 'Children\'s bathroom' },
      { value: 'shared', label: 'Shared bathroom', description: 'Used by multiple people' },
      { value: 'outdoor', label: 'Outdoor bathroom', description: 'Exterior bathroom' }
    ]
  },
  {
    id: 'designStyle',
    label: 'Preferred Design Style',
    type: 'radio',
    required: true,
    description: 'Choose your preferred design aesthetic',
    options: [
      { value: 'modern', label: 'Modern', description: 'Clean lines, contemporary' },
      { value: 'minimalist', label: 'Minimalist', description: 'Simple, uncluttered' },
      { value: 'luxury', label: 'Luxury', description: 'High-end, premium' },
      { value: 'industrial', label: 'Industrial', description: 'Raw, urban style' },
      { value: 'traditional', label: 'Traditional', description: 'Classic, timeless' },
      { value: 'vintage', label: 'Vintage', description: 'Retro, antique' }
    ]
  },
  {
    id: 'colorSchemeMain',
    label: 'Main Colors',
    type: 'select',
    required: false,
    description: 'Select your preferred main color',
    options: [
      { value: 'white', label: 'White' },
      { value: 'off_white', label: 'Off-White / Cream' },
      { value: 'beige', label: 'Beige' },
      { value: 'gray', label: 'Gray' },
      { value: 'light_gray', label: 'Light Gray' },
      { value: 'dark_gray', label: 'Dark Gray / Charcoal' },
      { value: 'black', label: 'Black' },
      { value: 'brown', label: 'Brown' },
      { value: 'taupe', label: 'Taupe' },
      { value: 'navy_blue', label: 'Navy Blue' },
      { value: 'green', label: 'Green / Sage' },
      { value: 'blue', label: 'Blue' }
    ]
  },
  {
    id: 'colorSchemeAccent',
    label: 'Accent Colors',
    type: 'select',
    required: false,
    description: 'Select your preferred accent color',
    options: [
      { value: 'gold', label: 'Gold' },
      { value: 'brass', label: 'Brass' },
      { value: 'copper', label: 'Copper' },
      { value: 'black', label: 'Black' },
      { value: 'white', label: 'White' },
      { value: 'silver', label: 'Silver / Chrome' },
      { value: 'navy', label: 'Navy' },
      { value: 'blue', label: 'Blue' },
      { value: 'teal', label: 'Teal' },
      { value: 'green', label: 'Green' },
      { value: 'red', label: 'Red / Burgundy' },
      { value: 'pink', label: 'Pink / Rose' },
      { value: 'purple', label: 'Purple / Violet' },
      { value: 'orange', label: 'Orange / Terracotta' },
      { value: 'yellow', label: 'Yellow / Mustard' },
      { value: 'brown', label: 'Brown / Wood tones' }
    ]
  },
  {
    id: 'metalFinish',
    label: 'Metal Finish',
    type: 'radio',
    required: true,
    description: 'Choose metal finish for fixtures',
    options: [
      { value: 'chrome', label: 'Chrome', description: 'Shiny silver finish' },
      { value: 'black', label: 'Black', description: 'Matte or glossy black' },
      { value: 'gold', label: 'Gold', description: 'Brass or gold finish' },
      { value: 'nickel', label: 'Nickel', description: 'Brushed nickel' },
      { value: 'bronze', label: 'Bronze', description: 'Oil-rubbed bronze' }
    ]
  }
];

// SECTION 4: Shower Area (Conditional - if shower_area selected)
export const SHOWER_AREA_QUESTIONS: Question[] = [
  {
    id: 'showerType',
    label: 'Shower Type',
    type: 'radio',
    required: true,
    sectionTitle: 'Shower Area',
    description: 'What type of shower do you want?',
    options: [
      { value: 'walk_in', label: 'Walk-in shower', description: 'Open, barrier-free shower with modern design' },
      { value: 'enclosure', label: 'Shower enclosure', description: 'Glass-enclosed shower for space efficiency' },
      { value: 'bath_shower', label: 'Bath + shower combo', description: 'Combined tub and shower for flexibility' },
      { value: 'wet_room', label: 'Wet room', description: 'Fully waterproofed room with open shower area' }
    ]
  },
  {
    id: 'showerFixtureQuality',
    label: 'Shower Fixture Quality Preference',
    type: 'radio',
    required: true,
    description: 'Select the quality level for shower fixtures (faucets, shower heads, controls)',
    options: [
      {
        value: 'budget',
        label: 'Budget-Friendly',
        description: 'Basic functionality with standard features',
        qualityLevel: 'budget',
        qualityDescription: 'Reliable standard brands, essential features, good for basic renovations'
      },
      {
        value: 'standard',
        label: 'Standard Quality',
        description: 'Good quality German brands with reliable performance',
        qualityLevel: 'standard',
        qualityDescription: 'German brands like Grohe, good durability, wide range of designs, excellent value'
      },
      {
        value: 'premium',
        label: 'Premium Quality',
        description: 'High-end German brands with superior quality',
        qualityLevel: 'premium',
        qualityDescription: 'Hansgrohe, Dornbracht - exceptional durability, innovative features, elegant design'
      }
    ]
  },
  {
    id: 'showerEnclosureGlass',
    label: 'Glass Type (for Shower Enclosure)',
    type: 'radio',
    required: false,
    description: 'Type of glass for shower enclosure',
    options: [
      { value: 'clear', label: 'Clear', description: 'Transparent glass' },
      { value: 'frosted', label: 'Frosted', description: 'Privacy glass' },
      { value: 'tinted', label: 'Tinted', description: 'Colored glass' }
    ]
  },
  {
    id: 'showerEnclosureThickness',
    label: 'Glass Thickness (mm)',
    type: 'number',
    required: false,
    placeholder: 'e.g., 8',
    min: 6,
    max: 12,
    description: 'Thickness of shower glass (6-12mm)'
  },
  {
    id: 'showerEnclosureFrame',
    label: 'Frame Type',
    type: 'radio',
    required: false,
    description: 'Shower enclosure frame style',
    options: [
      { value: 'framed', label: 'Framed', description: 'With metal frame' },
      { value: 'frameless', label: 'Frameless', description: 'Minimalist, no frame' }
    ]
  },
  {
    id: 'showerFixtures',
    label: 'Shower Fixtures',
    type: 'multiselect',
    required: true,
    description: 'Select shower head types',
    options: [
      { value: 'rain', label: 'Rain shower', description: 'Overhead rainfall shower' },
      { value: 'handheld', label: 'Handheld', description: 'Detachable shower head' },
      { value: 'both', label: 'Both', description: 'Rain + Handheld' },
      { value: 'thermostatic', label: 'Thermostatic control', description: 'Temperature control' },
      { value: 'smart', label: 'Smart control', description: 'Digital/app control' }
    ]
  },
  {
    id: 'drainType',
    label: 'Drain Type',
    type: 'radio',
    required: true,
    description: 'Shower drain placement',
    options: [
      { value: 'linear', label: 'Linear', description: 'Long, narrow drain' },
      { value: 'center', label: 'Center', description: 'Central round drain' },
      { value: 'corner', label: 'Corner', description: 'Corner placement' }
    ]
  }
];

// SECTION 5: Bathtub (Conditional - if bathtub selected)
export const BATHTUB_QUESTIONS: Question[] = [
  {
    id: 'bathtubWanted',
    label: 'Do you want a bathtub?',
    type: 'radio',
    required: true,
    sectionTitle: 'Bathtub',
    description: 'Include a bathtub in your renovation?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Include bathtub' },
      { value: 'no', label: 'No', description: 'No bathtub needed' }
    ]
  },
  {
    id: 'bathtubType',
    label: 'Bathtub Type',
    type: 'radio',
    required: false,
    description: 'What style of bathtub?',
    options: [
      { value: 'freestanding', label: 'Freestanding', description: 'Standalone tub for luxurious look' },
      { value: 'built_in', label: 'Built-in', description: 'Alcove or drop-in, space-efficient' },
      { value: 'jacuzzi', label: 'Jacuzzi/Whirlpool', description: 'With massage jets for spa experience' },
      { value: 'soaking', label: 'Deep soaking', description: 'Extra deep tub for relaxation' }
    ]
  },
  {
    id: 'bathtubMaterialQuality',
    label: 'Bathtub Material & Quality',
    type: 'radio',
    required: false,
    description: 'Choose bathtub material based on quality and durability',
    options: [
      {
        value: 'acrylic_budget',
        label: 'Acrylic - Budget',
        description: 'Lightweight, affordable, easy to install',
        qualityLevel: 'budget',
        qualityDescription: 'Standard acrylic bathtubs - good insulation, affordable, suitable for most renovations'
      },
      {
        value: 'acrylic_premium',
        label: 'Acrylic - Premium',
        description: 'High-grade acrylic with reinforced construction',
        qualityLevel: 'standard',
        qualityDescription: 'Thicker acrylic, better durability, enhanced comfort, German brands like Bette/Kaldewei acrylic lines'
      },
      {
        value: 'steel_enamel',
        label: 'Steel Enamel - Standard',
        description: 'Glazed steel, durable and easy to clean',
        qualityLevel: 'standard',
        qualityDescription: 'German specialty - Bette & Kaldewei titanium steel with enamel coating, excellent heat retention, 30-year warranty'
      },
      {
        value: 'cast_iron',
        label: 'Cast Iron - Premium',
        description: 'Heavy-duty, excellent heat retention, timeless',
        qualityLevel: 'premium',
        qualityDescription: 'Classic luxury material, exceptional durability, superior heat retention, lasts generations'
      },
      {
        value: 'stone_resin',
        label: 'Stone Resin - Luxury',
        description: 'Modern composite material, elegant matte finish',
        qualityLevel: 'luxury',
        qualityDescription: 'High-end material with stone-like appearance, warm to touch, contemporary luxury bathrooms'
      }
    ]
  },
  {
    id: 'bathtubSize',
    label: 'Bathtub Size',
    type: 'radio',
    required: false,
    description: 'Select bathtub dimensions',
    options: [
      { value: 'compact', label: 'Compact (140-150cm)', description: 'For smaller bathrooms' },
      { value: 'standard', label: 'Standard (160-170cm)', description: 'Most common size for average bathrooms' },
      { value: 'large', label: 'Large (180-190cm)', description: 'Spacious, for master bathrooms' },
      { value: 'extra_large', label: 'Extra Large (200cm+)', description: 'Luxury size for large bathrooms' }
    ]
  }
];

// SECTION 6: Toilet Area (Conditional - if toilet_area selected)
export const TOILET_AREA_QUESTIONS: Question[] = [
  {
    id: 'toiletType',
    label: 'Toilet Type',
    type: 'radio',
    required: true,
    sectionTitle: 'Toilet Area',
    description: 'What type of toilet?',
    options: [
      { value: 'floor_mounted', label: 'Floor-mounted', description: 'Traditional floor toilet, easier installation' },
      { value: 'wall_mounted', label: 'Wall-mounted (wall-hung)', description: 'Modern, space-saving, easier to clean floor' },
      { value: 'smart', label: 'Smart toilet', description: 'With bidet, heated seat, advanced features' }
    ]
  },
  {
    id: 'toiletQuality',
    label: 'Toilet Quality & Brand',
    type: 'radio',
    required: true,
    description: 'Select toilet quality level based on German market brands',
    options: [
      {
        value: 'budget',
        label: 'Budget-Friendly',
        description: 'Standard brands with basic features',
        qualityLevel: 'budget',
        qualityDescription: 'Reliable functionality, standard ceramic, affordable options for basic renovations'
      },
      {
        value: 'standard',
        label: 'Standard Quality - German Brands',
        description: 'Well-known German ceramic brands',
        qualityLevel: 'standard',
        qualityDescription: 'Villeroy & Boch, Duravit standard lines - excellent ceramics, good design, reliable performance'
      },
      {
        value: 'premium',
        label: 'Premium Quality - Designer Lines',
        description: 'High-end German designer toilets',
        qualityLevel: 'premium',
        qualityDescription: 'Duravit designer series, advanced rim technology, superior hygiene, elegant modern design'
      },
      {
        value: 'luxury_smart',
        label: 'Luxury - Smart Toilets',
        description: 'Advanced smart toilets with integrated bidet',
        qualityLevel: 'luxury',
        qualityDescription: 'Heated seat, automatic lid, integrated bidet, air dryer, deodorizer, premium comfort and hygiene'
      }
    ]
  },
  {
    id: 'flushSystem',
    label: 'Flush System',
    type: 'radio',
    required: true,
    description: 'Flush mechanism preferences',
    options: [
      { value: 'concealed_dual', label: 'Concealed tank with dual flush', description: 'Hidden cistern, eco-friendly two-button flush (standard)' },
      { value: 'concealed_sensor', label: 'Concealed tank with sensor', description: 'Hidden cistern, touchless automatic flush (premium)' },
      { value: 'exposed', label: 'Exposed tank', description: 'Visible cistern, easier maintenance (budget)' }
    ]
  }
];

// SECTION 7: Washbasin Area (Conditional - if washbasin_area selected)
export const WASHBASIN_AREA_QUESTIONS: Question[] = [
  {
    id: 'basinCount',
    label: 'Basin Count',
    type: 'radio',
    required: true,
    sectionTitle: 'Washbasin Area',
    description: 'Number of sinks',
    options: [
      { value: 'single', label: 'Single basin', description: 'One sink, suitable for most bathrooms' },
      { value: 'double', label: 'Double basin', description: 'Two sinks, ideal for master bathrooms' }
    ]
  },
  {
    id: 'basinType',
    label: 'Basin Type & Installation',
    type: 'radio',
    required: true,
    description: 'Sink installation style',
    options: [
      { value: 'countertop', label: 'Countertop vessel', description: 'Bowl sits on counter, modern design statement' },
      { value: 'undermount', label: 'Undermount', description: 'Integrated under counter, clean minimalist look' },
      { value: 'wall_mounted', label: 'Wall-mounted', description: 'Floating sink, space-saving for small bathrooms' },
      { value: 'integrated', label: 'Integrated sink-countertop', description: 'Seamless one-piece design, easy to clean' }
    ]
  },
  {
    id: 'basinQuality',
    label: 'Basin Quality & Brand',
    type: 'radio',
    required: true,
    description: 'Select washbasin quality level',
    options: [
      {
        value: 'budget',
        label: 'Budget-Friendly',
        description: 'Standard ceramic basins',
        qualityLevel: 'budget',
        qualityDescription: 'Basic ceramic or porcelain, functional design, affordable for standard renovations'
      },
      {
        value: 'standard',
        label: 'Standard Quality - German Brands',
        description: 'Well-known German ceramic manufacturers',
        qualityLevel: 'standard',
        qualityDescription: 'Villeroy & Boch, Duravit - high-quality ceramics, variety of designs, excellent durability'
      },
      {
        value: 'premium',
        label: 'Premium Quality - Designer Basins',
        description: 'High-end designer washbasins',
        qualityLevel: 'premium',
        qualityDescription: 'Duravit designer series, premium finishes, unique shapes, architectural quality'
      }
    ]
  },
  {
    id: 'faucetQuality',
    label: 'Faucet (Tap) Quality & Brand',
    type: 'radio',
    required: true,
    description: 'Select faucet quality level for washbasin',
    options: [
      {
        value: 'budget',
        label: 'Budget-Friendly',
        description: 'Standard faucets with basic features',
        qualityLevel: 'budget',
        qualityDescription: 'Basic chrome finish, standard functionality, affordable for basic renovations'
      },
      {
        value: 'standard_grohe',
        label: 'Standard Quality - Grohe',
        description: 'German brand with reliable performance',
        qualityLevel: 'standard',
        qualityDescription: 'Grohe - good quality, wide range of designs, reliable, excellent value for money'
      },
      {
        value: 'premium_hansgrohe',
        label: 'Premium Quality - Hansgrohe',
        description: 'High-end German faucets with superior quality',
        qualityLevel: 'premium',
        qualityDescription: 'Hansgrohe - exceptional durability, smooth operation, water-saving technology, elegant design'
      },
      {
        value: 'luxury_dornbracht',
        label: 'Luxury - Dornbracht',
        description: 'Ultra-luxury architectural faucets',
        qualityLevel: 'luxury',
        qualityDescription: 'Dornbracht - ultra-premium, architecturally designed, precision engineering, statement piece for luxury bathrooms'
      }
    ]
  },
  {
    id: 'countertopMaterialQuality',
    label: 'Countertop Material & Quality',
    type: 'radio',
    required: true,
    description: 'Choose vanity countertop material based on quality and durability',
    options: [
      {
        value: 'laminate',
        label: 'Laminate - Budget',
        description: 'Affordable, variety of colors and patterns',
        qualityLevel: 'budget',
        qualityDescription: 'Budget-friendly, water-resistant with proper sealing, good for cost-conscious renovations'
      },
      {
        value: 'solid_surface',
        label: 'Solid Surface (Corian) - Standard',
        description: 'Non-porous, seamless, easy to repair',
        qualityLevel: 'standard',
        qualityDescription: 'Durable synthetic material, seamless appearance, repairable, good mid-range option'
      },
      {
        value: 'quartz',
        label: 'Quartz - Premium',
        description: 'Engineered stone, non-porous, highly durable',
        qualityLevel: 'premium',
        qualityDescription: 'Top choice for bathrooms - extremely durable, non-porous (no bacteria/mildew), low maintenance, premium appearance'
      },
      {
        value: 'granite',
        label: 'Granite - Premium',
        description: 'Natural stone, heat and scratch resistant',
        qualityLevel: 'premium',
        qualityDescription: 'Natural stone beauty, very durable, heat resistant, requires periodic sealing'
      },
      {
        value: 'marble',
        label: 'Marble - Luxury',
        description: 'Natural marble, elegant and timeless',
        qualityLevel: 'luxury',
        qualityDescription: 'Luxurious natural stone, unique veining, softer than granite, requires maintenance and sealing, premium aesthetic'
      }
    ]
  }
];

// SECTION 8: Tiles & Surfaces (Conditional - if tiles_surfaces selected)
export const TILES_SURFACES_QUESTIONS: Question[] = [
  {
    id: 'floorTileQuality',
    label: 'Floor Tile Material & Quality',
    type: 'radio',
    required: true,
    sectionTitle: 'Tiles & Surfaces',
    description: 'Choose floor tile material based on quality and durability',
    options: [
      {
        value: 'ceramic_budget',
        label: 'Ceramic - Budget',
        description: 'Affordable, variety of colors and patterns',
        qualityLevel: 'budget',
        qualityDescription: 'Standard ceramic tiles - versatile, good for dry areas, cost-effective for basic renovations'
      },
      {
        value: 'ceramic_standard',
        label: 'Ceramic - Standard Quality',
        description: 'Higher grade ceramic with better durability',
        qualityLevel: 'standard',
        qualityDescription: 'Enhanced ceramic - better water resistance, more durable, suitable for bathroom floors'
      },
      {
        value: 'porcelain_standard',
        label: 'Porcelain - Standard',
        description: 'Dense, water-resistant, durable',
        qualityLevel: 'standard',
        qualityDescription: 'Porcelain tiles (45% market share in Germany) - frost resistant, low water absorption, ideal for bathrooms'
      },
      {
        value: 'porcelain_premium',
        label: 'Porcelain - Premium',
        description: 'Large format, through-body color, superior finish',
        qualityLevel: 'premium',
        qualityDescription: 'High-end porcelain - through-body color (no visible chips), large formats, premium finishes like natural stone effects'
      },
      {
        value: 'natural_stone',
        label: 'Natural Stone - Luxury',
        description: 'Marble, slate, or travertine',
        qualityLevel: 'luxury',
        qualityDescription: 'Authentic natural stone - unique appearance, luxurious feel, requires sealing and maintenance'
      }
    ]
  },
  {
    id: 'floorTileSize',
    label: 'Floor Tile Size',
    type: 'radio',
    required: true,
    description: 'Floor tile dimensions (larger tiles = fewer grout lines, modern look)',
    options: [
      { value: '300x300', label: '300x300 mm', description: 'Small format - traditional, more grout lines' },
      { value: '600x600', label: '600x600 mm', description: 'Large format - modern, fewer grout lines' },
      { value: '800x800', label: '800x800 mm', description: 'Extra large - contemporary, minimal grout' }
    ]
  },
  {
    id: 'wallTilesQuality',
    label: 'Wall Tile Material & Quality',
    type: 'radio',
    required: true,
    description: 'Choose wall tile material based on quality and style',
    options: [
      {
        value: 'ceramic_budget',
        label: 'Ceramic - Budget',
        description: 'Standard ceramic wall tiles',
        qualityLevel: 'budget',
        qualityDescription: 'Basic ceramic wall tiles - affordable, variety of colors, suitable for standard bathrooms'
      },
      {
        value: 'ceramic_premium',
        label: 'Ceramic - Premium',
        description: 'High-quality ceramic with special finishes',
        qualityLevel: 'standard',
        qualityDescription: 'Premium ceramic - textured or glossy finishes, better quality, consistent color'
      },
      {
        value: 'porcelain',
        label: 'Porcelain',
        description: 'Dense porcelain wall tiles',
        qualityLevel: 'standard',
        qualityDescription: 'Porcelain for walls - superior moisture resistance, excellent for wet areas like showers'
      },
      {
        value: 'glass_mosaic',
        label: 'Glass Mosaic - Premium',
        description: 'Glass tiles for accent areas',
        qualityLevel: 'premium',
        qualityDescription: 'Glass mosaic tiles - elegant, reflective, perfect for accent walls or shower niches'
      },
      {
        value: 'marble_luxury',
        label: 'Marble/Natural Stone - Luxury',
        description: 'Natural stone wall tiles',
        qualityLevel: 'luxury',
        qualityDescription: 'Natural marble or stone - luxurious appearance, unique veining, requires sealing'
      }
    ]
  },
  {
    id: 'wallTilesHeight',
    label: 'Wall Tiles Coverage',
    type: 'radio',
    required: true,
    description: 'How high should wall tiles go?',
    options: [
      { value: 'full', label: 'Full height (floor to ceiling)', description: 'Complete coverage, best moisture protection, modern look' },
      { value: 'half', label: 'Half height (up to ~1.2m)', description: 'Partial wall coverage, paint above, traditional style' },
      { value: 'shower_only', label: 'Shower area only', description: 'Tile only wet areas, paint elsewhere' }
    ]
  },
  {
    id: 'accentWall',
    label: 'Accent/Feature Wall',
    type: 'radio',
    required: false,
    description: 'Special feature wall with decorative tiles?',
    options: [
      { value: 'yes', label: 'Yes - Include accent wall', description: 'Add feature wall with special tiles or pattern' },
      { value: 'no', label: 'No - Uniform tiles', description: 'Same tiles throughout' }
    ]
  },
  {
    id: 'groutQuality',
    label: 'Grout Type & Quality',
    type: 'radio',
    required: false,
    description: 'Type of grout (affects durability and maintenance)',
    options: [
      {
        value: 'cement_budget',
        label: 'Cement-based grout - Budget',
        description: 'Standard grout, requires sealing',
        qualityLevel: 'budget',
        qualityDescription: 'Traditional cement grout - affordable, requires periodic sealing to prevent staining'
      },
      {
        value: 'cement_premium',
        label: 'Premium cement grout with additives',
        description: 'Enhanced cement grout, better stain resistance',
        qualityLevel: 'standard',
        qualityDescription: 'Premium cement grout with polymers - better flexibility, stain resistance, less maintenance'
      },
      {
        value: 'epoxy',
        label: 'Epoxy grout - Premium',
        description: 'Waterproof, stain-proof, highly durable',
        qualityLevel: 'premium',
        qualityDescription: 'Epoxy grout - completely waterproof, no sealing needed, best for wet areas, superior stain resistance'
      }
    ]
  },
  {
    id: 'groutColor',
    label: 'Grout Color',
    type: 'radio',
    required: false,
    description: 'Preferred grout color',
    options: [
      { value: 'white', label: 'White', description: 'Clean, classic look' },
      { value: 'gray', label: 'Gray', description: 'Modern, hides dirt better' },
      { value: 'matching', label: 'Matching tile color', description: 'Seamless appearance' },
      { value: 'contrasting', label: 'Contrasting color', description: 'Highlight tile pattern' }
    ]
  }
];

// SECTION 9: Electrical & Lighting (Conditional - if electrical_lighting selected)
export const ELECTRICAL_LIGHTING_QUESTIONS: Question[] = [
  {
    id: 'ceilingLights',
    label: 'Ceiling Lights',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Electrical & Lighting',
    description: 'Select ceiling lighting options (can select multiple)',
    options: [
      { value: 'recessed', label: 'Recessed downlights', description: 'Built-in ceiling spotlights, modern clean look' },
      { value: 'led_panel', label: 'LED panel lights', description: 'Flat LED panels, even illumination, energy-efficient' },
      { value: 'chandelier', label: 'Chandelier/Pendant', description: 'Decorative hanging light for luxury bathrooms' },
      { value: 'spotlights', label: 'Adjustable spotlights', description: 'Directional spots for accent lighting' }
    ]
  },
  {
    id: 'lightingQuality',
    label: 'Lighting Fixture Quality',
    type: 'radio',
    required: true,
    description: 'Select quality level for bathroom lighting fixtures',
    options: [
      {
        value: 'budget',
        label: 'Budget-Friendly',
        description: 'Standard LED lights with basic features',
        qualityLevel: 'budget',
        qualityDescription: 'Basic LED fixtures - functional, energy-efficient, IP44 rated for bathroom use'
      },
      {
        value: 'standard',
        label: 'Standard Quality',
        description: 'Good quality German brands with better efficiency',
        qualityLevel: 'standard',
        qualityDescription: 'Branded LED fixtures - better light quality (CRI 80+), dimmable options, IP65 rated, longer warranty'
      },
      {
        value: 'premium',
        label: 'Premium Quality',
        description: 'High-end designer lighting with smart features',
        qualityLevel: 'premium',
        qualityDescription: 'Designer LED lights - excellent light quality (CRI 90+), smart control, premium finishes, architectural quality'
      }
    ]
  },
  {
    id: 'mirrorLights',
    label: 'Mirror Lights',
    type: 'radio',
    required: false,
    description: 'Select mirror lighting option',
    options: [
      { value: 'led_backlit', label: 'LED backlit mirror', description: 'Integrated LED lighting behind/around mirror, modern look' },
      { value: 'sconce', label: 'Wall sconce lights', description: 'Wall-mounted lights beside mirror, traditional elegance' },
      { value: 'illuminated_mirror', label: 'Fully illuminated mirror', description: 'Mirror with integrated LED surround lighting' },
      { value: 'none', label: 'No mirror lights', description: 'Standard mirror without lighting' }
    ]
  },
  {
    id: 'mirrorQuality',
    label: 'Mirror Quality',
    type: 'radio',
    required: false,
    description: 'Select mirror quality level',
    options: [
      {
        value: 'budget',
        label: 'Standard Mirror',
        description: 'Basic bathroom mirror',
        qualityLevel: 'budget',
        qualityDescription: 'Standard mirror - basic glass, fog-resistant coating optional'
      },
      {
        value: 'standard',
        label: 'LED-Backlit Mirror',
        description: 'Mirror with integrated LED lighting',
        qualityLevel: 'standard',
        qualityDescription: 'LED mirror - built-in lighting, anti-fog heating, modern aesthetic'
      },
      {
        value: 'premium',
        label: 'Smart Mirror',
        description: 'Digital mirror with touchscreen and smart features',
        qualityLevel: 'premium',
        qualityDescription: 'Smart mirror - touchscreen display, lighting control, Bluetooth speakers, defogging, luxury feature'
      }
    ]
  },
  {
    id: 'smartFeatures',
    label: 'Smart Technology Features',
    type: 'multiselect',
    required: false,
    description: 'Smart home integration (optional)',
    options: [
      { value: 'smart_lights', label: 'Smart lighting control', description: 'App-controlled lights with dimming and color temperature' },
      { value: 'voice_control', label: 'Voice control integration', description: 'Alexa, Google Assistant for hands-free control' },
      { value: 'motion_sensors', label: 'Motion sensor lighting', description: 'Automatic lights when entering bathroom' },
      { value: 'ambient_scenes', label: 'Lighting scenes/presets', description: 'Pre-programmed lighting moods (bright, relaxing, etc.)' }
    ]
  }
];

// SECTION 10B: Water Pressure (Conditional - if water_pressure selected)
export const WATER_PRESSURE_QUESTIONS: Question[] = [
  {
    id: 'currentWaterPressure',
    label: 'Current water pressure',
    type: 'radio',
    required: true,
    sectionTitle: 'Water Pressure',
    description: 'How is your current water pressure?',
    options: [
      { value: 'good', label: 'Good', description: 'Strong pressure' },
      { value: 'average', label: 'Average', description: 'Acceptable pressure' },
      { value: 'low', label: 'Low', description: 'Weak pressure' },
      { value: 'not_sure', label: 'Not sure', description: 'Need to check' }
    ]
  },
  {
    id: 'lowPressureLocation',
    label: 'Where is pressure low?',
    type: 'multiselect',
    required: false,
    description: 'Which fixtures have low pressure?',
    options: [
      { value: 'shower', label: 'Shower', description: 'Weak shower' },
      { value: 'basin', label: 'Basin tap', description: 'Weak tap flow' },
      { value: 'toilet', label: 'Toilet flush', description: 'Weak flush' },
      { value: 'whole_bathroom', label: 'Whole bathroom', description: 'All fixtures' },
      { value: 'na', label: 'Not applicable', description: 'Pressure is fine' }
    ]
  },
  {
    id: 'waterSupplyType',
    label: 'Water supply type',
    type: 'radio',
    required: true,
    description: 'How is water supplied?',
    options: [
      { value: 'overhead', label: 'Overhead tank', description: 'Gravity-fed' },
      { value: 'underground_pump', label: 'Underground tank with pump', description: 'Pumped supply' },
      { value: 'municipal', label: 'Direct municipal supply', description: 'City water' },
      { value: 'not_sure', label: 'Not sure', description: 'Need to check' }
    ]
  },
  {
    id: 'wantStrongerPressure',
    label: 'Want stronger shower pressure?',
    type: 'radio',
    required: true,
    description: 'Improve shower pressure?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Increase pressure' },
      { value: 'no', label: 'No', description: 'Keep as is' },
      { value: 'normal_fine', label: 'Normal pressure is fine', description: 'Current is OK' }
    ]
  },
  {
    id: 'boosterPumpOk',
    label: 'OK with booster pump if needed?',
    type: 'radio',
    required: true,
    description: 'Install pump if required?',
    options: [
      { value: 'yes', label: 'Yes', description: 'OK to install pump' },
      { value: 'no', label: 'No', description: 'No pump wanted' },
      { value: 'not_sure', label: 'Not sure', description: 'Need advice' }
    ]
  }
];

// SECTION 11: Heating (Conditional - if heating selected)
export const HEATING_QUESTIONS: Question[] = [
  {
    id: 'heatingType',
    label: 'Bathroom Heating System',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Heating & Comfort',
    description: 'Select heating systems for your bathroom',
    allowOther: true,
    otherPlaceholder: 'Describe heating system...',
    options: [
      {
        value: 'radiator',
        label: 'Wall radiator (Heizkörper)',
        description: 'Traditional panel radiator for bathroom heating',
        qualityLevel: 'standard',
        qualityDescription: 'Traditional wall-mounted radiator - reliable heating, good for retrofit installations'
      },
      {
        value: 'towel_radiator',
        label: 'Heated towel radiator (Handtuchheizkörper)',
        description: 'Dual function: room heating + towel warming',
        qualityLevel: 'standard',
        qualityDescription: 'Popular German choice - heats room while keeping towels warm and dry, space-efficient'
      },
      {
        value: 'underfloor_electric',
        label: 'Electric underfloor heating',
        description: 'Floor heating mats, easy installation',
        qualityLevel: 'standard',
        qualityDescription: 'Electric heating mats under tiles - comfortable floor warmth, easier retrofit than water system'
      },
      {
        value: 'underfloor_water',
        label: 'Water underfloor heating',
        description: 'Hydronic system, most energy-efficient',
        qualityLevel: 'premium',
        qualityDescription: 'Water-based underfloor heating - most efficient, even heat distribution, ideal for new construction or major renovations'
      },
      {
        value: 'infrared_heater',
        label: 'Infrared panel heater',
        description: 'Modern, efficient, wall/ceiling mounted',
        qualityLevel: 'standard',
        qualityDescription: 'Modern infrared panels - efficient spot heating, quick warmth, contemporary design, wall or ceiling mount'
      }
    ]
  },
  {
    id: 'heatedTowelRailQuality',
    label: 'Heated Towel Rail Quality & Brand (if selected)',
    type: 'radio',
    required: false,
    description: 'Choose heated towel rail quality level',
    allowOther: true,
    otherPlaceholder: 'Enter specific brand preference...',
    options: [
      {
        value: 'budget_standard',
        label: 'Budget - Standard brands',
        description: 'Functional, basic models',
        qualityLevel: 'budget',
        qualityDescription: 'Basic heated towel rails - reliable functionality, standard designs, good for cost-conscious renovations'
      },
      {
        value: 'kermi',
        label: 'Standard - Kermi (German)',
        description: 'German quality, energy-efficient',
        qualityLevel: 'standard',
        qualityDescription: 'Kermi - established German brand, efficient heating, reliable quality, good value'
      },
      {
        value: 'zehnder',
        label: 'Premium - Zehnder (Swiss-German)',
        description: 'High-quality design radiators',
        qualityLevel: 'premium',
        qualityDescription: 'Zehnder - Swiss-German premium brand, excellent design options, superior build quality'
      },
      {
        value: 'vasco',
        label: 'Luxury - Vasco',
        description: 'Designer radiators, modern aesthetics',
        qualityLevel: 'luxury',
        qualityDescription: 'Vasco - luxury designer radiators, statement pieces, contemporary designs, premium finishes'
      }
    ]
  }
];

// SECTION 12: Ventilation (Conditional - if ventilation selected)
export const VENTILATION_QUESTIONS: Question[] = [
  {
    id: 'ventilationType',
    label: 'Ventilation System',
    type: 'radio',
    required: true,
    sectionTitle: 'Ventilation & Air Quality',
    description: 'What type of ventilation do you need? (Must comply with DIN 18017 German standards)',
    allowOther: true,
    otherPlaceholder: 'Describe ventilation...',
    options: [
      {
        value: 'window_only',
        label: 'Window ventilation only',
        description: 'Natural ventilation through window',
        qualityLevel: 'budget',
        qualityDescription: 'Natural ventilation - no mechanical system, relies on opening windows, only suitable if bathroom has external window'
      },
      {
        value: 'basic_exhaust',
        label: 'Basic exhaust fan',
        description: 'Simple wall or ceiling-mounted fan',
        qualityLevel: 'budget',
        qualityDescription: 'Basic mechanical ventilation - simple fan, manually controlled, removes moisture and odors'
      },
      {
        value: 'humidity_sensor',
        label: 'Humidity sensor fan',
        description: 'Automatically turns on when humidity rises',
        qualityLevel: 'standard',
        qualityDescription: 'Smart humidity-controlled fan - automatically activates when moisture detected, energy-efficient, prevents mold'
      },
      {
        value: 'timer_fan',
        label: 'Timer-controlled fan',
        description: 'Runs for set time after bathroom use',
        qualityLevel: 'standard',
        qualityDescription: 'Timer-based fan - continues running after light switch off, ensures complete moisture removal'
      },
      {
        value: 'heat_recovery',
        label: 'Heat recovery ventilation (HRV)',
        description: 'Energy-efficient, recovers warmth from exhaust air',
        qualityLevel: 'premium',
        qualityDescription: 'Premium HRV system - recovers heat from outgoing air, energy-efficient, ideal for passive houses and modern builds'
      }
    ]
  },
  {
    id: 'ventilationCapacity',
    label: 'Fan Capacity (if mechanical ventilation selected)',
    type: 'radio',
    required: false,
    description: 'Choose ventilation capacity based on bathroom size (measured in cubic meters per hour)',
    allowOther: true,
    otherPlaceholder: 'Custom capacity...',
    options: [
      {
        value: 'small',
        label: 'Small bathroom (up to 4m²) - 80m³/h',
        description: 'For compact bathrooms and powder rooms',
        qualityLevel: 'standard',
        qualityDescription: 'Suitable for small bathrooms - adequate air exchange for spaces up to 4 square meters'
      },
      {
        value: 'medium',
        label: 'Medium bathroom (4-8m²) - 120m³/h',
        description: 'For standard family bathrooms',
        qualityLevel: 'standard',
        qualityDescription: 'Most common choice - suitable for typical family bathrooms with shower or bath'
      },
      {
        value: 'large',
        label: 'Large bathroom (8m²+) - 180m³/h or more',
        description: 'For larger bathrooms or wet rooms',
        qualityLevel: 'standard',
        qualityDescription: 'Higher capacity - needed for large master bathrooms, wet rooms, or bathrooms with multiple fixtures'
      }
    ]
  }
];

// SECTION 13: Accessories (Conditional - if accessories selected)
export const ACCESSORIES_QUESTIONS: Question[] = [
  {
    id: 'accessoriesWanted',
    label: 'Which accessories do you want?',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Accessories',
    description: 'Select bathroom accessories',
    options: [
      { value: 'towel_bars', label: 'Towel bars', description: 'Standard towel racks' },
      { value: 'heated_towel', label: 'Heated towel rail', description: 'Warming towel rack' },
      { value: 'toilet_paper', label: 'Toilet paper holder', description: 'TP holder' },
      { value: 'shelves', label: 'Shelves', description: 'Storage shelves' },
      { value: 'grab_bars', label: 'Grab bars', description: 'Safety rails' }
    ]
  }
];

// SECTION 14: Waterproofing (Conditional - if waterproofing selected)
export const WATERPROOFING_QUESTIONS: Question[] = [
  {
    id: 'waterproofingRequired',
    label: 'Waterproofing required?',
    type: 'radio',
    required: true,
    sectionTitle: 'Waterproofing',
    description: 'Need waterproofing work?',
    options: [
      { value: 'full', label: 'Yes, full waterproofing', description: 'Entire bathroom' },
      { value: 'shower_only', label: 'Only shower area', description: 'Just shower' },
      { value: 'floor_only', label: 'Only floor', description: 'Floor waterproofing' },
      { value: 'expert_advice', label: 'Not sure, need expert advice', description: 'Get recommendation' },
      { value: 'no', label: 'No', description: 'Not needed' }
    ]
  },
  {
    id: 'waterproofingIssues',
    label: 'Existing waterproofing issues?',
    type: 'multiselect',
    required: false,
    description: 'Current moisture problems',
    options: [
      { value: 'leakage_downstairs', label: 'Water leakage to downstairs', description: 'Leaking to below' },
      { value: 'damp_walls', label: 'Damp / wet walls', description: 'Moisture in walls' },
      { value: 'cracked_tiles', label: 'Cracked tiles', description: 'Tile damage' },
      { value: 'mold', label: 'Mold / fungus on walls or floor', description: 'Mold growth' },
      { value: 'bad_smell', label: 'Bad smell from wet areas', description: 'Odor issues' },
      { value: 'no_issues', label: 'No issues', description: 'All good' },
      { value: 'not_sure', label: 'Not sure', description: 'Need inspection' }
    ]
  },
  {
    id: 'waterproofingPreference',
    label: 'Waterproofing preference',
    type: 'radio',
    required: false,
    description: 'Quality level wanted',
    options: [
      { value: 'standard', label: 'Standard waterproofing', description: 'Basic protection' },
      { value: 'high_grade', label: 'High-grade waterproofing', description: 'Premium quality' },
      { value: 'suggest', label: 'Not sure — suggest best option', description: 'Get recommendation' }
    ]
  }
];

// Combine all questions for easy access
export const BATHROOM_QUESTIONS: Question[] = [
  ...BATHROOM_AREA_SELECTION
];

// ============================================================================
// KITCHEN RENOVATION CONSTANTS
// ============================================================================

export const KITCHEN_RENOVATION_GOAL: Question[] = [
  {
    id: 'kitchenRenovationGoal',
    label: 'Kitchen Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Project Goal',
    description: 'What type of kitchen renovation are you planning?',
    options: [
      { value: 'cosmetic_upgrade', label: 'Cosmetic upgrade', description: 'Paint, hardware, minor updates' },
      { value: 'full_demolition', label: 'Full demolition + rebuild', description: 'Complete kitchen reconstruction' },
      { value: 'cabinet_replacement', label: 'Cabinet replacement only', description: 'New cabinets only' },
      { value: 'countertop_replacement', label: 'Countertop replacement only', description: 'New countertops only' },
      { value: 'layout_change', label: 'Layout change', description: 'Restructure kitchen layout' },
      { value: 'increase_size', label: 'Increase kitchen size (extension)', description: 'Expand kitchen area' },
      { value: 'open_kitchen', label: 'Convert closed kitchen to open kitchen', description: 'Remove walls for open plan' },
      { value: 'add_island', label: 'Add island / breakfast bar', description: 'Add central island or bar' }
    ]
  }
];

export const KITCHEN_COMMON_FIELDS: Question[] = [
  {
    id: 'kitchenType',
    label: 'Kitchen Type',
    type: 'radio',
    required: true,
    sectionTitle: 'Common Fields',
    description: 'What type of kitchen is this?',
    options: [
      { value: 'main_kitchen', label: 'Main kitchen', description: 'Primary kitchen in home' },
      { value: 'secondary_kitchen', label: 'Secondary / service kitchen', description: 'Additional kitchen space' },
      { value: 'pantry_kitchen', label: 'Pantry kitchen', description: 'Small pantry-style kitchen' },
      { value: 'outdoor_kitchen', label: 'Outdoor kitchen', description: 'Outdoor cooking area' },
      { value: 'kitchenette', label: 'Apartment kitchenette', description: 'Compact kitchen space' }
    ]
  },
  {
    id: 'layoutPreference',
    label: 'Layout Preference',
    type: 'radio',
    required: false,
    description: 'Preferred kitchen layout configuration',
    options: [
      { value: 'l_shape', label: 'L-shape', description: 'Two perpendicular walls' },
      { value: 'u_shape', label: 'U-shape', description: 'Three walls' },
      { value: 'straight_line', label: 'Straight line', description: 'Single wall' },
      { value: 'island', label: 'Island kitchen', description: 'With central island' },
      { value: 'peninsula', label: 'Peninsula kitchen', description: 'With peninsula extension' },
      { value: 'open_plan', label: 'Open plan', description: 'Integrated with living space' },
      { value: 'closed', label: 'Closed kitchen', description: 'Separate enclosed room' }
    ]
  },
  {
    id: 'designStyle',
    label: 'Design Style',
    type: 'radio',
    required: false,
    description: 'Preferred design aesthetic',
    allowOther: true,
    options: [
      { value: 'modern', label: 'Modern', description: 'Clean contemporary lines' },
      { value: 'minimalist', label: 'Minimalist', description: 'Simple and functional' },
      { value: 'luxury', label: 'Luxury', description: 'High-end premium finish' },
      { value: 'traditional', label: 'Traditional', description: 'Classic timeless style' },
      { value: 'scandinavian', label: 'Scandinavian', description: 'Nordic minimalist design' },
      { value: 'industrial', label: 'Industrial', description: 'Exposed materials and metals' },
      { value: 'rustic', label: 'Rustic / farmhouse', description: 'Warm natural materials' }
    ]
  }
];

export const KITCHEN_CABINETS_STORAGE: Question[] = [
  {
    id: 'cabinetWorkRequired',
    label: 'Cabinet Work Required',
    type: 'radio',
    required: false,
    sectionTitle: 'Cabinets & Storage',
    description: 'What cabinet work do you need?',
    options: [
      { value: 'replace', label: 'Replace cabinets', description: 'Complete cabinet replacement' },
      { value: 'repaint', label: 'Only repaint / re-laminate', description: 'Refresh existing cabinets' },
      { value: 'replace_doors', label: 'Only replace doors', description: 'New doors on existing boxes' },
      { value: 'add_new', label: 'Add new cabinets', description: 'Additional cabinet units' },
      { value: 'no_work', label: 'No cabinet work', description: 'Keep as is' }
    ]
  },
  {
    id: 'cabinetMaterial',
    label: 'Cabinet Material',
    type: 'radio',
    required: false,
    description: 'Preferred cabinet construction material',
    options: [
      { value: 'mdf', label: 'MDF', description: 'Medium density fiberboard' },
      { value: 'plywood', label: 'Plywood', description: 'Layered wood sheets' },
      { value: 'solid_wood', label: 'Solid wood', description: 'Natural solid wood' },
      { value: 'hdf', label: 'HDF', description: 'High density fiberboard' },
      { value: 'aluminum', label: 'Aluminum cabinets', description: 'Metal construction' },
      { value: 'not_sure', label: 'Not sure', description: 'Need recommendation' }
    ]
  },
  {
    id: 'storageAccessories',
    label: 'Storage Accessories',
    type: 'multiselect',
    required: false,
    description: 'Additional storage features wanted',
    options: [
      { value: 'cutlery_organizer', label: 'Cutlery organizer', description: 'Drawer dividers' },
      { value: 'corner_carousel', label: 'Corner carousel', description: 'Rotating corner unit' },
      { value: 'spice_pullout', label: 'Spice pull-out', description: 'Dedicated spice storage' },
      { value: 'bottle_pullout', label: 'Bottle pull-out', description: 'Pull-out bottle rack' },
      { value: 'drawer_dividers', label: 'Drawer dividers', description: 'Organized drawer systems' },
      { value: 'tall_unit', label: 'Tall unit shelf', description: 'Full-height storage' },
      { value: 'pantry_system', label: 'Pantry system', description: 'Organized pantry storage' }
    ]
  }
];

export const KITCHEN_COUNTERTOPS: Question[] = [
  {
    id: 'countertopMaterial',
    label: 'Countertop Material',
    type: 'radio',
    required: false,
    sectionTitle: 'Countertops',
    description: 'Preferred countertop material',
    options: [
      { value: 'quartz', label: 'Quartz', description: 'Engineered stone' },
      { value: 'granite', label: 'Granite', description: 'Natural stone' },
      { value: 'marble', label: 'Marble', description: 'Luxury natural stone' },
      { value: 'solid_surface', label: 'Solid surface', description: 'Corian-type material' },
      { value: 'ceramic', label: 'Ceramic countertop', description: 'Tiled surface' },
      { value: 'stainless_steel', label: 'Stainless steel', description: 'Metal surface' },
      { value: 'not_sure', label: 'Not sure', description: 'Need recommendation' }
    ]
  },
  {
    id: 'islandCountertop',
    label: 'Island Countertop Needed?',
    type: 'radio',
    required: false,
    description: 'Will you need countertop for a kitchen island?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Island countertop required' },
      { value: 'no', label: 'No', description: 'No island planned' }
    ]
  },
  {
    id: 'backsplashPreference',
    label: 'Backsplash Preference',
    type: 'radio',
    required: false,
    description: 'Type of backsplash wanted',
    options: [
      { value: 'full_height', label: 'Full-height', description: 'Floor to ceiling' },
      { value: 'half_height', label: 'Half-height', description: 'Partial coverage' },
      { value: 'tile', label: 'Tile backsplash', description: 'Ceramic or porcelain tiles' },
      { value: 'glass', label: 'Glass backsplash', description: 'Glass panel' },
      { value: 'stainless_steel', label: 'Stainless steel', description: 'Metal backsplash' }
    ]
  }
];

export const KITCHEN_SINK_FAUCET: Question[] = [
  {
    id: 'sinkType',
    label: 'Sink Type',
    type: 'radio',
    required: false,
    sectionTitle: 'Sink & Faucet',
    description: 'Preferred sink configuration',
    options: [
      { value: 'single_bowl', label: 'Single bowl', description: 'One large basin' },
      { value: 'double_bowl', label: 'Double bowl', description: 'Two separate basins' },
      { value: 'farmhouse', label: 'Farmhouse sink', description: 'Apron-front sink' },
      { value: 'undermount', label: 'Undermount', description: 'Mounted under counter' },
      { value: 'top_mount', label: 'Top-mount', description: 'Drop-in style' }
    ]
  },
  {
    id: 'sinkMaterial',
    label: 'Sink Material',
    type: 'radio',
    required: false,
    description: 'Preferred sink material',
    options: [
      { value: 'stainless_steel', label: 'Stainless steel', description: 'Durable metal' },
      { value: 'quartz_sink', label: 'Quartz sink', description: 'Composite material' },
      { value: 'granite_composite', label: 'Granite composite', description: 'Stone composite' },
      { value: 'ceramic', label: 'Ceramic sink', description: 'Porcelain finish' }
    ]
  },
  {
    id: 'faucetFeatures',
    label: 'Faucet Features',
    type: 'multiselect',
    required: false,
    description: 'Desired faucet features',
    options: [
      { value: 'pullout_spray', label: 'Pull-out spray', description: 'Extendable spray head' },
      { value: 'standard', label: 'Standard', description: 'Basic faucet' },
      { value: 'touch_sensor', label: 'Touch / Sensor', description: 'Touch or motion activated' },
      { value: 'hot_water_tap', label: 'Hot water tap (instant heater)', description: 'Instant boiling water' }
    ]
  }
];

export const KITCHEN_COOKING_APPLIANCES: Question[] = [
  {
    id: 'hobType',
    label: 'Hob Type',
    type: 'radio',
    required: false,
    sectionTitle: 'Cooking Appliances',
    description: 'Preferred cooking hob type',
    options: [
      { value: 'gas', label: 'Gas hob', description: 'Natural gas or LPG' },
      { value: 'electric', label: 'Electric hob', description: 'Electric heating elements' },
      { value: 'induction', label: 'Induction hob', description: 'Magnetic induction cooking' }
    ]
  },
  {
    id: 'hoodType',
    label: 'Hood / Chimney Type',
    type: 'radio',
    required: false,
    description: 'Kitchen hood configuration',
    options: [
      { value: 'wall_mounted', label: 'Wall-mounted hood', description: 'Mounted on wall' },
      { value: 'island_hood', label: 'Island hood', description: 'Ceiling-mounted for island' },
      { value: 'built_in', label: 'Built-in hood', description: 'Integrated in cabinet' },
      { value: 'no_hood', label: 'No hood needed', description: 'Not required' }
    ]
  },
  {
    id: 'additionalAppliances',
    label: 'Additional Appliances',
    type: 'multiselect',
    required: false,
    description: 'Additional kitchen appliances needed',
    options: [
      { value: 'built_in_oven', label: 'Built-in oven', description: 'Wall oven' },
      { value: 'microwave', label: 'Microwave', description: 'Built-in or countertop' },
      { value: 'dishwasher', label: 'Dishwasher', description: 'Integrated dishwasher' },
      { value: 'refrigerator', label: 'Refrigerator', description: 'Built-in or freestanding' },
      { value: 'wine_cooler', label: 'Wine cooler', description: 'Wine storage unit' },
      { value: 'appliance_garage', label: 'Mixer / appliance garage', description: 'Hidden appliance storage' }
    ]
  }
];

export const KITCHEN_QUESTIONS: Question[] = [
  ...KITCHEN_RENOVATION_GOAL,
  ...KITCHEN_COMMON_FIELDS,
  ...KITCHEN_CABINETS_STORAGE,
  ...KITCHEN_COUNTERTOPS,
  ...KITCHEN_SINK_FAUCET,
  ...KITCHEN_COOKING_APPLIANCES
];

// ============================================================================
// BASEMENT RENOVATION CONSTANTS
// ============================================================================

export const BASEMENT_QUESTIONS: Question[] = [
  {
    id: 'basementRenovationGoal',
    label: 'Basement Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Renovation Goal',
    description: 'What type of basement renovation are you planning?',
    options: [
      { value: 'cosmetic_upgrade', label: 'Cosmetic upgrade', description: 'Paint, finishes, minor updates' },
      { value: 'full_demolition', label: 'Full demolition + rebuild', description: 'Complete basement reconstruction' },
      { value: 'convert_unfinished', label: 'Convert unfinished basement to usable space', description: 'Finish an unfinished basement' },
      { value: 'moisture_issues', label: 'Improve moisture / water issues', description: 'Waterproofing and drainage' },
      { value: 'structural', label: 'Structural strengthening', description: 'Reinforce structure' },
      { value: 'increase_area', label: 'Increase usable area', description: 'Maximize basement space' },
      { value: 'change_usage', label: 'Change basement usage', description: 'Repurpose basement function' }
    ]
  },
  {
    id: 'basementFinished',
    label: 'Is the basement currently finished?',
    type: 'radio',
    required: true,
    sectionTitle: 'Existing Basement Condition',
    description: 'Current state of basement',
    options: [
      { value: 'fully_finished', label: 'Fully finished', description: 'Complete with walls, ceiling, flooring' },
      { value: 'partially_finished', label: 'Partially finished', description: 'Some areas finished' },
      { value: 'unfinished', label: 'Unfinished', description: 'Bare concrete and studs' },
      { value: 'not_sure', label: 'Not sure', description: 'Need assessment' }
    ]
  },
  {
    id: 'basementIssues',
    label: 'Any existing issues?',
    type: 'multiselect',
    required: false,
    description: 'Current basement problems',
    options: [
      { value: 'water_leakage', label: 'Water leakage', description: 'Water intrusion' },
      { value: 'damp_walls', label: 'Damp walls or floor', description: 'Moisture problems' },
      { value: 'mold', label: 'Mold / fungus smell', description: 'Mold growth' },
      { value: 'cracks', label: 'Cracks in walls or floor', description: 'Structural cracks' },
      { value: 'low_ceiling', label: 'Low ceiling height', description: 'Limited headroom' },
      { value: 'poor_ventilation', label: 'Poor ventilation', description: 'Inadequate airflow' },
      { value: 'poor_lighting', label: 'Poor lighting / no natural light', description: 'Dark space' },
      { value: 'uneven_floor', label: 'Uneven floor', description: 'Floor level issues' },
      { value: 'no_issues', label: 'No major issues', description: 'Good condition' }
    ]
  },
  {
    id: 'basementUse',
    label: 'How do you want to use the basement?',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Intended Basement Use',
    description: 'Planned basement function',
    options: [
      { value: 'living_room', label: 'Living room / family room', description: 'Living space' },
      { value: 'bedroom', label: 'Bedroom / guest room', description: 'Sleeping quarters' },
      { value: 'home_office', label: 'Home office', description: 'Work space' },
      { value: 'home_theater', label: 'Home theater / media room', description: 'Entertainment area' },
      { value: 'gym', label: 'Gym / fitness room', description: 'Exercise space' },
      { value: 'storage', label: 'Storage', description: 'Storage area' },
      { value: 'laundry', label: 'Laundry area', description: 'Laundry facilities' },
      { value: 'rental_unit', label: 'Rental unit', description: 'Separate living unit' },
      { value: 'play_area', label: 'Kids play area', description: 'Children\'s space' },
      { value: 'multipurpose', label: 'Multi-purpose space', description: 'Flexible use' }
    ]
  },
  {
    id: 'basementDesignStyle',
    label: 'Preferred Design Style',
    type: 'radio',
    required: false,
    sectionTitle: 'Style & Comfort',
    description: 'Design aesthetic preference',
    options: [
      { value: 'modern', label: 'Modern', description: 'Contemporary design' },
      { value: 'minimalist', label: 'Minimalist', description: 'Simple and clean' },
      { value: 'industrial', label: 'Industrial', description: 'Exposed elements' },
      { value: 'traditional', label: 'Traditional', description: 'Classic style' },
      { value: 'cozy', label: 'Cozy / warm', description: 'Comfortable atmosphere' },
      { value: 'not_sure', label: 'Not sure', description: 'Need suggestions' }
    ]
  },
  {
    id: 'basementLightingPreference',
    label: 'Lighting Preference',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Lighting & Ventilation',
    description: 'Desired lighting types',
    options: [
      { value: 'recessed', label: 'Recessed ceiling lights', description: 'Flush mount lights' },
      { value: 'led_panels', label: 'LED panels', description: 'Panel lighting' },
      { value: 'wall_lights', label: 'Wall lights', description: 'Wall sconces' },
      { value: 'ambient', label: 'Floor / ambient lighting', description: 'Mood lighting' }
    ]
  },
  {
    id: 'basementFlooringPreference',
    label: 'Flooring Preference',
    type: 'radio',
    required: false,
    sectionTitle: 'Flooring & Walls',
    description: 'Preferred basement flooring',
    options: [
      { value: 'vinyl', label: 'Vinyl flooring', description: 'Waterproof vinyl' },
      { value: 'tiles', label: 'Tiles', description: 'Ceramic or porcelain' },
      { value: 'engineered_wood', label: 'Engineered wood', description: 'Wood-look planks' },
      { value: 'carpet', label: 'Carpet', description: 'Soft carpeting' },
      { value: 'epoxy', label: 'Epoxy floor', description: 'Seamless coating' },
      { value: 'not_sure', label: 'Not sure', description: 'Need recommendation' }
    ]
  },
  {
    id: 'basementWaterproofing',
    label: 'Do you want waterproofing work?',
    type: 'radio',
    required: false,
    sectionTitle: 'Waterproofing & Moisture Control',
    description: 'Waterproofing needed?',
    options: [
      { value: 'yes_full', label: 'Yes, full basement', description: 'Complete waterproofing' },
      { value: 'walls_only', label: 'Only walls', description: 'Wall waterproofing' },
      { value: 'floor_only', label: 'Only floor', description: 'Floor waterproofing' },
      { value: 'not_sure', label: 'Not sure', description: 'Need assessment' },
      { value: 'no', label: 'No', description: 'Not needed' }
    ]
  }
];

// ============================================================================
// ROOFING RENOVATION CONSTANTS
// ============================================================================

export const ROOFING_QUESTIONS: Question[] = [
  {
    id: 'roofingRenovationGoal',
    label: 'Roofing Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Roofing Renovation Goal',
    description: 'What roofing work do you need?',
    options: [
      { value: 'minor_repair', label: 'Minor repair', description: 'Small fixes' },
      { value: 'partial_replacement', label: 'Partial roof replacement', description: 'Replace damaged sections' },
      { value: 'full_replacement', label: 'Full roof replacement', description: 'Complete new roof' },
      { value: 'waterproofing', label: 'Improve waterproofing', description: 'Enhance water protection' },
      { value: 'insulation', label: 'Improve insulation / temperature control', description: 'Better thermal performance' },
      { value: 'change_material', label: 'Change roof material', description: 'Different roofing material' },
      { value: 'structural', label: 'Structural strengthening', description: 'Reinforce structure' },
      { value: 'add_skylight', label: 'Add skylight / roof window', description: 'Install skylight' },
      { value: 'fix_leakage', label: 'Fix leakage issues', description: 'Repair leaks' }
    ]
  },
  {
    id: 'currentRoofType',
    label: 'Current Roof Type',
    type: 'radio',
    required: true,
    sectionTitle: 'Existing Roof Condition',
    description: 'What type of roof do you have?',
    options: [
      { value: 'flat', label: 'Flat roof', description: 'Horizontal surface' },
      { value: 'sloped', label: 'Sloped / pitched roof', description: 'Angled roof' },
      { value: 'terrace', label: 'Terrace roof', description: 'Accessible flat roof' },
      { value: 'metal', label: 'Metal roof', description: 'Metal sheet roofing' },
      { value: 'not_sure', label: 'Not sure', description: 'Need inspection' }
    ]
  },
  {
    id: 'roofProblems',
    label: 'Existing Roof Problems',
    type: 'multiselect',
    required: false,
    description: 'Current roof issues',
    options: [
      { value: 'leakage', label: 'Water leakage', description: 'Active leaks' },
      { value: 'damp_ceiling', label: 'Damp ceiling / stains', description: 'Water stains' },
      { value: 'cracks', label: 'Cracks in slab', description: 'Structural cracks' },
      { value: 'broken_tiles', label: 'Broken or missing tiles', description: 'Damaged tiles' },
      { value: 'rusted_metal', label: 'Rusted metal sheets', description: 'Corroded metal' },
      { value: 'heat', label: 'Heat issue (too hot inside)', description: 'Excessive heat transfer' },
      { value: 'noise', label: 'Noise during rain', description: 'Sound issues' },
      { value: 'no_issues', label: 'No major issues', description: 'Good condition' }
    ]
  },
  {
    id: 'roofWaterproofing',
    label: 'Do you want waterproofing work?',
    type: 'radio',
    required: false,
    sectionTitle: 'Waterproofing & Drainage',
    description: 'Waterproofing needed?',
    options: [
      { value: 'yes_full', label: 'Yes, full roof waterproofing', description: 'Complete waterproofing' },
      { value: 'damaged_areas', label: 'Only repair damaged areas', description: 'Spot repairs' },
      { value: 'expert_advice', label: 'Not sure - need expert advice', description: 'Professional assessment' },
      { value: 'no', label: 'No', description: 'Not needed' }
    ]
  },
  {
    id: 'thermalInsulation',
    label: 'Do you want thermal insulation?',
    type: 'radio',
    required: false,
    sectionTitle: 'Insulation & Heat Control',
    description: 'Insulation needed?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Add insulation' },
      { value: 'no', label: 'No', description: 'Not needed' },
      { value: 'not_sure', label: 'Not sure', description: 'Need recommendation' }
    ]
  },
  {
    id: 'skylightsWanted',
    label: 'Do you want skylights / roof windows?',
    type: 'radio',
    required: false,
    sectionTitle: 'Skylights & Roof Openings',
    description: 'Add skylights?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Install skylights' },
      { value: 'no', label: 'No', description: 'Not needed' },
      { value: 'not_sure', label: 'Not sure', description: 'Considering' }
    ]
  }
];

// ============================================================================
// ELECTRICAL RENOVATION CONSTANTS
// ============================================================================

export const ELECTRICAL_QUESTIONS: Question[] = [
  {
    id: 'electricalRenovationGoal',
    label: 'Electrical Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Electrical Renovation Goal',
    description: 'What electrical work do you need?',
    options: [
      { value: 'minor_repairs', label: 'Minor electrical repairs', description: 'Small fixes' },
      { value: 'upgrade_wiring', label: 'Upgrade old wiring', description: 'Replace old cables' },
      { value: 'full_rewiring', label: 'Full electrical rewiring', description: 'Complete rewire' },
      { value: 'add_points', label: 'Add new electrical points', description: 'More outlets/switches' },
      { value: 'improve_safety', label: 'Improve safety', description: 'Safety upgrades' },
      { value: 'support_appliances', label: 'Support new appliances / load', description: 'Higher capacity' },
      { value: 'smart_home', label: 'Smart home upgrade', description: 'Home automation' }
    ]
  },
  {
    id: 'electricalCondition',
    label: 'Current Electrical Condition',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Existing Electrical Condition',
    description: 'Current electrical issues',
    options: [
      { value: 'working_fine', label: 'Working fine', description: 'No issues' },
      { value: 'frequent_tripping', label: 'Frequent tripping', description: 'Breakers trip often' },
      { value: 'flickering_lights', label: 'Flickering lights', description: 'Light flicker issues' },
      { value: 'burning_smell', label: 'Burning smell / sparks', description: 'Safety hazard' },
      { value: 'old_wiring', label: 'Old wiring', description: 'Aged system' },
      { value: 'not_sure', label: 'Not sure', description: 'Need inspection' }
    ]
  },
  {
    id: 'addPowerPoints',
    label: 'Do you want to add or change power points?',
    type: 'radio',
    required: false,
    sectionTitle: 'Power Points & Switches',
    description: 'Modify power points?',
    options: [
      { value: 'add_new', label: 'Add new power points', description: 'Additional outlets' },
      { value: 'relocate', label: 'Relocate existing points', description: 'Move outlets' },
      { value: 'replace', label: 'Replace old sockets', description: 'Update existing' },
      { value: 'no_changes', label: 'No changes', description: 'Keep as is' }
    ]
  },
  {
    id: 'lightingUpgrade',
    label: 'Lighting Upgrade Required?',
    type: 'radio',
    required: false,
    sectionTitle: 'Lighting',
    description: 'Upgrade lighting?',
    options: [
      { value: 'yes', label: 'Yes', description: 'New lighting needed' },
      { value: 'no', label: 'No', description: 'Current is fine' }
    ]
  },
  {
    id: 'safetyUpgrades',
    label: 'Safety Upgrades Required',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Safety & Protection',
    description: 'Desired safety improvements',
    options: [
      { value: 'mcb_upgrade', label: 'MCB upgrade', description: 'Circuit breaker upgrade' },
      { value: 'rccb_elcb', label: 'RCCB / ELCB', description: 'Earth leakage protection' },
      { value: 'surge_protection', label: 'Surge protection', description: 'Surge protectors' },
      { value: 'earthing', label: 'Earthing improvement', description: 'Better grounding' },
      { value: 'fire_safety', label: 'Fire safety', description: 'Fire protection measures' },
      { value: 'not_sure', label: 'Not sure', description: 'Need advice' }
    ]
  }
];

// ============================================================================
// PLUMBING RENOVATION CONSTANTS
// ============================================================================

export const PLUMBING_QUESTIONS: Question[] = [
  {
    id: 'plumbingRenovationGoal',
    label: 'Plumbing Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Plumbing Renovation Goal',
    description: 'What plumbing work do you need?',
    options: [
      { value: 'minor_repairs', label: 'Minor repairs', description: 'Small fixes' },
      { value: 'replace_pipes', label: 'Replace old plumbing pipes', description: 'New pipework' },
      { value: 'full_upgrade', label: 'Full plumbing system upgrade', description: 'Complete system' },
      { value: 'add_points', label: 'Add new plumbing points', description: 'New fixtures' },
      { value: 'fix_leakage', label: 'Fix water leakage issues', description: 'Repair leaks' },
      { value: 'improve_pressure', label: 'Improve water pressure', description: 'Better pressure' },
      { value: 'renovation_prep', label: 'Prepare for renovation (bathroom/kitchen/etc.)', description: 'Support renovation' }
    ]
  },
  {
    id: 'plumbingCondition',
    label: 'Current Plumbing Condition',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Existing Plumbing Condition',
    description: 'Current plumbing issues',
    options: [
      { value: 'working_fine', label: 'Working fine', description: 'No issues' },
      { value: 'frequent_leakage', label: 'Frequent leakage', description: 'Regular leaks' },
      { value: 'low_pressure', label: 'Low water pressure', description: 'Weak flow' },
      { value: 'blocked_drain', label: 'Blocked drainage', description: 'Drain clogs' },
      { value: 'old_pipes', label: 'Old / rusted pipes', description: 'Aged pipes' },
      { value: 'bad_smell', label: 'Bad smell from drains', description: 'Odor issues' },
      { value: 'not_sure', label: 'Not sure', description: 'Need inspection' }
    ]
  },
  {
    id: 'waterSupplySource',
    label: 'Water Supply Source',
    type: 'radio',
    required: false,
    sectionTitle: 'Water Supply',
    description: 'Primary water source',
    options: [
      { value: 'municipal', label: 'Municipal supply', description: 'City water' },
      { value: 'borewell', label: 'Borewell', description: 'Well water' },
      { value: 'tanker', label: 'Water tanker', description: 'Delivered water' },
      { value: 'combination', label: 'Combination', description: 'Multiple sources' },
      { value: 'not_sure', label: 'Not sure', description: 'Unknown' }
    ]
  },
  {
    id: 'waterPressure',
    label: 'Current Water Pressure',
    type: 'radio',
    required: false,
    sectionTitle: 'Water Pressure',
    description: 'How is water pressure?',
    options: [
      { value: 'good', label: 'Good', description: 'Strong pressure' },
      { value: 'average', label: 'Average', description: 'Acceptable' },
      { value: 'low', label: 'Low', description: 'Weak pressure' },
      { value: 'not_sure', label: 'Not sure', description: 'Uncertain' }
    ]
  },
  {
    id: 'drainageIssues',
    label: 'Drainage Issues',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Drainage & Waste System',
    description: 'Current drainage problems',
    options: [
      { value: 'slow_drainage', label: 'Slow drainage', description: 'Drains slowly' },
      { value: 'frequent_blockage', label: 'Frequent blockage', description: 'Regular clogs' },
      { value: 'backflow', label: 'Backflow problem', description: 'Water backs up' },
      { value: 'bad_odor', label: 'Bad odor', description: 'Smell issues' },
      { value: 'no_issues', label: 'No issues', description: 'Works fine' },
      { value: 'not_sure', label: 'Not sure', description: 'Uncertain' }
    ]
  },
  {
    id: 'replacePipesPlumbing',
    label: 'Do you plan to replace pipes?',
    type: 'radio',
    required: false,
    sectionTitle: 'Pipework',
    description: 'Pipe replacement needed?',
    options: [
      { value: 'all_pipes', label: 'Yes, all pipes', description: 'Complete replacement' },
      { value: 'partial', label: 'Partial replacement', description: 'Some pipes' },
      { value: 'no', label: 'No', description: 'Keep existing' },
      { value: 'not_sure', label: 'Not sure', description: 'Need assessment' }
    ]
  }
];

// ============================================================================
// HVAC RENOVATION CONSTANTS
// ============================================================================

export const HVAC_QUESTIONS: Question[] = [
  {
    id: 'hvacRenovationGoal',
    label: 'HVAC Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'HVAC Renovation Goal',
    description: 'What HVAC work do you need?',
    options: [
      { value: 'install_new', label: 'Install new HVAC system', description: 'First time installation' },
      { value: 'replace_existing', label: 'Replace existing HVAC system', description: 'System replacement' },
      { value: 'upgrade_capacity', label: 'Upgrade system capacity', description: 'Larger system' },
      { value: 'improve_cooling', label: 'Improve cooling performance', description: 'Better cooling' },
      { value: 'improve_heating', label: 'Improve heating performance', description: 'Better heating' },
      { value: 'air_quality', label: 'Improve indoor air quality', description: 'Better air' },
      { value: 'reduce_noise', label: 'Reduce noise', description: 'Quieter operation' },
      { value: 'energy_efficiency', label: 'Improve energy efficiency', description: 'Save energy' }
    ]
  },
  {
    id: 'propertyType',
    label: 'Property Type',
    type: 'radio',
    required: true,
    sectionTitle: 'Property & Space Details',
    description: 'Type of property',
    options: [
      { value: 'apartment', label: 'Apartment', description: 'Multi-unit building' },
      { value: 'house', label: 'Independent house', description: 'Single family home' },
      { value: 'villa', label: 'Villa', description: 'Luxury home' },
      { value: 'commercial', label: 'Commercial space', description: 'Business property' },
      { value: 'basement', label: 'Basement / attic space', description: 'Below/above ground' }
    ]
  },
  {
    id: 'existingHVACSystem',
    label: 'Existing HVAC System Present?',
    type: 'radio',
    required: true,
    sectionTitle: 'Existing HVAC Condition',
    description: 'Do you have an HVAC system?',
    options: [
      { value: 'yes', label: 'Yes', description: 'System exists' },
      { value: 'no', label: 'No', description: 'No system' }
    ]
  },
  {
    id: 'existingSystemIssues',
    label: 'Existing System Issues',
    type: 'multiselect',
    required: false,
    description: 'Current system problems',
    options: [
      { value: 'poor_cooling', label: 'Poor cooling', description: 'Inadequate cooling' },
      { value: 'poor_heating', label: 'Poor heating', description: 'Inadequate heating' },
      { value: 'uneven_temp', label: 'Uneven temperature', description: 'Hot/cold spots' },
      { value: 'high_consumption', label: 'High electricity consumption', description: 'Energy inefficient' },
      { value: 'breakdowns', label: 'Frequent breakdowns', description: 'Reliability issues' },
      { value: 'noise', label: 'Excessive noise', description: 'Too loud' },
      { value: 'no_issues', label: 'No major issues', description: 'Working well' }
    ]
  },
  {
    id: 'coolingRequirement',
    label: 'Cooling Requirement',
    type: 'radio',
    required: false,
    sectionTitle: 'Cooling & Heating Requirements',
    description: 'Cooling needs',
    options: [
      { value: 'high', label: 'High cooling', description: 'Strong cooling needed' },
      { value: 'moderate', label: 'Moderate cooling', description: 'Average cooling' },
      { value: 'basic', label: 'Basic cooling', description: 'Light cooling' }
    ]
  },
  {
    id: 'heatingRequirement',
    label: 'Heating Requirement',
    type: 'radio',
    required: false,
    description: 'Heating needs',
    options: [
      { value: 'yes', label: 'Yes', description: 'Heating needed' },
      { value: 'no', label: 'No', description: 'No heating' },
      { value: 'limited', label: 'Limited heating', description: 'Occasional heating' }
    ]
  },
  {
    id: 'airQualityConcerns',
    label: 'Air Quality Concerns',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Indoor Air Quality',
    description: 'Air quality issues',
    options: [
      { value: 'dust', label: 'Dust', description: 'Dusty air' },
      { value: 'humidity', label: 'Humidity', description: 'Too humid' },
      { value: 'odor', label: 'Odor', description: 'Bad smells' },
      { value: 'allergies', label: 'Allergies', description: 'Allergen issues' },
      { value: 'none', label: 'None', description: 'No concerns' }
    ]
  }
];

// ============================================================================
// FLOORING RENOVATION CONSTANTS
// ============================================================================

export const FLOORING_QUESTIONS: Question[] = [
  {
    id: 'flooringRenovationGoal',
    label: 'Flooring Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Flooring Renovation Goal',
    description: 'What flooring work do you need?',
    options: [
      { value: 'replace', label: 'Replace existing flooring', description: 'New flooring' },
      { value: 'install_new', label: 'Install flooring in new area', description: 'First time installation' },
      { value: 'repair', label: 'Repair damaged flooring', description: 'Fix damage' },
      { value: 'upgrade_look', label: 'Upgrade look & finish', description: 'Aesthetic improvement' },
      { value: 'improve_durability', label: 'Improve durability', description: 'Longer lasting' },
      { value: 'slip_resistance', label: 'Improve slip resistance', description: 'Safety improvement' },
      { value: 'comfort', label: 'Improve comfort / warmth', description: 'More comfortable' }
    ]
  },
  {
    id: 'flooringWorkAreas',
    label: 'Areas Requiring Flooring Work',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Area Details',
    description: 'Select areas needing flooring',
    options: [
      { value: 'living_room', label: 'Living room', description: 'Main living area' },
      { value: 'bedrooms', label: 'Bedrooms', description: 'Sleeping areas' },
      { value: 'kitchen', label: 'Kitchen', description: 'Cooking area' },
      { value: 'bathroom', label: 'Bathroom', description: 'Wet areas' },
      { value: 'basement', label: 'Basement', description: 'Below ground' },
      { value: 'staircase', label: 'Staircase', description: 'Stairs' },
      { value: 'balcony', label: 'Balcony / terrace', description: 'Outdoor areas' },
      { value: 'entire_house', label: 'Entire house', description: 'Whole property' }
    ]
  },
  {
    id: 'existingFlooringType',
    label: 'Existing Flooring Type',
    type: 'radio',
    required: false,
    sectionTitle: 'Existing Floor Condition',
    description: 'Current flooring material',
    options: [
      { value: 'tiles', label: 'Tiles', description: 'Ceramic/porcelain tiles' },
      { value: 'marble', label: 'Marble / stone', description: 'Natural stone' },
      { value: 'wood', label: 'Wood / laminate', description: 'Wood flooring' },
      { value: 'vinyl', label: 'Vinyl', description: 'Vinyl flooring' },
      { value: 'carpet', label: 'Carpet', description: 'Carpeted' },
      { value: 'concrete', label: 'Concrete', description: 'Bare concrete' },
      { value: 'not_sure', label: 'Not sure', description: 'Unknown' }
    ]
  },
  {
    id: 'existingFlooringIssues',
    label: 'Existing Flooring Issues',
    type: 'multiselect',
    required: false,
    description: 'Current floor problems',
    options: [
      { value: 'cracked_tiles', label: 'Cracked tiles', description: 'Broken tiles' },
      { value: 'uneven', label: 'Uneven surface', description: 'Not level' },
      { value: 'loose', label: 'Loose flooring', description: 'Coming apart' },
      { value: 'water_damage', label: 'Water damage', description: 'Moisture damage' },
      { value: 'slippery', label: 'Slippery surface', description: 'Safety hazard' },
      { value: 'worn', label: 'Worn-out finish', description: 'Old appearance' },
      { value: 'no_issues', label: 'No major issues', description: 'Good condition' }
    ]
  },
  {
    id: 'preferredFlooringMaterial',
    label: 'Preferred Flooring Material',
    type: 'radio',
    required: false,
    sectionTitle: 'Flooring Material Preference',
    description: 'Desired flooring type',
    options: [
      { value: 'ceramic', label: 'Ceramic tiles', description: 'Ceramic tiles' },
      { value: 'porcelain', label: 'Porcelain tiles', description: 'Porcelain tiles' },
      { value: 'marble', label: 'Marble', description: 'Natural marble' },
      { value: 'granite', label: 'Granite', description: 'Natural granite' },
      { value: 'vinyl', label: 'Vinyl', description: 'Vinyl flooring' },
      { value: 'laminate', label: 'Laminate wood', description: 'Laminate planks' },
      { value: 'engineered_wood', label: 'Engineered wood', description: 'Engineered wood' },
      { value: 'carpet', label: 'Carpet', description: 'Soft carpet' },
      { value: 'epoxy', label: 'Epoxy', description: 'Epoxy coating' },
      { value: 'not_sure', label: 'Not sure', description: 'Need recommendation' }
    ]
  },
  {
    id: 'slipResistance',
    label: 'Slip Resistance Required?',
    type: 'radio',
    required: false,
    sectionTitle: 'Functional Requirements',
    description: 'Need slip-resistant flooring?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Slip-resistant needed' },
      { value: 'no', label: 'No', description: 'Not required' }
    ]
  }
];

// ============================================================================
// WINDOWS & DOORS RENOVATION CONSTANTS
// ============================================================================

export const WINDOWS_DOORS_QUESTIONS: Question[] = [
  {
    id: 'windowsDoorsRenovationGoal',
    label: 'Windows / Doors Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Renovation Goal',
    description: 'What windows/doors work do you need?',
    options: [
      { value: 'replace', label: 'Replace existing windows / doors', description: 'New windows/doors' },
      { value: 'repair', label: 'Repair existing windows / doors', description: 'Fix existing' },
      { value: 'soundproofing', label: 'Upgrade insulation / soundproofing', description: 'Better insulation' },
      { value: 'security', label: 'Improve security', description: 'Enhanced security' },
      { value: 'light_ventilation', label: 'Improve natural light & ventilation', description: 'More light/air' },
      { value: 'design', label: 'Change design / appearance', description: 'New look' },
      { value: 'add_new', label: 'Add new windows / doors', description: 'Additional units' }
    ]
  },
  {
    id: 'windowsDoorsWorkAreas',
    label: 'Areas Requiring Work',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Area & Location',
    description: 'Select areas needing work',
    options: [
      { value: 'main_entrance', label: 'Main entrance door', description: 'Front door' },
      { value: 'internal_doors', label: 'Internal doors', description: 'Interior doors' },
      { value: 'balcony_doors', label: 'Balcony doors', description: 'Balcony access' },
      { value: 'bathroom_doors', label: 'Bathroom doors', description: 'Bathroom entries' },
      { value: 'bedroom_windows', label: 'Bedroom windows', description: 'Bedroom windows' },
      { value: 'living_windows', label: 'Living room windows', description: 'Living area windows' },
      { value: 'basement_windows', label: 'Basement windows', description: 'Below ground windows' },
      { value: 'entire_house', label: 'Entire house', description: 'All windows/doors' }
    ]
  },
  {
    id: 'existingFrameMaterial',
    label: 'Existing Frame Material',
    type: 'radio',
    required: false,
    sectionTitle: 'Existing Condition',
    description: 'Current frame material',
    options: [
      { value: 'wood', label: 'Wood', description: 'Wooden frames' },
      { value: 'aluminum', label: 'Aluminum', description: 'Aluminum frames' },
      { value: 'upvc', label: 'uPVC', description: 'uPVC frames' },
      { value: 'steel', label: 'Steel', description: 'Steel frames' },
      { value: 'not_sure', label: 'Not sure', description: 'Unknown' }
    ]
  },
  {
    id: 'existingWindowsDoorsIssues',
    label: 'Existing Issues',
    type: 'multiselect',
    required: false,
    description: 'Current problems',
    options: [
      { value: 'air_leakage', label: 'Air leakage', description: 'Drafts' },
      { value: 'water_leakage', label: 'Water leakage', description: 'Leaks when raining' },
      { value: 'difficult_operation', label: 'Difficult to open / close', description: 'Stuck or jammed' },
      { value: 'noise', label: 'Noise from outside', description: 'Sound transmission' },
      { value: 'broken_glass', label: 'Broken glass', description: 'Damaged glass' },
      { value: 'rotten_frames', label: 'Rotten / rusted frames', description: 'Deteriorated frames' },
      { value: 'no_issues', label: 'No major issues', description: 'Good condition' }
    ]
  },
  {
    id: 'windowType',
    label: 'Window Type',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Windows Details',
    description: 'Preferred window type',
    options: [
      { value: 'sliding', label: 'Sliding', description: 'Horizontal slide' },
      { value: 'casement', label: 'Casement', description: 'Hinged outward' },
      { value: 'fixed', label: 'Fixed', description: 'Non-opening' },
      { value: 'tilt_turn', label: 'Tilt & turn', description: 'Dual operation' },
      { value: 'awning', label: 'Awning', description: 'Top-hinged' },
      { value: 'bay', label: 'Bay window', description: 'Projected window' }
    ]
  },
  {
    id: 'doorMaterial',
    label: 'Door Material',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Doors Details',
    description: 'Preferred door material',
    options: [
      { value: 'solid_wood', label: 'Solid wood', description: 'Natural wood' },
      { value: 'engineered_wood', label: 'Engineered wood', description: 'Composite wood' },
      { value: 'upvc', label: 'uPVC', description: 'Plastic material' },
      { value: 'aluminum', label: 'Aluminum', description: 'Metal door' },
      { value: 'steel', label: 'Steel', description: 'Steel door' },
      { value: 'glass', label: 'Glass door', description: 'Glass panel door' }
    ]
  },
  {
    id: 'soundInsulation',
    label: 'Sound Insulation Required?',
    type: 'radio',
    required: false,
    sectionTitle: 'Insulation & Performance',
    description: 'Need soundproofing?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Soundproofing needed' },
      { value: 'no', label: 'No', description: 'Not required' },
      { value: 'not_sure', label: 'Not sure', description: 'Need advice' }
    ]
  }
];

// ============================================================================
// EXTERIOR RENOVATION CONSTANTS
// ============================================================================

export const EXTERIOR_QUESTIONS: Question[] = [
  {
    id: 'exteriorRenovationGoal',
    label: 'Exterior Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Exterior Renovation Goal',
    description: 'What exterior work do you need?',
    options: [
      { value: 'appearance', label: 'Improve appearance / curb appeal', description: 'Better looks' },
      { value: 'repair', label: 'Repair existing exterior damage', description: 'Fix damage' },
      { value: 'upgrade_materials', label: 'Upgrade materials & finishes', description: 'Better materials' },
      { value: 'weather_protection', label: 'Improve weather protection', description: 'Weatherproofing' },
      { value: 'insulation', label: 'Improve insulation', description: 'Better thermal performance' },
      { value: 'security', label: 'Improve security', description: 'Enhanced security' },
      { value: 'full_makeover', label: 'Full exterior makeover', description: 'Complete transformation' }
    ]
  },
  {
    id: 'exteriorAreas',
    label: 'Exterior Areas to be Renovated',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Areas Included',
    description: 'Select areas for renovation',
    options: [
      { value: 'facade', label: 'Building façade', description: 'Front exterior' },
      { value: 'walls', label: 'External walls', description: 'Side walls' },
      { value: 'boundary', label: 'Boundary wall', description: 'Perimeter wall' },
      { value: 'balcony', label: 'Balcony / terrace exterior', description: 'Balcony outside' },
      { value: 'porch', label: 'Porch / entrance area', description: 'Entry area' },
      { value: 'staircase', label: 'Exterior staircase', description: 'Outdoor stairs' },
      { value: 'entire', label: 'Entire exterior', description: 'Complete exterior' }
    ]
  },
  {
    id: 'existingExteriorFinish',
    label: 'Existing Exterior Finish',
    type: 'radio',
    required: false,
    sectionTitle: 'Existing Exterior Condition',
    description: 'Current exterior finish',
    options: [
      { value: 'paint', label: 'Paint', description: 'Painted surface' },
      { value: 'plaster', label: 'Plaster', description: 'Plastered finish' },
      { value: 'stone', label: 'Stone cladding', description: 'Stone facade' },
      { value: 'brick', label: 'Brick finish', description: 'Exposed brick' },
      { value: 'tile', label: 'Tile cladding', description: 'Tiled exterior' },
      { value: 'concrete', label: 'Concrete finish', description: 'Bare concrete' },
      { value: 'not_sure', label: 'Not sure', description: 'Unknown' }
    ]
  },
  {
    id: 'exteriorIssues',
    label: 'Existing Issues',
    type: 'multiselect',
    required: false,
    description: 'Current exterior problems',
    options: [
      { value: 'cracks', label: 'Cracks in walls', description: 'Structural cracks' },
      { value: 'peeling_paint', label: 'Peeling paint', description: 'Paint deterioration' },
      { value: 'seepage', label: 'Water seepage', description: 'Water intrusion' },
      { value: 'damp', label: 'Damp patches', description: 'Moisture issues' },
      { value: 'fading', label: 'Fading / discoloration', description: 'Color loss' },
      { value: 'surface_damage', label: 'Surface damage', description: 'Physical damage' },
      { value: 'no_issues', label: 'No major issues', description: 'Good condition' }
    ]
  },
  {
    id: 'preferredExteriorFinish',
    label: 'Preferred Exterior Finish',
    type: 'radio',
    required: false,
    sectionTitle: 'Exterior Finish & Materials',
    description: 'Desired exterior finish',
    options: [
      { value: 'paint', label: 'Paint', description: 'Standard paint' },
      { value: 'texture_paint', label: 'Texture paint', description: 'Textured finish' },
      { value: 'stone', label: 'Stone cladding', description: 'Stone facade' },
      { value: 'brick', label: 'Brick cladding', description: 'Brick finish' },
      { value: 'tile', label: 'Tile cladding', description: 'Tiled exterior' },
      { value: 'metal', label: 'Metal panels', description: 'Metal cladding' },
      { value: 'mixed', label: 'Mixed materials', description: 'Combination' },
      { value: 'not_sure', label: 'Not sure', description: 'Need recommendation' }
    ]
  },
  {
    id: 'exteriorWaterproofing',
    label: 'Waterproofing Required?',
    type: 'radio',
    required: false,
    sectionTitle: 'Weather & Water Protection',
    description: 'Need waterproofing?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Waterproofing needed' },
      { value: 'no', label: 'No', description: 'Not required' },
      { value: 'not_sure', label: 'Not sure', description: 'Need assessment' }
    ]
  }
];

// ============================================================================
// GENERAL RENOVATION CONSTANTS
// ============================================================================

export const GENERAL_QUESTIONS: Question[] = [
  {
    id: 'generalRenovationGoal',
    label: 'General Renovation Goal',
    type: 'multiselect',
    required: true,
    sectionTitle: 'General Renovation Goal',
    description: 'What type of renovation are you planning?',
    options: [
      { value: 'cosmetic', label: 'Cosmetic upgrade', description: 'Aesthetic improvements' },
      { value: 'partial', label: 'Partial renovation', description: 'Selected areas' },
      { value: 'full_house', label: 'Full house renovation', description: 'Complete renovation' },
      { value: 'repair', label: 'Repair & maintenance', description: 'Fix issues' },
      { value: 'modernization', label: 'Modernization', description: 'Update to modern standards' },
      { value: 'comfort', label: 'Improve comfort & usability', description: 'Better functionality' },
      { value: 'structural', label: 'Structural improvement', description: 'Structural work' }
    ]
  },
  {
    id: 'propertyAge',
    label: 'Age of Property',
    type: 'radio',
    required: false,
    sectionTitle: 'Property Details',
    description: 'Approximate property age',
    options: [
      { value: 'less_5', label: 'Less than 5 years', description: 'New property' },
      { value: '5_15', label: '5-15 years', description: 'Moderate age' },
      { value: 'more_15', label: 'More than 15 years', description: 'Older property' },
      { value: 'not_sure', label: 'Not sure', description: 'Unknown' }
    ]
  },
  {
    id: 'areasIncluded',
    label: 'Select Areas to be Renovated',
    type: 'multiselect',
    required: true,
    sectionTitle: 'Areas Included in Renovation',
    description: 'Choose renovation areas',
    options: [
      { value: 'living_room', label: 'Living room', description: 'Living area' },
      { value: 'bedrooms', label: 'Bedrooms', description: 'Sleeping areas' },
      { value: 'kitchen', label: 'Kitchen', description: 'Cooking area' },
      { value: 'bathrooms', label: 'Bathrooms', description: 'Bathrooms' },
      { value: 'basement', label: 'Basement', description: 'Below ground' },
      { value: 'flooring', label: 'Flooring', description: 'Floor replacement' },
      { value: 'roofing', label: 'Roofing', description: 'Roof work' },
      { value: 'electrical', label: 'Electrical', description: 'Electrical system' },
      { value: 'plumbing', label: 'Plumbing', description: 'Plumbing system' },
      { value: 'hvac', label: 'HVAC', description: 'Heating/cooling' },
      { value: 'windows_doors', label: 'Windows & doors', description: 'Windows/doors' },
      { value: 'exterior', label: 'Exterior', description: 'Outside work' },
      { value: 'entire', label: 'Entire property', description: 'Complete property' }
    ]
  },
  {
    id: 'overallCondition',
    label: 'Overall Condition',
    type: 'radio',
    required: false,
    sectionTitle: 'Existing Condition Overview',
    description: 'Current property condition',
    options: [
      { value: 'good', label: 'Good condition', description: 'Well maintained' },
      { value: 'average', label: 'Average condition', description: 'Normal wear' },
      { value: 'poor', label: 'Poor condition', description: 'Needs work' },
      { value: 'not_sure', label: 'Not sure', description: 'Need inspection' }
    ]
  },
  {
    id: 'generalExistingIssues',
    label: 'Existing Issues',
    type: 'multiselect',
    required: false,
    description: 'Current property problems',
    options: [
      { value: 'cracks', label: 'Cracks in walls', description: 'Wall damage' },
      { value: 'dampness', label: 'Dampness / leakage', description: 'Water issues' },
      { value: 'old_electrical', label: 'Old electrical wiring', description: 'Electrical problems' },
      { value: 'plumbing_issues', label: 'Plumbing issues', description: 'Plumbing problems' },
      { value: 'floor_damage', label: 'Flooring damage', description: 'Floor issues' },
      { value: 'poor_ventilation', label: 'Poor ventilation', description: 'Air circulation' },
      { value: 'poor_lighting', label: 'Poor lighting', description: 'Lighting issues' },
      { value: 'no_issues', label: 'No major issues', description: 'Good condition' }
    ]
  },
  {
    id: 'preferredDesignStyle',
    label: 'Preferred Design Style',
    type: 'radio',
    required: false,
    sectionTitle: 'Design & Style Preference',
    description: 'Overall design aesthetic',
    options: [
      { value: 'modern', label: 'Modern', description: 'Contemporary style' },
      { value: 'minimalist', label: 'Minimalist', description: 'Clean and simple' },
      { value: 'traditional', label: 'Traditional', description: 'Classic design' },
      { value: 'luxury', label: 'Luxury', description: 'High-end finish' },
      { value: 'industrial', label: 'Industrial', description: 'Urban industrial' },
      { value: 'mixed', label: 'Mix of styles', description: 'Combined styles' },
      { value: 'not_sure', label: 'Not sure', description: 'Need guidance' }
    ]
  },
  {
    id: 'structuralChanges',
    label: 'Structural Changes Required?',
    type: 'radio',
    required: false,
    sectionTitle: 'Structural Changes',
    description: 'Need structural modifications?',
    options: [
      { value: 'yes', label: 'Yes', description: 'Structural work needed' },
      { value: 'no', label: 'No', description: 'No structural changes' },
      { value: 'not_sure', label: 'Not sure', description: 'Need assessment' }
    ]
  },
  {
    id: 'comfortImprovements',
    label: 'Comfort Improvements Needed',
    type: 'multiselect',
    required: false,
    sectionTitle: 'Comfort & Functionality',
    description: 'Desired comfort upgrades',
    options: [
      { value: 'lighting', label: 'Better lighting', description: 'Improved lighting' },
      { value: 'ventilation', label: 'Better ventilation', description: 'Air circulation' },
      { value: 'noise_reduction', label: 'Noise reduction', description: 'Soundproofing' },
      { value: 'thermal', label: 'Thermal comfort', description: 'Temperature control' },
      { value: 'storage', label: 'Improved storage', description: 'More storage' }
    ]
  },
  {
    id: 'renovationApproach',
    label: 'Renovation Approach',
    type: 'radio',
    required: false,
    sectionTitle: 'Renovation Depth',
    description: 'How to approach the renovation?',
    options: [
      { value: 'one_at_time', label: 'One area at a time', description: 'Phased approach' },
      { value: 'multiple', label: 'Multiple areas together', description: 'Concurrent work' },
      { value: 'full_property', label: 'Full property at once', description: 'Complete renovation' }
    ]
  }
];

// Map renovation types to their specific questions
export const RENOVATION_QUESTIONS: Record<string, Question[]> = {
  bathroom: BATHROOM_QUESTIONS,
  kitchen: KITCHEN_QUESTIONS,
  basement: BASEMENT_QUESTIONS,
  roofing: ROOFING_QUESTIONS,
  electrical: ELECTRICAL_QUESTIONS,
  plumbing: PLUMBING_QUESTIONS,
  hvac: HVAC_QUESTIONS,
  flooring: FLOORING_QUESTIONS,
  windows_doors: WINDOWS_DOORS_QUESTIONS,
  exterior: EXTERIOR_QUESTIONS,
  general: GENERAL_QUESTIONS
};

// Removed: FINANCING_OPTIONS - Not needed anymore

// Removed: AI_CONFIG - All AI calls now go through backend

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_FORM_DATA: FinancingFormData = {
  renovationType: ''
};


// Removed: UI Constants for financing types - Not needed anymore