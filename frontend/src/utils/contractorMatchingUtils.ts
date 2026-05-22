/**
 * Utility functions for Contractor Matching Screen
 * Handles role derivation, filtering, ranking, and other business logic
 */

import {
  ContractorRole,
  Role,
  PlanData,
  ContractorProfile,
  FilterState,
  MatchScore,
  MatchScoreBreakdown,
  RiskFlag,
  TernaryFilter
} from '../types/contractorMatching.types';

// ==================== Role Mapping ====================

/**
 * Maps stakeholder roles and task descriptions to contractor roles
 */
export const ROLE_MAPPING: Record<string, ContractorRole> = {
  // Direct mappings
  'Plumber': 'SHK',
  'Heater': 'SHK',
  'Heating Installer': 'SHK',
  'HVAC': 'SHK',
  'Electrician': 'Electrician',
  'Electrical Contractor': 'Electrician',
  'Tiler': 'Tiler',
  'Tile Setter': 'Tiler',
  'Painter': 'Painter',
  'Carpenter': 'Carpenter',
  'Joiner': 'Carpenter',
  'Mason': 'Mason',
  'Bricklayer': 'Mason',
  'Roofer': 'Roofer',
  'Demolition': 'Demolition',
  'General Contractor': 'General Contractor',
  'GC': 'General Contractor',
  'Architect': 'Architect',
  'Engineer': 'Engineer',
  'Structural Engineer': 'Engineer',
  'Energy Consultant': 'Energy Consultant',
  
  // Task-based mappings (lowercase for fuzzy matching)
  'bathroom': 'SHK',
  'heating': 'SHK',
  'plumbing': 'SHK',
  'water': 'SHK',
  'sanitary': 'SHK',
  'electrical': 'Electrician',
  'wiring': 'Electrician',
  'lighting': 'Electrician',
  'tiling': 'Tiler',
  'tiles': 'Tiler',
  'flooring': 'Tiler',
  'painting': 'Painter',
  'carpentry': 'Carpenter',
  'windows': 'Carpenter',
  'doors': 'Carpenter',
  'masonry': 'Mason',
  'walls': 'Mason',
  'roofing': 'Roofer',
  'demolition': 'Demolition',
};

/**
 * Default role labels for UI display
 */
export const ROLE_LABELS: Record<ContractorRole, string> = {
  'SHK': 'Plumber/Heating (SHK)',
  'Electrician': 'Electrician',
  'Tiler': 'Tiler',
  'Painter': 'Painter',
  'Carpenter': 'Carpenter',
  'Mason': 'Mason',
  'Roofer': 'Roofer',
  'Demolition': 'Demolition',
  'General Contractor': 'General Contractor',
  'Architect': 'Architect',
  'Engineer': 'Engineer',
  'Energy Consultant': 'Energy Consultant',
};

/**
 * Derive required contractor roles from PlanData
 * Uses both stakeholders and Phase 5 (Implementation) tasks
 */
export function deriveRequiredRoles(planData: PlanData | null): Role[] {
  if (!planData) return [];

  const rolesSet = new Set<ContractorRole>();

  // Extract from stakeholders
  planData.stakeholders?.forEach((stakeholder) => {
    const role = mapToContractorRole(stakeholder.role);
    if (role) rolesSet.add(role);
  });

  // Extract from Phase 5 (Implementation) tasks
  const implementationPhase = planData.phases?.find(p => p.id === 5);
  if (implementationPhase?.tasks) {
    implementationPhase.tasks.forEach((task) => {
      const roles = extractRolesFromTask(task.task_name);
      roles.forEach(role => rolesSet.add(role));
    });
  }

  // Convert to Role objects
  return Array.from(rolesSet).map(key => ({
    key,
    label: ROLE_LABELS[key],
    required: true,
    target_count: 3, // Default target: 3-5 contractors per role
  }));
}

/**
 * Maps a string to a ContractorRole using fuzzy matching
 */
function mapToContractorRole(text: string): ContractorRole | null {
  if (!text) return null;

  // Try direct mapping first (case-insensitive)
  const directMatch = Object.entries(ROLE_MAPPING).find(
    ([key]) => key.toLowerCase() === text.toLowerCase()
  );
  if (directMatch) return directMatch[1];

  // Try fuzzy matching
  const lowerText = text.toLowerCase();
  for (const [key, role] of Object.entries(ROLE_MAPPING)) {
    if (lowerText.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerText)) {
      return role;
    }
  }

  return null;
}

/**
 * Extracts contractor roles from task descriptions
 */
function extractRolesFromTask(taskName: string): ContractorRole[] {
  const roles: ContractorRole[] = [];
  const lowerTask = taskName.toLowerCase();

  // Check for keywords
  for (const [keyword, role] of Object.entries(ROLE_MAPPING)) {
    if (lowerTask.includes(keyword.toLowerCase())) {
      if (!roles.includes(role)) {
        roles.push(role);
      }
    }
  }

  // Special case: "bathroom renovation" implies both SHK and Tiler
  if (lowerTask.includes('bathroom')) {
    if (!roles.includes('SHK')) roles.push('SHK');
    if (!roles.includes('Tiler')) roles.push('Tiler');
  }

  return roles;
}

