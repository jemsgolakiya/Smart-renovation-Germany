import Heading from "../../components/Heading/Heading";
import React, { useState, useEffect } from "react";
import Text from "../../components/Text/Text";
import { X, CheckCircle2, Loader2, Camera, MessageSquare, Sparkles } from "lucide-react";
import FinancingAssistant from "../../components/FinancingAssistant/FinancingAssistant";
import CostEstimationResults from "../../components/CostEstimationResults";
import AssessmentWizard, { AssessmentWizardResult } from "../../components/AssessmentWizard/AssessmentWizard";
import { useNavigate } from "react-router-dom";

// Import ProjectContext to access selected project
import { useProject } from "../../contexts/ProjectContext";

// Import AppState for cross-module state persistence
import { useFinancingState, useAppState } from "../../contexts/AppStateContext";

// Import project to financing mapper
import { mapProjectToFinancingForm, hasMinimumProjectData, getAutoFillMessage } from "../../utils/projectToFinancingMapper";

// Import types
import { FinancingFormData, RAGAnalysisResult, CostEstimateResponse } from '../../types/financing.types';

// Import constants - single source of truth
import {
  RENOVATION_TYPE_OPTIONS,
  DEFAULT_FORM_DATA,
  RENOVATION_QUESTIONS,
  Question,
  RENOVATION_GOAL_QUESTIONS,
  COMMON_FIELDS_QUESTIONS,
  SHOWER_AREA_QUESTIONS,
  BATHTUB_QUESTIONS,
  TOILET_AREA_QUESTIONS,
  WASHBASIN_AREA_QUESTIONS,
  TILES_SURFACES_QUESTIONS,
  ELECTRICAL_LIGHTING_QUESTIONS,
  PLUMBING_QUESTIONS,
  WATER_PRESSURE_QUESTIONS,
  HEATING_QUESTIONS,
  VENTILATION_QUESTIONS,
  ACCESSORIES_QUESTIONS,
  WATERPROOFING_QUESTIONS
} from '../../constants/financing.constants';

// Import Gemini service for analysis
import { geminiService } from '../../services/gemini.service';

// LocalStorage key for persisting financing analysis data
const FINANCING_SESSION_KEY = 'financingSessionData';

