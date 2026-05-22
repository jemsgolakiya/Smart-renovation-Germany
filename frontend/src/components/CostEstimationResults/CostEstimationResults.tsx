import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, TrendingUp, Package, Wrench, Users, Sparkles, Lightbulb, PiggyBank } from 'lucide-react';
import { CostEstimate, CostBreakdownItem, CostRiskItem, FinancingInsight, QualityTierEstimate, CostSubcategory, CostLineItem, ExecutiveSummary } from '../../types/financing.types';

interface CostEstimationResultsProps {
  costEstimate: CostEstimate;
  isMultimodal?: boolean;
  filesAnalyzed?: number;
  onGetFinancingOptions?: () => void;
  onGenerateImage?: () => void;
  onFindContractor?: () => void;
  isLoadingFinancing?: boolean;
  isLoadingImage?: boolean;
  saveSuccess?: boolean;
  savedResultId?: number | null;
}

const CostEstimationResults: React.FC<CostEstimationResultsProps> = ({
  costEstimate,
  isMultimodal = false,
  filesAnalyzed = 0,
  onGetFinancingOptions,
  onGenerateImage,
  onFindContractor,
  isLoadingFinancing = false,
  isLoadingImage = false,
  saveSuccess = false,
  savedResultId = null
}) => {
  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // State for expanded subcategories within categories
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [selectedTier, setSelectedTier] = useState<'budget' | 'standard' | 'premium' | 'luxury'>('standard');

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Toggle subcategory expansion
  const toggleSubcategory = (key: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubcategories(newExpanded);
  };

  // Calculate percentage share for progress bars (based on selected tier's total)
  const getPercentageShare = (cost: number): number => {
    const tierTotal = getTierDisplayCost();
    return tierTotal > 0 ? Math.round((cost / tierTotal) * 100) : 0;
  };

  // Get subcategory icon based on name
  const getSubcategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('labor') || lowerName.includes('installation')) {
      return <Users className="w-4 h-4 text-blue-600" />;
    }
    if (lowerName.includes('material') || lowerName.includes('fixture') || lowerName.includes('equipment')) {
      return <Package className="w-4 h-4 text-emerald-600" />;
    }
    return <Wrench className="w-4 h-4 text-gray-600" />;
  };

  // Get current tier data
  const getCurrentTierData = (): QualityTierEstimate | undefined => {
    return costEstimate.qualityTiers?.find(t => t.tier === selectedTier);
  };

  // Get tier display cost
  const getTierDisplayCost = (): number => {
    const tierData = getCurrentTierData();
    return tierData?.totalCost || costEstimate.totalEstimatedCost;
  };

  // Get tier-specific breakdown (use tier's breakdown if available, otherwise scale proportionally)
  const getTierBreakdown = (): CostBreakdownItem[] => {
    const tierData = getCurrentTierData();

    // If tier has its own breakdown, use it
    if (tierData?.breakdown && tierData.breakdown.length > 0) {
      return tierData.breakdown;
    }

    // Otherwise, scale the default breakdown proportionally
    const tierCost = getTierDisplayCost();
    const baseCost = costEstimate.totalEstimatedCost;

    if (baseCost === 0 || tierCost === baseCost) {
      return costEstimate.breakdown;
    }

    const scaleFactor = tierCost / baseCost;

    return costEstimate.breakdown.map(item => ({
      ...item,
      cost: Math.round(item.cost * scaleFactor),
      subcategories: item.subcategories?.map(sub => ({
        ...sub,
        subtotal: Math.round(sub.subtotal * scaleFactor),
        items: sub.items.map(lineItem => ({
          ...lineItem,
          cost: Math.round(lineItem.cost * scaleFactor),
          unitPrice: lineItem.unitPrice ? Math.round(lineItem.unitPrice * scaleFactor) : undefined
        }))
      }))
    }));
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('de-DE');
  };

  // Render line item row
  const renderLineItem = (item: CostLineItem, index: number) => (
    <div key={index} className="grid grid-cols-12 gap-2 py-2 px-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
      <div className="col-span-6 text-gray-700">
        <span>{item.item}</span>
        {item.note && (
          <span className="block text-xs text-gray-500 italic mt-0.5">{item.note}</span>
        )}
      </div>
      <div className="col-span-2 text-right text-gray-500">
        {item.quantity && item.unit && (
          <span>{item.quantity} {item.unit}</span>
        )}
      </div>
      <div className="col-span-2 text-right text-gray-500">
        {item.unitPrice && (
          <span>{formatCurrency(item.unitPrice)} EUR</span>
        )}
      </div>
      <div className="col-span-2 text-right font-medium text-gray-800">
        {formatCurrency(item.cost)} EUR
      </div>
    </div>
  );

  // Render subcategory section
  const renderSubcategory = (subcategory: CostSubcategory, categoryName: string, index: number) => {
    const key = `${categoryName}-${subcategory.name}`;
    const isExpanded = expandedSubcategories.has(key);

    return (
      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden mb-2 last:mb-0">
        {/* Subcategory Header */}
        <div
          className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
          onClick={() => toggleSubcategory(key)}
        >
          <div className="flex items-center gap-2">
            {getSubcategoryIcon(subcategory.name)}
            <span className="font-medium text-gray-700">{subcategory.name}</span>
            <span className="text-xs text-gray-500">({subcategory.items.length} items)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-emerald-700">{formatCurrency(subcategory.subtotal)} EUR</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
        </div>

        {/* Subcategory Items Table */}
        {isExpanded && (
          <div className="bg-white">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <div className="col-span-6">Item Description</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
            {/* Table Rows */}
            {subcategory.items.map((item, idx) => renderLineItem(item, idx))}
            {/* Subtotal Row */}
            <div className="grid grid-cols-12 gap-2 py-2 px-3 bg-emerald-50 border-t border-emerald-200">
              <div className="col-span-10 text-right font-semibold text-emerald-800">Subtotal:</div>
              <div className="col-span-2 text-right font-bold text-emerald-700">{formatCurrency(subcategory.subtotal)} EUR</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* SECTION 1: Cost Overview Card (Hero Section) */}
      {/* ============================================ */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-lg p-8 border border-emerald-200">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left: Title and badges */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-emerald-900">
                {costEstimate.renovationType || 'Renovation'} - Cost Overview
              </h2>
              {isMultimodal && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  AI Vision
                </span>
              )}
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2 mt-4">
              {costEstimate.qualityLevel && (
                <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-semibold rounded-lg flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {costEstimate.qualityLevel} Finish
                </span>
              )}
              {costEstimate.estimatedDuration && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-lg">
                  {costEstimate.estimatedDuration}
                </span>
              )}
              {costEstimate.locationAssumption && (
                <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg">
                  {costEstimate.locationAssumption}
                </span>
              )}
              {isMultimodal && filesAnalyzed > 0 && (
                <span className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg">
                  {filesAnalyzed} file(s) analyzed
                </span>
              )}
            </div>
          </div>

          {/* Right: Big cost number */}
          <div className="text-right">
            <div className="text-sm text-emerald-700 font-medium mb-1">Estimated Total Cost</div>
            <div className="text-5xl font-bold text-emerald-700 tracking-tight">
              {formatCurrency(getTierDisplayCost())}
            </div>
            <div className="text-2xl text-emerald-600">EUR</div>
          </div>
        </div>

        {/* Quality Tier Toggle */}
        {costEstimate.qualityTiers && costEstimate.qualityTiers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-emerald-800">Compare Quality Levels:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {costEstimate.qualityTiers.map((tier) => (
                <button
                  key={tier.tier}
                  onClick={() => setSelectedTier(tier.tier)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedTier === tier.tier
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                  }`}
                >
                  {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                  <span className="ml-2 font-bold">
                    {formatCurrency(tier.totalCost)} EUR
                  </span>
                </button>
              ))}
            </div>

            {/* Show highlights for selected tier */}
            {getCurrentTierData()?.highlights && (
              <div className="mt-3 p-3 bg-white rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Includes:</div>
                <div className="flex flex-wrap gap-2">
                  {getCurrentTierData()?.highlights.map((highlight, idx) => (
                    <span key={idx} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded">
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SECTION 2: AI Executive Summary */}
      {/* ============================================ */}
      {costEstimate.executiveSummary && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border border-indigo-200">
          <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </span>
            AI Executive Summary
          </h3>

          {/* Overview */}
          <div className="mb-5 p-4 bg-white rounded-lg border border-indigo-100">
            <p className="text-gray-700 leading-relaxed">{costEstimate.executiveSummary.overview}</p>
          </div>

          {/* Key Highlights */}
          <div className="mb-5">
            <h4 className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Key Cost Highlights
            </h4>
            <div className="space-y-2">
              {costEstimate.executiveSummary.keyHighlights.map((highlight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-indigo-100">
                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 text-sm">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Drivers */}
          <div className="mb-5 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">Main Cost Drivers</h4>
            <p className="text-amber-900 text-sm leading-relaxed">{costEstimate.executiveSummary.costDrivers}</p>
          </div>

          {/* Recommendation */}
          <div className="mb-5 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              AI Recommendation
            </h4>
            <p className="text-emerald-900 text-sm leading-relaxed">{costEstimate.executiveSummary.recommendation}</p>
          </div>

          {/* Savings Tips */}
          {costEstimate.executiveSummary.savingsTips && costEstimate.executiveSummary.savingsTips.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <PiggyBank className="w-4 h-4" />
                Cost Saving Tips
              </h4>
              <div className="grid md:grid-cols-2 gap-2">
                {costEstimate.executiveSummary.savingsTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-blue-100">
                    <span className="text-blue-500 mt-0.5 font-bold">*</span>
                    <span className="text-blue-800 text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 3: Detailed Cost Breakdown */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          Detailed Cost Breakdown
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Click on each category to see detailed subcategories and line items with individual pricing.
        </p>

        <div className="space-y-3">
          {getTierBreakdown().map((item, index) => {
            const percentage = getPercentageShare(item.cost);
            const isExpanded = expandedCategories.has(item.category);
            const hasSubcategories = item.subcategories && item.subcategories.length > 0;
            const hasDetails = item.details && item.details.length > 0;

            return (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Category Header */}
                <div
                  className={`p-4 cursor-pointer transition-all ${
                    isExpanded ? 'bg-emerald-50' : 'bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleCategory(item.category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-lg">{item.category}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{item.description}</div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-xl font-bold text-emerald-700">{formatCurrency(item.cost)} EUR</div>
                      <div className="text-sm text-gray-500">{percentage}% of total</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    {/* Subcategories with Line Items */}
                    {hasSubcategories ? (
                      <div className="space-y-2">
                        {item.subcategories!.map((subcategory, subIdx) =>
                          renderSubcategory(subcategory, item.category, subIdx)
                        )}

                        {/* Category Total */}
                        <div className="mt-4 p-3 bg-emerald-100 rounded-lg flex justify-between items-center">
                          <span className="font-bold text-emerald-800">Category Total:</span>
                          <span className="text-xl font-bold text-emerald-700">{formatCurrency(item.cost)} EUR</span>
                        </div>
                      </div>
                    ) : hasDetails ? (
                      /* Fallback to simple details list */
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">Included items:</div>
                        <ul className="space-y-1.5 pl-4">
                          {item.details!.map((detail, detailIdx) => (
                            <li key={detailIdx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No detailed breakdown available for this category.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grand Total */}
        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-emerald-100 text-sm">Grand Total (incl. VAT 19%)</div>
              <div className="text-lg font-medium">
                All categories combined
                {costEstimate.qualityTiers && costEstimate.qualityTiers.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500 rounded text-xs">
                    {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} Quality
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(getTierDisplayCost())} EUR</div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 4: Assumptions (Trust Building) */}
      {/* ============================================ */}
      {costEstimate.assumptions && costEstimate.assumptions.length > 0 && (
        <div className="bg-blue-50 rounded-xl shadow-md p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Cost Assumptions
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {costEstimate.assumptions.map((assumption, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded-lg">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-blue-800 text-sm">{assumption}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 5: Risks & Cost Sensitivity */}
      {/* ============================================ */}
      {costEstimate.risks && costEstimate.risks.length > 0 && (
        <div className="bg-amber-50 rounded-xl shadow-md p-6 border border-amber-200">
          <h3 className="text-lg font-bold text-amber-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Cost Sensitivity & Risks
          </h3>
          <div className="space-y-2">
            {costEstimate.risks.map((risk, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    risk.likelihood === 'high' ? 'bg-red-500' :
                    risk.likelihood === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <span className="text-gray-800 font-medium">{risk.factor}</span>
                    {risk.likelihood && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        risk.likelihood === 'high' ? 'bg-red-100 text-red-700' :
                        risk.likelihood === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {risk.likelihood} likelihood
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-lg">
                  {risk.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 6: Financing Readiness */}
      {/* ============================================ */}
      {costEstimate.financingInsights && costEstimate.financingInsights.length > 0 && (
        <div className="bg-green-50 rounded-xl shadow-md p-6 border border-green-200">
          <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Financing Readiness
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {costEstimate.financingInsights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                insight.eligible ? 'bg-white border border-green-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                {insight.eligible ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}
                <span className={`text-sm ${insight.eligible ? 'text-green-800' : 'text-amber-800'}`}>
                  {insight.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SECTION 7: Action Buttons */}
      {/* ============================================ */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">What would you like to do next?</h3>

        {/* Auto-Save Success Message */}
        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 text-sm">
              Results auto-saved {savedResultId && `(ID: ${savedResultId})`}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Financing Options Button */}
          {onGetFinancingOptions && (
            <button
              onClick={onGetFinancingOptions}
              disabled={isLoadingFinancing}
              className="flex flex-col items-center p-6 border-2 border-emerald-600 rounded-xl hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h4 className="font-semibold text-emerald-800 mb-2">Get Financing Options</h4>
              <p className="text-sm text-gray-600 text-center">
                {isLoadingFinancing ? 'Analyzing...' : 'Explore loans, grants & subsidies'}
              </p>
            </button>
          )}

          {/* Generate Image Button */}
          {onGenerateImage && (
            <button
              onClick={onGenerateImage}
              disabled={isLoadingImage}
              className="flex flex-col items-center p-6 border-2 border-blue-600 rounded-xl hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-12 h-12 mb-3 group-hover:scale-110 transition-transform bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h4 className="font-semibold text-blue-800 mb-2">Generate Image</h4>
              <p className="text-sm text-gray-600 text-center">
                {isLoadingImage ? 'Generating...' : 'Visualize your renovation'}
              </p>
            </button>
          )}

          {/* Find Contractor Button */}
          {onFindContractor && (
            <button
              onClick={onFindContractor}
              className="flex flex-col items-center p-6 border-2 border-purple-600 rounded-xl hover:bg-purple-50 transition group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👷</div>
              <h4 className="font-semibold text-purple-800 mb-2">Find Contractors</h4>
              <p className="text-sm text-gray-600 text-center">
                Go to contractor matching
              </p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostEstimationResults;
