/**
 * Contractor Card Component
 * Displays individual contractor with badges
 */

import React from 'react';
import { Star, MapPin, CheckCircle2 } from 'lucide-react';
import { ContractorProfile, MatchScore } from '../../../types/contractorMatching.types';
import { Badge } from '../../../components/Bagde/Badge';

interface ContractorCardProps {
  contractor: ContractorProfile;
  matchScore?: MatchScore;
  isShortlisted: boolean;
  onToggle: () => void;
}

export const ContractorCard: React.FC<ContractorCardProps> = ({
  contractor,
  matchScore,
  isShortlisted,
  onToggle,
}) => {
  const signals = contractor.signals;

  return (
    <div
      className={`
        border-2 rounded-lg p-5 transition-all cursor-pointer
        ${isShortlisted
          ? 'border-emerald-500 bg-emerald-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
        }
      `}
      onClick={onToggle}
    >
      {/* Header: Name, Rating, Distance */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">
            {contractor.name}
          </h3>
          
          {/* Rating & Distance Row */}
          <div className="flex items-center gap-3 flex-wrap mb-2">
            {/* Rating */}
            {contractor.rating !== null && contractor.rating !== undefined && (
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-900">
                  {Number(contractor.rating).toFixed(1)}
                </span>
                {contractor.reviews_count > 0 && (
                  <span className="text-xs text-gray-500">
                    ({contractor.reviews_count})
                  </span>
                )}
              </div>
            )}

            {/* Distance */}
            {contractor.distance_km !== undefined && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{Number(contractor.distance_km).toFixed(1)} km</span>
              </div>
            )}
          </div>

          {/* AI-Generated Description */}
          {contractor.ai_description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {contractor.ai_description}
            </p>
          )}
        </div>
      </div>

      {/* Badge Row: Qualifications & Experience - Only show POSITIVE signals */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Verified Certifications (only if true) */}
        {signals?.hwk_listed === true && (
          <Badge className="bg-green-100 text-green-800 text-xs" title={signals.hwk_chamber || 'HWK Chamber member'}>
            ✓ HWK{signals.hwk_chamber ? ` (${signals.hwk_chamber})` : ''}
          </Badge>
        )}
        {signals?.meisterbetrieb === true && (
          <Badge className="bg-teal-100 text-teal-800 text-xs">
            ✓ Meisterbetrieb
          </Badge>
        )}
        {signals?.kfw_certified === true && (
          <Badge className="bg-purple-100 text-purple-800 text-xs">
            ✓ KfW Certified
          </Badge>
        )}
        {signals?.insurance_stated === true && (
          <Badge className="bg-emerald-100 text-emerald-800 text-xs">
            ✓ Insured
          </Badge>
        )}
        
        {/* Experience badges (only if true) */}
        {signals?.altbau_experience === true && (
          <Badge className="bg-amber-100 text-amber-800 text-xs">
            Altbau
          </Badge>
        )}
        {signals?.denkmal_experience === true && (
          <Badge className="bg-orange-100 text-orange-800 text-xs">
            Denkmal
          </Badge>
        )}
        
        {/* Years in business */}
        {contractor.years_in_business !== null && contractor.years_in_business > 0 && (
          <Badge className="bg-gray-100 text-gray-700 text-xs">
            {contractor.years_in_business}y exp
          </Badge>
        )}
      </div>

      {/* Shortlist Action */}
      <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isShortlisted}
            onChange={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700">
            {isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}
          </span>
        </div>

        {isShortlisted && (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        )}
      </div>

      {/* Location Info */}
      {contractor.city && contractor.state && (
        <p className="mt-2 text-xs text-gray-500">
          {contractor.city}, {contractor.state}
        </p>
      )}
    </div>
  );
};
