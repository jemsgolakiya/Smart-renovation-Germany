/**
 * Role Selector Component
 * Horizontal tabs for selecting contractor roles (required vs optional)
 */

import React from 'react';
import { Role, ContractorRole } from '../../../types/contractorMatching.types';
import { Badge } from '../../../components/Bagde/Badge';

interface RoleSelectorProps {
  requiredRoles: Role[];
  optionalRoles: Role[];
  activeRole: ContractorRole | null;
  shortlistCounts: Record<ContractorRole, number>;
  onRoleChange: (role: ContractorRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  requiredRoles,
  optionalRoles,
  activeRole,
  shortlistCounts,
  onRoleChange,
}) => {
  const renderRoleTab = (role: Role, isRequired: boolean) => {
    const isActive = activeRole === role.key;
    const shortlisted = shortlistCounts[role.key] || 0;
    const target = role.target_count;
    const isComplete = shortlisted >= target;

    return (
      <button
        key={role.key}
        onClick={() => onRoleChange(role.key)}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap
          ${isActive
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold shadow-sm'
            : isRequired
            ? 'border-gray-300 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
          }
        `}
      >
        <span className={isRequired ? 'font-medium' : 'font-normal'}>
          {role.label}
        </span>
        
        {isRequired && (
          <Badge
            className={`
              text-xs px-2 py-0.5
              ${isComplete
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-200 text-gray-700'
              }
            `}
          >
            {shortlisted}/{target}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <div className="mb-6">
      {/* Required Roles */}
      {requiredRoles.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
            Required Roles
          </p>
          <div className="flex flex-wrap gap-2">
            {requiredRoles.map(role => renderRoleTab(role, true))}
          </div>
        </div>
      )}

      {/* Optional Roles */}
      {optionalRoles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Optional Roles
          </p>
          <div className="flex flex-wrap gap-2">
            {optionalRoles.map(role => renderRoleTab(role, false))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {requiredRoles.length === 0 && optionalRoles.length === 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">
            No contractor roles identified. Please complete the planning phase first.
          </p>
        </div>
      )}
    </div>
  );
};
