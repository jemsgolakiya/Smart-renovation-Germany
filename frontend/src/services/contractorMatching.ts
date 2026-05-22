/**
 * Contractor Matching Service
 * Handles Gemini API integration for enrichment and ranking
 */

import { apiRequest } from './http';
import {
  ContractorProfile,
  GeminiEnrichment,
  RiskFlag,
  CoverageGuidance,
  PlanData,
  ContractorRole,
} from '../types/contractorMatching.types';

// ==================== Gemini Enrichment ====================

/**
 * Enrich contractor data using Gemini AI
 * Input: Raw contractor text data
 * Output: Structured tags, normalized attributes, confidence scores
 */
export async function enrichContractorData(
  contractor: ContractorProfile
): Promise<GeminiEnrichment> {
  try {
    const response = await apiRequest<GeminiEnrichment>('/contracting/enrich-contractor/', {
      method: 'POST',
      body: JSON.stringify({
        contractor_id: contractor.id,
        services: contractor.services,
        specializations: contractor.specializations,
        description: contractor.description,
        additional_info: contractor.additional_info,
      }),
    });

    return response;
  } catch (error) {
    console.error('Gemini enrichment failed:', error);
    // Fallback: return default enrichment
    return {
      tags: [],
      confidence: 0,
      trade_tags: [],
      service_area_normalized: [],
      specialties: [],
    };
  }
}

/**
 * Generate "Why this match" explanation using Gemini
 * Max 140 characters
 */
export async function generateWhyMatch(
  contractor: ContractorProfile,
  planData: PlanData,
  activeRole: ContractorRole
): Promise<string> {
  try {
    const response = await apiRequest<{ whyMatch: string }>('/contracting/generate-why-match/', {
      method: 'POST',
      body: JSON.stringify({
        contractor_id: contractor.id,
        contractor_summary: {
          name: contractor.name,
          distance_km: contractor.distance_km,
          years_in_business: contractor.years_in_business,
          rating: contractor.rating,
          kfw_eligible: contractor.kfw_eligible,
          signals: contractor.signals,
        },
        plan_summary: {
          complexity_level: planData.project_summary.complexity_level,
          funding_readiness: planData.project_summary.funding_readiness,
          total_duration: planData.project_summary.total_duration,
        },
        active_role: activeRole,
      }),
    });

    return response.whyMatch;
  } catch (error) {
    console.error('Why-match generation failed:', error);
    // Fallback: generate simple match text
    const parts: string[] = [];
    if (contractor.distance_km && contractor.distance_km <= 25) {
      parts.push(`${Number(contractor.distance_km).toFixed(1)}km away`);
    }
    if (contractor.years_in_business && contractor.years_in_business >= 10) {
      parts.push(`${contractor.years_in_business}y experience`);
    }
    if (contractor.rating && contractor.rating >= 4.5) {
      parts.push(`${contractor.rating}★`);
    }
    return parts.join(' | ') || 'Good match';
  }
}

/**
 * Generate risk flags using Gemini
 */
export async function generateRiskFlagsAI(
  contractor: ContractorProfile
): Promise<RiskFlag[]> {
  try {
    const response = await apiRequest<{ flags: RiskFlag[] }>('/contracting/generate-risk-flags/', {
      method: 'POST',
      body: JSON.stringify({
        contractor_id: contractor.id,
        profile: {
          insurance_stated: contractor.signals?.insurance_stated,
          hwk_listed: contractor.signals?.hwk_listed,
          has_rating: contractor.rating !== null,
          reviews_count: contractor.reviews_count,
          has_contact_info: !!(contractor.phone && contractor.email),
          availability_date: contractor.signals?.availability_date,
        },
      }),
    });

    return response.flags;
  } catch (error) {
    console.error('Risk flags generation failed:', error);
    // Fallback: return empty array
    return [];
  }
}

/**
 * Generate coverage guidance using Gemini
 */
export async function generateCoverageGuidance(
  planData: PlanData,
  requiredRoles: ContractorRole[],
  shortlistCounts: Record<ContractorRole, number>
): Promise<CoverageGuidance> {
  try {
    const response = await apiRequest<CoverageGuidance>('/contracting/generate-coverage-guidance/', {
      method: 'POST',
      body: JSON.stringify({
        plan_summary: {
          complexity_level: planData.project_summary.complexity_level,
          phases: planData.phases.map(p => ({
            id: p.id,
            title: p.title,
            tasks: p.tasks,
            stakeholders: p.stakeholders,
          })),
        },
        required_roles: requiredRoles,
        shortlist_counts: shortlistCounts,
      }),
    });

    return response;
  } catch (error) {
    console.error('Coverage guidance generation failed:', error);
    // Fallback: return basic guidance
    const roles_coverage: any = {};
    requiredRoles.forEach(role => {
      const count = shortlistCounts[role] || 0;
      const target = 3;
      roles_coverage[role] = {
        shortlisted: count,
        target,
        status: count === 0 ? 'empty' : count < target ? 'partial' : 'complete',
      };
    });

    return {
      overall_progress: 0,
      roles_coverage,
      recommendations: [],
    };
  }
}

// ==================== Mock Data (for MVP) ====================

/**
 * Generate mock German contractor data for testing
 */
