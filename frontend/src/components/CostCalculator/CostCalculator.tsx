import React from 'react';
import { Calculator, TrendingUp, AlertCircle, Info, Euro } from 'lucide-react';

interface CostBreakdownItem {
  category: string;
  cost: number;
  description: string;
}

interface CostCalculatorProps {
  totalEstimatedCost: number;
  breakdown: CostBreakdownItem[];
  contingency: number;
  explanation: string;
  userBudget: number;
}

const CostCalculator: React.FC<CostCalculatorProps> = ({
  totalEstimatedCost,
  breakdown,
  contingency,
  explanation,
  userBudget
}) => {
  const budgetDifference = totalEstimatedCost - userBudget;
  const isOverBudget = budgetDifference > 0;
  const budgetPercentage = (userBudget / totalEstimatedCost) * 100;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 p-2 rounded-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">AI-Powered Cost Estimate</h2>
        </div>
        <p className="text-blue-100 text-sm">
          Detailed breakdown based on current German market prices (2025)
        </p>
      </div>

      {/* Total Cost Banner */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Estimated Total Project Cost</p>
            <p className="text-4xl font-bold text-gray-900">{formatCurrency(totalEstimatedCost)}</p>
          </div>
          <div className="bg-white rounded-full p-4 shadow-md">
            <Euro className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Budget Comparison */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your Budget</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(userBudget)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all ${
                isOverBudget ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {isOverBudget ? 'Additional financing needed' : 'Within budget'}
            </span>
            <span className={`text-sm font-semibold ${
              isOverBudget ? 'text-amber-600' : 'text-green-600'
            }`}>
              {isOverBudget ? '+' : ''}{formatCurrency(Math.abs(budgetDifference))}
            </span>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Detailed Cost Breakdown
        </h3>

        <div className="space-y-3">
          {breakdown.map((item, index) => {
            const percentage = (item.cost / totalEstimatedCost) * 100;
            const isContingency = item.category.toLowerCase().includes('contingency');

            return (
              <div
                key={index}
                className={`rounded-lg p-4 border-2 transition-all ${
                  isContingency
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{item.category}</h4>
                      {isContingency && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          Safety Buffer
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(item.cost)}</p>
                    <p className="text-xs text-gray-500">{percentage.toFixed(1)}% of total</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isContingency ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="p-6 pt-0">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Cost Analysis Notes</h4>
            <p className="text-sm text-blue-800">{explanation}</p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {isOverBudget && (
        <div className="p-6 pt-0">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">Financing Gap Identified</h4>
              <p className="text-sm text-amber-800">
                Your project requires an additional <strong>{formatCurrency(budgetDifference)}</strong> in financing.
                Review the prioritized financing recommendations below to find the best options for covering this gap.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCalculator;
