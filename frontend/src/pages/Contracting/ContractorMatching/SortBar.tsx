/**
 * Sort Bar Component
 * Dropdown for sorting options and view mode toggle
 */

import React from 'react';
import { Grid3x3, List } from 'lucide-react';
import { SortOption, ViewMode } from '../../../types/contractorMatching.types';

interface SortBarProps {
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  totalCount: number;
  filteredCount: number;
}

export const SortBar: React.FC<SortBarProps> = ({
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
}) => {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'best_match', label: 'Best Match (AI Ranked)' },
    { value: 'distance', label: 'Distance (Nearest First)' },
    { value: 'rating', label: 'Rating (Highest First)' },
    { value: 'years_in_business', label: 'Years in Business' },
    { value: 'availability', label: 'Availability (Earliest)' },
  ];

  return (
    <div className="flex items-center justify-between mb-4 p-3 bg-white border border-gray-200 rounded-lg">
      {/* Left: Sort Dropdown */}
      <div className="flex items-center gap-3">
        <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
          Sort by:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Center: Results Count */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold">{filteredCount}</span>
        {filteredCount !== totalCount && (
          <span> of {totalCount}</span>
        )}
        {filteredCount === 1 ? ' contractor' : ' contractors'}
      </div>

      {/* Right: View Mode Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`
            p-1.5 rounded transition-colors
            ${viewMode === 'grid'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          title="Grid view"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`
            p-1.5 rounded transition-colors
            ${viewMode === 'list'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
          `}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
