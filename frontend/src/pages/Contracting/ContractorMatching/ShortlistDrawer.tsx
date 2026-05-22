/**
 * Shortlist Drawer Component
 * Slide-up drawer showing shortlisted contractors grouped by role
 */

import React from 'react';
import { X, Users, GitCompare } from 'lucide-react';
import { ShortlistItem, ContractorRole, ContractorProfile } from '../../../types/contractorMatching.types';
import { ROLE_LABELS } from '../../../utils/contractorMatchingUtils';

interface ShortlistDrawerProps {
  shortlist: ShortlistItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (contractor: ContractorProfile) => void;
  onCompare: () => void;
  onInviteAll: () => void;
}

export const ShortlistDrawer: React.FC<ShortlistDrawerProps> = ({
  shortlist,
  isOpen,
  onClose,
  onRemove,
  onCompare,
  onInviteAll,
}) => {
  if (!isOpen) return null;

  // Group by role
  const groupedByRole: Record<ContractorRole, ShortlistItem[]> = {} as any;
  shortlist.forEach(item => {
    if (!groupedByRole[item.role]) {
      groupedByRole[item.role] = [];
    }
    groupedByRole[item.role].push(item);
  });

  const canCompare = shortlist.length >= 2 && shortlist.length <= 4;
  const canInvite = shortlist.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[60vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Shortlist ({shortlist.length})
              </h3>
              <p className="text-sm text-gray-600">
                {Object.keys(groupedByRole).length} {Object.keys(groupedByRole).length === 1 ? 'role' : 'roles'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {shortlist.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No contractors shortlisted yet</p>
              <p className="text-xs mt-1">Select contractors from the list to add them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByRole).map(([role, items]) => (
                <div key={role}>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    {ROLE_LABELS[role as ContractorRole]} ({items.length})
                  </h4>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div
                        key={item.contractor.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {item.contractor.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.contractor.city}, {item.contractor.state}
                            {item.contractor.distance_km !== undefined && (
                              <span className="ml-2">• {Number(item.contractor.distance_km).toFixed(1)} km</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemove(item.contractor)}
                          className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove from shortlist"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Action Buttons */}
        {shortlist.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            <button
              onClick={onCompare}
              disabled={!canCompare}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors
                ${canCompare
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
              title={!canCompare ? 'Select 2-4 contractors to compare' : 'Compare selected contractors'}
            >
              <GitCompare className="w-5 h-5" />
              <span>Compare ({shortlist.length})</span>
            </button>
            <button
              onClick={onInviteAll}
              disabled={!canInvite}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors
                ${canInvite
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Users className="w-5 h-5" />
              <span>Invite All ({shortlist.length})</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Floating Action Button to toggle the drawer
 */
interface ShortlistFABProps {
  count: number;
  onClick: () => void;
}

export const ShortlistFAB: React.FC<ShortlistFABProps> = ({ count, onClick }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 flex items-center gap-2"
    >
      <Users className="w-5 h-5" />
      <span className="font-semibold">View Shortlist ({count})</span>
    </button>
  );
};