const Financing: React.FC = () => {
  // Get selected project from context
  const { selectedProject } = useProject();
  const navigate = useNavigate();

  // Get global state management for cross-module persistence
  const { state: globalFinancingState, updateState: updateGlobalState, isInitialized } = useFinancingState();
  const { transferFinancingToContracting } = useAppState();

  // Helper function to load persisted session data (fallback to sessionStorage for backward compatibility)
  const loadPersistedData = () => {
    try {
      // First try to load from global state
      if (isInitialized && globalFinancingState) {
        const hasData = globalFinancingState.costEstimate ||
                        globalFinancingState.financingOptions ||
                        Object.keys(globalFinancingState.formData || {}).length > 0;
        if (hasData) {
          console.log('[Financing] Loaded data from global state');
          return {
            formData: globalFinancingState.formData || DEFAULT_FORM_DATA,
            currentStep: globalFinancingState.currentStep || 1,
            analysisResult: globalFinancingState.costEstimate ? { costEstimate: globalFinancingState.costEstimate } : null,
            costEstimateData: globalFinancingState.costEstimate,
            financingOptions: globalFinancingState.financingOptions,
            photoAnalysis: globalFinancingState.photoAnalysis,
          };
        }
      }

      // Fallback to sessionStorage for backward compatibility
      const savedData = sessionStorage.getItem(FINANCING_SESSION_KEY);
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading persisted financing data:', error);
    }
    return null;
  };

  // Load persisted data on initial render
  const persistedData = loadPersistedData();

  const [formData, setFormData] = useState<FinancingFormData>(
    persistedData?.formData || DEFAULT_FORM_DATA
  );

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState<number>(persistedData?.currentStep || 1); // 1 = Area Selection, 2 = Detailed Questions

  // Auto-fill notification state
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const [showAutoFillBanner, setShowAutoFillBanner] = useState(false);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RAGAnalysisResult | null>(persistedData?.analysisResult || null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Store original prompt and cost estimate for subsequent API calls
  const [originalPrompt, setOriginalPrompt] = useState<string>(persistedData?.originalPrompt || '');
  const [costEstimateData, setCostEstimateData] = useState<CostEstimateResponse | null>(persistedData?.costEstimateData || null);

  // New feature states
  const [financingOptions, setFinancingOptions] = useState<any>(persistedData?.financingOptions || null);
  const [imageDescription, setImageDescription] = useState<any>(persistedData?.imageDescription || null);

  // Loading states for each feature
  const [isLoadingFinancing, setIsLoadingFinancing] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  // Multimodal AI: File upload states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<{file: File, preview: string, type: 'image' | 'video'}[]>([]);
  const [uploadedImagesBase64, setUploadedImagesBase64] = useState<any[]>([]);  // Store images for image generation

  // Saved results state (hidden from users, auto-save only)
  // Results are saved automatically but not displayed
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedResultId, setSavedResultId] = useState<number | null>(null);

  // Smart Assessment Wizard state
  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [analysisMethod, setAnalysisMethod] = useState<'smart' | 'questions' | null>(persistedData?.analysisMethod || null);

  // Store photo analysis and user answers from Smart Photo Analysis for financing options
  const [smartPhotoAnalysis, setSmartPhotoAnalysis] = useState<any>(persistedData?.smartPhotoAnalysis || null);
  const [smartUserAnswers, setSmartUserAnswers] = useState<Record<string, any> | null>(persistedData?.smartUserAnswers || null);

  // INTEGRATION: Store planning data from Planning module for use in Smart Photo Analysis
  const [planningModuleData, setPlanningModuleData] = useState<{
    projectPlan: any;
    apiPlanData: any;
    timestamp: string;
  } | null>(null);

  // Persist analysis data to global state and sessionStorage whenever it changes
  // Global state persists across navigation, sessionStorage is backup for page refresh
  useEffect(() => {
    // Only save if we have some analysis data
    if (analysisResult || costEstimateData || financingOptions || imageDescription) {
      const dataToSave = {
        formData,
        currentStep,
        analysisResult,
        originalPrompt,
        costEstimateData,
        financingOptions,
        imageDescription,
        analysisMethod,
        smartPhotoAnalysis,
        smartUserAnswers,
        timestamp: new Date().toISOString()
      };

      // Save to global state for cross-module persistence
      if (isInitialized) {
        updateGlobalState({
          formData: formData,
          costEstimate: costEstimateData || undefined,
          financingOptions: financingOptions || undefined,
          photoAnalysis: smartPhotoAnalysis || undefined,
          currentStep: currentStep,
          analysisComplete: !!(analysisResult || costEstimateData),
        });
        console.log('[Financing] Data saved to global state for cross-module persistence');
      }

      // Also save to sessionStorage as backup
      try {
        sessionStorage.setItem(FINANCING_SESSION_KEY, JSON.stringify(dataToSave));
        console.log('[Financing] Session data saved for page refresh persistence');
      } catch (error) {
        console.error('[Financing] Error saving session data:', error);
      }
    }
  }, [
    formData,
    currentStep,
    analysisResult,
    originalPrompt,
    costEstimateData,
    financingOptions,
    imageDescription,
    analysisMethod,
    smartPhotoAnalysis,
    smartUserAnswers,
    isInitialized,
    updateGlobalState
  ]);

  // Clear session data when user navigates away from the page (not on refresh)
  useEffect(() => {
    // Show notification if we restored data
    if (persistedData && (persistedData.analysisResult || persistedData.costEstimateData)) {
      console.log('[Financing] Restored analysis data from previous session');
    }

    // Cleanup function - called when component unmounts (navigation away)
    return () => {
      // Clear session storage when navigating away from the page
      sessionStorage.removeItem(FINANCING_SESSION_KEY);
      console.log('[Financing] Session data cleared on navigation');
    };
  }, []);

  // Auto-fill form from selected project or planning data on component mount
  useEffect(() => {
    // First check for planning data from Planning module
    const planningDataStr = localStorage.getItem('planningData');
    if (planningDataStr) {
      try {
        const planningData = JSON.parse(planningDataStr);
        console.log('Auto-filling financing form from planning module:', planningData);

        // IMPORTANT: Store planning data in state for use in Smart Photo Analysis
        // This data will be passed to the backend for integrated analysis
        setPlanningModuleData(planningData);
        console.log('Stored planning data for Smart Photo Analysis integration:', {
          hasProjectPlan: !!planningData.projectPlan,
          hasApiPlanData: !!planningData.apiPlanData,
          timestamp: planningData.timestamp
        });

        // Map planning data to financing form
        const planData = planningData.projectPlan;
        const preFilledData: Partial<FinancingFormData> = {
          ...formData,
          renovationType: 'general', // Default, can be more specific based on goals
          propertyLocation: planData.bundesland || '',
          bathroomSize: planData.buildingSize || undefined,
          // Map more fields as needed
        };

        // Try to infer renovation type from goals
        const goals = planData.goals || [];
        if (goals.some((g: string) => g.toLowerCase().includes('bathroom'))) {
          preFilledData.renovationType = 'bathroom';
        } else if (goals.some((g: string) => g.toLowerCase().includes('kitchen'))) {
          preFilledData.renovationType = 'kitchen';
        } else if (goals.some((g: string) => g.toLowerCase().includes('roof'))) {
          preFilledData.renovationType = 'roofing';
        }

        setFormData(preFilledData as FinancingFormData);

        // Generate and show auto-fill message
        setAutoFillMessage(`Pre-filled from your planning: ${planData.buildingType} renovation in ${planData.bundesland} with budget of €${planData.budget?.toLocaleString()}`);
        setShowAutoFillBanner(true);

        // Auto-hide banner after 10 seconds
        const timer = setTimeout(() => {
          setShowAutoFillBanner(false);
        }, 10000);

        // Clear planning data from localStorage after storing in state
        localStorage.removeItem('planningData');

        return () => clearTimeout(timer);
      } catch (e) {
        console.error('Failed to parse planning data:', e);
        localStorage.removeItem('planningData');
      }
    }
    // Otherwise, check for selected project
    else if (hasMinimumProjectData(selectedProject)) {
      console.log('Auto-filling financing form from project:', selectedProject);
      const preFilledData = mapProjectToFinancingForm(selectedProject!);
      setFormData(preFilledData);

      // Generate and show auto-fill message
      const message = getAutoFillMessage(selectedProject!);
      setAutoFillMessage(message);
      setShowAutoFillBanner(true);

      // Auto-hide banner after 8 seconds
      const timer = setTimeout(() => {
        setShowAutoFillBanner(false);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [selectedProject]);

  const handleInputChange = (field: keyof FinancingFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle multiselect changes
  const handleMultiSelectChange = (field: keyof FinancingFormData, selectedValue: string) => {
    const currentValues = (formData[field] as string[]) || [];
    const newValues = currentValues.includes(selectedValue)
      ? currentValues.filter(v => v !== selectedValue)
      : [...currentValues, selectedValue];
    setFormData(prev => ({ ...prev, [field]: newValues }));
  };

  // Get questions based on selected renovation type and current step
  const getCurrentQuestions = (): Question[] => {
    if (!formData.renovationType) {
      return [];
    }

    // For bathroom, use the existing 2-step approach (area selection + detailed questions)
    if (formData.renovationType === 'bathroom') {
      // STEP 1: Show area selection only
      if (currentStep === 1) {
        return RENOVATION_QUESTIONS[formData.renovationType] || [];
      }

      // STEP 2: Show detailed questions based on selected areas
      if (currentStep === 2) {
        const questions: Question[] = [];
        const selectedAreas = formData.bathroomRenovationAreas || [];

        console.log('[Form] Step 2 - Selected Areas:', selectedAreas);
        console.log('[Form] Building question list based on selections...');

        // Always show Renovation Goal and Common Fields
        console.log('[Form] Adding: Renovation Goal (always shown)');
        questions.push(...RENOVATION_GOAL_QUESTIONS);

        console.log('[Form] Adding: Common Fields (always shown)');
        questions.push(...COMMON_FIELDS_QUESTIONS);

        // Conditionally add sections based on selected areas
        if (selectedAreas.includes('shower_area')) {
          console.log('[Form] Adding: Shower Area questions');
          questions.push(...SHOWER_AREA_QUESTIONS);
        }
        if (selectedAreas.includes('bathtub')) {
          console.log('[Form] Adding: Bathtub questions');
          questions.push(...BATHTUB_QUESTIONS);
        }
        if (selectedAreas.includes('toilet_area')) {
          console.log('[Form] Adding: Toilet Area questions');
          questions.push(...TOILET_AREA_QUESTIONS);
        }
        if (selectedAreas.includes('washbasin_area')) {
          console.log('[Form] Adding: Washbasin Area questions');
          questions.push(...WASHBASIN_AREA_QUESTIONS);
        }
        if (selectedAreas.includes('tiles_surfaces')) {
          console.log('[Form] Adding: Tiles & Surfaces questions');
          questions.push(...TILES_SURFACES_QUESTIONS);
        }
        if (selectedAreas.includes('electrical_lighting')) {
          console.log('[Form] Adding: Electrical & Lighting questions');
          questions.push(...ELECTRICAL_LIGHTING_QUESTIONS);
        }
        if (selectedAreas.includes('plumbing')) {
          console.log('[Form] Adding: Plumbing questions');
          questions.push(...PLUMBING_QUESTIONS);
        }
        if (selectedAreas.includes('water_pressure')) {
          console.log('[Form] Adding: Water Pressure questions');
          questions.push(...WATER_PRESSURE_QUESTIONS);
        }
        if (selectedAreas.includes('heating')) {
          console.log('[Form] Adding: Heating questions');
          questions.push(...HEATING_QUESTIONS);
        }
        if (selectedAreas.includes('ventilation')) {
          console.log('[Form] Adding: Ventilation questions');
          questions.push(...VENTILATION_QUESTIONS);
        }
        if (selectedAreas.includes('accessories')) {
          console.log('[Form] Adding: Accessories questions');
          questions.push(...ACCESSORIES_QUESTIONS);
        }
        if (selectedAreas.includes('waterproofing')) {
          console.log('[Form] Adding: Waterproofing questions');
          questions.push(...WATERPROOFING_QUESTIONS);
        }

        console.log('[Form] Total questions to display:', questions.length);

        return questions;
      }
    }

    // For all other renovation types, show all questions directly (no multi-step)
    console.log(`[Form] Loading questions for renovation type: ${formData.renovationType}`);
    const questions = RENOVATION_QUESTIONS[formData.renovationType] || [];
    console.log(`[Form] Found ${questions.length} questions for ${formData.renovationType}`);
    return questions;
  };

  const currentQuestions = getCurrentQuestions();

  // Check if form is complete enough to analyze
  const canAnalyze = () => {
    if (!formData.renovationType) return false;

    // If there are specific questions for this renovation type, check if they're answered
    if (currentQuestions && currentQuestions.length > 0) {
      const requiredQuestions = currentQuestions.filter(q => q.required);
      const allRequiredAnswered = requiredQuestions.every(q => {
        const answer = formData[q.id as keyof FinancingFormData];
        if (Array.isArray(answer)) {
          return answer.length > 0;
        }
        return answer && answer !== '';
      });
      return allRequiredAnswered;
    }

    return true;
  };

  // Handle Next button (Step 1 -> Step 2) - Only for bathroom renovation
  const handleNextStep = () => {
    // Only for bathroom renovation - validate that at least one area is selected
    if (formData.renovationType === 'bathroom') {
      if (!formData.bathroomRenovationAreas || formData.bathroomRenovationAreas.length === 0) {
        window.alert('Please select at least one renovation area to continue.');
        return;
      }
      setCurrentStep(2);
      // Scroll to top when moving to next step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Back button (Step 2 -> Step 1)
  const handlePreviousStep = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle analyze budget button click
  const handleAnalyzeBudget = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);

      console.log('='.repeat(80));
      console.log('FRONTEND: Starting cost estimation (Questions-based Analysis)');
      console.log('='.repeat(80));
      console.log('Form Data being sent to backend:');
      console.log(JSON.stringify(formData, null, 2));
      console.log('Uploaded files:', uploadedFiles.length);
      console.log('Planning Data available:', !!planningModuleData);
      if (planningModuleData) {
        console.log('  - Building Type:', planningModuleData.projectPlan?.buildingType);
        console.log('  - Budget:', planningModuleData.projectPlan?.budget);
        console.log('  - Goals:', planningModuleData.projectPlan?.goals?.join(', '));
      }
      console.log('='.repeat(80));

      let response;

      // Use multimodal endpoint if files are uploaded
      if (uploadedFiles.length > 0) {
        console.log('Using MULTIMODAL endpoint with uploaded files');

        // Create FormData for multipart/form-data request
        const formDataMultipart = new FormData();
        formDataMultipart.append('form_data', JSON.stringify(formData));

        // Append all uploaded files
        uploadedFiles.forEach((file, index) => {
          formDataMultipart.append('files', file);
        });

        // INTEGRATION: Include planning data if available
        if (planningModuleData) {
          formDataMultipart.append('planning_data', JSON.stringify(planningModuleData));
          console.log('Including planning data in multimodal cost estimate');
        }

        // Call multimodal API
        const apiResponse = await fetch('/api/financing/multimodal-cost-estimate/', {
          method: 'POST',
          body: formDataMultipart,
          // Don't set Content-Type header - browser will set it with boundary
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.message || errorData.error || 'Multimodal analysis failed');
        }

        response = await apiResponse.json();
      } else {
        console.log('Using STANDARD endpoint (no files uploaded)');
        // INTEGRATION: Call standard cost estimation with planning data
        response = await geminiService.generateCostEstimate(formData, planningModuleData || undefined);
      }

      console.log('='.repeat(80));
      console.log('FRONTEND: Cost estimate received from backend');
      console.log('Result:', JSON.stringify(response, null, 2));
      console.log('='.repeat(80));

      // Extract original prompt and form data from response
      const originalPromptFromBackend = response._originalPrompt || '';

      // Store for subsequent API calls
      setOriginalPrompt(originalPromptFromBackend);
      setCostEstimateData(response);

      // Store uploaded images for image generation
      if (response._uploadedImages && response._uploadedImages.length > 0) {
        setUploadedImagesBase64(response._uploadedImages);
        console.log('Stored uploaded images for image generation:', response._uploadedImages.length);
      }

      console.log('='.repeat(80));
      console.log('FRONTEND: Stored original prompt and cost estimate for future use');
      console.log('Original Prompt Length:', originalPromptFromBackend.length);
      console.log('Multimodal:', response._multimodal || false);
      console.log('Files Analyzed:', response._filesAnalyzed || 0);
      console.log('Uploaded Images Stored:', response._uploadedImages?.length || 0);
      console.log('='.repeat(80));

      // Remove the internal fields before displaying
      const { _originalPrompt, _formData, _multimodal, _filesAnalyzed, ...costEstimate } = response;

      // Set the cost estimate result
      setAnalysisResult({
        costEstimate: costEstimate,
        recommendations: [],
        summary: '',
        nextSteps: []
      });

      // Auto-save the result after a short delay
      setTimeout(() => {
        autoSaveResult();
      }, 500);

      // Scroll to results
      setTimeout(() => {
        const resultsSection = document.getElementById('analysis-results');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (error) {
      console.error('[Financing] Analysis failed:', error);

      // Parse error message for better display
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('RATE_LIMIT')) {
        // Show detailed rate limit error
        setAnalysisError(errorMessage.replace('RATE_LIMIT: ', ''));
      } else {
        // Show generic error
        setAnalysisError(errorMessage || 'Failed to analyze budget. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Get Financing Options button - Comprehensive analysis with RAG
  const handleGetFinancingOptions = async () => {
    try {
      setIsLoadingFinancing(true);

      console.log('='.repeat(80));
      console.log('FRONTEND: Getting COMPREHENSIVE financing options');
      console.log('='.repeat(80));
      console.log('Original Prompt Length:', originalPrompt?.length || 0);
      console.log('Cost Estimate Data:', costEstimateData);
      console.log('Form Data:', formData);
      console.log('Smart Photo Analysis Available:', !!smartPhotoAnalysis);
      console.log('Smart User Answers Available:', !!smartUserAnswers);
      if (smartUserAnswers) {
        console.log('User Answers Count:', Object.keys(smartUserAnswers).length);
      }

      // Validate we have the required data - provide helpful error messages
      if (!costEstimateData) {
        throw new Error('No cost estimate data available. Please complete the cost analysis first.');
      }

      // If originalPrompt is missing, create a basic one from costEstimateData
      let promptToUse = originalPrompt;
      if (!promptToUse && costEstimateData._originalPrompt) {
        promptToUse = costEstimateData._originalPrompt;
        console.log('Using _originalPrompt from costEstimateData');
      }
      if (!promptToUse) {
        // Build a basic prompt from form data for fallback
        promptToUse = `${formData.renovationType || 'general'} renovation cost estimation for German market 2026`;
        console.log('Using fallback prompt:', promptToUse);
      }

      // Extract clean cost estimate without internal fields
      const { _originalPrompt, _formData, ...cleanCostEstimate } = costEstimateData!;

      console.log('Clean Cost Estimate:', cleanCostEstimate);
      console.log('Passing to backend:');
      console.log('  - Photo Analysis:', smartPhotoAnalysis ? 'Yes' : 'No');
      console.log('  - User Answers:', smartUserAnswers ? `Yes (${Object.keys(smartUserAnswers).length} answers)` : 'No');
      console.log('  - Planning Data:', planningModuleData ? 'Yes' : 'No');
      if (planningModuleData) {
        console.log('    - Building Type:', planningModuleData.projectPlan?.buildingType);
        console.log('    - Budget:', planningModuleData.projectPlan?.budget);
        console.log('    - Goals:', planningModuleData.projectPlan?.goals?.join(', '));
      }
      console.log('='.repeat(80));

      // Call comprehensive financing options with photo analysis, user answers, and planning data
      const result = await geminiService.generateFinancingOptions(
        promptToUse,
        cleanCostEstimate,
        formData,
        smartPhotoAnalysis || undefined,  // Pass photo analysis from Smart Photo Analysis
        smartUserAnswers || undefined,    // Pass user's answers to 15 budget questions
        planningModuleData || undefined   // INTEGRATION: Pass planning data from Planning module
      );

      console.log('='.repeat(80));
      console.log('FRONTEND: Comprehensive financing options received');
      console.log('Sections:', Object.keys(result));
      console.log('Recommendations:', result.recommendations?.length || 0);
      console.log('Has Eligibility Matrix:', !!result.eligibilityMatrix);
      console.log('Has Comparison Table:', !!result.comparisonTable);
      console.log('Has Tax Benefits:', !!result.taxBenefits);
      console.log('='.repeat(80));

      setFinancingOptions(result);

      // Scroll to financing options section
      setTimeout(() => {
        const section = document.getElementById('financing-options-results');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (error) {
      console.error('[Financing] Failed to get financing options:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to get financing options');
    } finally {
      setIsLoadingFinancing(false);
    }
  };

  // Handle Generate Image button
  const handleGenerateImage = async () => {
    try {
      setIsLoadingImage(true);

      console.log('='.repeat(80));
      console.log('FRONTEND: Generating image description');
      console.log('='.repeat(80));

      // Extract clean cost estimate without internal fields
      const { _originalPrompt, _formData, ...cleanCostEstimate } = costEstimateData!;

      console.log('Sending uploaded images for generation:', uploadedImagesBase64.length);

      const result = await geminiService.generateImageDescription(
        originalPrompt,
        cleanCostEstimate,
        formData,
        uploadedImagesBase64  // Pass uploaded images for photo-based generation
      );

      console.log('='.repeat(80));
      console.log('FRONTEND: Image description received');
      console.log(JSON.stringify(result, null, 2));
      console.log('='.repeat(80));

      setImageDescription(result);

      // Scroll to image section
      setTimeout(() => {
        const section = document.getElementById('image-description-results');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (error) {
      console.error('[Financing] Failed to generate image:', error);
      window.alert(error instanceof Error ? error.message : 'Failed to generate image description');
    } finally {
      setIsLoadingImage(false);
    }
  };

  // Handle Find Contractor button - Navigate to Contracting module
  const handleFindContractor = () => {
    // Navigate to contracting page
    navigate('/contracting');
  };

  // Auto-save result (called automatically after analysis)
  const autoSaveResult = async () => {
    if (!analysisResult || !costEstimateData) {
      return;
    }

    try {
      setIsSaving(true);

      // Generate automatic name from renovation type and timestamp
      const timestamp = new Date().toLocaleString('de-DE');
      const renovationType = formData.renovationType || 'renovation';
      const resultName = `${renovationType.charAt(0).toUpperCase() + renovationType.slice(1)} - ${timestamp}`;

      const payload = {
        form_data: formData,
        cost_estimate: analysisResult.costEstimate,
        financing_options: financingOptions,
        image_description: imageDescription,
        result_name: resultName,
        _ragMetadata: costEstimateData?._ragMetadata || {},
      };

      console.log('Auto-saving result with payload:', payload);

      const response = await fetch('/api/financing/results/save/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Check if response is OK before parsing
      if (!response.ok) {
        const text = await response.text();
        console.error('Server error response:', text);
        throw new Error(`Server error: ${response.status} - ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        setSavedResultId(data.result_id);

        // Auto-hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);

        console.log(`Result auto-saved successfully! ID: ${data.result_id}`);
      } else {
        throw new Error(data.message || 'Failed to save result');
      }
    } catch (error) {
      console.error('Failed to auto-save result:', error);
      // Silent fail - don't show alert to user for auto-save failures
    } finally {
      setIsSaving(false);
    }
  };

  // Saved results management removed - all results are auto-saved silently

  // Handle file upload (images and videos)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB max

      if (!isImage && !isVideo) {
        window.alert(`${file.name} is not an image or video file.`);
        return false;
      }

      if (!isValidSize) {
        window.alert(`${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }

      return true;
    });

    // Create previews
    const newPreviews = validFiles.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: URL.createObjectURL(file),
        type: (isImage ? 'image' : 'video') as 'image' | 'video'
      };
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setUploadPreviews(prev => [...prev, ...newPreviews]);
  };

  // Remove uploaded file
  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index);
      // Revoke old preview URL to avoid memory leaks
      if (prev[index]) {
        URL.revokeObjectURL(prev[index].preview);
      }
      return newPreviews;
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex-1">
          <Heading level={1}>Financing Your Renovation</Heading>
          <Text className="text-gray-600 mt-2">
            Find the best loans, subsidies, and grants for your renovation project based on your specific needs and financial situation.
          </Text>
        </div>
      </div>

      {/* Saved Results section removed - auto-save works silently in background */}

      {/* Questionnaire Form */}
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Auto-fill notification banner */}
        {showAutoFillBanner && autoFillMessage && selectedProject && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm animate-slideDown">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 p-1.5 rounded-full mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-900 text-sm mb-1">Auto-filled from project</h4>
                    <p className="text-emerald-700 text-sm">
                      {autoFillMessage}
                    </p>
                    <p className="text-emerald-600 text-xs mt-1">
                      From project: <span className="font-medium">{selectedProject.name}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAutoFillBanner(false)}
                className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-100 transition flex-shrink-0"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-emerald-800">
            Renovation Type
          </h2>
        </div>

        <div className="space-y-6">
          {/* Renovation Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What type of renovation do you need? *
            </label>
            <select
              value={formData.renovationType}
              onChange={(e) => {
                handleInputChange('renovationType', e.target.value);
                // Reset analysis method when renovation type changes
                setAnalysisMethod(null);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            >
              <option value="">Select renovation type...</option>
              {RENOVATION_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Analysis Method Selection - Show only when renovation type is selected */}
          {formData.renovationType && !analysisMethod && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Choose Your Analysis Method
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Smart Photo Analysis - RECOMMENDED */}
                <button
                  onClick={() => {
                    setAnalysisMethod('smart');
                    setShowSmartWizard(true);
                  }}
                  className="relative p-6 border-2 border-emerald-500 rounded-xl bg-gradient-to-br from-emerald-50 to-white hover:from-emerald-100 hover:to-emerald-50 transition-all duration-300 text-left group shadow-lg hover:shadow-xl"
                >
                  {/* Recommended Badge */}
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    RECOMMENDED
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition">
                      <Camera className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-emerald-800 mb-2">
                        Smart Photo Analysis
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Upload photos of your space and our AI will analyze them to ask smart, targeted questions specific to what it sees.
                      </p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          AI detects issues & features automatically
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Personalized questions based on your photos
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          99% more accurate cost estimates
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* Questions-based Analysis */}
                <button
                  onClick={() => setAnalysisMethod('questions')}
                  className="relative p-6 border-2 border-gray-300 rounded-xl bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition">
                      <MessageSquare className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 mb-2">
                        Questions-based Analysis
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Answer our comprehensive questionnaire about your renovation needs without uploading photos.
                      </p>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-gray-400" />
                          Standard question set
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-gray-400" />
                          No photos required
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-gray-400" />
                          Basic cost estimates
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Conditional Questions Based on Renovation Type - Only for questions method */}
      {analysisMethod === 'questions' && currentQuestions && currentQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 mt-6">
          <div className="mb-6">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentStep === 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                Step 1
              </span>
              <span className="text-gray-400">→</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentStep === 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                Step 2
              </span>
            </div>

            <h2 className="text-2xl font-semibold text-emerald-800">
              {currentStep === 1 ? 'Select Renovation Areas' : 'Renovation Details'}
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              {currentStep === 1
                ? 'Choose all the areas you want to include in your bathroom renovation project.'
                : 'Provide details for your selected renovation areas.'}
            </p>

            {/* Show selected areas summary on Step 2 */}
            {currentStep === 2 && formData.bathroomRenovationAreas && formData.bathroomRenovationAreas.length > 0 && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {formData.bathroomRenovationAreas.map((area) => {
                    const areaLabels: Record<string, string> = {
                      shower_area: 'Shower Area',
                      bathtub: 'Bathtub',
                      toilet_area: 'Toilet Area',
                      washbasin_area: 'Washbasin Area',
                      tiles_surfaces: 'Tiles & Surfaces',
                      electrical_lighting: 'Electrical & Lighting',
                      plumbing: 'Plumbing',
                      water_pressure: 'Water Pressure',
                      heating: 'Heating',
                      ventilation: 'Ventilation',
                      accessories: 'Accessories',
                      waterproofing: 'Waterproofing'
                    };
                    return (
                      <span key={area} className="px-3 py-1 bg-emerald-600 text-white text-sm rounded-full">
                        {areaLabels[area] || area}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {currentQuestions.map((question: Question, index) => (
              <div key={question.id}>
                {/* Section Title */}
                {question.sectionTitle && (
                  <h3 className="text-xl font-semibold text-white bg-emerald-700 px-4 py-3 mb-4 mt-6 rounded-lg shadow">
                    {question.sectionTitle}
                  </h3>
                )}

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {question.label} {question.required && <span className="text-red-500">*</span>}
                </label>

                {/* Select Dropdown */}
                {question.type === 'select' && (
                  <select
                    value={(formData[question.id as keyof FinancingFormData] as string) || ''}
                    onChange={(e) => handleInputChange(question.id as keyof FinancingFormData, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  >
                    <option value="">Select an option...</option>
                    {question.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {/* Radio Buttons */}
                {question.type === 'radio' && (
                  <div className="space-y-3">
                    {question.options?.map(opt => (
                      <label
                        key={opt.value}
                        className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={opt.value}
                          checked={(formData[question.id as keyof FinancingFormData] as string) === opt.value}
                          onChange={(e) => handleInputChange(question.id as keyof FinancingFormData, e.target.value)}
                          className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <div className="text-gray-700">{opt.label}</div>
                          {opt.description && (
                            <div className="text-sm text-gray-600 mt-1">{opt.description}</div>
                          )}
                          {opt.qualityDescription && (
                            <div className="text-sm text-blue-600 font-medium mt-1 italic">{opt.qualityDescription}</div>
                          )}
                        </div>
                      </label>
                    ))}
                    {/* "Other" option - NEW */}
                    {question.allowOther && (
                      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <label className="flex items-start gap-3">
                          <input
                            type="radio"
                            name={question.id}
                            value="other"
                            checked={(formData[question.id as keyof FinancingFormData] as string) === 'other'}
                            onChange={(e) => handleInputChange(question.id as keyof FinancingFormData, 'other')}
                            className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <span className="text-gray-700 font-medium">Other (specify)</span>
                            {(formData[question.id as keyof FinancingFormData] as string) === 'other' && (
                              <input
                                type="text"
                                placeholder={question.otherPlaceholder || 'Please specify...'}
                                value={(formData[`${question.id}_other` as keyof FinancingFormData] as string) || ''}
                                onChange={(e) => handleInputChange(`${question.id}_other` as keyof FinancingFormData, e.target.value)}
                                className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                autoFocus
                              />
                            )}
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Multiselect Checkboxes */}
                {question.type === 'multiselect' && (
                  <div className="space-y-3">
                    {question.options?.map(opt => (
                      <label
                        key={opt.value}
                        className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition"
                      >
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={((formData[question.id as keyof FinancingFormData] as string[]) || []).includes(opt.value)}
                          onChange={() => handleMultiSelectChange(question.id as keyof FinancingFormData, opt.value)}
                          className="mt-1 w-5 h-5 text-emerald-600 focus:ring-emerald-500 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{opt.label}</div>
                          {opt.description && (
                            <div className="text-sm text-gray-600 mt-1">{opt.description}</div>
                          )}
                          {opt.qualityDescription && (
                            <div className="text-sm text-blue-600 font-medium mt-1 italic">{opt.qualityDescription}</div>
                          )}
                        </div>
                      </label>
                    ))}
                    {/* "Other" option for multiselect */}
                    {question.allowOther && (
                      <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <label className="block">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={!!formData[`${question.id}_other` as keyof FinancingFormData]}
                              onChange={(e) => {
                                if (!e.target.checked) {
                                  handleInputChange(`${question.id}_other` as keyof FinancingFormData, '');
                                } else {
                                  handleInputChange(`${question.id}_other` as keyof FinancingFormData, ' ');
                                }
                              }}
                              className="mt-1 w-5 h-5 text-emerald-600 focus:ring-emerald-500 rounded"
                            />
                            <div className="flex-1">
                              <span className="text-gray-700 font-medium">Other (specify)</span>
                              {!!formData[`${question.id}_other` as keyof FinancingFormData] && (
                                <input
                                  type="text"
                                  name={`${question.id}_other`}
                                  placeholder={question.otherPlaceholder || 'Please specify...'}
                                  value={(formData[`${question.id}_other` as keyof FinancingFormData] as string) || ''}
                                  onChange={(e) => handleInputChange(`${question.id}_other` as keyof FinancingFormData, e.target.value)}
                                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                  autoFocus
                                />
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Number Input */}
                {question.type === 'number' && (
                  <div className="relative">
                    <input
                      type="number"
                      min={question.min}
                      max={question.max}
                      placeholder={question.placeholder}
                      value={formData[question.id as keyof FinancingFormData] || ''}
                      onChange={(e) => handleInputChange(question.id as keyof FinancingFormData, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    />
                    {question.unit && (
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                        {question.unit}
                      </span>
                    )}
                  </div>
                )}

                {/* Text Input */}
                {question.type === 'text' && (
                  <div>
                    <input
                      type="text"
                      placeholder={question.placeholder}
                      value={(formData[question.id as keyof FinancingFormData] as string) || ''}
                      onChange={(e) => handleInputChange(question.id as keyof FinancingFormData, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    />
                  </div>
                )}

                {/* Description - Only show for non-multiselect questions */}
                {question.description && question.type !== 'multiselect' && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">{question.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
            {/* Back Button (only show on Step 2) */}
            {currentStep === 2 && (
              <button
                onClick={handlePreviousStep}
                className="px-6 py-3 border-2 border-emerald-600 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition"
              >
                ← Back to Area Selection
              </button>
            )}

            {/* Next Button (only show on Step 1 for bathroom renovation) */}
            {currentStep === 1 && formData.renovationType === 'bathroom' && (
              <button
                onClick={handleNextStep}
                disabled={!formData.bathroomRenovationAreas || formData.bathroomRenovationAreas.length === 0}
                className={`ml-auto px-8 py-3 rounded-lg font-semibold transition ${
                  formData.bathroomRenovationAreas && formData.bathroomRenovationAreas.length > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next: Enter Details →
              </button>
            )}

            {/* Spacer for Step 2 when back button is shown */}
            {currentStep === 2 && <div></div>}
          </div>
        </div>
      )}

      {/* Analyze Budget Button - Show on Step 2 for bathroom, or immediately for other types (questions method only) */}
      {analysisMethod === 'questions' && formData.renovationType && (
        (formData.renovationType === 'bathroom' && currentStep === 2) ||
        (formData.renovationType !== 'bathroom' && currentQuestions.length > 0)
      ) && (
        <div className="bg-white rounded-lg shadow-md p-8 mt-6">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold text-emerald-800 mb-4">
              Ready to Get Your Financing Plan?
            </h2>
            <p className="text-gray-600 mb-6 text-center max-w-2xl">
              Click below to analyze your renovation project and get personalized cost estimates and financing recommendations.
            </p>

            {/* Error message */}
            {analysisError && (
              <div className="mb-4 p-6 bg-red-50 border-2 border-red-300 rounded-lg w-full max-w-3xl">
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Analysis Failed</h3>
                    <div className="text-sm text-red-700 whitespace-pre-line">
                      {analysisError}
                    </div>
                    {analysisError.includes('rate limit') && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                        <p className="text-sm text-yellow-800 font-medium">
                          Tip: Try again in a few minutes, or check your Google AI Studio quota at{' '}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-yellow-900"
                          >
                            aistudio.google.com
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyzeBudget}
              disabled={!canAnalyze() || isAnalyzing}
              className={`
                px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200
                ${canAnalyze() && !isAnalyzing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing Your Project...
                </span>
              ) : (
                'Analyze Budget & Get Financing Options'
              )}
            </button>

            {!canAnalyze() && !isAnalyzing && (
              <p className="text-sm text-gray-500 mt-3">
                Please complete all required fields above to continue
              </p>
            )}
          </div>
        </div>
      )}

      {/* Analysis Results Section - Professional Consultant-Style */}
      {analysisResult && (
        <div id="analysis-results" className="mt-8">
          <CostEstimationResults
            costEstimate={analysisResult.costEstimate}
            isMultimodal={costEstimateData?._multimodal || false}
            filesAnalyzed={costEstimateData?._filesAnalyzed || 0}
            onGetFinancingOptions={handleGetFinancingOptions}
            onGenerateImage={handleGenerateImage}
            onFindContractor={handleFindContractor}
            isLoadingFinancing={isLoadingFinancing}
            isLoadingImage={isLoadingImage}
            saveSuccess={saveSuccess}
            savedResultId={savedResultId}
          />
        </div>
      )}

      {/* Comprehensive Financing Options Results */}
      {financingOptions && (
        <div id="financing-options-results" className="mt-8 space-y-6">

          {/* Executive Financing Summary */}
          {financingOptions.financingSummary && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg shadow-md p-8 border border-emerald-200">
              <h2 className="text-2xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Financing Summary
              </h2>
              <p className="text-gray-700 text-lg mb-4">{financingOptions.financingSummary.overview}</p>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Total Financing Needed</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    €{financingOptions.financingSummary.totalFinancingNeeded?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Potential Savings</div>
                  <div className="text-2xl font-bold text-green-600">
                    €{financingOptions.financingSummary.potentialTotalSavings?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500">Recommended Strategy</div>
                  <div className="text-sm font-medium text-gray-700">
                    {financingOptions.financingSummary.recommendedStrategy || 'See recommendations below'}
                  </div>
                </div>
              </div>

              {financingOptions.financingSummary.keyEligibilityFactors && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Key Eligibility Factors:</h4>
                  <div className="flex flex-wrap gap-2">
                    {financingOptions.financingSummary.keyEligibilityFactors.map((factor: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {financingOptions.financingSummary.urgentConsiderations && financingOptions.financingSummary.urgentConsiderations.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">Important Considerations:</h4>
                  <ul className="list-disc list-inside text-sm text-amber-700">
                    {financingOptions.financingSummary.urgentConsiderations.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Quality Tier Financing Comparison */}
          {financingOptions.qualityTierFinancing && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Financing by Quality Level
              </h2>
              <p className="text-gray-600 mb-6">Compare financing options across different quality tiers to find the best fit for your budget.</p>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Budget Tier */}
                {financingOptions.qualityTierFinancing.budget && (
                  <div className="border-2 border-blue-200 rounded-lg p-5 hover:border-blue-400 transition">
                    <div className="text-center mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">BUDGET</span>
                    </div>
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-blue-700">
                        €{financingOptions.qualityTierFinancing.budget.totalCost?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Total Project Cost</div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financing:</span>
                        <span className="font-semibold">€{financingOptions.qualityTierFinancing.budget.financingNeeded?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-semibold text-blue-600">{financingOptions.qualityTierFinancing.budget.monthlyPayment || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.budget.totalInterest || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.budget.loanTerm || 'N/A'}</span>
                      </div>
                    </div>
                    {financingOptions.qualityTierFinancing.budget.recommendedPrograms && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-1">Programs:</div>
                        <div className="flex flex-wrap gap-1">
                          {financingOptions.qualityTierFinancing.budget.recommendedPrograms.map((prog: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{prog}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {financingOptions.qualityTierFinancing.budget.note && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-center">
                        <span className="text-blue-600 text-xs">{financingOptions.qualityTierFinancing.budget.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Tier */}
                {financingOptions.qualityTierFinancing.standard && (
                  <div className="border-2 border-gray-200 rounded-lg p-5 hover:border-gray-400 transition">
                    <div className="text-center mb-3">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">STANDARD</span>
                    </div>
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-gray-800">
                        €{financingOptions.qualityTierFinancing.standard.totalCost?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Total Project Cost</div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financing:</span>
                        <span className="font-semibold">€{financingOptions.qualityTierFinancing.standard.financingNeeded?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-semibold text-gray-700">{financingOptions.qualityTierFinancing.standard.monthlyPayment || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.standard.totalInterest || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.standard.loanTerm || 'N/A'}</span>
                      </div>
                    </div>
                    {financingOptions.qualityTierFinancing.standard.recommendedPrograms && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-1">Programs:</div>
                        <div className="flex flex-wrap gap-1">
                          {financingOptions.qualityTierFinancing.standard.recommendedPrograms.map((prog: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{prog}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {financingOptions.qualityTierFinancing.standard.note && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-center">
                        <span className="text-gray-600 text-xs">{financingOptions.qualityTierFinancing.standard.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Premium Tier */}
                {financingOptions.qualityTierFinancing.premium && (
                  <div className="border-2 border-emerald-500 rounded-lg p-5 relative shadow-lg">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold">BEST VALUE</span>
                    </div>
                    <div className="text-center mb-3 mt-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">PREMIUM</span>
                    </div>
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-emerald-700">
                        €{financingOptions.qualityTierFinancing.premium.totalCost?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Total Project Cost</div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financing:</span>
                        <span className="font-semibold">€{financingOptions.qualityTierFinancing.premium.financingNeeded?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-semibold text-emerald-600">{financingOptions.qualityTierFinancing.premium.monthlyPayment || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.premium.totalInterest || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.premium.loanTerm || 'N/A'}</span>
                      </div>
                    </div>
                    {financingOptions.qualityTierFinancing.premium.recommendedPrograms && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-1">Programs:</div>
                        <div className="flex flex-wrap gap-1">
                          {financingOptions.qualityTierFinancing.premium.recommendedPrograms.map((prog: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-xs">{prog}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {financingOptions.qualityTierFinancing.premium.note && (
                      <div className="mt-3 p-2 bg-emerald-50 rounded text-center">
                        <span className="text-emerald-600 text-xs">{financingOptions.qualityTierFinancing.premium.note}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Luxury Tier */}
                {financingOptions.qualityTierFinancing.luxury && (
                  <div className="border-2 border-amber-300 rounded-lg p-5 hover:border-amber-400 transition">
                    <div className="text-center mb-3">
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">LUXURY</span>
                    </div>
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-amber-700">
                        €{financingOptions.qualityTierFinancing.luxury.totalCost?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Total Project Cost</div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Financing:</span>
                        <span className="font-semibold">€{financingOptions.qualityTierFinancing.luxury.financingNeeded?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly:</span>
                        <span className="font-semibold text-amber-600">{financingOptions.qualityTierFinancing.luxury.monthlyPayment || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Interest:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.luxury.totalInterest || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span className="font-semibold">{financingOptions.qualityTierFinancing.luxury.loanTerm || 'N/A'}</span>
                      </div>
                    </div>
                    {financingOptions.qualityTierFinancing.luxury.recommendedPrograms && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-gray-500 mb-1">Programs:</div>
                        <div className="flex flex-wrap gap-1">
                          {financingOptions.qualityTierFinancing.luxury.recommendedPrograms.map((prog: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-xs">{prog}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {financingOptions.qualityTierFinancing.luxury.note && (
                      <div className="mt-3 p-2 bg-amber-50 rounded text-center">
                        <span className="text-amber-600 text-xs">{financingOptions.qualityTierFinancing.luxury.note}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comparison Note */}
              {financingOptions.qualityTierFinancing.comparisonNote && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700 text-sm">{financingOptions.qualityTierFinancing.comparisonNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Quality Tier Comparison Table */}
          {financingOptions.qualityTierComparison && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> Quality Tier Comparison Table
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {financingOptions.qualityTierComparison.headers?.map((header: string, i: number) => (
                        <th key={i} className={`p-2 text-left font-semibold ${i === 0 ? 'text-gray-700' : i === 3 ? 'text-emerald-700 bg-emerald-50' : 'text-gray-700'}`}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financingOptions.qualityTierComparison.rows?.map((row: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-700">{row.metric}</td>
                        {row.values?.map((value: string, j: number) => (
                          <td key={j} className={`p-2 ${j === 2 ? 'bg-emerald-50 font-semibold text-emerald-700' : ''}`}>
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {financingOptions.qualityTierComparison.tierRecommendation && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-emerald-700 font-medium">{financingOptions.qualityTierComparison.tierRecommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Program Recommendations */}
          {financingOptions.recommendations && financingOptions.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-3xl">🏦</span> Financing Program Recommendations
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({financingOptions.recommendations.length} programs)
                </span>
              </h2>

              <div className="space-y-6">
                {financingOptions.recommendations.map((rec: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className={`p-4 ${
                      rec.type === 'grant' ? 'bg-green-50 border-b border-green-200' :
                      rec.type === 'subsidy' ? 'bg-blue-50 border-b border-blue-200' :
                      rec.type === 'tax_benefit' ? 'bg-purple-50 border-b border-purple-200' :
                      'bg-yellow-50 border-b border-yellow-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              rec.type === 'grant' ? 'bg-green-500 text-white' :
                              rec.type === 'subsidy' ? 'bg-blue-500 text-white' :
                              rec.type === 'tax_benefit' ? 'bg-purple-500 text-white' :
                              'bg-yellow-500 text-white'
                            }`}>
                              {rec.type?.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-500">{rec.provider}</span>
                            {rec.programCode && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs font-mono">
                                {rec.programCode}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mt-2">{rec.name || rec.optionName}</h3>
                          {rec.nameEnglish && <p className="text-sm text-gray-500">{rec.nameEnglish}</p>}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Match Score</div>
                          <div className={`text-2xl font-bold ${
                            rec.matchScore >= 80 ? 'text-green-600' :
                            rec.matchScore >= 60 ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {rec.matchScore || 'N/A'}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Financial Details */}
                      {rec.financialDetails && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3">Financial Details</h4>
                          <div className="grid md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 rounded p-3">
                              <div className="text-xs text-gray-500">Max Amount</div>
                              <div className="font-bold text-gray-800">{rec.financialDetails.maxAmount}</div>
                            </div>
                            <div className="bg-emerald-50 rounded p-3">
                              <div className="text-xs text-gray-500">Est. for Project</div>
                              <div className="font-bold text-emerald-700">{rec.financialDetails.estimatedAmountForProject}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-3">
                              <div className="text-xs text-gray-500">Interest Rate</div>
                              <div className="font-bold text-gray-800">{rec.financialDetails.interestRate || 'N/A'}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-3">
                              <div className="text-xs text-gray-500">Term</div>
                              <div className="font-bold text-gray-800">{rec.financialDetails.term || 'N/A'}</div>
                            </div>
                          </div>
                          {rec.financialDetails.repaymentBonus && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                              <strong>Tilgungszuschuss:</strong> {rec.financialDetails.repaymentBonus}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Eligibility Status */}
                      {rec.eligibility && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3">Eligibility Status</h4>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                            rec.eligibility.status === 'eligible' ? 'bg-green-100 text-green-800' :
                            rec.eligibility.status === 'likely_eligible' ? 'bg-blue-100 text-blue-800' :
                            rec.eligibility.status === 'needs_verification' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {rec.eligibility.status === 'eligible' ? '✓ Eligible' :
                             rec.eligibility.status === 'likely_eligible' ? '◐ Likely Eligible' :
                             rec.eligibility.status === 'needs_verification' ? '? Needs Verification' :
                             '✗ Not Eligible'}
                          </div>
                          {rec.eligibility.requirements && (
                            <div className="space-y-2">
                              {rec.eligibility.requirements.map((req: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm">
                                  <span className={req.userMeets ? 'text-green-600' : 'text-amber-600'}>
                                    {req.userMeets ? '✓' : '○'}
                                  </span>
                                  <span className="text-gray-700">{req.requirement}</span>
                                  {req.notes && <span className="text-gray-500 text-xs">({req.notes})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Why Recommended */}
                      {rec.recommendationReason && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-800 mb-2">Why This is Recommended</h4>
                          <p className="text-blue-700">{rec.recommendationReason}</p>
                        </div>
                      )}

                      {/* Pros and Cons */}
                      <div className="grid md:grid-cols-2 gap-4 mb-6">
                        {rec.pros && rec.pros.length > 0 && (
                          <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="font-semibold text-green-800 mb-2">✓ Advantages</h4>
                            <ul className="space-y-1">
                              {rec.pros.map((pro: string, i: number) => (
                                <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                                  <span className="text-green-500">•</span> {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {rec.cons && rec.cons.length > 0 && (
                          <div className="bg-red-50 rounded-lg p-4">
                            <h4 className="font-semibold text-red-800 mb-2">✗ Limitations</h4>
                            <ul className="space-y-1">
                              {rec.cons.map((con: string, i: number) => (
                                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                  <span className="text-red-500">•</span> {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Application Process */}
                      {rec.applicationProcess && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-700 mb-3">Application Process</h4>
                          {rec.applicationProcess.criticalNote && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Critical:</strong> {rec.applicationProcess.criticalNote}
                            </div>
                          )}
                          <div className="space-y-2">
                            {rec.applicationProcess.steps?.map((step: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                                  {step.step || i + 1}
                                </span>
                                <div>
                                  <span className="text-gray-800">{step.action || step}</span>
                                  {step.duration && <span className="text-gray-500 ml-2">({step.duration})</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                          {rec.applicationProcess.applicationUrl && (
                            <a
                              href={rec.applicationProcess.applicationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition"
                            >
                              Apply Now →
                            </a>
                          )}
                        </div>
                      )}

                      {/* Cost Benefit */}
                      {rec.costBenefit && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-2">Cost-Benefit Analysis</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <div className="text-gray-500">Total Benefit</div>
                              <div className="font-bold text-green-700">{rec.costBenefit.totalBenefit}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">vs Standard Loan</div>
                              <div className="font-bold text-green-700">{rec.costBenefit.savingsVsStandardLoan}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Cost Reduction</div>
                              <div className="font-bold text-green-700">{rec.costBenefit.effectiveCostReduction}</div>
                            </div>
                            <div>
                              <div className="text-gray-500">Break-even</div>
                              <div className="font-bold text-gray-700">{rec.costBenefit.breakEvenMonths} months</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimal Strategy */}
          {financingOptions.optimalStrategy && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-md p-8 border border-indigo-200">
              <h2 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> Optimal Financing Strategy
              </h2>
              <p className="text-gray-700 mb-4">{financingOptions.optimalStrategy.strategyExplanation}</p>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Recommended Combination</h4>
                  <div className="flex flex-wrap gap-2">
                    {financingOptions.optimalStrategy.recommendedCombination?.map((prog: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                        {prog}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Total Combined Benefit</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {financingOptions.optimalStrategy.totalCombinedBenefit}
                  </div>
                </div>
              </div>

              {financingOptions.optimalStrategy.applicationOrder && (
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Application Order</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {financingOptions.optimalStrategy.applicationOrder.map((order: string, i: number) => (
                      <li key={i}>{order}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Tax Benefits */}
          {financingOptions.taxBenefits && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> Tax Benefits
              </h2>

              {financingOptions.taxBenefits.handwerkerleistungen && (
                <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Handwerkerleistungen (§35a EStG)</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Maximum Deduction:</span>
                      <span className="ml-2 font-medium">{financingOptions.taxBenefits.handwerkerleistungen.maxDeduction}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimated Benefit:</span>
                      <span className="ml-2 font-bold text-green-600">{financingOptions.taxBenefits.handwerkerleistungen.estimatedBenefit}</span>
                    </div>
                  </div>
                  {financingOptions.taxBenefits.handwerkerleistungen.requirements && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-500">Requirements: </span>
                      <span className="text-sm text-gray-700">{financingOptions.taxBenefits.handwerkerleistungen.requirements.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}

              {financingOptions.taxBenefits.totalTaxSavings && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-gray-500">Total Estimated Tax Savings</div>
                  <div className="text-2xl font-bold text-green-600">{financingOptions.taxBenefits.totalTaxSavings}</div>
                </div>
              )}
            </div>
          )}

          {/* Next Steps */}
          {financingOptions.nextSteps && financingOptions.nextSteps.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg shadow-md p-8 border border-amber-200">
              <h2 className="text-2xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                <span className="text-3xl">👉</span> Next Steps
              </h2>
              <div className="space-y-3">
                {financingOptions.nextSteps.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                    <span className="flex-shrink-0 w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                      {step.step || i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-800">{step.action || step}</div>
                      {step.deadline && <div className="text-sm text-gray-500">Deadline: {step.deadline}</div>}
                      {step.details && <div className="text-sm text-gray-600 mt-1">{step.details}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Find Contractor Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={handleFindContractor}
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Find the Best Contractor
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>

          {/* Metadata */}
          {financingOptions.metadata && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Analysis generated on {financingOptions.metadata.analysisDate} | Data version: {financingOptions.metadata.dataVersion}
              <br />
              {financingOptions.metadata.disclaimer}
            </div>
          )}
        </div>
      )}

      {/* Image Description Results */}
      {imageDescription && (
        <div id="image-description-results" className="mt-8 bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-blue-800 mb-4">
            Generated Renovation Visualization
          </h2>

          {/* Display Generated Image */}
          {imageDescription.image_base64 && (
            <div className="mb-6">
              <div className="relative rounded-lg overflow-hidden border-2 border-blue-200 shadow-lg">
                <img
                  src={`data:image/png;base64,${imageDescription.image_base64}`}
                  alt="Generated Renovation Visualization"
                  className="w-full h-auto"
                />
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
                  Generated by FLUX.1-schnell
                </div>
              </div>
            </div>
          )}

          {/* Show legacy image description data if exists */}
          {(imageDescription.imagePrompt || imageDescription.keyFeatures || imageDescription.style) && (
            <div className="grid md:grid-cols-2 gap-6">
              {imageDescription.keyFeatures && imageDescription.keyFeatures.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Key Features:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {imageDescription.keyFeatures.map((feature: string, i: number) => (
                      <li key={i} className="text-gray-600">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {imageDescription.materials && imageDescription.materials.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Materials:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {imageDescription.materials.map((material: string, i: number) => (
                      <li key={i} className="text-gray-600">{material}</li>
                    ))}
                  </ul>
                </div>
              )}

              {imageDescription.colorPalette && imageDescription.colorPalette.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Color Palette:</h4>
                  <div className="flex gap-2">
                    {imageDescription.colorPalette.map((color: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{color}</span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                {imageDescription.style && (
                  <div className="mb-3">
                    <span className="font-semibold text-gray-800">Style:</span> {imageDescription.style}
                  </div>
                )}
                {imageDescription.mood && (
                  <div className="mb-3">
                    <span className="font-semibold text-gray-800">Mood:</span> {imageDescription.mood}
                  </div>
                )}
                {imageDescription.lighting && (
                  <div>
                    <span className="font-semibold text-gray-800">Lighting:</span> {imageDescription.lighting}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart Assessment Wizard - Full screen wizard for photo-based analysis */}
      <AssessmentWizard
        renovationType={formData.renovationType}
        isOpen={showSmartWizard}
        planningData={planningModuleData}  // INTEGRATION: Pass planning data for integrated analysis
        onClose={() => {
          setShowSmartWizard(false);
          setAnalysisMethod(null);
        }}
        onComplete={(result, fullResult) => {
          console.log('AssessmentWizard completed with result:', result);

          // CRITICAL: Extract and store the original prompt for financing options
          // The API response includes _originalPrompt which is needed for Get Financing Options
          const originalPromptFromResult = result._originalPrompt || '';
          if (originalPromptFromResult) {
            setOriginalPrompt(originalPromptFromResult);
            console.log('Set originalPrompt from Smart Photo Analysis result:', originalPromptFromResult.length, 'chars');
          } else {
            // If no original prompt in result, build a basic one from the form data
            const basicPrompt = `${formData.renovationType || 'general'} renovation project in Germany`;
            setOriginalPrompt(basicPrompt);
            console.log('Set fallback originalPrompt:', basicPrompt);
          }

          // Store the cost estimate result
          setCostEstimateData(result);
          setAnalysisResult({
            costEstimate: result,
            recommendations: [],
            summary: '',
            nextSteps: []
          });

          // Store photo analysis and user answers for financing options
          if (fullResult) {
            console.log('Storing Smart Photo Analysis data for financing:', {
              hasPhotoAnalysis: !!fullResult.photoAnalysis,
              userAnswersCount: Object.keys(fullResult.userAnswers || {}).length,
              photoConditionScore: fullResult.photoAnalysis?.photoAnalysis?.conditionScore
            });
            setSmartPhotoAnalysis(fullResult.photoAnalysis);
            setSmartUserAnswers(fullResult.userAnswers);
          }

          setShowSmartWizard(false);

          // Auto-save the result
          setTimeout(() => {
            autoSaveResult();
          }, 500);
        }}
      />

      {/* AI Financing Assistant - Available on all pages */}
      <FinancingAssistant />
    </div>
  );
};

export default Financing;