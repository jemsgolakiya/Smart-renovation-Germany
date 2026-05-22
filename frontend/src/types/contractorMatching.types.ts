/**
 * Type definitions for the Contractor Matching Screen
 * Based on the specification for Germany-aware contractor selection
 */

// ==================== PlanData Types ====================

export interface ProjectSummary {
  total_estimated_cost: string;
  total_duration: string;
  funding_readiness: 'Good Match' | 'Partial Match' | 'Needs Review';
  complexity_level: 'Low' | 'Medium' | 'High';
  key_considerations: string[];
}

export interface PhaseTask {
  task_name: string;
  estimated_time: string;
  estimated_cost: string;
  required_by: string;
}

export interface Phase {
  id: number;
  title: string;
  icon: string;
  duration: string;
  cost: string;
  status: 'ready' | 'pending';
  color: string;
  tasks: PhaseTask[];
  required_documents: string[];
  stakeholders: string[];
}

export interface GanttTask {
  id: number;
  name: string;
  start: number;
  duration: number;
  color: string;
}

export interface Permit {
  id: string;
  name: string;
  description: string;
  checked: boolean;
}

export interface Stakeholder {
  name: string;
  role: string;
  when_needed: string;
  estimated_cost: string;
  how_to_find: string;
}

export interface PlanData {
  project_summary: ProjectSummary;
  phases: Phase[];
  gantt_chart: GanttTask[];
  permits: Permit[];
  stakeholders: Stakeholder[];
  ai_suggestions: string[];
}

// ==================== Contractor Types ====================

export interface ContractorSignals {
  insurance_stated: boolean | null;
  hwk_listed: boolean | null;
  kfw_certified: boolean | null;
  meisterbetrieb?: boolean | null;  // Master craftsman business
  hwk_chamber?: string | null;      // HWK chamber name
  confidence?: 'high' | 'medium' | 'low';  // Certification confidence level
  certification_reasoning?: string;  // Brief explanation of certification status
  altbau_experience: boolean | null;
  denkmal_experience: boolean | null;
  languages: string[];
  contract_preference?: 'VOB/B' | 'BGB';
  service_area_km?: number;
  availability_date?: string;
  business_size?: string;
}

export interface GeminiEnrichment {
  tags: string[];
  confidence: number;
  trade_tags?: string[];
  service_area_normalized?: string[];
  specialties?: string[];
}

export interface RiskFlag {
  type: 'warning' | 'error' | 'info';
  message: string;
  confidence: number;
}

export interface MatchScoreBreakdown {
  relevance: number;
  distance: number;
  quality: number;
}

export interface MatchScore {
  total: number;
  breakdown: MatchScoreBreakdown;
  explanation: string;
  whyMatch: string; // Max 140 chars
}

export interface ContractorProfile {
  id?: number; // Optional - for database contractors
  place_id?: string; // Optional - for Google Places contractors
  name: string;
  address: string;
  city: string;
  postal_code: string;
  state: string;
  phone: string;
  website: string;
  email: string;
  price_range: string;
  service_area: string;
  business_size: string;
  years_in_business: number | null;
  services: string;
  description: string;
  specializations: string;
  rating: number | null;
  reviews_count: number;
  certifications: string;
  kfw_eligible: boolean;
  source: string;
  additional_info: string;
  project_types: string;
  
  // Extended fields for matching
  distance_km?: number;
  latitude?: number;
  longitude?: number;
  signals?: ContractorSignals;
  enrichment?: GeminiEnrichment;
  matchScore?: MatchScore;
  riskFlags?: RiskFlag[];
  ai_description?: string; // AI-generated short description
}

// ==================== Role Types ====================

export type ContractorRole = 
  | 'SHK' // Sanitär-Heizung-Klima (Plumber/Heating)
  | 'Electrician'
  | 'Tiler'
  | 'Painter'
  | 'Carpenter'
  | 'Mason'
  | 'Roofer'
  | 'Demolition'
  | 'General Contractor'
  | 'Architect'
  | 'Engineer'
  | 'Energy Consultant';

export interface Role {
  key: ContractorRole;
  label: string;
  required: boolean;
  target_count: number; // Target shortlist count (typically 3-5)
}

// ==================== Filter Types ====================

export interface LocationFilters {
  radius_km: number;
  service_areas: string[];
}

export interface AvailabilityFilters {
  available_from?: string;
  can_start_within_4_weeks: boolean;
}

export type TernaryFilter = 'yes' | 'unknown' | 'either';

export interface QualificationFilters {
  insurance_stated: TernaryFilter;
  hwk_listed: TernaryFilter;
  kfw_certified: TernaryFilter;
}

export interface ExperienceFilters {
  altbau_experience: TernaryFilter;
  denkmal_experience: TernaryFilter;
  min_years_in_business: number;
}

export interface ContractPreferenceFilters {
  contract_type?: 'VOB/B' | 'BGB' | 'either';
}

export interface LanguageFilters {
  languages: string[];
}

export interface FilterState {
  location: LocationFilters;
  availability: AvailabilityFilters;
  qualifications: QualificationFilters;
  experience: ExperienceFilters;
  contract_preference: ContractPreferenceFilters;
  languages: LanguageFilters;
}

// ==================== Sort Types ====================

export type SortOption = 
  | 'best_match'
  | 'distance'
  | 'rating'
  | 'years_in_business'
  | 'availability';

// ==================== Shortlist Types ====================

export interface ShortlistItem {
  contractor: ContractorProfile;
  role: ContractorRole;
  added_at: string;
}

export interface ShortlistState {
  items: ShortlistItem[];
  counts_by_role: Record<ContractorRole, number>;
}

// ==================== Compare Types ====================

export interface CompareRow {
  field: string;
  label: string;
  values: (string | number | boolean | null)[];
  highlight_differences: boolean;
}

// ==================== UI State Types ====================

export type ViewMode = 'grid' | 'list';

export interface GuidanceRecommendation {
  type: 'info' | 'warning' | 'success';
  message: string;
  role?: ContractorRole;
}

export interface CoverageGuidance {
  overall_progress: number; // 0-100%
  roles_coverage: Record<ContractorRole, {
    shortlisted: number;
    target: number;
    status: 'empty' | 'partial' | 'complete' | 'over';
  }>;
  recommendations: GuidanceRecommendation[];
}
