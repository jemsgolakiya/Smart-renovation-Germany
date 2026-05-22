import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { contractingPlanningApi, Offer } from "../../services/contractingPlanning";
import { projectApi, Project, PROJECT_TYPES } from "../../services/projects";
import { 
	FileText, 
	BarChart, 
	Download, 
	CheckCircle2, 
	AlertCircle, 
	AlertTriangle,
	Clock,
	DollarSign,
	Shield,
	ThumbsUp,
	ThumbsDown,
	HelpCircle,
	ChevronDown,
	ChevronUp,
	TrendingUp,
	Calendar,
	ClipboardCheck,
	FileCheck,
	Award,
	Info,
	Loader2,
	MapPin
} from "lucide-react";
import "./AnalysisReportPage.css";
import type { StructuredAnalysis, StructuredComparison } from "../../types/offerAnalysis";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";

interface ContractorOffer {
	id: number;
	contractor_id: number;
	contractor_name?: string;
	total_price?: number;
	currency: string;
	timeline_duration_days?: number;
	offer_date?: string;
}

const AnalysisReportPage: React.FC = () => {
	const { projectId, contractorId, analysisId } = useParams<{
		projectId: string;
		contractorId: string;
		analysisId: string;
	}>();
	
	const [analysisData, setAnalysisData] = useState<any>(null);
	const [reportContent, setReportContent] = useState<string>("");
	const [reportType, setReportType] = useState<"analysis" | "comparison">("analysis");
	const [offerDetails, setOfferDetails] = useState<ContractorOffer | undefined>();
	const [comparedOffers, setComparedOffers] = useState<ContractorOffer[]>([]);
	const [projectData, setProjectData] = useState<Project | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	
	// State for collapsible sections
	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
		pricing: false,
		timeline: false,
		scope: false,
		terms: false,
		quality: false,
		risks: false,
		detailedComparisons: false,
		marketContext: false,
		additionalInsights: false
	});
	
	const toggleSection = (section: string) => {
		setExpandedSections(prev => ({
			...prev,
			[section]: !prev[section]
		}));
	};

	useEffect(() => {
		const loadAnalysis = async () => {
			if (!projectId || !analysisId) {
				setError("Missing project or analysis ID");
				setIsLoading(false);
				return;
			}

			try {
				setIsLoading(true);
				setError(null);

				// Load analysis and project data in parallel
				const [analysis, project] = await Promise.all([
					contractingPlanningApi.getAnalysisById(
						parseInt(projectId),
						parseInt(analysisId)
					),
					projectApi.getById(parseInt(projectId))
				]);

				setAnalysisData(analysis);
				setReportContent(analysis.analysis_report);
				setReportType(analysis.analysis_type === 'single' ? 'analysis' : 'comparison');
				setProjectData(project);

				// Set offer details
				if (analysis.offer_details) {
					setOfferDetails(analysis.offer_details);
				}

				// Set compared offers
				if (analysis.compared_offers_details) {
					setComparedOffers(analysis.compared_offers_details);
				}

			} catch (err) {
				console.error("Error loading analysis:", err);
				setError(err instanceof Error ? err.message : "Failed to load analysis");
			} finally {
				setIsLoading(false);
			}
		};

		loadAnalysis();
	}, [projectId, analysisId]);

	const formatPrice = (price?: number, currency?: string) => {
		if (!price) return "N/A";
		return new Intl.NumberFormat("de-DE", {
			style: "currency",
			currency: currency || "EUR",
		}).format(price);
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		return new Date(dateString).toLocaleDateString("de-DE");
	};

	const getProjectTypeLabel = (projectType: string): string => {
		return PROJECT_TYPES.find((type) => type.value === projectType)?.label || projectType;
	};

	const getRecommendationConfig = (recommendation: string) => {
		switch (recommendation) {
			case "recommended":
				return {
					label: "Recommended",
					icon: CheckCircle2,
					bgColor: "bg-green-50",
					borderColor: "border-green-200",
					textColor: "text-green-800",
					badgeColor: "bg-green-100 text-green-800",
				};
			case "acceptable":
				return {
					label: "Acceptable with Clarification",
					icon: CheckCircle2,
					bgColor: "bg-blue-50",
					borderColor: "border-blue-200",
					textColor: "text-blue-800",
					badgeColor: "bg-blue-100 text-blue-800",
				};
			case "caution":
				return {
					label: "Proceed with Caution",
					icon: AlertTriangle,
					bgColor: "bg-yellow-50",
					borderColor: "border-yellow-200",
					textColor: "text-yellow-800",
					badgeColor: "bg-yellow-100 text-yellow-800",
				};
			case "not_recommended":
				return {
					label: "Not Recommended",
					icon: AlertCircle,
					bgColor: "bg-red-50",
					borderColor: "border-red-200",
					textColor: "text-red-800",
					badgeColor: "bg-red-100 text-red-800",
				};
			default:
				return {
					label: "Under Review",
					icon: HelpCircle,
					bgColor: "bg-gray-50",
					borderColor: "border-gray-200",
					textColor: "text-gray-800",
					badgeColor: "bg-gray-100 text-gray-800",
				};
		}
	};

	const getRiskConfig = (riskLevel: string) => {
		switch (riskLevel) {
			case "low":
				return {
					label: "Low Risk",
					color: "text-green-600",
					bgColor: "bg-green-50",
					borderColor: "border-green-200",
				};
			case "medium":
				return {
					label: "Medium Risk",
					color: "text-yellow-600",
					bgColor: "bg-yellow-50",
					borderColor: "border-yellow-200",
				};
			case "high":
				return {
					label: "High Risk",
					color: "text-red-600",
					bgColor: "bg-red-50",
					borderColor: "border-red-200",
				};
			default:
				return {
					label: "Risk Assessment",
					color: "text-gray-600",
					bgColor: "bg-gray-50",
					borderColor: "border-gray-200",
				};
		}
	};

	const handleDownloadPDF = async () => {
		setIsGeneratingPDF(true);
		try {
			const { default: jsPDF } = await import('jspdf');
			const { default: html2canvas } = await import('html2canvas');

			if (!contentRef.current) return;

			const tempContainer = document.createElement('div');
			tempContainer.style.position = 'absolute';
			tempContainer.style.left = '-9999px';
			tempContainer.style.width = '800px';
			tempContainer.style.backgroundColor = 'white';
			tempContainer.style.padding = '40px';
			
			const clonedContent = contentRef.current.cloneNode(true) as HTMLElement;
			
			const collapsibles = clonedContent.querySelectorAll('[data-collapsible]');
			collapsibles.forEach((el) => {
				(el as HTMLElement).style.display = 'block';
			});
			
			tempContainer.appendChild(clonedContent);
			document.body.appendChild(tempContainer);

			const canvas = await html2canvas(tempContainer, {
				scale: 2,
				useCORS: true,
				logging: false,
				backgroundColor: '#ffffff',
			});

			document.body.removeChild(tempContainer);

			const imgWidth = 210;
			const pageHeight = 297;
			const imgHeight = (canvas.height * imgWidth) / canvas.width;
			let heightLeft = imgHeight;

			const pdf = new jsPDF('p', 'mm', 'a4');
			let position = 0;

			const imgData = canvas.toDataURL('image/png');
			pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
			heightLeft -= pageHeight;

			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
				heightLeft -= pageHeight;
			}

			const fileName = reportType === "analysis" 
				? `Offer_Analysis_${offerDetails?.contractor_name || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`
				: `Offer_Comparison_${new Date().toISOString().split('T')[0]}.pdf`;
			
			pdf.save(fileName);
		} catch (error) {
			console.error('Error generating PDF:', error);
			alert('Failed to generate PDF. Please try again.');
		} finally {
			setIsGeneratingPDF(false);
		}
	};

	const extractStructuredData = (content: string): StructuredAnalysis | StructuredComparison | null => {
		try {
			const parsed = JSON.parse(content);
			return parsed;
		} catch (error) {
			console.error('Failed to parse structured data from content:', error);
			console.error('Content received:', content?.substring(0, 500));
			return null;
		}
	};

	const renderAnalysisView = () => {
		const data = extractStructuredData(reportContent) as StructuredAnalysis;
		
		if (!data || !data.executive_summary || !data.recommendation) {
			console.error('Invalid structured data for analysis');
			return (
				<div className="space-y-4">
					<div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
						<p className="text-sm text-red-800">
							<strong>Error:</strong> Failed to load analysis data. Please try generating the analysis again.
						</p>
					</div>
				</div>
			);
		}
		
		return renderAnalysisWithData(data);
	};

	const renderAnalysisWithData = (data: StructuredAnalysis) => {
		const recommendationConfig = getRecommendationConfig(data.recommendation);
		const riskConfig = getRiskConfig(data.risk_level);
		const RecommendationIcon = recommendationConfig.icon;

		return (
			<div className="space-y-4">
				{/* Hero Section - Recommendation */}
				<div className={`${recommendationConfig.bgColor} ${recommendationConfig.borderColor} border-2 rounded-xl p-4 sm:p-5 w-full`}>
					<div className="flex flex-col sm:flex-row items-start gap-4">
						<div className={`${recommendationConfig.badgeColor} p-3 rounded-lg flex-shrink-0`}>
							<RecommendationIcon className="w-8 h-8" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
								<h3 className={`text-lg sm:text-xl font-bold ${recommendationConfig.textColor}`}>
									{recommendationConfig.label}
								</h3>
								<span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${recommendationConfig.badgeColor}`}>
									Score: {data.overall_score}/5
								</span>
							</div>
							<p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2">
								{data.executive_summary}
							</p>
							{data.recommendation_reasoning && (
								<p className="text-xs sm:text-sm text-gray-600 italic">
									{data.recommendation_reasoning}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Quick Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Price Card */}
					<div className="stat-card bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
						<div className="flex items-center gap-3 mb-2">
							<div className="bg-emerald-100 p-2 rounded-lg">
								<DollarSign className="w-5 h-5 text-emerald-600" />
							</div>
							<span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
								Price
							</span>
						</div>
						<div className="text-2xl font-bold text-gray-900 mb-1">
							{formatPrice(offerDetails?.total_price, offerDetails?.currency)}
						</div>
						<div className="flex items-center gap-2">
							<span className={`text-sm font-medium ${
								data.pricing_analysis.value_rating === 'excellent' ? 'text-green-600' :
								data.pricing_analysis.value_rating === 'good' ? 'text-blue-600' :
								data.pricing_analysis.value_rating === 'fair' ? 'text-yellow-600' : 'text-red-600'
							}`}>
								{data.pricing_analysis.value_rating.charAt(0).toUpperCase() + data.pricing_analysis.value_rating.slice(1)} value
							</span>
							<span className="text-xs text-gray-500">• {data.pricing_analysis.price_vs_budget}</span>
						</div>
					</div>

					{/* Timeline Card */}
					<div className="stat-card bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
						<div className="flex items-center gap-3 mb-2">
							<div className="bg-blue-100 p-2 rounded-lg">
								<Clock className="w-5 h-5 text-blue-600" />
							</div>
							<span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
								Timeline
							</span>
						</div>
						<div className="text-2xl font-bold text-gray-900 mb-1">
							{data.timeline_assessment.estimated_duration_days} days
						</div>
						<div className="flex items-center gap-2">
							{data.timeline_assessment.duration_realistic ? (
								<span className="text-sm font-medium text-green-600">Realistic</span>
							) : (
								<span className="text-sm font-medium text-yellow-600">Optimistic</span>
							)}
						</div>
					</div>

					{/* Risk Card */}
					<div className={`stat-card bg-white border-2 ${riskConfig.borderColor} rounded-lg p-4 hover:shadow-md transition-shadow`}>
						<div className="flex items-center gap-3 mb-2">
							<div className={`${riskConfig.bgColor} p-2 rounded-lg`}>
								<Shield className={`w-5 h-5 ${riskConfig.color}`} />
							</div>
							<span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
								Risk Level
							</span>
						</div>
						<div className={`text-2xl font-bold mb-1 ${riskConfig.color}`}>
							{riskConfig.label}
						</div>
						{data.risk_factors && data.risk_factors.length > 0 && (
							<div className="text-xs text-gray-600">
								{data.risk_factors.length} factor{data.risk_factors.length > 1 ? 's' : ''} identified
							</div>
						)}
					</div>
				</div>

				{/* Strengths & Weaknesses */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Strengths */}
					<div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
						<div className="flex items-center gap-2 mb-3">
							<ThumbsUp className="w-5 h-5 text-green-600" />
							<h4 className="font-bold text-gray-900">Strengths</h4>
						</div>
						<ul className="space-y-2">
							{data.strengths.map((strength, index) => (
								<li key={index} className="flex items-start gap-2 text-sm text-gray-700">
									<CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
									<span>{strength}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Weaknesses */}
					<div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
						<div className="flex items-center gap-2 mb-3">
							<ThumbsDown className="w-5 h-5 text-red-600" />
							<h4 className="font-bold text-gray-900">Weaknesses</h4>
						</div>
						<ul className="space-y-2">
							{data.weaknesses.map((weakness, index) => (
								<li key={index} className="flex items-start gap-2 text-sm text-gray-700">
									<AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
									<span>{weakness}</span>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Detailed Analysis - Modern Interactive Sections */}
				<div className="space-y-2">
					<h4 className="font-bold text-gray-900 text-base mb-2 flex items-center gap-2">
						<FileText className="w-5 h-5 text-emerald-600" />
						Detailed Analysis
					</h4>
					
					{/* Pricing Analysis - Collapsible */}
					<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
						<button 
							onClick={() => toggleSection('pricing')}
							className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="bg-emerald-100 p-2 rounded-lg">
									<TrendingUp className="w-5 h-5 text-emerald-600" />
								</div>
								<div className="text-left">
									<h5 className="font-bold text-gray-900">Pricing Analysis</h5>
									<div className="flex items-center gap-2 mt-1">
										<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
											data.pricing_analysis.value_rating === 'excellent' ? 'bg-green-100 text-green-700' :
											data.pricing_analysis.value_rating === 'good' ? 'bg-blue-100 text-blue-700' :
											data.pricing_analysis.value_rating === 'fair' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
										}`}>
											{data.pricing_analysis.value_rating.toUpperCase()}
										</span>
										<span className="text-xs text-gray-500">{data.pricing_analysis.price_vs_budget} budget</span>
										<span className={`text-xs font-medium ${
											data.pricing_analysis.cost_breakdown_quality === 'transparent' ? 'text-green-600' :
											data.pricing_analysis.cost_breakdown_quality === 'adequate' ? 'text-blue-600' : 'text-yellow-600'
										}`}>• {data.pricing_analysis.cost_breakdown_quality}</span>
									</div>
								</div>
							</div>
							{expandedSections.pricing ? (
								<ChevronUp className="w-5 h-5 text-gray-400" />
							) : (
								<ChevronDown className="w-5 h-5 text-gray-400" />
							)}
						</button>
						{expandedSections.pricing && (
							<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-gradient-to-b from-emerald-50/30 to-white" data-collapsible>
								<p className="text-sm text-gray-700 leading-relaxed">{data.pricing_analysis.summary}</p>
								{data.pricing_analysis.market_comparison && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
										<div className="flex items-start gap-2">
											<Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
											<div>
												<p className="text-xs font-semibold text-blue-800 mb-1">Market Comparison</p>
												<p className="text-xs text-gray-700">{data.pricing_analysis.market_comparison}</p>
											</div>
										</div>
									</div>
								)}
								{data.pricing_analysis.unusual_line_items && data.pricing_analysis.unusual_line_items.length > 0 && (
									<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
										<p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
											<AlertCircle className="w-3.5 h-3.5" />
											Unusual Line Items
										</p>
										<div className="space-y-1.5">
											{data.pricing_analysis.unusual_line_items.map((item, idx) => (
												<div key={idx} className="flex items-start gap-2">
													<span className="text-amber-600 text-xs mt-0.5">▸</span>
													<span className="text-xs text-gray-700">{item}</span>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Timeline Assessment - Collapsible */}
					<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
						<button 
							onClick={() => toggleSection('timeline')}
							className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="bg-blue-100 p-2 rounded-lg">
									<Calendar className="w-5 h-5 text-blue-600" />
								</div>
								<div className="text-left">
									<h5 className="font-bold text-gray-900">Timeline Assessment</h5>
									<div className="flex items-center gap-2 mt-1">
										<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
											data.timeline_assessment.duration_realistic ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
										}`}>
											{data.timeline_assessment.duration_realistic ? 'REALISTIC' : 'OPTIMISTIC'}
										</span>
										<span className="text-xs text-gray-500">{data.timeline_assessment.estimated_duration_days} days estimated</span>
									</div>
								</div>
							</div>
							{expandedSections.timeline ? (
								<ChevronUp className="w-5 h-5 text-gray-400" />
							) : (
								<ChevronDown className="w-5 h-5 text-gray-400" />
							)}
						</button>
						{expandedSections.timeline && (
							<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-gradient-to-b from-blue-50/30 to-white" data-collapsible>
								<p className="text-sm text-gray-700 leading-relaxed">{data.timeline_assessment.summary}</p>
								{data.timeline_assessment.start_date_assessment && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
										<p className="text-xs font-semibold text-blue-800 mb-1">Start Date Assessment</p>
										<p className="text-xs text-gray-700">{data.timeline_assessment.start_date_assessment}</p>
									</div>
								)}
								{data.timeline_assessment.scheduling_risks && data.timeline_assessment.scheduling_risks.length > 0 && (
									<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
										<p className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
											<AlertTriangle className="w-3.5 h-3.5" />
											Scheduling Risks
										</p>
										<div className="space-y-1.5">
											{data.timeline_assessment.scheduling_risks.map((risk, idx) => (
												<div key={idx} className="flex items-start gap-2">
													<span className="text-yellow-600 text-xs mt-0.5">▸</span>
													<span className="text-xs text-gray-700">{risk}</span>
												</div>
											))}
										</div>
									</div>
								)}
								{data.timeline_assessment.seasonal_factors && (
									<div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
										<p className="text-xs font-semibold text-purple-800 mb-1">Seasonal Factors</p>
										<p className="text-xs text-gray-700">{data.timeline_assessment.seasonal_factors}</p>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Scope Analysis - Collapsible */}
					{data.scope_analysis && (
						<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
							<button 
								onClick={() => toggleSection('scope')}
								className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="bg-purple-100 p-2 rounded-lg">
										<ClipboardCheck className="w-5 h-5 text-purple-600" />
									</div>
									<div className="text-left">
										<h5 className="font-bold text-gray-900">Scope Analysis</h5>
										<div className="flex items-center gap-2 mt-1">
											<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
												data.scope_analysis.completeness_rating === 'comprehensive' ? 'bg-green-100 text-green-700' :
												data.scope_analysis.completeness_rating === 'adequate' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
											}`}>
												{data.scope_analysis.completeness_rating.toUpperCase()}
											</span>
											{data.scope_analysis.potential_gaps && data.scope_analysis.potential_gaps.length > 0 && (
												<span className="text-xs text-amber-600 font-medium">• {data.scope_analysis.potential_gaps.length} potential gap{data.scope_analysis.potential_gaps.length > 1 ? 's' : ''}</span>
											)}
										</div>
									</div>
								</div>
								{expandedSections.scope ? (
									<ChevronUp className="w-5 h-5 text-gray-400" />
								) : (
									<ChevronDown className="w-5 h-5 text-gray-400" />
								)}
							</button>
							{expandedSections.scope && (
								<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-gradient-to-b from-purple-50/30 to-white" data-collapsible>
									<p className="text-sm text-gray-700 leading-relaxed">{data.scope_analysis.summary}</p>
									{data.scope_analysis.included_items && data.scope_analysis.included_items.length > 0 && (
										<div className="bg-green-50 border border-green-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
												<CheckCircle2 className="w-3.5 h-3.5" />
												Included Items
											</p>
											<div className="grid grid-cols-1 gap-1.5">
												{data.scope_analysis.included_items.map((item, idx) => (
													<div key={idx} className="flex items-center gap-2">
														<div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
														<span className="text-xs text-gray-700">{item}</span>
													</div>
												))}
											</div>
										</div>
									)}
									{data.scope_analysis.potential_gaps && data.scope_analysis.potential_gaps.length > 0 && (
										<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
												<AlertCircle className="w-3.5 h-3.5" />
												Potential Gaps
											</p>
											<div className="space-y-1.5">
												{data.scope_analysis.potential_gaps.map((gap, idx) => (
													<div key={idx} className="flex items-start gap-2">
														<span className="text-amber-600 text-xs mt-0.5">▸</span>
														<span className="text-xs text-gray-700">{gap}</span>
													</div>
												))}
											</div>
										</div>
									)}
									{data.scope_analysis.material_quality_assessment && (
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-blue-800 mb-1">Material Quality</p>
											<p className="text-xs text-gray-700">{data.scope_analysis.material_quality_assessment}</p>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Terms and Conditions - Collapsible */}
					{data.terms_and_conditions && (
						<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
							<button 
								onClick={() => toggleSection('terms')}
								className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="bg-indigo-100 p-2 rounded-lg">
										<FileCheck className="w-5 h-5 text-indigo-600" />
									</div>
									<div className="text-left">
										<h5 className="font-bold text-gray-900">Terms & Conditions</h5>
										<div className="flex items-center gap-2 mt-1">
											<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
												data.terms_and_conditions.payment_terms_fairness === 'fair' ? 'bg-green-100 text-green-700' :
												data.terms_and_conditions.payment_terms_fairness === 'acceptable' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
											}`}>
												{data.terms_and_conditions.payment_terms_fairness.toUpperCase()}
											</span>
											<span className={`text-xs font-medium ${
												data.terms_and_conditions.warranty_adequate ? 'text-green-600' : 'text-amber-600'
											}`}>• Warranty {data.terms_and_conditions.warranty_adequate ? 'adequate' : 'needs review'}</span>
										</div>
									</div>
								</div>
								{expandedSections.terms ? (
									<ChevronUp className="w-5 h-5 text-gray-400" />
								) : (
									<ChevronDown className="w-5 h-5 text-gray-400" />
								)}
							</button>
							{expandedSections.terms && (
								<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-gradient-to-b from-indigo-50/30 to-white" data-collapsible>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="bg-green-50 border border-green-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-1">
												<DollarSign className="w-3.5 h-3.5" />
												Payment Terms
											</p>
											<p className="text-xs text-gray-700 mb-2">{data.terms_and_conditions.payment_terms_summary}</p>
											<p className="text-xs text-gray-600 italic">{data.terms_and_conditions.payment_schedule_analysis}</p>
										</div>
										<div className={`border rounded-lg p-3 ${
											data.terms_and_conditions.warranty_adequate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
										}`}>
											<p className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${
												data.terms_and_conditions.warranty_adequate ? 'text-green-800' : 'text-amber-800'
											}`}>
												<Shield className="w-3.5 h-3.5" />
												Warranty Coverage
											</p>
											<p className="text-xs text-gray-700">{data.terms_and_conditions.warranty_assessment}</p>
										</div>
									</div>
									{data.terms_and_conditions.insurance_coverage && (
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-blue-800 mb-1">Insurance Coverage</p>
											<p className="text-xs text-gray-700">{data.terms_and_conditions.insurance_coverage}</p>
										</div>
									)}
									{data.terms_and_conditions.special_conditions_concerns && data.terms_and_conditions.special_conditions_concerns.length > 0 && (
										<div className="bg-red-50 border border-red-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
												<AlertTriangle className="w-3.5 h-3.5" />
												Special Conditions Concerns
											</p>
											<div className="space-y-1.5">
												{data.terms_and_conditions.special_conditions_concerns.map((concern, idx) => (
													<div key={idx} className="flex items-start gap-2">
														<span className="text-red-600 text-xs mt-0.5">▸</span>
														<span className="text-xs text-gray-700">{concern}</span>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Quality Indicators - Collapsible */}
					{data.quality_indicators && (
						<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
							<button 
								onClick={() => toggleSection('quality')}
								className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="bg-amber-100 p-2 rounded-lg">
										<Award className="w-5 h-5 text-amber-600" />
									</div>
									<div className="text-left">
										<h5 className="font-bold text-gray-900">Quality Indicators</h5>
										<div className="flex items-center gap-2 mt-1">
											<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
												data.quality_indicators.professionalism_rating === 'high' ? 'bg-green-100 text-green-700' :
												data.quality_indicators.professionalism_rating === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
											}`}>
												{data.quality_indicators.professionalism_rating.toUpperCase()}
											</span>
											{data.quality_indicators.certifications_standards && data.quality_indicators.certifications_standards.length > 0 && (
												<span className="text-xs text-blue-600 font-medium">• {data.quality_indicators.certifications_standards.length} certification{data.quality_indicators.certifications_standards.length > 1 ? 's' : ''}</span>
											)}
										</div>
									</div>
								</div>
								{expandedSections.quality ? (
									<ChevronUp className="w-5 h-5 text-gray-400" />
								) : (
									<ChevronDown className="w-5 h-5 text-gray-400" />
								)}
							</button>
							{expandedSections.quality && (
								<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3 bg-gradient-to-b from-amber-50/30 to-white" data-collapsible>
									<p className="text-sm text-gray-700 leading-relaxed">{data.quality_indicators.offer_presentation_quality}</p>
									{data.quality_indicators.certifications_standards && data.quality_indicators.certifications_standards.length > 0 && (
										<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-blue-800 mb-2">Standards & Certifications</p>
											<div className="flex flex-wrap gap-2">
												{data.quality_indicators.certifications_standards.map((cert, idx) => (
													<span key={idx} className="inline-flex items-center gap-1 text-xs bg-white border border-blue-300 text-blue-700 px-2.5 py-1 rounded-full font-medium">
														<CheckCircle2 className="w-3 h-3" />
														{cert}
													</span>
												))}
											</div>
										</div>
									)}
									{data.quality_indicators.material_brands_mentioned && data.quality_indicators.material_brands_mentioned.length > 0 && (
										<div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-purple-800 mb-2">Material Brands</p>
											<div className="flex flex-wrap gap-2">
												{data.quality_indicators.material_brands_mentioned.map((brand, idx) => (
													<span key={idx} className="text-xs bg-white border border-purple-300 text-purple-700 px-2.5 py-1 rounded-full">
														{brand}
													</span>
												))}
											</div>
										</div>
									)}
									{data.quality_indicators.contractor_credibility_signals && data.quality_indicators.contractor_credibility_signals.length > 0 && (
										<div className="bg-green-50 border border-green-200 rounded-lg p-3">
											<p className="text-xs font-semibold text-green-800 mb-2">Credibility Signals</p>
											<div className="space-y-1.5">
												{data.quality_indicators.contractor_credibility_signals.map((signal, idx) => (
													<div key={idx} className="flex items-center gap-2">
														<CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
														<span className="text-xs text-gray-700">{signal}</span>
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Risk Factors - Collapsible */}
					{data.risk_factors && data.risk_factors.length > 0 && (
						<div className="bg-white border-2 border-red-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
							<button 
								onClick={() => toggleSection('risks')}
								className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className={`${getRiskConfig(data.risk_level).bgColor} p-2 rounded-lg`}>
										<AlertTriangle className={`w-5 h-5 ${getRiskConfig(data.risk_level).color}`} />
									</div>
									<div className="text-left">
										<h5 className="font-bold text-gray-900">Risk Factors</h5>
										<div className="flex items-center gap-2 mt-1">
											<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
												data.risk_level === 'low' ? 'bg-green-100 text-green-700' :
												data.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
											}`}>
												{data.risk_level.toUpperCase()} RISK
											</span>
											<span className="text-xs text-gray-500">• {data.risk_factors.length} factor{data.risk_factors.length > 1 ? 's' : ''} identified</span>
										</div>
									</div>
								</div>
								{expandedSections.risks ? (
									<ChevronUp className="w-5 h-5 text-gray-400" />
								) : (
									<ChevronDown className="w-5 h-5 text-gray-400" />
								)}
							</button>
							{expandedSections.risks && (
								<div className="px-4 pb-4 space-y-2 border-t border-red-200 pt-3 bg-gradient-to-b from-red-50/30 to-white" data-collapsible>
									{data.risk_factors.map((risk, index) => (
										<div key={index} className="bg-white border border-red-200 rounded-lg p-3 hover:border-red-300 transition-colors">
											<div className="flex items-start gap-2">
												<AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
												<span className="text-sm text-gray-700">{risk}</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Conversation Updates */}
				{data.conversation_context && data.conversation_context.has_conversation_updates && (
					<div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
						<h4 className="font-bold text-gray-900 mb-3">💬 Conversation Updates</h4>
						{data.conversation_context.key_clarifications && data.conversation_context.key_clarifications.length > 0 && (
							<div className="mb-3">
								<p className="text-sm font-semibold text-blue-800 mb-2">Key Clarifications:</p>
								<ul className="space-y-1">
									{data.conversation_context.key_clarifications.map((clarification, idx) => (
										<li key={idx} className="text-sm text-gray-700">• {clarification}</li>
									))}
								</ul>
							</div>
						)}
						{data.conversation_context.impact_on_evaluation && (
							<p className="text-sm text-gray-700 italic">{data.conversation_context.impact_on_evaluation}</p>
						)}
					</div>
				)}

				{/* Additional Insights */}
				{data.additional_insights && (
					<div className="insights-card">
						<div className="section-header">
							<div className="section-header-icon insights">
								<Info className="w-5 h-5 text-white" />
							</div>
							<div>
								<h4 className="section-header-title">Additional Insights</h4>
								<p className="section-header-subtitle">Expert observations and opportunities</p>
							</div>
						</div>
						<div className="insight-grid">
							{data.additional_insights.negotiation_opportunities && data.additional_insights.negotiation_opportunities.length > 0 && (
								<div className="insight-section">
									<p className="insight-label">Negotiation Opportunities</p>
									<div className="space-y-1 pl-6">
										{data.additional_insights.negotiation_opportunities.map((opp, idx) => (
											<div key={idx} className="insight-list-item">
												<span>{opp}</span>
											</div>
										))}
									</div>
								</div>
							)}
							{data.additional_insights.notable_observations && data.additional_insights.notable_observations.length > 0 && (
								<div className="insight-section">
									<p className="insight-label">Notable Observations</p>
									<div className="space-y-1 pl-6">
										{data.additional_insights.notable_observations.map((obs, idx) => (
											<div key={idx} className="insight-list-item">
												<span>{obs}</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Questions to Ask */}
				{data.key_questions && data.key_questions.length > 0 && (
					<div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
						<div className="flex items-center gap-2 mb-3">
							<HelpCircle className="w-5 h-5 text-blue-600" />
							<h4 className="font-bold text-gray-900">Important Questions to Ask</h4>
						</div>
						<ul className="space-y-2">
							{data.key_questions.map((question, index) => (
								<li key={index} className="flex items-start gap-2 text-sm text-gray-700">
									<span className="font-semibold text-blue-600 mt-0.5">{index + 1}.</span>
									<span>{question}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		);
	};

	const renderComparisonView = () => {
		const data = extractStructuredData(reportContent) as StructuredComparison;
		
		if (!data || !data.executive_summary || !data.recommended_contractor) {
			console.error('Invalid structured data for comparison');
			return (
				<div className="space-y-4">
					<div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
						<p className="text-sm text-red-800">
							<strong>Error:</strong> Failed to load comparison data. Please try generating the comparison again.
						</p>
					</div>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				{/* DECISION SUMMARY - NEW: Top-level recommendation */}
				{data.decision_summary && (
					<div className="bg-gradient-to-br from-emerald-50 to-green-50 border-3 border-emerald-300 rounded-2xl p-6 shadow-lg">
						<div className="flex items-start gap-4 mb-4">
							<div className="bg-emerald-600 p-3 rounded-xl">
								<CheckCircle2 className="w-8 h-8 text-white" />
							</div>
							<div className="flex-1">
								<h2 className="text-2xl font-bold text-gray-900 mb-1">Recommended Choice</h2>
								<p className="text-3xl font-extrabold text-emerald-700 mb-4">
									{data.decision_summary.recommended_choice}
								</p>
								
								{/* Three Key Reasons */}
								<div className="space-y-2 mb-4">
									{data.decision_summary.decision_reasons && data.decision_summary.decision_reasons.map((reason, idx) => (
										<div key={idx} className="flex items-start gap-2">
											<CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
											<span className="text-base font-medium text-gray-800">{reason}</span>
										</div>
									))}
								</div>

								{/* Trade-off */}
								{data.decision_summary.main_tradeoff && (
									<div className="bg-white/80 border-2 border-amber-200 rounded-lg p-3 mt-4">
										<div className="flex items-start gap-2">
											<AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
											<div>
												<span className="text-sm font-bold text-amber-800">Trade-off: </span>
												<span className="text-sm text-gray-700">{data.decision_summary.main_tradeoff}</span>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Executive Summary - Condensed */}
				<div className="bg-white border-2 border-gray-200 rounded-lg p-4">
					<div className="flex items-start gap-3 mb-4">
						<div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
							<BarChart className="w-5 h-5 text-blue-600" />
						</div>
						<div className="flex-1">
							<h3 className="font-bold text-gray-900 text-base mb-2">Comparison Summary</h3>
							<p className="text-sm text-gray-700 leading-relaxed">
								{data.executive_summary}
							</p>
						</div>
					</div>
					
					{/* Contractor Quick Cards */}
					<div className="contractor-quick-cards">
							<div className="contractor-quick-card recommended">
								<div className="contractor-quick-label recommended">
									<Award className="contractor-quick-icon" />
									<span>Top Recommendation</span>
								</div>
								<div className="contractor-quick-name" title={data.recommended_contractor}>
									{data.recommended_contractor}
								</div>
								<div className="contractor-quick-badge">
									<CheckCircle2 className="w-3.5 h-3.5" />
									Best Overall Choice
								</div>
							</div>
							
							{data.runner_up_contractor && (
								<div className="contractor-quick-card runner-up">
									<div className="contractor-quick-label runner-up">
										<TrendingUp className="contractor-quick-icon" />
										<span>Runner-Up</span>
									</div>
									<div className="contractor-quick-name" title={data.runner_up_contractor}>
										{data.runner_up_contractor}
									</div>
									<div className="contractor-quick-badge">
										<Info className="w-3.5 h-3.5" />
										Alternative Option
									</div>
								</div>
							)}
							
							<div className="contractor-quick-card best-value">
								<div className="contractor-quick-label best-value">
									<DollarSign className="contractor-quick-icon" />
									<span>Best Value</span>
								</div>
								<div className="contractor-quick-name" title={data.best_value_contractor}>
									{data.best_value_contractor}
								</div>
								<div className="contractor-quick-badge">
									<TrendingUp className="w-3.5 h-3.5" />
									Price Performance
								</div>
							</div>
						</div>

						{/* Summary Stats with Download Button */}
						{data.comparison_matrix && (
							<div className="summary-stats mt-4">
								<div className="summary-stat-item">
									<div className="summary-stat-icon contractors">
										<Award className="w-4 h-4 text-white" />
									</div>
									<div className="summary-stat-content">
										<span className="summary-stat-label">Contractors</span>
										<span className="summary-stat-value">{data.comparison_matrix.length} Compared</span>
									</div>
								</div>
								{data.comparison_matrix.length > 1 && (
									<>
										<div className="summary-stat-item">
											<div className="summary-stat-icon range">
												<DollarSign className="w-4 h-4 text-white" />
											</div>
											<div className="summary-stat-content">
												<span className="summary-stat-label">Price Range</span>
												<span className="summary-stat-value">
													{formatPrice(
														Math.min(...data.comparison_matrix.map(c => c.total_price || 0)),
														data.comparison_matrix[0].currency
													)} - {formatPrice(
														Math.max(...data.comparison_matrix.map(c => c.total_price || 0)),
														data.comparison_matrix[0].currency
													)}
												</span>
											</div>
										</div>
										<div className="summary-stat-item">
											<div className="summary-stat-icon timeline">
												<Clock className="w-4 h-4 text-white" />
											</div>
											<div className="summary-stat-content">
												<span className="summary-stat-label">Timeline Range</span>
												<span className="summary-stat-value">
													{Math.min(...data.comparison_matrix.map(c => c.timeline_days || 0))} - {Math.max(...data.comparison_matrix.map(c => c.timeline_days || 0))} days
												</span>
											</div>
										</div>
									</>
								)}
								{/* Download PDF Button */}
								<button
									onClick={handleDownloadPDF}
									disabled={isGeneratingPDF}
									className="summary-stat-item summary-stat-button"
									style={{ cursor: 'pointer' }}
								>
									<div className="summary-stat-icon download">
										{isGeneratingPDF ? (
											<Loader2 className="w-4 h-4 text-white animate-spin" />
										) : (
											<Download className="w-4 h-4 text-white" />
										)}
									</div>
									<div className="summary-stat-content">
										<span className="summary-stat-label">Export</span>
										<span className="summary-stat-value">
											{isGeneratingPDF ? 'Generating...' : 'Download PDF'}
										</span>
									</div>
								</button>
							</div>
						)}
				</div>

				{/* Scope Comparison Table - NEW */}
				{data.scope_comparison_table && data.scope_comparison_table.length > 0 && (
					<div className="bg-white border-2 border-gray-200 rounded-lg p-5">
						<h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
							<ClipboardCheck className="w-5 h-5 text-purple-600" />
							Scope Coverage Comparison
						</h4>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b-2 border-gray-200">
										<th className="text-left py-3 px-4 font-bold text-gray-700">Contractor</th>
										<th className="text-center py-3 px-4 font-bold text-gray-700">Electrical</th>
										<th className="text-center py-3 px-4 font-bold text-gray-700">Plumbing</th>
										<th className="text-center py-3 px-4 font-bold text-gray-700">Appliances</th>
										<th className="text-center py-3 px-4 font-bold text-gray-700">Timeline Detail</th>
									</tr>
								</thead>
								<tbody>
									{data.scope_comparison_table.map((contractor, idx) => {
										const isRecommended = contractor.contractor_name === data.recommended_contractor;
										const getScopeIcon = (value: string) => {
											if (value === 'included') return <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />;
											if (value === 'excluded') return <span className="text-red-600 text-xl mx-auto block">❌</span>;
											if (value === 'partial') return <span className="text-amber-600 text-xl mx-auto block">⚠️</span>;
											if (value === 'yes') return <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />;
											if (value === 'no') return <span className="text-red-600 text-xl mx-auto block">❌</span>;
											if (value === 'vague') return <span className="text-amber-600 text-xl mx-auto block">⚠️</span>;
											return <HelpCircle className="w-5 h-5 text-gray-400 mx-auto" />;
										};
										
										return (
											<tr key={idx} className={`border-b border-gray-100 ${isRecommended ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
												<td className="py-3 px-4 font-semibold text-gray-900">
													{contractor.contractor_name}
													{isRecommended && (
														<span className="ml-2 inline-flex items-center gap-1 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
															<Award className="w-3 h-3" />
															Recommended
														</span>
													)}
												</td>
												<td className="py-3 px-4 text-center">{getScopeIcon(contractor.electrical_work)}</td>
												<td className="py-3 px-4 text-center">{getScopeIcon(contractor.plumbing_work)}</td>
												<td className="py-3 px-4 text-center">{getScopeIcon(contractor.appliances_included)}</td>
												<td className="py-3 px-4 text-center">{getScopeIcon(contractor.detailed_timeline_provided)}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						<div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
							<span className="flex items-center gap-1">
								<CheckCircle2 className="w-4 h-4 text-green-600" /> Included
							</span>
							<span className="flex items-center gap-1">
								<span className="text-red-600">❌</span> Excluded
							</span>
							<span className="flex items-center gap-1">
								<span className="text-amber-600">⚠️</span> Partial/Unclear
							</span>
						</div>
					</div>
				)}

				{/* Key Differences */}
				{data.key_differences && data.key_differences.length > 0 && (
					<div className="key-differences-card">
						<div className="section-header">
							<div className="section-header-icon timeline">
								<AlertCircle className="w-5 h-5 text-white" />
							</div>
							<div>
								<h4 className="section-header-title">Key Differences</h4>
								<p className="section-header-subtitle">Critical distinctions between contractor offers</p>
							</div>
						</div>
						<div className="flex flex-wrap gap-2 mb-4">
							<span className="difference-badge">
								<TrendingUp className="w-3 h-3" />
								{data.key_differences.length} Notable Difference{data.key_differences.length > 1 ? 's' : ''}
							</span>
						</div>
						<div className="space-y-2">
							{data.key_differences.map((diff, index) => (
								<div key={index} className="difference-item">
									<p className="difference-content">{diff}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Comparison Matrix */}
				{data.comparison_matrix && data.comparison_matrix.length > 0 && (
					<div className="space-y-6">
						<div className="contractor-comparison-header">
							<div className="contractor-comparison-icon">
								<BarChart className="w-5 h-5 text-white" />
							</div>
							<div className="flex-1">
								<h4 className="font-bold text-gray-900 text-lg">Contractor Comparison</h4>
								<p className="text-sm text-gray-600">Detailed side-by-side analysis</p>
								
								{/* Rating Weights Context */}
								{data.rating_weights_context && (
									<div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 inline-flex items-start gap-2">
										<Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
										<div className="flex-1">
											<p className="text-xs text-blue-800 font-medium">{data.rating_weights_context}</p>
											<div className="flex flex-wrap gap-3 mt-1.5 text-xs text-blue-700">
												<span className="font-semibold">Price: 40%</span>
												<span className="font-semibold">Timeline: 30%</span>
												<span className="font-semibold">Quality: 20%</span>
												<span className="font-semibold">Terms: 10%</span>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
						{data.comparison_matrix.map((contractor, index) => {
							const riskConfig = getRiskConfig(contractor.risk_level);
							const isRecommended = contractor.contractor_name === data.recommended_contractor;
							
							return (
								<div 
									key={contractor.contractor_id} 
									className={`contractor-card ${isRecommended ? 'recommended' : ''}`}
									style={isRecommended ? { 
										transform: 'scale(1.02)', 
										boxShadow: '0 8px 30px rgba(5, 150, 105, 0.15)',
										border: '3px solid rgb(5, 150, 105)'
									} : {}}
								>
									{/* Header */}
									<div className="contractor-header">
										<div className="contractor-name-section">
											<h5 className="contractor-name">
												{contractor.contractor_name}
												{isRecommended && (
													<span className="recommended-badge">
														<Award className="w-3 h-3" />
														Recommended
													</span>
												)}
											</h5>
											<div className="contractor-price">
												{formatPrice(contractor.total_price, contractor.currency)}
											</div>
											<div className="contractor-timeline">
												<Clock className="w-4 h-4 text-gray-500" />
												<span>{contractor.timeline_days} days completion time</span>
											</div>
										</div>
										<div className="contractor-rating-section">
											<div className="contractor-overall-rating">
												{contractor.overall_rating.toFixed(1)}
											</div>
											<div className="contractor-rating-label">Overall Score</div>
										</div>
									</div>

									{/* Rating Bars */}
									<div className="contractor-ratings">
										<div className="rating-item">
											<div className="rating-header">
												<div className="rating-label">
													<DollarSign className="rating-icon text-emerald-600" />
													<span>Price</span>
												</div>
												<span className="rating-value">{contractor.price_rating}/5</span>
											</div>
											<div className="rating-bar-container">
												<div 
													className="rating-bar-fill price" 
													style={{ width: `${(contractor.price_rating / 5) * 100}%` }}
												></div>
											</div>
										</div>
										<div className="rating-item">
											<div className="rating-header">
												<div className="rating-label">
													<Clock className="rating-icon text-blue-600" />
													<span>Timeline</span>
												</div>
												<span className="rating-value">{contractor.timeline_rating}/5</span>
											</div>
											<div className="rating-bar-container">
												<div 
													className="rating-bar-fill timeline" 
													style={{ width: `${(contractor.timeline_rating / 5) * 100}%` }}
												></div>
											</div>
										</div>
										<div className="rating-item">
											<div className="rating-header">
												<div className="rating-label">
													<Award className="rating-icon text-purple-600" />
													<span>Quality</span>
												</div>
												<span className="rating-value">{contractor.quality_rating}/5</span>
											</div>
											<div className="rating-bar-container">
												<div 
													className="rating-bar-fill quality" 
													style={{ width: `${(contractor.quality_rating / 5) * 100}%` }}
												></div>
											</div>
										</div>
										<div className="rating-item">
											<div className="rating-header">
												<div className="rating-label">
													<FileCheck className="rating-icon text-amber-600" />
													<span>Terms</span>
												</div>
												<span className="rating-value">{contractor.terms_rating}/5</span>
											</div>
											<div className="rating-bar-container">
												<div 
													className="rating-bar-fill terms" 
													style={{ width: `${(contractor.terms_rating / 5) * 100}%` }}
												></div>
											</div>
										</div>
									</div>

									{/* Strengths & Weaknesses */}
									<div className="contractor-sw-section">
										<div className="strengths-section">
											<div className="sw-header">
												<CheckCircle2 className="w-4 h-4" />
												<span>Key Strengths</span>
											</div>
											<div className="sw-list">
												{contractor.strengths.slice(0, 3).map((strength, idx) => (
													<div key={idx} className="sw-item">
														<CheckCircle2 className="w-3.5 h-3.5 icon" />
														<span>{strength}</span>
													</div>
												))}
											</div>
										</div>
										<div className="weaknesses-section">
											<div className="sw-header">
												<AlertCircle className="w-4 h-4" />
												<span>Areas of Concern</span>
											</div>
											<div className="sw-list">
												{contractor.weaknesses.slice(0, 3).map((weakness, idx) => (
													<div key={idx} className="sw-item">
														<AlertCircle className="w-3.5 h-3.5 icon" />
														<span>{weakness}</span>
													</div>
												))}
											</div>
										</div>
									</div>

									{/* Risk Breakdown - Enhanced */}
									{contractor.risk_breakdown ? (
										<div className="border-t border-gray-200 pt-5 mt-5">
											<h6 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 px-1">
												<Shield className="w-4 h-4" />
												Risk Assessment
											</h6>
											<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
												{/* Cost Risk */}
												<div className={`rounded-lg p-4 border-2 ${
													contractor.risk_breakdown.cost_risk.level === 'low' ? 'bg-green-50 border-green-200' :
													contractor.risk_breakdown.cost_risk.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
													'bg-red-50 border-red-200'
												}`}>
													<div className="flex items-center gap-2 mb-2">
														<DollarSign className={`w-4 h-4 ${
															contractor.risk_breakdown.cost_risk.level === 'low' ? 'text-green-600' :
															contractor.risk_breakdown.cost_risk.level === 'medium' ? 'text-yellow-600' :
															'text-red-600'
														}`} />
														<span className="text-xs font-bold text-gray-700 uppercase">Cost Risk</span>
													</div>
													<p className={`text-xs font-semibold mb-2 ${
														contractor.risk_breakdown.cost_risk.level === 'low' ? 'text-green-700' :
														contractor.risk_breakdown.cost_risk.level === 'medium' ? 'text-yellow-700' :
														'text-red-700'
													}`}>
														{contractor.risk_breakdown.cost_risk.level.toUpperCase()}
													</p>
													<p className="text-xs text-gray-600">{contractor.risk_breakdown.cost_risk.explanation}</p>
												</div>

												{/* Timeline Risk */}
												<div className={`rounded-lg p-4 border-2 ${
													contractor.risk_breakdown.timeline_risk.level === 'low' ? 'bg-green-50 border-green-200' :
													contractor.risk_breakdown.timeline_risk.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
													'bg-red-50 border-red-200'
												}`}>
													<div className="flex items-center gap-2 mb-2">
														<Clock className={`w-4 h-4 ${
															contractor.risk_breakdown.timeline_risk.level === 'low' ? 'text-green-600' :
															contractor.risk_breakdown.timeline_risk.level === 'medium' ? 'text-yellow-600' :
															'text-red-600'
														}`} />
														<span className="text-xs font-bold text-gray-700 uppercase">Timeline Risk</span>
													</div>
													<p className={`text-xs font-semibold mb-2 ${
														contractor.risk_breakdown.timeline_risk.level === 'low' ? 'text-green-700' :
														contractor.risk_breakdown.timeline_risk.level === 'medium' ? 'text-yellow-700' :
														'text-red-700'
													}`}>
														{contractor.risk_breakdown.timeline_risk.level.toUpperCase()}
													</p>
													<p className="text-xs text-gray-600">{contractor.risk_breakdown.timeline_risk.explanation}</p>
												</div>

												{/* Scope Risk */}
												<div className={`rounded-lg p-4 border-2 ${
													contractor.risk_breakdown.scope_risk.level === 'low' ? 'bg-green-50 border-green-200' :
													contractor.risk_breakdown.scope_risk.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
													'bg-red-50 border-red-200'
												}`}>
													<div className="flex items-center gap-2 mb-2">
														<ClipboardCheck className={`w-4 h-4 ${
															contractor.risk_breakdown.scope_risk.level === 'low' ? 'text-green-600' :
															contractor.risk_breakdown.scope_risk.level === 'medium' ? 'text-yellow-600' :
															'text-red-600'
														}`} />
														<span className="text-xs font-bold text-gray-700 uppercase">Scope Risk</span>
													</div>
													<p className={`text-xs font-semibold mb-2 ${
														contractor.risk_breakdown.scope_risk.level === 'low' ? 'text-green-700' :
														contractor.risk_breakdown.scope_risk.level === 'medium' ? 'text-yellow-700' :
														'text-red-700'
													}`}>
														{contractor.risk_breakdown.scope_risk.level.toUpperCase()}
													</p>
													<p className="text-xs text-gray-600">{contractor.risk_breakdown.scope_risk.explanation}</p>
												</div>
											</div>
										</div>
									) : (
										<div className="contractor-footer">
											<div className="risk-indicator">
												<Shield className="w-4 h-4 text-gray-600" />
												<span className="text-gray-600">Risk Assessment:</span>
												<div className={`risk-dot ${contractor.risk_level}`}></div>
												<span className={riskConfig.color}>{riskConfig.label}</span>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* Scenario Recommendations */}
				{data.scenario_recommendations && (
					<div className="bg-white border-2 border-gray-200 rounded-lg p-5">
						<h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
							<ClipboardCheck className="w-5 h-5 text-indigo-600" />
							Recommendation by Priority
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
								<div className="flex items-center gap-2 mb-1.5">
									<DollarSign className="w-4 h-4 text-green-600" />
									<span className="text-xs font-bold text-green-700 uppercase tracking-wide">Lowest Cost</span>
								</div>
								<p className="font-bold text-gray-900 text-base">{data.scenario_recommendations.lowest_cost}</p>
							</div>
							<div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
								<div className="flex items-center gap-2 mb-1.5">
									<Clock className="w-4 h-4 text-blue-600" />
									<span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Fastest Completion</span>
								</div>
								<p className="font-bold text-gray-900 text-base">{data.scenario_recommendations.fastest_completion}</p>
							</div>
							<div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
								<div className="flex items-center gap-2 mb-1.5">
									<Award className="w-4 h-4 text-purple-600" />
									<span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Highest Quality</span>
								</div>
								<p className="font-bold text-gray-900 text-base">{data.scenario_recommendations.highest_quality}</p>
							</div>
							<div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
								<div className="flex items-center gap-2 mb-1.5">
									<TrendingUp className="w-4 h-4 text-emerald-600" />
									<span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Best Overall Value</span>
								</div>
								<p className="font-bold text-gray-900 text-base">{data.scenario_recommendations.best_overall_value}</p>
							</div>
						</div>
					</div>
				)}

				{/* Detailed Comparisons - Collapsible */}
				{data.detailed_comparisons && (
					<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
						<button 
							onClick={() => toggleSection('detailedComparisons')}
							className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="bg-indigo-100 p-2 rounded-lg">
									<BarChart className="w-5 h-5 text-indigo-600" />
								</div>
								<div className="text-left">
									<h4 className="font-bold text-gray-900">Detailed Comparisons</h4>
									<p className="text-sm text-gray-600">In-depth analysis across key dimensions</p>
								</div>
							</div>
							{expandedSections.detailedComparisons ? (
								<ChevronUp className="w-5 h-5 text-gray-400" />
							) : (
								<ChevronDown className="w-5 h-5 text-gray-400" />
							)}
						</button>
						{expandedSections.detailedComparisons && (
							<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3" data-collapsible>
								{data.detailed_comparisons.price_analysis && (
									<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
										<p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1.5">Price Analysis</p>
										<ul className="space-y-1 text-sm text-gray-700">
											{data.detailed_comparisons.price_analysis.split('.').filter(s => s.trim()).map((sentence, idx) => (
												<li key={idx} className="flex items-start gap-2">
													<span className="text-emerald-600 mt-1">•</span>
													<span>{sentence.trim()}.</span>
												</li>
											))}
										</ul>
									</div>
								)}
								{data.detailed_comparisons.timeline_analysis && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
										<p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1.5">Timeline Analysis</p>
										<ul className="space-y-1 text-sm text-gray-700">
											{data.detailed_comparisons.timeline_analysis.split('.').filter(s => s.trim()).map((sentence, idx) => (
												<li key={idx} className="flex items-start gap-2">
													<span className="text-blue-600 mt-1">•</span>
													<span>{sentence.trim()}.</span>
												</li>
											))}
										</ul>
									</div>
								)}
								{data.detailed_comparisons.quality_analysis && (
									<div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
										<p className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-1.5">Quality Analysis</p>
										<ul className="space-y-1 text-sm text-gray-700">
											{data.detailed_comparisons.quality_analysis.split('.').filter(s => s.trim()).map((sentence, idx) => (
												<li key={idx} className="flex items-start gap-2">
													<span className="text-purple-600 mt-1">•</span>
													<span>{sentence.trim()}.</span>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Trade-offs */}
				{data.trade_offs && data.trade_offs.length > 0 && (
					<div className="tradeoff-card">
						<div className="section-header">
							<div className="section-header-icon tradeoff">
								<TrendingUp className="w-5 h-5 text-white" />
							</div>
							<div>
								<h4 className="section-header-title">Important Trade-offs</h4>
								<p className="section-header-subtitle">Key considerations when choosing between contractors</p>
							</div>
						</div>
						<div className="space-y-2">
							{data.trade_offs.slice(0, 5).map((tradeOff, index) => (
								<div key={index} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
									<AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
									<p className="text-sm text-gray-800 font-medium leading-relaxed">{tradeOff}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Negotiation Opportunities */}
				{data.negotiation_opportunities && data.negotiation_opportunities.length > 0 && (
					<div className="negotiation-card">
						<div className="section-header">
							<div className="section-header-icon negotiation">
								<TrendingUp className="w-5 h-5 text-white" />
							</div>
							<div>
								<h4 className="section-header-title">Negotiation Opportunities</h4>
								<p className="section-header-subtitle">Areas where you can potentially improve terms</p>
							</div>
						</div>
						<div className="space-y-2">
							{data.negotiation_opportunities.slice(0, 5).map((opp, index) => (
								<div key={index} className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
									<CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
									<p className="text-sm text-gray-800 font-medium leading-relaxed">{opp}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Next Steps */}
				{data.next_steps && data.next_steps.length > 0 && (
					<div className="next-steps-card">
						<div className="section-header">
							<div className="section-header-icon steps">
								<ClipboardCheck className="w-5 h-5 text-white" />
							</div>
							<div>
								<h4 className="section-header-title">Recommended Next Steps</h4>
								<p className="section-header-subtitle">Action plan to move forward with confidence</p>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{data.next_steps.slice(0, 6).map((step, index) => (
								<div key={index} className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
									<div className="bg-blue-600 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm">
										{index + 1}
									</div>
									<p className="text-sm text-gray-800 font-medium leading-relaxed flex-1">{step}</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Additional Insights - Collapsible */}
				{data.additional_insights && (
					<div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
						<button 
							onClick={() => toggleSection('additionalInsights')}
							className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<div className="bg-purple-100 p-2 rounded-lg">
									<Info className="w-5 h-5 text-purple-600" />
								</div>
								<div className="text-left">
									<h4 className="font-bold text-gray-900">Additional Insights</h4>
									<p className="text-sm text-gray-600">Expert observations and market context</p>
								</div>
							</div>
							{expandedSections.additionalInsights ? (
								<ChevronUp className="w-5 h-5 text-gray-400" />
							) : (
								<ChevronDown className="w-5 h-5 text-gray-400" />
							)}
						</button>
						{expandedSections.additionalInsights && (
							<div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3" data-collapsible>
								{data.additional_insights.market_context && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
										<p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1.5">Market Context</p>
										<p className="text-sm text-gray-700">{data.additional_insights.market_context}</p>
									</div>
								)}
								{data.additional_insights.standout_observations && data.additional_insights.standout_observations.length > 0 && (
									<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
										<p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1.5">Key Observations</p>
										<ul className="space-y-1.5">
											{data.additional_insights.standout_observations.map((obs, idx) => (
												<li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
													<span className="text-amber-600 mt-1">•</span>
													<span>{obs}</span>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>
				)}

			</div>
		);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
				<Text className="ml-3 text-gray-600">Loading analysis report...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<AlertCircle className="w-8 h-8 text-red-600" />
				</div>
				<Heading level={2} className="mb-2">Error Loading Analysis</Heading>
				<Text className="text-gray-600">{error}</Text>
			</div>
		);
	}

	// Render enhanced header for analysis report
	const renderAnalysisHeader = () => {
		const data = extractStructuredData(reportContent) as StructuredAnalysis;
		if (!data) return null;

		const recommendationConfig = getRecommendationConfig(data.recommendation);
		const RecommendationIcon = recommendationConfig.icon;

		// Build location string
		const locationParts = [];
		if (projectData?.address) locationParts.push(projectData.address);
		if (projectData?.city) locationParts.push(projectData.city);
		const locationStr = locationParts.length > 0 ? locationParts.join(", ") : "Location not specified";

		return (
			<div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
				{/* Row 1: Title + Status Badge + Download Button */}
				<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
					<div className="flex-1">
						<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
							Offer Analysis – {offerDetails?.contractor_name || "Contractor"}
						</h1>
					</div>
					
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
						{/* Status Badge with Score */}
						<div className={`${recommendationConfig.badgeColor} px-4 py-2.5 rounded-lg flex items-center gap-2 border-2 ${recommendationConfig.borderColor}`}>
							<RecommendationIcon className="w-5 h-5 flex-shrink-0" />
							<div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
								<span className="font-bold text-sm whitespace-nowrap">
									{recommendationConfig.label}
								</span>
								<span className="text-xs sm:text-sm font-semibold opacity-90">
									· Score {data.overall_score}/5
								</span>
							</div>
						</div>

						{/* Download PDF Button */}
						<button
							onClick={handleDownloadPDF}
							disabled={isGeneratingPDF}
							className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
						>
							{isGeneratingPDF ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									<span className="text-sm">Generating...</span>
								</>
							) : (
								<>
									<Download className="w-4 h-4" />
									<span className="text-sm">Download PDF</span>
								</>
							)}
						</button>
					</div>
				</div>

				{/* Row 2: Context Subtitle */}
				<div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
					<span className="inline-flex items-center gap-1.5 font-medium">
						<FileText className="w-4 h-4 text-gray-500" />
						{getProjectTypeLabel(projectData?.project_type || "general")}
					</span>
					<span className="text-gray-400">·</span>
					<span className="inline-flex items-center gap-1.5">
						<MapPin className="w-4 h-4 text-gray-500" />
						{locationStr}
					</span>
					<span className="text-gray-400">·</span>
					<span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
						<DollarSign className="w-4 h-4" />
						Offer {formatPrice(offerDetails?.total_price, offerDetails?.currency)}
					</span>
					{projectData?.budget && (
						<>
							<span className="text-gray-400">·</span>
							<span className="inline-flex items-center gap-1.5 text-gray-600">
								Budget {formatPrice(projectData.budget, offerDetails?.currency)}
							</span>
						</>
					)}
					{analysisData?.created_at && (
						<>
							<span className="text-gray-400">·</span>
							<span className="inline-flex items-center gap-1.5 text-gray-500 text-xs">
								<Calendar className="w-3.5 h-3.5" />
								{formatDate(analysisData.created_at)}
							</span>
						</>
					)}
				</div>
			</div>
		);
	};

	// Render enhanced header for comparison report
	// const renderComparisonHeader = () => {
	// 	const data = extractStructuredData(reportContent) as StructuredComparison;
	// 	if (!data) return null;
    //
	// 	// Build location string
	// 	const locationParts = [];
	// 	if (projectData?.address) locationParts.push(projectData.address);
	// 	if (projectData?.city) locationParts.push(projectData.city);
	// 	const locationStr = locationParts.length > 0 ? locationParts.join(", ") : "Location not specified";
    //
	// 	// Calculate price range
	// 	let priceRange = "N/A";
	// 	if (data.comparison_matrix && data.comparison_matrix.length > 1) {
	// 		const prices = data.comparison_matrix.map(c => c.total_price || 0).filter(p => p > 0);
	// 		if (prices.length > 0) {
	// 			const minPrice = Math.min(...prices);
	// 			const maxPrice = Math.max(...prices);
	// 			const currency = data.comparison_matrix[0]?.currency || "EUR";
	// 			priceRange = `${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}`;
	// 		}
	// 	}
    //
	// 	return (
	// 		<div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
	// 			{/* Row 1: Title + Download Button */}
	// 			<div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
	// 				<div className="flex-1">
    //
	// 					{data.recommended_contractor && (
	// 						<div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 mt-2">
	// 							<Award className="w-4 h-4" />
	// 							<span className="text-sm font-semibold">
	// 								Top Choice: {data.recommended_contractor}
	// 							</span>
	// 						</div>
	// 					)}
	// 				</div>
	//
	// 				{/* Download PDF Button */}
	// 				<button
	// 					onClick={handleDownloadPDF}
	// 					disabled={isGeneratingPDF}
	// 					className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap self-start"
	// 				>
	// 					{isGeneratingPDF ? (
	// 						<>
	// 							<Loader2 className="w-4 h-4 animate-spin" />
	// 							<span className="text-sm">Generating...</span>
	// 						</>
	// 					) : (
	// 						<>
	// 							<Download className="w-4 h-4" />
	// 							<span className="text-sm">Download PDF</span>
	// 						</>
	// 					)}
	// 				</button>
	// 			</div>
    //
	// 			{/* Row 2: Context Subtitle */}
	// 			<div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
	// 				<span className="inline-flex items-center gap-1.5 font-medium">
	// 					<FileText className="w-4 h-4 text-gray-500" />
	// 					{getProjectTypeLabel(projectData?.project_type || "general")}
	// 				</span>
	// 				<span className="text-gray-400">·</span>
	// 				<span className="inline-flex items-center gap-1.5">
	// 					<MapPin className="w-4 h-4 text-gray-500" />
	// 					{locationStr}
	// 				</span>
	// 				<span className="text-gray-400">·</span>
	// 				<span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
	// 					<DollarSign className="w-4 h-4" />
	// 					Price Range {priceRange}
	// 				</span>
	// 				{projectData?.budget && (
	// 					<>
	// 						<span className="text-gray-400">·</span>
	// 						<span className="inline-flex items-center gap-1.5 text-gray-600">
	// 							Budget {formatPrice(projectData.budget, "EUR")}
	// 						</span>
	// 					</>
	// 				)}
	// 				{analysisData?.created_at && (
	// 					<>
	// 						<span className="text-gray-400">·</span>
	// 						<span className="inline-flex items-center gap-1.5 text-gray-500 text-xs">
	// 							<Calendar className="w-3.5 h-3.5" />
	// 							{formatDate(analysisData.created_at)}
	// 						</span>
	// 					</>
	// 				)}
	// 			</div>
	// 		</div>
	// 	);
	// };

	return (
		<div className="space-y-4">
			{/* Enhanced Page Header */}
			{reportType === "analysis" && renderAnalysisHeader()}
			
			{/* Report Content */}
			<div ref={contentRef}>
				{reportType === "analysis" ? renderAnalysisView() : renderComparisonView()}
				
				{/* Footer note */}
				<div className="mt-6 pt-6 border-t border-gray-200 text-center bg-white rounded-lg">
					<Text className="text-xs text-gray-500">
						Generated on {new Date().toLocaleDateString('en-US', { 
							weekday: 'long', 
							year: 'numeric', 
							month: 'long', 
							day: 'numeric' 
						})}
					</Text>
				</div>
			</div>
		</div>
	);
};

export default AnalysisReportPage;

