/**
 * Guidance Panel Component
 * Sticky sidebar showing selection progress and recommendations
 */

import React from 'react';
import { CheckCircle2, Circle, AlertCircle, Info } from 'lucide-react';
import { ContractorRole, PlanData, Role } from '../../../types/contractorMatching.types';

interface GuidancePanelProps {
  planData: PlanData | null;
  requiredRoles: Role[];
  activeRole: ContractorRole | null;
  shortlistCounts: Record<ContractorRole, number>;
  totalShortlisted: number;
}

export const GuidancePanel: React.FC<GuidancePanelProps> = ({
  planData,
  requiredRoles,
  activeRole,
  shortlistCounts,
  totalShortlisted,
}) => {
  const renderProgressStep = (
    stepNumber: number,
    title: string,
    isComplete: boolean,
    isCurrent: boolean
  ) => (
    <div className="flex items-start gap-3">
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
          ${isComplete
            ? 'bg-emerald-600 text-white'
            : isCurrent
            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600'
            : 'bg-gray-200 text-gray-600'
          }
        `}
      >
        {isComplete ? <CheckCircle2 className="w-5 h-5" /> : stepNumber}
      </div>
      <div className="flex-1 pt-1">
        <p className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-600'}`}>
          {title}
        </p>
      </div>
    </div>
  );

  // Calculate completion status
  const rolesWithSufficientContractors = requiredRoles.filter(
    role => (shortlistCounts[role.key] || 0) >= role.target_count
  );
  const allRolesCovered = rolesWithSufficientContractors.length === requiredRoles.length;

  // Current step logic
  const hasSelectedRoles = requiredRoles.length > 0;
  const hasShortlisted = totalShortlisted > 0;
  const hasEnoughForComparison = totalShortlisted >= 2;
  const isReadyToInvite = allRolesCovered && totalShortlisted >= 3;

  return (
    <div className="hidden xl:block w-80 flex-shrink-0">
      <div className="sticky top-4 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Selection Progress</h3>

        {/* Progress Steps */}
        <div className="space-y-4 mb-6">
          {renderProgressStep(
            1,
            'Identify required roles',
            hasSelectedRoles,
            !hasSelectedRoles
          )}
          {renderProgressStep(
            2,
            'Review top matches',
            hasShortlisted,
            hasSelectedRoles && !hasShortlisted
          )}
          {renderProgressStep(
            3,
            'Shortlist contractors (3-5 per role)',
            hasEnoughForComparison,
            hasShortlisted && !hasEnoughForComparison
          )}
          {renderProgressStep(
            4,
            'Compare finalists',
            allRolesCovered,
            hasEnoughForComparison && !allRolesCovered
          )}
          {renderProgressStep(
            5,
            'Proceed to invitation',
            isReadyToInvite,
            allRolesCovered && !isReadyToInvite
          )}
        </div>

        {/* Role Coverage */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Role Coverage</h4>
          <div className="space-y-2">
            {requiredRoles.map(role => {
              const count = shortlistCounts[role.key] || 0;
              const target = role.target_count;
              const percentage = Math.min(100, (count / target) * 100);
              const isComplete = count >= target;
              const isActive = activeRole === role.key;

              return (
                <div key={role.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {role.label}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isComplete ? 'text-emerald-700' : 'text-gray-600'
                      }`}
                    >
                      {count}/{target}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isComplete ? 'bg-emerald-600' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Recommendations</h4>
          
          {requiredRoles.length === 0 && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Complete the planning phase to identify required contractor roles.</p>
            </div>
          )}

          {requiredRoles.map(role => {
            const count = shortlistCounts[role.key] || 0;
            const target = role.target_count;

            if (count === 0) {
              return (
                <div key={role.key} className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    No {role.label} contractors shortlisted yet – critical for Phase 5 tasks
                  </p>
                </div>
              );
            } else if (count < target) {
              return (
                <div key={role.key} className="flex items-start gap-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Consider shortlisting {target - count} more {role.label} contractor{target - count > 1 ? 's' : ''} for redundancy
                  </p>
                </div>
              );
            }
            return null;
          })}

          {totalShortlisted >= 5 && !allRolesCovered && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>You've shortlisted {totalShortlisted} contractors. Consider comparing them before adding more.</p>
            </div>
          )}

          {allRolesCovered && (
            <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>All required roles covered! Ready to proceed to invitation.</p>
            </div>
          )}
        </div>

        {/* Phase Context from PlanData */}
        {planData && activeRole && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Phase 5 Context
            </h4>
            {planData.phases.find(p => p.id === 5)?.tasks
              .filter(task => task.task_name.toLowerCase().includes(activeRole.toLowerCase()))
              .slice(0, 2)
              .map((task, idx) => (
                <div key={idx} className="mb-2 text-xs text-gray-700">
                  <p className="font-medium">{task.task_name}</p>
                  <p className="text-gray-600">
                    {task.estimated_time} • {task.estimated_cost}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
