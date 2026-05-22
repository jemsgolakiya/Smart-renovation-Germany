// Type definitions for the Offer Comparison Dashboard

export interface ComparisonOffer {
	id: number;
	contractorId: number;
	contractorName: string;
	totalPrice: number;
	currency: string;
	timeline: {
		startDate?: string;
		endDate?: string;
		durationDays?: number;
	};
	warranty: {
		period?: string;
		details: string;
	};
	paymentTerms: string;
	paymentSchedule: Array<{
		milestone: string;
		amount: number;
		percentage: number;
	}>;
	breakdown: {
		labor: number;
		materials: number;
		other: number;
		vat: number;
	};
	scopeOfWork: string;
	materialsIncluded: string[];
	insurance: string;
	specialConditions: string;
	offerDate?: string;
	validUntil?: string;
	riskScore: number; // 0-100, lower is better
	extractedData: any;
}

export interface ScoringMetrics {
	priceFairness: number; // 0-100
	warrantyStrength: number; // 0-100
	scopeCompleteness: number; // 0-100
	timelineRealism: number; // 0-100
	legalCompliance: number; // 0-100
	transparency: number; // 0-100
	totalScore: number; // 0-100
}

export interface OfferScoring {
	[offerId: number]: ScoringMetrics;
}

export interface MissingItem {
	id: string;
	type: 'warning' | 'error' | 'info';
	message: string;
	offerId?: number;
	contractorName?: string;
}

export interface AIInsight {
	summary: string;
	recommendation: {
		recommendedOfferId: number;
		reasoning: string;
		runnerUpId?: number;
		runnerUpReason?: string;
	};
	highlights: Array<{
		offerId: number;
		badge: string;
		type: 'success' | 'warning' | 'info';
	}>;
	missingItems: MissingItem[];
	detailedComparisons: {
		pricing: string;
		timeline: string;
		warranty: string;
		scope: string;
		safety: string;
		included: string;
		redFlags: string;
	};
}

export interface ComparisonData {
	offers: ComparisonOffer[];
	scoring: OfferScoring;
	aiInsights: AIInsight;
	lastUpdated: string;
}

// Utility type conversions
export function convertOfferToComparisonOffer(offer: any): ComparisonOffer {
	return {
		id: offer.id,
		contractorId: offer.contractor_id,
		contractorName: offer.contractor_name || `Contractor ${offer.contractor_id}`,
		totalPrice: offer.total_price || 0,
		currency: offer.currency || 'EUR',
		timeline: {
			startDate: offer.timeline_start,
			endDate: offer.timeline_end,
			durationDays: offer.timeline_duration_days,
		},
		warranty: {
			period: offer.warranty_period,
			details: offer.warranty_details || '',
		},
		paymentTerms: offer.payment_terms || 'Not specified',
		paymentSchedule: offer.payment_schedule || [],
		breakdown: {
			labor: offer.labor_breakdown?.labor || 0,
			materials: offer.labor_breakdown?.materials || 0,
			other: offer.labor_breakdown?.other || 0,
			vat: offer.labor_breakdown?.vat || 19,
		},
		scopeOfWork: offer.scope_of_work || '',
		materialsIncluded: offer.materials_included || [],
		insurance: offer.insurance_details || '',
		specialConditions: offer.special_conditions || '',
		offerDate: offer.offer_date,
		validUntil: offer.valid_until,
		riskScore: calculateRiskScore(offer),
		extractedData: offer.extracted_data,
	};
}

function calculateRiskScore(offer: any): number {
	let score = 0;
	
	// Missing warranty
	if (!offer.warranty_period) score += 20;
	
	// Missing payment terms
	if (!offer.payment_terms || offer.payment_terms === 'Not specified') score += 15;
	
	// Missing insurance
	if (!offer.insurance_details) score += 15;
	
	// Missing timeline
	if (!offer.timeline_duration_days) score += 20;
	
	// Missing price breakdown
	if (!offer.labor_breakdown || Object.keys(offer.labor_breakdown).length === 0) score += 10;
	
	// Unrealistic timeline (less than 7 days for most renovations)
	if (offer.timeline_duration_days && offer.timeline_duration_days < 7) score += 20;
	
	return Math.min(score, 100);
}
