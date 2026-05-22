/**
 * Assessment Questions Configuration
 * Expert-interview style questions for accurate cost estimation
 */

import { AssessmentStep, AssessmentQuestion } from '../types/assessment.types';

// ============================================================================
// Bathroom Renovation Assessment Steps
// ============================================================================

export const BATHROOM_ASSESSMENT_STEPS: AssessmentStep[] = [
  // Step 0: File Upload (Always First)
  {
    id: 'media_upload',
    title: 'Photo & Video',
    icon: 'camera',
    description: 'Upload images or videos of your bathroom',
    questions: [
      {
        id: 'media_files',
        category: 'VISUAL ANALYSIS',
        categoryIcon: 'video',
        text: 'Upload photos or videos of your current bathroom',
        type: 'file_upload',
        required: false,
        helperText: 'Our AI will analyze your space for more accurate estimates',
        expertHint: {
          title: 'Why upload photos?',
          content: 'Our multimodal AI can identify existing fixtures, room dimensions, condition of surfaces, and potential issues. This results in 30-40% more accurate cost estimates compared to text-only descriptions.'
        }
      }
    ]
  },

  // Step 1: Property Type
  {
    id: 'property_type',
    title: 'Property Type',
    icon: 'home',
    description: 'Tell us about your property',
    questions: [
      {
        id: 'building_type',
        category: 'PROPERTY DETAILS',
        categoryIcon: 'building',
        text: 'What type of building is your property?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'apartment', label: 'Apartment (Wohnung)', description: 'Multi-unit residential building', icon: 'apartment' },
          { value: 'house', label: 'House (Einfamilienhaus)', description: 'Single-family detached home', icon: 'house' },
          { value: 'townhouse', label: 'Townhouse (Reihenhaus)', description: 'Row house or terraced house', icon: 'townhouse' },
          { value: 'other', label: 'Other', description: 'Commercial or mixed-use', icon: 'building-alt' }
        ],
        expertHint: {
          title: 'Why does this matter?',
          content: 'Building type affects accessibility, structural constraints, and often requires coordination with building management (Hausverwaltung) for apartments.'
        }
      },
      {
        id: 'building_age',
        category: 'PROPERTY DETAILS',
        categoryIcon: 'calendar',
        text: 'When was your building constructed?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'pre_1950', label: 'Before 1950 (Altbau)', description: 'May have special requirements', icon: 'historic', costImpact: 'high' },
          { value: '1950_1980', label: '1950-1980', description: 'Post-war construction', icon: 'building', costImpact: 'medium' },
          { value: '1980_2000', label: '1980-2000', description: 'Modern construction standards', icon: 'office', costImpact: 'low' },
          { value: 'post_2000', label: 'After 2000 (Neubau)', description: 'Current building codes', icon: 'home', costImpact: 'low' },
          { value: 'unknown', label: 'Not sure', description: 'We will assume average', icon: 'help' }
        ],
        expertHint: {
          title: 'Why is building age important?',
          content: 'Older buildings (Altbau) often have lead pipes, asbestos materials, or non-standard dimensions. This can add 20-40% to renovation costs due to required remediation and custom solutions.'
        }
      }
    ]
  },

  // Step 2: Quality Level
  {
    id: 'quality_level',
    title: 'Quality Level',
    icon: 'star',
    description: 'Choose your desired quality standard',
    questions: [
      {
        id: 'quality_preference',
        category: 'QUALITY STANDARD',
        categoryIcon: 'diamond',
        text: 'What quality level are you aiming for?',
        type: 'single_choice',
        required: true,
        options: [
          {
            value: 'budget',
            label: 'Budget-Friendly',
            description: 'Functional basics, standard materials from Baumarkt',
            icon: 'wallet',
            costImpact: 'low'
          },
          {
            value: 'standard',
            label: 'Standard Quality',
            description: 'German brands (Grohe, Villeroy & Boch), good durability',
            icon: 'star',
            costImpact: 'medium'
          },
          {
            value: 'premium',
            label: 'Premium Quality',
            description: 'Designer brands (Hansgrohe, Duravit), superior finishes',
            icon: 'sparkles',
            costImpact: 'high'
          },
          {
            value: 'luxury',
            label: 'Luxury',
            description: 'High-end brands (Dornbracht, Axor), smart features',
            icon: 'crown',
            costImpact: 'high'
          }
        ],
        expertHint: {
          title: 'Quality impact on cost',
          content: 'Quality level is the biggest cost factor. Premium fixtures from German brands like Hansgrohe cost 2-3x more than budget options but last 15-25 years vs 5-10 years.'
        }
      }
    ]
  },

  // Step 3: Budget Range
  {
    id: 'budget_range',
    title: 'Budget Range',
    icon: 'euro',
    description: 'Your investment range',
    questions: [
      {
        id: 'budget_estimate',
        category: 'BUDGET PLANNING',
        categoryIcon: 'wallet',
        text: 'What is your approximate budget for this renovation?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'under_10k', label: 'Under EUR 10,000', description: 'Basic refresh, partial renovation', icon: 'money-1' },
          { value: '10k_20k', label: 'EUR 10,000 - 20,000', description: 'Standard full renovation', icon: 'money-2' },
          { value: '20k_35k', label: 'EUR 20,000 - 35,000', description: 'Premium full renovation', icon: 'money-3' },
          { value: '35k_50k', label: 'EUR 35,000 - 50,000', description: 'High-end renovation', icon: 'money-4' },
          { value: 'over_50k', label: 'Over EUR 50,000', description: 'Luxury or large bathroom', icon: 'diamond' },
          { value: 'flexible', label: 'Flexible / Not sure', description: 'Let the estimate guide me', icon: 'help' }
        ],
        expertHint: {
          title: 'Budget guidance',
          content: 'In Germany, a standard bathroom renovation (6-8 m2) typically costs EUR 15,000-25,000 for mid-range quality. This includes labor, materials, and fixtures.'
        }
      }
    ]
  },

  // Step 4: Structural Scope
  {
    id: 'structural_scope',
    title: 'Structural Scope',
    icon: 'hammer',
    description: 'What changes are needed?',
    questions: [
      {
        id: 'structural_changes',
        category: 'BUILDING STRUCTURE',
        categoryIcon: 'building',
        text: 'Does your bathroom renovation require structural changes?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'none', label: 'No structural changes', description: 'Keep existing layout', icon: 'check', costImpact: 'low' },
          { value: 'minor', label: 'Minor adjustments', description: 'Moving fixtures within existing space', icon: 'wrench', costImpact: 'medium' },
          { value: 'major', label: 'Major structural changes', description: 'Moving walls, changing layout', icon: 'building', costImpact: 'high' },
          { value: 'not_sure', label: 'Not sure', description: 'Need professional assessment', icon: 'help' }
        ],
        helperText: 'You can change this later',
        expertHint: {
          title: 'Why is this important?',
          content: 'Structural changes strongly influence cost, permits, and financing eligibility in Germany. Moving load-bearing walls requires engineering approval and can add EUR 5,000-15,000.'
        }
      },
      {
        id: 'bathroom_size',
        category: 'ROOM DIMENSIONS',
        categoryIcon: 'ruler',
        text: 'What is the approximate size of your bathroom?',
        type: 'range_slider',
        required: true,
        min: 3,
        max: 25,
        step: 0.5,
        unit: 'm2',
        defaultValue: 8,
        expertHint: {
          title: 'Size matters',
          content: 'Bathroom size directly affects tile quantity, waterproofing area, and labor hours. German average is 7-9 m2 for main bathrooms.'
        }
      }
    ]
  },

  // Step 5: Technical Systems
  {
    id: 'technical_systems',
    title: 'Technical Systems',
    icon: 'plug',
    description: 'Plumbing, electrical, heating',
    questions: [
      {
        id: 'plumbing_condition',
        category: 'PLUMBING',
        categoryIcon: 'droplet',
        text: 'What is the condition of your existing plumbing?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'good', label: 'Good condition', description: 'Modern pipes, no issues', icon: 'check', costImpact: 'low' },
          { value: 'fair', label: 'Fair condition', description: 'Some repairs needed', icon: 'wrench', costImpact: 'medium' },
          { value: 'poor', label: 'Poor / Old pipes', description: 'Full replacement recommended', icon: 'alert', costImpact: 'high' },
          { value: 'unknown', label: 'Unknown', description: 'Not visible or not sure', icon: 'help' }
        ],
        expertHint: {
          title: 'Plumbing considerations',
          content: 'Old copper or lead pipes (common in pre-1970 buildings) should be replaced. This adds EUR 2,000-5,000 but prevents future water damage and health issues.'
        }
      },
      {
        id: 'electrical_upgrade',
        category: 'ELECTRICAL',
        categoryIcon: 'zap',
        text: 'Do you need electrical upgrades?',
        type: 'multi_select',
        required: false,
        options: [
          { value: 'new_lighting', label: 'New lighting fixtures', icon: 'lightbulb' },
          { value: 'heated_floor', label: 'Electric underfloor heating', icon: 'thermometer' },
          { value: 'more_outlets', label: 'Additional power outlets', icon: 'plug' },
          { value: 'smart_features', label: 'Smart home features', icon: 'smartphone' },
          { value: 'ventilation', label: 'New ventilation fan', icon: 'wind' },
          { value: 'none', label: 'No electrical changes needed', icon: 'check' }
        ],
        expertHint: {
          title: 'Electrical in wet rooms',
          content: 'All bathroom electrical work in Germany must comply with DIN VDE 0100-701 for wet rooms. This requires IP-rated fixtures and GFCI protection.'
        }
      },
      {
        id: 'heating_preference',
        category: 'HEATING',
        categoryIcon: 'thermometer',
        text: 'What heating do you want in the bathroom?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'existing', label: 'Keep existing radiator', description: 'No changes to heating', icon: 'refresh', costImpact: 'low' },
          { value: 'towel_rail', label: 'Heated towel rail', description: 'Replace with towel radiator', icon: 'towel', costImpact: 'medium' },
          { value: 'underfloor', label: 'Underfloor heating', description: 'Electric or water-based', icon: 'thermometer', costImpact: 'high' },
          { value: 'both', label: 'Towel rail + Underfloor', description: 'Maximum comfort', icon: 'sparkles', costImpact: 'high' }
        ]
      }
    ]
  },

  // Step 6: Fixtures & Finishes
  {
    id: 'finishes',
    title: 'Finishes',
    icon: 'palette',
    description: 'Fixtures, tiles, and style',
    questions: [
      {
        id: 'fixture_selection',
        category: 'FIXTURES',
        categoryIcon: 'bath',
        text: 'Which fixtures do you want to include?',
        type: 'multi_select',
        required: true,
        options: [
          { value: 'shower', label: 'Shower', description: 'Walk-in or enclosure', icon: 'shower' },
          { value: 'bathtub', label: 'Bathtub', description: 'Built-in or freestanding', icon: 'bath' },
          { value: 'toilet', label: 'Toilet', description: 'Wall-hung or floor-mounted', icon: 'toilet' },
          { value: 'washbasin', label: 'Washbasin', description: 'Single or double', icon: 'sink' },
          { value: 'vanity', label: 'Vanity unit', description: 'Storage cabinet', icon: 'cabinet' },
          { value: 'bidet', label: 'Bidet / Shower toilet', description: 'Separate or integrated', icon: 'droplet' }
        ]
      },
      {
        id: 'tile_coverage',
        category: 'TILING',
        categoryIcon: 'grid',
        text: 'How much wall tiling do you want?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'full', label: 'Full height (floor to ceiling)', description: 'Complete tile coverage', icon: 'square-full', costImpact: 'high' },
          { value: 'three_quarter', label: 'Three-quarter height (~2m)', description: 'Tiles up to door height', icon: 'square-three-quarter', costImpact: 'medium' },
          { value: 'half', label: 'Half height (~1.2m)', description: 'Partial coverage, paint above', icon: 'square-half', costImpact: 'low' },
          { value: 'wet_areas', label: 'Wet areas only', description: 'Shower and behind basin', icon: 'droplet', costImpact: 'low' }
        ],
        expertHint: {
          title: 'Tile coverage impact',
          content: 'Full-height tiling costs 40-60% more than half-height but provides better moisture protection and is easier to maintain long-term.'
        }
      },
      {
        id: 'design_style',
        category: 'DESIGN',
        categoryIcon: 'palette',
        text: 'What design style do you prefer?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'modern', label: 'Modern Minimalist', description: 'Clean lines, neutral colors', icon: 'square' },
          { value: 'classic', label: 'Classic / Traditional', description: 'Timeless, warm tones', icon: 'columns' },
          { value: 'industrial', label: 'Industrial', description: 'Concrete, metal accents', icon: 'factory' },
          { value: 'scandinavian', label: 'Scandinavian', description: 'Light wood, white, simple', icon: 'tree' },
          { value: 'luxury', label: 'Luxury Spa', description: 'High-end, hotel-like', icon: 'sparkles' }
        ]
      }
    ]
  },

  // Step 7: Constraints
  {
    id: 'constraints',
    title: 'Constraints',
    icon: 'alert-triangle',
    description: 'Special requirements',
    questions: [
      {
        id: 'accessibility_needs',
        category: 'ACCESSIBILITY',
        categoryIcon: 'accessibility',
        text: 'Do you need accessibility features?',
        type: 'multi_select',
        required: false,
        options: [
          { value: 'grab_bars', label: 'Grab bars / handrails', icon: 'grip' },
          { value: 'walk_in_shower', label: 'Barrier-free walk-in shower', icon: 'shower' },
          { value: 'raised_toilet', label: 'Raised toilet seat', icon: 'toilet' },
          { value: 'wide_door', label: 'Wider door opening', icon: 'door' },
          { value: 'none', label: 'No accessibility needs', icon: 'check' }
        ],
        expertHint: {
          title: 'KfW Funding',
          content: 'Accessibility features may qualify for KfW 159 "Age-appropriate Conversion" grants up to EUR 6,250 or low-interest loans up to EUR 50,000.'
        }
      },
      {
        id: 'timeline',
        category: 'TIMELINE',
        categoryIcon: 'calendar',
        text: 'When do you want to complete this renovation?',
        type: 'single_choice',
        required: true,
        options: [
          { value: 'asap', label: 'As soon as possible', description: 'Within 1-2 months', icon: 'zap' },
          { value: '3_months', label: 'Within 3 months', description: 'Standard timeline', icon: 'calendar' },
          { value: '6_months', label: 'Within 6 months', description: 'Flexible planning', icon: 'calendar-range' },
          { value: 'flexible', label: 'Flexible / Planning phase', description: 'No rush', icon: 'help' }
        ]
      },
      {
        id: 'special_requirements',
        category: 'SPECIAL NOTES',
        categoryIcon: 'note',
        text: 'Any special requirements or concerns?',
        type: 'text_input',
        required: false,
        placeholder: 'E.g., noise restrictions, specific brands, allergies to materials...',
        helperText: 'Optional - helps us tailor the estimate'
      }
    ]
  },

  // Step 8: Summary (Final)
  {
    id: 'summary',
    title: 'Summary',
    icon: 'check-circle',
    description: 'Review and generate estimate',
    questions: [
      {
        id: 'confidence_overall',
        category: 'CONFIDENCE CHECK',
        categoryIcon: 'target',
        text: 'How confident are you in the information provided?',
        type: 'confidence',
        required: true,
        expertHint: {
          title: 'Accuracy note',
          content: 'Your confidence level helps us adjust the contingency buffer in the estimate. Less certain answers may result in a higher recommended buffer.'
        }
      }
    ]
  }
];

// ============================================================================
// Get Steps for Renovation Type
// ============================================================================

export const getAssessmentSteps = (renovationType: string): AssessmentStep[] => {
  switch (renovationType) {
    case 'bathroom':
      return BATHROOM_ASSESSMENT_STEPS;
    // Add other renovation types here
    default:
      return BATHROOM_ASSESSMENT_STEPS;
  }
};

// ============================================================================
// Progress Items Generator
// ============================================================================

export const generateProgressItems = (
  steps: AssessmentStep[],
  currentStepIndex: number
): { id: string; label: string; icon: string; status: 'completed' | 'current' | 'upcoming' }[] => {
  return steps.map((step, index) => ({
    id: step.id,
    label: step.title,
    icon: step.icon,
    status: index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'current' : 'upcoming'
  }));
};
