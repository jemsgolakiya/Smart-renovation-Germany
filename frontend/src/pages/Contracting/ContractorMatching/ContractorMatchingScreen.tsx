/**
 * Contractor Matching Screen - Main Component
 * Sophisticated contractor selection system integrated with PlanData
 */

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Project } from '../../../services/projects';
import { searchContractorsByRole, geocodeAddress, deriveContractorRoles, LocationCoordinates } from '../../../services/googlePlaces';
import {
  PlanData,
  ContractorProfile,
  ContractorRole,
  Role,
  FilterState,
  SortOption,
  ViewMode,
  ShortlistItem,
} from '../../../types/contractorMatching.types';
import {
  deriveRequiredRoles as deriveRequiredRolesFallback,
  applyFilters,
  calculateMatchScore,
  generateRiskFlags,
  sortContractors,
  getDefaultFilters,
} from '../../../utils/contractorMatchingUtils';

// Components
import { ContextBanner } from './ContextBanner';
import { RoleSelector } from './RoleSelector';
import { SortBar } from './SortBar';
import { FiltersPanel } from './FiltersPanel';
import { ContractorCard } from './ContractorCard';
import { GuidancePanel } from './GuidancePanel';
import { ShortlistDrawer, ShortlistFAB } from './ShortlistDrawer';
import { CompareModal } from './CompareModal';

interface ContractorMatchingScreenProps {
  selectedProject: Project;
  planData: PlanData | null;
  onProceedToInvite: (contractorIds: number[]) => void;
}