// ==================== Filtering ====================

/**
 * Apply filters to contractor list
 */
export function applyFilters(
  contractors: ContractorProfile[],
  filters: FilterState
): ContractorProfile[] {
  return contractors.filter(contractor => {
    // Location filter
    if (contractor.distance_km !== undefined) {
      if (contractor.distance_km > filters.location.radius_km) {
        return false;
      }
    }

    // Qualifications filters
    if (!matchesTernaryFilter(
      contractor.signals?.insurance_stated,
      filters.qualifications.insurance_stated
    )) {
      return false;
    }

    if (!matchesTernaryFilter(
      contractor.signals?.hwk_listed,
      filters.qualifications.hwk_listed
    )) {
      return false;
    }

    if (!matchesTernaryFilter(
      contractor.signals?.kfw_certified,
      filters.qualifications.kfw_certified
    )) {
      return false;
    }

    // Experience filters
    if (!matchesTernaryFilter(
      contractor.signals?.altbau_experience,
      filters.experience.altbau_experience
    )) {
      return false;
    }

    if (!matchesTernaryFilter(
      contractor.signals?.denkmal_experience,
      filters.experience.denkmal_experience
    )) {
      return false;
    }

    if (contractor.years_in_business !== null) {
      if (contractor.years_in_business < filters.experience.min_years_in_business) {
        return false;
      }
    }

    // Language filter
    if (filters.languages.languages.length > 0) {
      const contractorLanguages = contractor.signals?.languages || [];
      const hasMatchingLanguage = filters.languages.languages.some(
        lang => contractorLanguages.includes(lang)
      );
      if (!hasMatchingLanguage && contractorLanguages.length > 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Helper to match ternary filters
 */
function matchesTernaryFilter(
  value: boolean | null | undefined,
  filter: TernaryFilter
): boolean {
  if (filter === 'either') return true;
  if (filter === 'yes') return value === true;
  if (filter === 'unknown') return value === undefined || value === null || value === false;
  return true;
}

// ==================== Ranking ====================

/**
 * Calculate match score for a contractor based on PlanData
 */
export function calculateMatchScore(
  contractor: ContractorProfile,
  planData: PlanData | null,
  activeRole: ContractorRole
): MatchScore {
  const breakdown: MatchScoreBreakdown = {
    relevance: calculateRelevanceScore(contractor, planData, activeRole),
    distance: calculateDistanceScore(contractor),
    quality: calculateQualityScore(contractor),
  };

  // Weighted total (out of 100)
  const total = Math.round(
    breakdown.relevance * 0.35 +
    breakdown.distance * 0.25 +
    breakdown.quality * 0.25
  );

  return {
    total,
    breakdown,
    explanation: generateMatchExplanation(breakdown, contractor),
    whyMatch: generateWhyMatch(contractor, planData, activeRole),
  };
}

/**
 * Calculate relevance score based on role match and specializations
 */
function calculateRelevanceScore(
  contractor: ContractorProfile,
  planData: PlanData | null,
  activeRole: ContractorRole
): number {
  let score = 60; // Base score

  // Check specializations
  const specs = contractor.specializations?.toLowerCase() || '';
  const services = contractor.services?.toLowerCase() || '';

  // Role-specific keywords
  const roleKeywords: Record<ContractorRole, string[]> = {
    'SHK': ['heating', 'plumbing', 'sanitary', 'bathroom', 'hvac', 'shk'],
    'Electrician': ['electrical', 'electric', 'wiring', 'lighting'],
    'Tiler': ['tile', 'tiling', 'floor', 'ceramic'],
    'Painter': ['painting', 'paint', 'decorating'],
    'Carpenter': ['carpentry', 'carpenter', 'joinery', 'woodwork'],
    'Mason': ['masonry', 'mason', 'brick', 'stone'],
    'Roofer': ['roofing', 'roofer', 'roof'],
    'Demolition': ['demolition', 'demolish', 'removal'],
    'General Contractor': ['general', 'renovation', 'contracting'],
    'Architect': ['architect', 'design', 'planning'],
    'Engineer': ['engineer', 'structural', 'technical'],
    'Energy Consultant': ['energy', 'consultant', 'efficiency'],
  };

  const keywords = roleKeywords[activeRole] || [];
  const matchCount = keywords.filter(
    kw => specs.includes(kw) || services.includes(kw)
  ).length;

  score += matchCount * 8; // +8 per keyword match

  // KfW bonus if funding is good match
  if (planData?.project_summary.funding_readiness === 'Good Match' && contractor.kfw_eligible) {
    score += 10;
  }

  // Experience bonuses
  if (contractor.signals?.altbau_experience && planData?.project_summary.complexity_level !== 'Low') {
    score += 5;
  }

  if (contractor.signals?.denkmal_experience) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * Calculate distance score (closer is better)
 */
function calculateDistanceScore(contractor: ContractorProfile): number {
  if (contractor.distance_km === undefined) return 50;

  if (contractor.distance_km <= 10) return 100;
  if (contractor.distance_km <= 25) return 85;
  if (contractor.distance_km <= 50) return 70;
  if (contractor.distance_km <= 75) return 50;
  return 30;
}

/**
 * Calculate quality score based on ratings, certifications, etc.
 */
function calculateQualityScore(contractor: ContractorProfile): number {
  let score = 50;

  // Rating bonus
  if (contractor.rating !== null) {
    score += (contractor.rating / 5) * 30; // Max +30 for 5-star rating
  }

  // Reviews count bonus (capped at +10)
  if (contractor.reviews_count > 0) {
    score += Math.min(10, contractor.reviews_count / 2);
  }

  // Years in business bonus
  if (contractor.years_in_business !== null) {
    score += Math.min(15, contractor.years_in_business / 2);
  }

  // Certification bonus
  if (contractor.signals?.insurance_stated) score += 10;
  if (contractor.signals?.hwk_listed) score += 10;

  return Math.min(100, score);
}

/**
 * Generate match explanation text
 */
function generateMatchExplanation(
  breakdown: MatchScoreBreakdown,
  contractor: ContractorProfile
): string {
  const parts: string[] = [];

  if (breakdown.relevance >= 80) parts.push('Highly relevant specialization');
  if (breakdown.distance >= 80) parts.push('Very close to project');
  if (breakdown.quality >= 80) parts.push('Excellent credentials');
  if (contractor.kfw_eligible) parts.push('KfW-certified');

  return parts.join(' • ') || 'Good general match';
}

/**
 * Generate "Why this match" text (max 140 chars)
 */
function generateWhyMatch(
  contractor: ContractorProfile,
  planData: PlanData | null,
  activeRole: ContractorRole
): string {
  // Not used anymore - kept for compatibility
  return '';
}

/**
 * Generate risk flags for a contractor
 * Only show ACTUAL risks, not just unknown/unverified information
 */
export function generateRiskFlags(contractor: ContractorProfile): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Only flag if explicitly FALSE (not just null/unknown)
  if (contractor.signals?.insurance_stated === false) {
    flags.push({
      type: 'warning',
      message: 'No insurance stated',
      confidence: 0.8,
    });
  }

  // Missing critical contact information (actual problem)
  if (!contractor.email) {
    flags.push({
      type: 'error',
      message: 'No email address',
      confidence: 0.95,
    });
  }

  if (!contractor.phone) {
    flags.push({
      type: 'warning',
      message: 'No phone number',
      confidence: 0.9,
    });
  }

  // Very low rating is a real concern
  if (contractor.rating && contractor.rating < 3.0) {
    flags.push({
      type: 'warning',
      message: `Low rating (${Number(contractor.rating).toFixed(1)}★)`,
      confidence: 0.9,
    });
  }

  // Large distance might be an issue
  if (contractor.distance_km && contractor.distance_km > 50) {
    flags.push({
      type: 'info',
      message: `Far away (${contractor.distance_km.toFixed(0)}km)`,
      confidence: 0.7,
    });
  }

  // Very low confidence in certification data
  if (contractor.signals?.confidence === 'low' && 
      !contractor.signals?.hwk_listed && 
      !contractor.signals?.meisterbetrieb &&
      !contractor.signals?.kfw_certified) {
    flags.push({
      type: 'info',
      message: 'Limited verification data',
      confidence: 0.6,
    });
  }

  return flags;
}

// ==================== Sorting ====================

/**
 * Sort contractors by the selected sort option
 */
export function sortContractors(
  contractors: ContractorProfile[],
  sortBy: string
): ContractorProfile[] {
  const sorted = [...contractors];

  switch (sortBy) {
    case 'best_match':
      sorted.sort((a, b) => (b.matchScore?.total || 0) - (a.matchScore?.total || 0));
      break;
    case 'distance':
      sorted.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
      break;
    case 'rating':
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'years_in_business':
      sorted.sort((a, b) => (b.years_in_business || 0) - (a.years_in_business || 0));
      break;
  }

  return sorted;
}

// ==================== Default Filters ====================

/**
 * Get default filters from PlanData
 */
export function getDefaultFilters(planData: PlanData | null): FilterState {
  return {
    location: {
      radius_km: 50, // Default 50km radius
      service_areas: [],
    },
    availability: {
      can_start_within_4_weeks: false,
    },
    qualifications: {
      // Set to 'either' by default to not filter out Google Places results
      // which don't have this information
      insurance_stated: 'either',
      hwk_listed: 'either',
      kfw_certified: 'either',
    },
    experience: {
      altbau_experience: 'either',
      denkmal_experience: 'either',
      min_years_in_business: 0,
    },
    contract_preference: {
      contract_type: 'either',
    },
    languages: {
      languages: [],
    },
  };
}
