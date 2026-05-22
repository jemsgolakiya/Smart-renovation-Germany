/**
 * Compare Modal Component
 * Side-by-side comparison of 2-4 contractors
 */

import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ContractorProfile } from '../../../types/contractorMatching.types';
import { Badge } from '../../../components/Bagde/Badge';

interface CompareModalProps {
  contractors: ContractorProfile[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveFromShortlist: (contractor: ContractorProfile) => void;
  onSelectForInvitation: (contractorIds: number[]) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  contractors,
  isOpen,
  onClose,
  onRemoveFromShortlist,
  onSelectForInvitation,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(contractors.map(c => c.id).filter((id): id is number => id !== undefined))
  );

  if (!isOpen || contractors.length === 0) return null;

  const toggleSelection = (id: number | undefined) => {
    if (id === undefined) return;
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleInviteSelected = () => {
    onSelectForInvitation(Array.from(selectedIds));
    onClose();
  };

  const renderComparisonRow = (
    label: string,
    getValue: (contractor: ContractorProfile) => React.ReactNode
  ) => (
    <tr className="border-t border-gray-200">
      <td className="p-3 bg-gray-50 font-medium text-sm text-gray-700 sticky left-0">
        {label}
      </td>
      {contractors.map(contractor => (
        <td key={contractor.id ?? `contractor-${Math.random()}`} className="p-3 text-sm text-gray-900 text-center">
          {getValue(contractor)}
        </td>
      ))}
    </tr>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-10 z-50 bg-white rounded-2xl shadow-2xl flex flex-col max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              Compare Contractors
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Compare up to 4 contractors side-by-side
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 bg-gray-100 font-semibold text-left sticky left-0 z-10"></th>
                {contractors.map(contractor => (
                  <th key={contractor.id ?? `contractor-${Math.random()}`} className="p-3 bg-gray-100 min-w-[200px]">
                    <div className="text-center">
                      <p className="font-bold text-gray-900 mb-2">{contractor.name}</p>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contractor.id !== undefined && selectedIds.has(contractor.id)}
                          onChange={() => toggleSelection(contractor.id)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                          disabled={contractor.id === undefined}
                        />
                        <span className="text-xs text-gray-600">Select for invitation</span>
                      </label>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Basic Info */}
              {renderComparisonRow('Location', c => `${c.city}, ${c.state}`)}
              {renderComparisonRow('Distance', c => 
                c.distance_km !== undefined ? `${Number(c.distance_km).toFixed(1)} km` : 'N/A'
              )}
              {renderComparisonRow('Rating', c => 
                c.rating !== null && c.rating !== undefined ? (
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-semibold">{Number(c.rating).toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({c.reviews_count})</span>
                  </div>
                ) : 'No rating'
              )}

              {/* Qualifications */}
              <tr className="bg-gray-50">
                <td colSpan={contractors.length + 1} className="p-2 font-bold text-sm text-gray-700">
                  Qualifications
                </td>
              </tr>
              {renderComparisonRow('Insurance', c => 
                c.signals?.insurance_stated ? (
                  <Badge className="bg-green-100 text-green-800 text-xs">✓ Stated</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600 text-xs">Unknown</Badge>
                )
              )}
              {renderComparisonRow('HWK Listed', c => 
                c.signals?.hwk_listed ? (
                  <Badge className="bg-purple-100 text-purple-800 text-xs">✓ Listed</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600 text-xs">Unknown</Badge>
                )
              )}
              {renderComparisonRow('KfW Certified', c => 
                c.kfw_eligible ? (
                  <Badge className="bg-blue-100 text-blue-800 text-xs">✓ Certified</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600 text-xs">No</Badge>
                )
              )}

              {/* Experience */}
              <tr className="bg-gray-50">
                <td colSpan={contractors.length + 1} className="p-2 font-bold text-sm text-gray-700">
                  Experience
                </td>
              </tr>
              {renderComparisonRow('Years in Business', c => 
                c.years_in_business ? `${c.years_in_business} years` : 'N/A'
              )}
              {renderComparisonRow('Altbau Experience', c => 
                c.signals?.altbau_experience ? (
                  <Badge className="bg-amber-100 text-amber-800 text-xs">✓ Yes</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600 text-xs">Unknown</Badge>
                )
              )}
              {renderComparisonRow('Denkmal Experience', c => 
                c.signals?.denkmal_experience ? (
                  <Badge className="bg-orange-100 text-orange-800 text-xs">✓ Yes</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600 text-xs">Unknown</Badge>
                )
              )}

              {/* Match Score */}
              <tr className="bg-gray-50">
                <td colSpan={contractors.length + 1} className="p-2 font-bold text-sm text-gray-700">
                  Match Analysis
                </td>
              </tr>
              {renderComparisonRow('Match Score', c => 
                c.matchScore ? (
                  <div className={`
                    inline-block px-3 py-1 rounded-full font-bold text-sm
                    ${c.matchScore.total >= 80
                      ? 'bg-emerald-600 text-white'
                      : c.matchScore.total >= 60
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-white'
                    }
                  `}>
                    {c.matchScore.total}%
                  </div>
                ) : 'N/A'
              )}
              {renderComparisonRow('Why This Match', c => 
                <p className="text-xs text-left">{c.matchScore?.whyMatch || 'N/A'}</p>
              )}

              {/* Risk Flags */}
              {renderComparisonRow('Risk Flags', c => 
                c.riskFlags && c.riskFlags.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {c.riskFlags.slice(0, 2).map((flag, idx) => (
                      <div
                        key={idx}
                        className={`
                          text-xs px-2 py-1 rounded flex items-center gap-1
                          ${flag.type === 'warning'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                          }
                        `}
                      >
                        {flag.type === 'warning' && <AlertTriangle className="w-3 h-3" />}
                        {flag.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    No flags
                  </Badge>
                )
              )}

              {/* Actions */}
              {renderComparisonRow('Actions', c => (
                <button
                  onClick={() => onRemoveFromShortlist(c)}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                  disabled={c.id === undefined}
                >
                  Remove from Shortlist
                </button>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {selectedIds.size} {selectedIds.size === 1 ? 'contractor' : 'contractors'} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInviteSelected}
              disabled={selectedIds.size === 0}
              className={`
                px-6 py-2 rounded-lg font-medium transition-colors
                ${selectedIds.size > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Invite Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