export const ContractorMatchingScreen: React.FC<ContractorMatchingScreenProps> = ({
  selectedProject,
  planData,
  onProceedToInvite,
}) => {
  // State: Roles
  const [requiredRoles, setRequiredRoles] = useState<Role[]>([]);
  const [optionalRoles] = useState<Role[]>([]);
  const [activeRole, setActiveRole] = useState<ContractorRole | null>(null);

  // State: Project Location
  const [projectLocation, setProjectLocation] = useState<LocationCoordinates | null>(null);

  // State: Contractors
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State: Contractor cache (per role)
  const [contractorCache, setContractorCache] = useState<Record<ContractorRole, ContractorProfile[]>>({} as Record<ContractorRole, ContractorProfile[]>);

  // State: Filters & Sorting
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters(planData));
  const [sortBy, setSortBy] = useState<SortOption>('best_match');
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list view

  // State: Shortlist
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [shortlistDrawerOpen, setShortlistDrawerOpen] = useState(false);

  // State: Compare
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // State: Filters mobile
  const [filtersMobileOpen, setFiltersMobileOpen] = useState(false);

  // Geocode project address on mount
  useEffect(() => {
    if (selectedProject) {
      const geocodeProject = async () => {
        const coords = await geocodeAddress(
          selectedProject.address,
          selectedProject.city,
          selectedProject.state,
          selectedProject.postal_code
        );
        if (coords) {
          setProjectLocation(coords);
        } else {
          console.warn('Failed to geocode project address');
        }
      };
      geocodeProject();
    }
  }, [selectedProject]);

  // Derive required roles on mount using Gemini AI
  useEffect(() => {
    if (planData) {
      const deriveRoles = async () => {
        try {
          // Try Gemini AI first
          const geminiRoles = await deriveContractorRoles(planData);
          
          if (geminiRoles && geminiRoles.length > 0) {
            // Convert to Role format
            const roles: Role[] = geminiRoles.map(r => ({
              key: r.role,
              label: r.label,
              required: r.required,
              target_count: r.target_count,
            }));
            
            setRequiredRoles(roles);
            if (roles.length > 0 && !activeRole) {
              setActiveRole(roles[0].key);
            }
            
            console.log('✨ Gemini-derived roles:', geminiRoles.map(r => 
              `${r.role} (${r.reasoning})`
            ));
          } else {
            // Fallback to hardcoded logic
            console.warn('Gemini role derivation returned no roles, using fallback');
            const roles = deriveRequiredRolesFallback(planData);
            setRequiredRoles(roles);
            if (roles.length > 0 && !activeRole) {
              setActiveRole(roles[0].key);
            }
          }
        } catch (error) {
          console.error('Gemini role derivation failed, using fallback:', error);
          // Fallback to hardcoded logic
          const roles = deriveRequiredRolesFallback(planData);
          setRequiredRoles(roles);
          if (roles.length > 0 && !activeRole) {
            setActiveRole(roles[0].key);
          }
        }
      };
      
      deriveRoles();
      // Update default filters based on PlanData
      setFilters(getDefaultFilters(planData));
    }
  }, [planData]);

  // Fetch contractors when role changes (with caching) or when radius changes (invalidate cache)
  useEffect(() => {
    if (!projectLocation || !activeRole) return;

    // Check if we already have cached contractors for this role
    if (contractorCache[activeRole]) {
      console.log(`✅ Using cached contractors for ${activeRole}`);
      setContractors(contractorCache[activeRole]);
      return;
    }

    const fetchContractors = async () => {
      console.log(`🔍 Fetching contractors for ${activeRole}...`);
      setLoading(true);
      setError(null);
      try {
        const data = await searchContractorsByRole(
          activeRole,
          projectLocation,
          filters.location.radius_km,
          planData || undefined
        );
        
        // Add match scores and risk flags to contractors
        // Note: Signals are now enriched by backend via Gemini batch analysis
        const enriched = data.map(contractor => {
          const profile: ContractorProfile = {
            ...contractor,
            // Backend already includes 'signals' from batch enrichment
          };

          // Calculate match score
          profile.matchScore = calculateMatchScore(profile, planData, activeRole);

          // Generate risk flags
          profile.riskFlags = generateRiskFlags(profile);

          return profile;
        });
        
        setContractors(enriched);
        
        // Cache the results for this role
        setContractorCache(prev => ({
          ...prev,
          [activeRole]: enriched,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contractors');
      } finally {
        setLoading(false);
      }
    };

    fetchContractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectLocation, activeRole, planData]);

  // Invalidate cache when radius changes
  useEffect(() => {
    console.log(`🔄 Radius changed to ${filters.location.radius_km}km - clearing cache`);
    setContractorCache({} as Record<ContractorRole, ContractorProfile[]>);
  }, [filters.location.radius_km]);

  // Apply filters and sorting
  const filteredContractors = applyFilters(contractors, filters);
  const sortedContractors = sortContractors(filteredContractors, sortBy);

  // Helper to get unique contractor identifier (works with both DB and Google Places contractors)
  const getContractorUniqueId = (contractor: ContractorProfile): string => {
    // Google Places contractors have place_id, DB contractors have id
    return contractor.place_id || (contractor.id ? `db_${contractor.id}` : '');
  };

  // Shortlist helpers
  const isShortlisted = (contractor: ContractorProfile): boolean => {
    const uniqueId = getContractorUniqueId(contractor);
    if (!uniqueId) return false;
    return shortlist.some(item => getContractorUniqueId(item.contractor) === uniqueId);
  };

  const toggleShortlist = (contractor: ContractorProfile) => {
    const uniqueId = getContractorUniqueId(contractor);
    if (!uniqueId) return; // Skip contractors without any ID
    
    if (isShortlisted(contractor)) {
      setShortlist(prev => prev.filter(item => getContractorUniqueId(item.contractor) !== uniqueId));
    } else {
      if (activeRole) {
        setShortlist(prev => [...prev, {
          contractor,
          role: activeRole,
          added_at: new Date().toISOString(),
        }]);
      }
    }
  };

  const removeFromShortlist = (contractor: ContractorProfile) => {
    const uniqueId = getContractorUniqueId(contractor);
    if (!uniqueId) return;
    setShortlist(prev => prev.filter(item => getContractorUniqueId(item.contractor) !== uniqueId));
  };

  const handleCompare = () => {
    setShortlistDrawerOpen(false);
    setCompareModalOpen(true);
  };

  const handleInviteAll = () => {
    const contractorIds = shortlist
      .map(item => item.contractor.id)
      .filter((id): id is number => id !== undefined);
    onProceedToInvite(contractorIds);
  };

  const handleSelectForInvitation = (contractorIds: number[]) => {
    onProceedToInvite(contractorIds);
  };

  // Calculate shortlist counts by role
  const shortlistCounts: Record<ContractorRole, number> = {} as any;
  requiredRoles.forEach(role => {
    shortlistCounts[role.key] = shortlist.filter(item => item.role === role.key).length;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-6">
        {/* Context Banner */}
        <ContextBanner planData={planData} />

        {/* Role Selector */}
        <RoleSelector
          requiredRoles={requiredRoles}
          optionalRoles={optionalRoles}
          activeRole={activeRole}
          shortlistCounts={shortlistCounts}
          onRoleChange={setActiveRole}
        />

        {/* Main Content Layout */}
        <div className="flex gap-6">
          {/* Left: Filters Panel */}
          <FiltersPanel
            filters={filters}
            onFiltersChange={setFilters}
            isMobileOpen={filtersMobileOpen}
            onMobileToggle={() => setFiltersMobileOpen(!filtersMobileOpen)}
          />

          {/* Center: Contractor List */}
          <div className="flex-1 min-w-0">
            {/* Sort Bar */}
            <SortBar
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalCount={contractors.length}
              filteredCount={filteredContractors.length}
            />

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="ml-3 text-gray-600">
                  Finding {activeRole} contractors near {selectedProject.city}...
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && sortedContractors.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-2">
                  No contractors found matching your criteria
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your filters or search radius
                </p>
              </div>
            )}

            {/* Contractor Grid/List */}
            {!loading && !error && sortedContractors.length > 0 && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-4'
                }
              >
                {sortedContractors.map(contractor => (
                  <ContractorCard
                    key={getContractorUniqueId(contractor)}
                    contractor={contractor}
                    matchScore={contractor.matchScore}
                    isShortlisted={isShortlisted(contractor)}
                    onToggle={() => toggleShortlist(contractor)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Guidance Panel */}
          <GuidancePanel
            planData={planData}
            requiredRoles={requiredRoles}
            activeRole={activeRole}
            shortlistCounts={shortlistCounts}
            totalShortlisted={shortlist.length}
          />
        </div>
      </div>

      {/* Shortlist FAB */}
      <ShortlistFAB
        count={shortlist.length}
        onClick={() => setShortlistDrawerOpen(true)}
      />

      {/* Shortlist Drawer */}
      <ShortlistDrawer
        shortlist={shortlist}
        isOpen={shortlistDrawerOpen}
        onClose={() => setShortlistDrawerOpen(false)}
        onRemove={removeFromShortlist}
        onCompare={handleCompare}
        onInviteAll={handleInviteAll}
      />

      {/* Compare Modal */}
      <CompareModal
        contractors={shortlist.map(item => item.contractor)}
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        onRemoveFromShortlist={removeFromShortlist}
        onSelectForInvitation={handleSelectForInvitation}
      />
    </div>
  );
};
