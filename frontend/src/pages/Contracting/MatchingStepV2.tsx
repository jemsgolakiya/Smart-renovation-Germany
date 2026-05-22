/**
 * Matching Step V2
 * Wrapper component that fetches PlanData and uses ContractorMatchingScreen
 * Replaces the old MatchingStep with the new sophisticated matching system
 */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Project } from '../../services/projects';
import { ContractorMatchingScreen } from './ContractorMatching';
import { PlanData } from '../../types/contractorMatching.types';
import { apiRequest } from '../../services/http';
import Text from '../../components/Text/Text';

interface MatchingStepV2Props {
  selectedProject: Project;
  selectedContractors: Set<number>;
  onContractorToggle: (contractorId: number) => void;
  onStepChange: (step: number) => void;
}

const MatchingStepV2: React.FC<MatchingStepV2Props> = ({
  selectedProject,
  selectedContractors,
  onContractorToggle,
  onStepChange,
}) => {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch PlanData for the selected project
  useEffect(() => {
    const fetchPlanData = async () => {
      if (!selectedProject?.id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch the most recent renovation plan for this specific project
        const response = await apiRequest<any>(`/renovation/plans/project/${selectedProject.id}/`, {
          method: 'GET',
        });

        if (response && response.plan_data) {
          setPlanData(response.plan_data);
        } else {
          // No plan found - show a message
          setError('No renovation plan found. Please complete the Planning phase first.');
        }
      } catch (err: any) {
        console.error('Error fetching plan data:', err);
        
        // Handle 404 specifically (no plan found)
        if (err?.response?.status === 404) {
          setError('No renovation plan found. Please complete the Planning phase first to enable AI-powered matching.');
        } else {
          setError('Unable to load renovation plan. You can still browse contractors, but matching will be limited.');
        }
        
        // Allow continuing with null planData
        setPlanData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanData();
  }, [selectedProject?.id]);

  const handleProceedToInvite = (contractorIds: number[]) => {
    // Update selected contractors in parent component
    contractorIds.forEach(id => {
      if (!selectedContractors.has(id)) {
        onContractorToggle(id);
      }
    });

    // Proceed to step 3 (Invite)
    onStepChange(3);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <Text className="text-gray-600">Loading project plan data...</Text>
        <Text className="text-sm text-gray-500 mt-1">
          Analyzing renovation requirements to match optimal contractors
        </Text>
      </div>
    );
  }

  // Error state (non-blocking - allow continuing)
  if (error && !planData) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 mb-1">
              Limited Matching Mode
            </p>
            <p className="text-sm text-yellow-700">
              {error}
            </p>
            <p className="text-xs text-yellow-600 mt-2">
              You can still browse and select contractors manually, but AI-powered matching and role recommendations will not be available.
            </p>
          </div>
        </div>

        {/* Still render ContractorMatchingScreen with null planData */}
        <ContractorMatchingScreen
          selectedProject={selectedProject}
          planData={null}
          onProceedToInvite={handleProceedToInvite}
        />
      </div>
    );
  }

  // Success - render the full matching screen
  return (
    <ContractorMatchingScreen
      selectedProject={selectedProject}
      planData={planData}
      onProceedToInvite={handleProceedToInvite}
    />
  );
};

export default MatchingStepV2;
