// Type definitions for offer analysis structured data

export type RecommendationType = 'recommended' | 'acceptable' | 'caution' | 'not_recommended';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ValueRating = 'excellent' | 'good' | 'fair' | 'poor';
export type PriceVsBudget = 'within' | 'over' | 'under';
export type CompletenessRating = 'comprehensive' | 'adequate' | 'incomplete';
export type CostBreakdownQuality = 'transparent' | 'adequate' | 'unclear';
export type PaymentTermsFairness = 'fair' | 'acceptable' | 'unfavorable';
export type ProfessionalismRating = 'high' | 'medium' | 'low';

export interface PricingAnalysis {
	summary: string;
	price_vs_budget: PriceVsBudget;
	budget_difference_eur: number;
	value_rating: ValueRating;
	cost_breakdown_quality: CostBreakdownQuality;
	unusual_line_items: string[];
	market_comparison: string;
}

export interface TimelineAssessment {
	summary: string;
	duration_realistic: boolean;
	estimated_duration_days: number;
	start_date_assessment: string;
	scheduling_risks: string[];
	seasonal_factors: string;
}

export interface ScopeAnalysis {
	completeness_rating: CompletenessRating;
	summary: string;
	included_items: string[];
	potential_gaps: string[];
	material_quality_assessment: string;
	clarifications_needed: string[];
}

export interface TermsAndConditions {
	payment_terms_summary: string;
	payment_terms_fairness: PaymentTermsFairness;
	payment_schedule_analysis: string;
	warranty_assessment: string;
	warranty_adequate: boolean;
	insurance_coverage: string;
	special_conditions_concerns: string[];
}

export interface QualityIndicators {
	professionalism_rating: ProfessionalismRating;
	offer_presentation_quality: string;
	material_brands_mentioned: string[];
	certifications_standards: string[];
	contractor_credibility_signals: string[];
}

export interface ConversationContext {
	has_conversation_updates: boolean;
	key_clarifications: string[];
	questions_answered: string[];
	concerns_addressed: string[];
	concerns_remaining: string[];
	impact_on_evaluation: string;
}

export interface AdditionalInsights {
	german_law_compliance: string[];
	market_insights: string[];
	negotiation_opportunities: string[];
	special_considerations: string[];
	notable_observations: string[];
}

export interface StructuredAnalysis {
	executive_summary: string;
	overall_score: number;
	recommendation: RecommendationType;
	recommendation_reasoning: string;
	pricing_analysis: PricingAnalysis;
	timeline_assessment: TimelineAssessment;
	scope_analysis: ScopeAnalysis;
	terms_and_conditions: TermsAndConditions;
	quality_indicators: QualityIndicators;
	conversation_context: ConversationContext;
	strengths: string[];
	weaknesses: string[];
	risk_level: RiskLevel;
	risk_factors: string[];
	key_questions: string[];
	additional_insights: AdditionalInsights;
}

// For comparison view - NEW types
export interface DecisionSummary {
	recommended_choice: string;
	decision_reasons: string[];
	main_tradeoff: string;
}

export interface ScopeComparisonItem {
	contractor_name: string;
	contractor_id: number;
	electrical_work: 'included' | 'excluded' | 'partial' | 'unclear';
	plumbing_work: 'included' | 'excluded' | 'partial' | 'unclear';
	appliances_included: 'included' | 'excluded' | 'partial' | 'unclear';
	detailed_timeline_provided: 'yes' | 'no' | 'vague';
}

export interface RiskBreakdownItem {
	level: RiskLevel;
	explanation: string;
}

export interface RiskBreakdown {
	cost_risk: RiskBreakdownItem;
	timeline_risk: RiskBreakdownItem;
	scope_risk: RiskBreakdownItem;
}

export interface ContractorComparison {
	contractor_name: string;
	contractor_id: number;
	total_price: number;
	currency: string;
	timeline_days: number;
	warranty_period: string;
	payment_terms_summary: string;
	overall_rating: number;
	price_rating: number;
	timeline_rating: number;
	quality_rating: number;
	terms_rating: number;
	strengths: string[];
	weaknesses: string[];
	risk_level: RiskLevel;
	risk_breakdown?: RiskBreakdown;
	notable_features: string[];
}

export interface DetailedComparisons {
	price_analysis: string;
	timeline_analysis: string;
	quality_analysis: string;
	terms_analysis: string;
	scope_analysis: string;
}

export interface PriceComparison {
	lowest_price_contractor: string;
	lowest_price_eur: number;
	highest_price_contractor: string;
	highest_price_eur: number;
	price_range_eur: [number, number];
	average_price_eur: number;
	best_value_contractor: string;
	value_analysis: string;
}

export interface TimelineComparison {
	fastest_contractor: string;
	fastest_days: number;
	slowest_contractor: string;
	slowest_days: number;
	most_realistic_timeline: string;
	realism_explanation: string;
}

export interface QualityComparison {
	highest_quality_contractor: string;
	quality_reasoning: string;
	material_comparison_summary: string;
	warranty_comparison_summary: string;
}

export interface RiskSummary {
	contractor_name: string;
	risk_level: RiskLevel;
	main_risks: string[];
}

export interface RiskComparison {
	lowest_risk_contractor: string;
	highest_risk_contractor: string;
	risk_summary_by_contractor: RiskSummary[];
}

export interface ScenarioRecommendations {
	lowest_cost: string;
	fastest_completion: string;
	highest_quality: string;
	best_overall_value: string;
	safest_choice: string;
	most_flexible_terms: string;
}

export interface ComparisonAdditionalInsights {
	market_context: string;
	standout_observations: string[];
	german_standards_compliance: string;
	final_considerations: string[];
}

export interface StructuredComparison {
	executive_summary: string;
	recommended_contractor: string;
	recommendation_reasoning: string;
	runner_up_contractor: string;
	runner_up_reasoning: string;
	best_value_contractor: string;
	decision_summary?: DecisionSummary;
	scope_comparison_table?: ScopeComparisonItem[];
	rating_weights_context?: string;
	comparison_matrix: ContractorComparison[];
	key_differences: string[];
	detailed_comparisons: DetailedComparisons;
	price_comparison: PriceComparison;
	timeline_comparison: TimelineComparison;
	quality_comparison: QualityComparison;
	risk_comparison: RiskComparison;
	scenario_recommendations: ScenarioRecommendations;
	trade_offs: string[];
	negotiation_opportunities: string[];
	next_steps: string[];
	additional_insights: ComparisonAdditionalInsights;
}

// Analysis response from API
export interface AnalysisData {
	offer_id: number;
	analyzed_at: string;
	context_used: string[];
	has_conversation_context: boolean;
	structured_data?: StructuredAnalysis | StructuredComparison;
	// Comparison specific fields
	primary_offer_id?: number;
	compared_offer_ids?: number[];
	comparison_count?: number;
}

export interface OfferAnalysisResponse {
	id: number;
	offer: number;
	analysis_type: 'single' | 'comparison';
	analysis_report: string; // JSON string containing StructuredAnalysis or StructuredComparison
	analysis_data: AnalysisData;
	compared_offer_ids?: number[];
	documents_used: number[];
	created_at: string;
	updated_at: string;
}