export function generateMockContractors(role: ContractorRole, count: number = 12): ContractorProfile[] {
  const mockContractors: ContractorProfile[] = [];

  const germanCities = ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund'];
  const states = ['Berlin', 'Hamburg', 'Bavaria', 'North Rhine-Westphalia', 'Hesse', 'Baden-Württemberg'];

  const roleSpecifics: Record<ContractorRole, { prefix: string; services: string; specs: string }> = {
    'SHK': {
      prefix: 'Sanitär & Heizung',
      services: 'Plumbing, Heating, Climate control, Bathroom renovation',
      specs: 'Bathroom renovation specialist, Heating system installation, Solar thermal systems',
    },
    'Electrician': {
      prefix: 'Elektro',
      services: 'Electrical installations, Lighting, Smart home, Photovoltaics',
      specs: 'Smart home installation, Solar panel systems, Industrial electrical work',
    },
    'Tiler': {
      prefix: 'Fliesen',
      services: 'Floor tiling, Wall tiling, Bathroom tiling, Natural stone',
      specs: 'Natural stone specialist, Large-format tiles, Mosaic work',
    },
    'Painter': {
      prefix: 'Maler',
      services: 'Interior painting, Exterior painting, Wallpapering, Facade work',
      specs: 'Historical building restoration, Special coatings, Facade renovation',
    },
    'Carpenter': {
      prefix: 'Tischler',
      services: 'Custom carpentry, Window installation, Door installation, Furniture',
      specs: 'Window restoration, Custom furniture, Wooden stairs',
    },
    'Mason': {
      prefix: 'Maurer',
      services: 'Masonry, Brickwork, Plastering, Concrete work',
      specs: 'Historical masonry, Facade renovation, Foundation work',
    },
    'Roofer': {
      prefix: 'Dachdecker',
      services: 'Roofing, Roof repair, Insulation, Solar installation',
      specs: 'Flat roof specialist, Historical roof restoration, Green roofs',
    },
    'Demolition': {
      prefix: 'Abbruch',
      services: 'Demolition, Dismantling, Disposal, Site clearance',
      specs: 'Selective demolition, Hazardous material removal, Recycling',
    },
    'General Contractor': {
      prefix: 'Generalunternehmer',
      services: 'Full renovation, Project management, All trades coordination',
      specs: 'Complete renovation projects, Historic buildings, Energy efficiency',
    },
    'Architect': {
      prefix: 'Architekturbüro',
      services: 'Architectural design, Planning, Permit management',
      specs: 'Residential architecture, Historic preservation, Sustainable design',
    },
    'Engineer': {
      prefix: 'Ingenieurbüro',
      services: 'Structural engineering, Building physics, Energy consulting',
      specs: 'Structural analysis, Energy certificates, Building permits',
    },
    'Energy Consultant': {
      prefix: 'Energieberatung',
      services: 'Energy audits, Subsidy advice, Efficiency planning',
      specs: 'KfW subsidies, Energy certificates, Renovation roadmaps',
    },
  };

  const specific = roleSpecifics[role] || roleSpecifics['General Contractor'];

  for (let i = 0; i < count; i++) {
    const city = germanCities[i % germanCities.length];
    const state = states[i % states.length];
    const yearsInBusiness = Math.floor(Math.random() * 40) + 3;
    const rating = Math.random() > 0.2 ? (Math.random() * 1.5 + 3.5) : null;
    const reviewsCount = rating ? Math.floor(Math.random() * 150) + 5 : 0;
    const uniqueId = 10000 + Math.floor(Math.random() * 90000); // Generate unique ID

    mockContractors.push({
      id: uniqueId,
      name: `${specific.prefix} ${['Müller', 'Schmidt', 'Weber', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch'][i % 8]} ${city}`,
      address: `Musterstraße ${i + 1}`,
      city,
      postal_code: `${10000 + Math.floor(Math.random() * 90000)}`,
      state,
      phone: `+49 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000000) + 1000000}`,
      website: `www.${specific.prefix.toLowerCase().replace(/\s/g, '')}-${i}.de`,
      email: `info@${specific.prefix.toLowerCase().replace(/\s/g, '')}-${i}.de`,
      price_range: ['€€', '€€€', '€€-€€€'][Math.floor(Math.random() * 3)],
      service_area: `${city} and surrounding area (${Math.floor(Math.random() * 50) + 30} km radius)`,
      business_size: ['Small (1-5 employees)', 'Medium (6-20 employees)', 'Large (20+ employees)'][Math.floor(Math.random() * 3)],
      years_in_business: yearsInBusiness,
      services: specific.services,
      description: `Professional ${role} services in ${city}. ${yearsInBusiness} years of experience.`,
      specializations: specific.specs,
      rating,
      reviews_count: reviewsCount,
      certifications: Math.random() > 0.5 ? 'HWK certified, ISO 9001' : '',
      kfw_eligible: Math.random() > 0.4,
      source: 'Mock Data (MVP)',
      additional_info: '',
      project_types: role,
      distance_km: Math.random() * 80 + 5,
      signals: {
        insurance_stated: Math.random() > 0.3,
        hwk_listed: Math.random() > 0.4,
        kfw_certified: Math.random() > 0.5,
        altbau_experience: Math.random() > 0.5,
        denkmal_experience: Math.random() > 0.7,
        languages: ['German', ...(Math.random() > 0.6 ? ['English'] : [])],
      },
    });
  }

  return mockContractors;
}
