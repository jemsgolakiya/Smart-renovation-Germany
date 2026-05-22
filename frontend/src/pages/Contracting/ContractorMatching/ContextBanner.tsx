/**
 * Context Banner Component
 * Shows project context derived from PlanData at the top of the screen
 */

import React from 'react';
import { Users } from 'lucide-react';
import { PlanData } from '../../../types/contractorMatching.types';
import { Badge } from '../../../components/Bagde/Badge';

interface ContextBannerProps {
  planData: PlanData | null;
}

export const ContextBanner: React.FC<ContextBannerProps> = ({ planData }) => {
  if (!planData) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200 p-4 mb-6 animate-pulse">
        <div className="h-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const { project_summary, permits } = planData;
  const isKfWReady = project_summary.funding_readiness === 'Good Match';

  const complexityColors = {
    Low: 'bg-green-100 text-green-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200 p-4 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Left: Phase Indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">
              Contractor Selection
            </h2>
            <p className="text-sm text-gray-600">
              Find and shortlist qualified contractors
            </p>
          </div>
        </div>

        {/* Center/Right: Project Summary */}
        <div className="flex-1 flex flex-wrap items-center gap-2 md:gap-4 md:ml-auto">
          {/* Budget */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="text-xs font-medium text-gray-600">Budget:</span>
            <span className="text-sm font-bold text-gray-900">
              {project_summary.total_estimated_cost}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-emerald-200">
            <span className="text-xs font-medium text-gray-600">Duration:</span>
            <span className="text-sm font-bold text-gray-900">
              {project_summary.total_duration}
            </span>
          </div>

          {/* Complexity */}
          <Badge className={complexityColors[project_summary.complexity_level]}>
            {project_summary.complexity_level} Complexity
          </Badge>

          {/* KfW-ready indicator */}
          {isKfWReady && (
            <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
              ✓ KfW-ready
            </Badge>
          )}
        </div>
      </div>

      {/* Key Considerations (if any) */}
      {project_summary.key_considerations?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <p className="text-xs font-medium text-gray-600 mb-2">Key Considerations:</p>
          <div className="flex flex-wrap gap-2">
            {project_summary.key_considerations.slice(0, 3).map((consideration, idx) => (
              <span
                key={idx}
                className="text-xs bg-white px-2 py-1 rounded border border-emerald-200 text-gray-700"
              >
                {consideration}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
