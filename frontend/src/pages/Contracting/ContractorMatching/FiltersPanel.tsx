/**
 * Filters Panel Component
 * Collapsible accordion sections for filtering contractors
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { FilterState, TernaryFilter } from '../../../types/contractorMatching.types';

interface FiltersPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isMobileOpen: boolean;
  onMobileToggle: () => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filters,
  onFiltersChange,
  isMobileOpen,
  onMobileToggle,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['location', 'qualifications'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const renderTernarySelect = (
    value: TernaryFilter,
    onChange: (value: TernaryFilter) => void,
    label: string
  ) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TernaryFilter)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="either">Either</option>
        <option value="yes">Yes</option>
        <option value="unknown">Unknown/No</option>
      </select>
    </div>
  );

  const panelContent = (
    <div className="space-y-2">
      {/* Location & Distance */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('location')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900">Location & Distance</span>
          {expandedSections.has('location') ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {expandedSections.has('location') && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Radius: {filters.location.radius_km} km
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.location.radius_km}
              onChange={(e) => onFiltersChange({
                ...filters,
                location: {
                  ...filters.location,
                  radius_km: parseInt(e.target.value)
                }
              })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0 km</span>
              <span>100 km</span>
            </div>
          </div>
        )}
      </div>

      {/* Qualifications */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('qualifications')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900">Qualifications</span>
          {expandedSections.has('qualifications') ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {expandedSections.has('qualifications') && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            {renderTernarySelect(
              filters.qualifications.insurance_stated,
              (value) => onFiltersChange({
                ...filters,
                qualifications: {
                  ...filters.qualifications,
                  insurance_stated: value
                }
              }),
              'Insurance Stated'
            )}
            {renderTernarySelect(
              filters.qualifications.hwk_listed,
              (value) => onFiltersChange({
                ...filters,
                qualifications: {
                  ...filters.qualifications,
                  hwk_listed: value
                }
              }),
              'HWK Chamber Listed'
            )}
            {renderTernarySelect(
              filters.qualifications.kfw_certified,
              (value) => onFiltersChange({
                ...filters,
                qualifications: {
                  ...filters.qualifications,
                  kfw_certified: value
                }
              }),
              'KfW-Certified'
            )}
          </div>
        )}
      </div>

      {/* Experience & Specialties */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('experience')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900">Experience & Specialties</span>
          {expandedSections.has('experience') ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {expandedSections.has('experience') && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            {renderTernarySelect(
              filters.experience.altbau_experience,
              (value) => onFiltersChange({
                ...filters,
                experience: {
                  ...filters.experience,
                  altbau_experience: value
                }
              }),
              'Altbau Experience'
            )}
            {renderTernarySelect(
              filters.experience.denkmal_experience,
              (value) => onFiltersChange({
                ...filters,
                experience: {
                  ...filters.experience,
                  denkmal_experience: value
                }
              }),
              'Denkmal Experience'
            )}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min. Years in Business: {filters.experience.min_years_in_business}
              </label>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={filters.experience.min_years_in_business}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  experience: {
                    ...filters.experience,
                    min_years_in_business: parseInt(e.target.value)
                  }
                })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('availability')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="font-semibold text-gray-900">Availability</span>
          {expandedSections.has('availability') ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {expandedSections.has('availability') && (
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.availability.can_start_within_4_weeks}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  availability: {
                    ...filters.availability,
                    can_start_within_4_weeks: e.target.checked
                  }
                })}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              Can start within 4 weeks
            </label>
          </div>
        )}
      </div>

      {/* Reset Button */}
      <button
        onClick={() => {
          // Reset to default filters
          onFiltersChange({
            location: { radius_km: 50, service_areas: [] },
            availability: { can_start_within_4_weeks: false },
            qualifications: {
              insurance_stated: 'either',
              hwk_listed: 'either',
              kfw_certified: 'either',
            },
            experience: {
              altbau_experience: 'either',
              denkmal_experience: 'either',
              min_years_in_business: 0,
            },
            contract_preference: { contract_type: 'either' },
            languages: { languages: [] },
          });
        }}
        className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
      >
        Reset All Filters
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onMobileToggle}
        className="lg:hidden fixed bottom-20 right-4 z-30 bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
      >
        <SlidersHorizontal className="w-6 h-6" />
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0">
        <div className="sticky top-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            Filters
          </h3>
          {panelContent}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={onMobileToggle}>
          <div
            className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filters
                </h3>
                <button
                  onClick={onMobileToggle}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
              {panelContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
