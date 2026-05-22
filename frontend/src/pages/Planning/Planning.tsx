import Heading from "../../components/Heading/Heading";
import React, { useState } from "react";
import Text from "../../components/Text/Text";
import { ProjectSetupWizard } from "./ProjectSetupWizard";
import { RenovationPhases } from "./RenovationPhases";
import { AISuggestions } from "./AISuggestion";
import { useProject } from "../../contexts/ProjectContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, Save } from "lucide-react";
import { TimelineGantt } from "./TimelineGantt";
import { Button } from "../../components/Button/Button";
import { PermitChecklist } from "./PermitChecklist";
/* import { BudgetPreview } from "./BudgetPreview"; */
import { CollaborationArea } from "./CollaborationArea";
import { apiRequest } from "../../services/http";
// Define the project data interface
export interface ProjectPlanData {
  buildingType: string;
  budget: number;
  startDate: string;
  goals: string[];
  renovationSpecification: string;
  renovationStandard: string;
  buildingAge: string;
  buildingSize: number;
  bundesland: string;
  heatingSystem?: string;
  insulationType?: string;
  windowsType?: string;
  neighborImpact: string;
  financingPreference: string;
  incentiveIntent: string;
  livingDuringRenovation: string;
  energyCertificateRating: string;
  knownMajorIssues: string;
  surveysRequired: string;
}

// API Response interfaces
interface ApiPlanResponse {
  success: boolean;
  plan: {
    phases: any[];
    gantt_chart: any[];
    permits: any[];
    stakeholders: any[];
    // ... other fields
  } | null;
  error?: string;
}

export function Planning() {
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [projectPlan, setProjectPlan] = useState<ProjectPlanData | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [apiPlanData, setApiPlanData] = useState<ApiPlanResponse | null>(null);
  
  // Function to handle plan generation
  const handleGeneratePlan = async (planData: ProjectPlanData) => {
  setIsGeneratingPlan(true);
  setProjectPlan(planData);
  console.log(planData)
  try {
    const result = await apiRequest<ApiPlanResponse>("/renovation/generate-plan/", {
      method: "POST",
      body: JSON.stringify({
        project_id: selectedProject?.id,
        building_type: planData.buildingType,
        budget: planData.budget,
        location: planData.bundesland,
        building_size: planData.buildingSize,
        renovation_goals: planData.goals,
        renovation_specification: planData.renovationSpecification,
        renovation_standard: planData.renovationStandard,
        building_age: planData.buildingAge,
        target_start_date: planData.startDate,
        financing_preference: planData.financingPreference,
        incentive_intent: planData.incentiveIntent,
        living_during_renovation: planData.livingDuringRenovation,
        heritage_protection: planData.neighborImpact,
        energy_certificate_available: planData.energyCertificateRating,
        heating_system_type: planData.heatingSystem,
        window_type: planData.windowsType,
        current_insulation_status: planData.insulationType,
      }),
    });

    console.log("Plan generated successfully:", result);

    // Check if the result is successful
    if (result && result.success) {
      setApiPlanData(result);
    } else {
      // If the API returned an error
      setApiPlanData({
        success: false,
        plan: null as any,
        error: result?.error || "Failed to generate plan"
      });
    }

  } catch (error) {
    console.error("Error generating plan:", error);
    // Set error state
    setApiPlanData({
      success: false,
      plan: null as any,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    });
  } finally {
    setIsGeneratingPlan(false);
  }
};

  // Function to save draft
  const handleSaveDraft = async () => {
    if (!projectPlan) return;

    try {
      const response = await fetch('/api/projects/save-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject?.id,
          planData: projectPlan,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      console.log('Draft saved successfully');
      // Show success message to user
      
    } catch (error) {
      console.error('Error saving draft:', error);
      // Handle error
    }
  };

  // Function to export plan
  const handleExportPlan = async () => {
    if (!projectPlan) return;

    try {
      const response = await fetch('/api/projects/export-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProject?.id,
          planData: projectPlan
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export plan');
      }

      const blob = await response.blob();
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `renovation-plan-${selectedProject?.id || 'project'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting plan:', error);
      // Handle error
    }
  };

  if (!selectedProject) {
    return (
      <div className="text-center py-12">
        <Heading level={1} className="mb-4">No Project Selected</Heading>
        <Text className="text-gray-600 mb-6">
          Please select a project from the Home page to access Planning options.
        </Text>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mx-auto bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to Home
        </button>
      </div>
    );
  } 

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2">Planning the Work</h1>
        <p className="text-gray-600">
          Set up your renovation plan, timeline, and permits step by step.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          <ProjectSetupWizard 
            onGeneratePlan={handleGeneratePlan}
            isGenerating={isGeneratingPlan}
          />
          
          {/* Show components only when API data is available */}
          {apiPlanData && apiPlanData.plan && (
            <>
              <RenovationPhases phases={apiPlanData.plan.phases} />
              <TimelineGantt tasks={apiPlanData.plan.gantt_chart} />

              <div className="grid grid-cols-2 gap-6">
                <PermitChecklist permits={apiPlanData.plan.permits} />
                <div className="space-y-6">
                 {/*  <BudgetPreview /> */}
                  <CollaborationArea stakeholders={apiPlanData.plan.stakeholders} />
                </div>
              </div>
            </>
          )}

          {/* Show error message if plan generation failed */}
          {apiPlanData && !apiPlanData.plan && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-semibold mb-2">Plan Generation Failed</h3>
              <p className="text-red-600 text-sm">
                {apiPlanData.error || "An error occurred while generating the plan. Please try again."}
              </p>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center gap-3 pt-6 border-t">
            <Button
              variant="primary"
              onClick={handleExportPlan}
              disabled={!projectPlan}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Plan
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveDraft}
              disabled={!projectPlan}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button
              className="ml-auto bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-lg"
              disabled={!apiPlanData?.plan}
              onClick={() => {
                if (apiPlanData?.plan) {
                  // Store planning data in localStorage for financing module
                  localStorage.setItem('planningData', JSON.stringify({
                    projectPlan,
                    apiPlanData,
                    timestamp: new Date().toISOString()
                  }));
                  navigate("/financing");
                }
              }}
              title={!apiPlanData?.plan ? "Please generate a plan first" : "Continue to get cost estimates and financing options"}
            >
              Continue to Financing & Costs
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Right Sidebar */}
        <div>
          <AISuggestions />
        </div>
      </div>
    </div>
  );
}

export default Planning;