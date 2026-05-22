import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Loader2, CheckCircle, Sparkles, Camera, AlertTriangle, Eye, Zap, Cpu, HelpCircle, Calculator } from 'lucide-react';
import ProgressSidebar from './ProgressSidebar';
import QuestionCard from './QuestionCard';
import {
  AssessmentStep,
  AssessmentQuestion,
  AssessmentAnswers,
  AssessmentAnswer,
  FilePreview
} from '../../types/assessment.types';
import { getAssessmentSteps, generateProgressItems } from '../../constants/assessment.constants';
import { CostEstimateResponse } from '../../types/financing.types';
import { geminiService } from '../../services/gemini.service';

// Types for smart photo analysis
interface PhotoAnalysisResult {
  photoAnalysis: {
    overallCondition: string;
    conditionScore: number;
    estimatedAge: string;
    currentStyle: string;
    estimatedSize: { sqm: number; confidence: string };
    qualityLevel: string;
    summary: string;
    keyObservations: string[];
  };
  detectedFeatures: Array<{
    feature: string;
    condition: string;
    notes: string;
    replacementNeeded: boolean;
    estimatedCostImpact: string;
  }>;
  detectedIssues: Array<{
    issue: string;
    severity: string;
    location: string;
    estimatedRepairCost: string;
    mustAddress: boolean;
    germanRegulationRelevant: boolean;
  }>;
  smartQuestions: Array<{
    id: string;
    category: string;
    question: string;
    reason: string;
    type: string;
    required: boolean;
    options?: Array<{ value: string; label: string; description: string; costImpact: string }>;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    defaultValue?: number;
    expertHint?: string;
  }>;
  analysisConfidence: {
    overall: string;
    dimensionsConfidence: string;
    conditionConfidence: string;
    issuesConfidence: string;
  };
  preliminaryEstimate: {
    rangeMin: number;
    rangeMax: number;
    currency: string;
    confidence: string;
    keyFactors: string[];
  };
  filesAnalyzed: number;
  renovationType: string;
  uploadedImages: Array<{ name: string; type: string; base64: string }>;
  ragEnhanced?: boolean;
}

// Extended completion result including photo analysis and user answers for financing
export interface AssessmentWizardResult {
  costEstimate: CostEstimateResponse;
  photoAnalysis: PhotoAnalysisResult | null;
  userAnswers: Record<string, any>;  // User's answers to the 15 budget questions
}

// Planning data from Planning module for integrated analysis
interface PlanningModuleData {
  projectPlan: {
    buildingType?: string;
    budget?: number;
    bundesland?: string;
    buildingSize?: number;
    goals?: string[];
    startDate?: string;
    financingPreference?: string;
    incentiveIntent?: string;
    heritageProtection?: string;
    livingDuringRenovation?: string;
    energyCertificateRating?: string;
    knownMajorIssues?: string[];
    surveysRequired?: string[];
    neighborImpacts?: string;
    heatingSystem?: string;
    insulation?: string;
    windowsType?: string;
    [key: string]: any;
  };
  apiPlanData: {
    success?: boolean;
    plan?: {
      phases?: any[];
      timeline?: any;
      permits_required?: any[];
      stakeholders?: any[];
      [key: string]: any;
    };
    saved_plan_id?: number;
    [key: string]: any;
  };
  timestamp: string;
}

interface AssessmentWizardProps {
  renovationType: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: CostEstimateResponse, fullResult?: AssessmentWizardResult) => void;
  planningData?: PlanningModuleData | null;  // INTEGRATION: Planning data from Planning module
}

// Wizard phases
type WizardPhase = 'upload' | 'analyzing' | 'review' | 'questions' | 'generating' | 'complete';

const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  renovationType,
  isOpen,
  onClose,
  onComplete,
  planningData  // INTEGRATION: Planning data from Planning module
}) => {
  // Log if planning data is available for integrated analysis
  useEffect(() => {
    if (planningData && isOpen) {
      console.log('='.repeat(80));
      console.log('INTEGRATION: Planning data available for Smart Photo Analysis');
      console.log('Project Plan:', planningData.projectPlan);
      console.log('API Plan Data:', planningData.apiPlanData?.plan ? 'Available' : 'Not available');
      console.log('Timestamp:', planningData.timestamp);
      console.log('='.repeat(80));
    }
  }, [planningData, isOpen]);
  // Static steps as fallback
  const staticSteps = getAssessmentSteps(renovationType);

  // State
  const [phase, setPhase] = useState<WizardPhase>('upload');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Derived state
  const currentQuestion = dynamicQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === dynamicQuestions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  // Helper function to render icons from string names
  const getIconComponent = (iconName: string, className: string = "w-5 h-5") => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'camera': <Camera className={className} />,
      'cpu': <Cpu className={className} />,
      'eye': <Eye className={className} />,
      'help-circle': <HelpCircle className={className} />,
      'calculator': <Calculator className={className} />,
    };
    return iconMap[iconName] || <HelpCircle className={className} />;
  };

  // Generate progress items for smart flow
  const getSmartProgressItems = () => {
    const items = [
      {
        id: 'upload',
        title: 'Upload Photos',
        icon: 'camera',
        status: phase === 'upload' ? 'current' : (uploadedFiles.length > 0 ? 'completed' : 'upcoming')
      },
      {
        id: 'analysis',
        title: 'AI Analysis',
        icon: 'cpu',
        status: phase === 'analyzing' ? 'current' : (photoAnalysis ? 'completed' : 'upcoming')
      },
      {
        id: 'review',
        title: 'Review Findings',
        icon: 'eye',
        status: phase === 'review' ? 'current' : (phase === 'questions' || phase === 'generating' || phase === 'complete' ? 'completed' : 'upcoming')
      },
      {
        id: 'questions',
        title: 'Smart Questions',
        icon: 'help-circle',
        status: phase === 'questions' ? 'current' : (phase === 'generating' || phase === 'complete' ? 'completed' : 'upcoming')
      },
      {
        id: 'estimate',
        title: 'Cost Estimate',
        icon: 'calculator',
        status: phase === 'generating' || phase === 'complete' ? 'current' : 'upcoming'
      }
    ];
    return items;
  };

  // Get current answer value
  const getCurrentAnswerValue = () => {
    if (!currentQuestion) return undefined;
    return answers[currentQuestion.id]?.value;
  };

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;

    const answer = answers[currentQuestion.id];
    if (!answer) return false;

    const value = answer.value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return !isNaN(value);
    return !!value;
  };

  // Handle answer change
  const handleAnswerChange = (value: string | string[] | number | File[]) => {
    if (!currentQuestion) return;

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        value,
        timestamp: new Date()
      }
    }));
  };

  // Handle file upload
  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: (file.type.startsWith('image/') ? 'image' : 'video') as 'image' | 'video'
    }));
    setFilePreviews(prev => [...prev, ...newPreviews]);
  };

  // Handle file remove
  const handleFileRemove = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      if (prev[index]) {
        URL.revokeObjectURL(prev[index].preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Call Smart Photo Analysis API
  const analyzePhotos = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one photo for smart analysis');
      return;
    }

    setPhase('analyzing');
    setError(null);
    setAnalysisProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('renovation_type', renovationType);

      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // INTEGRATION: Include planning data if available from Planning module
      if (planningData) {
        formData.append('planning_data', JSON.stringify(planningData));
        console.log('Including planning data in Smart Photo Analysis:', {
          buildingType: planningData.projectPlan?.buildingType,
          budget: planningData.projectPlan?.budget,
          goals: planningData.projectPlan?.goals,
          hasPlanPhases: !!planningData.apiPlanData?.plan?.phases
        });
      }

      console.log('Calling Smart Photo Analysis API...');

      const response = await fetch('/api/financing/smart-photo-analysis/', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Photo analysis failed');
      }

      const result: PhotoAnalysisResult = await response.json();
      console.log('Photo Analysis Result:', result);

      setPhotoAnalysis(result);
      setDynamicQuestions(result.smartQuestions || []);

      // Move to review phase
      setTimeout(() => {
        setPhase('review');
      }, 500);

    } catch (err) {
      clearInterval(progressInterval);
      console.error('Photo analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze photos');
      setPhase('upload');
    }
  };

  // Convert answers to form data for backend
  const convertAnswersToFormData = (): Record<string, any> => {
    const formData: Record<string, any> = {
      renovationType
    };

    // Add photo analysis data
    if (photoAnalysis) {
      formData._photoAnalysis = photoAnalysis.photoAnalysis;
      formData._detectedFeatures = photoAnalysis.detectedFeatures;
      formData._detectedIssues = photoAnalysis.detectedIssues;
      formData._preliminaryEstimate = photoAnalysis.preliminaryEstimate;
      formData.estimatedSize = photoAnalysis.photoAnalysis.estimatedSize.sqm;
      formData.overallCondition = photoAnalysis.photoAnalysis.overallCondition;
      formData.qualityLevel = photoAnalysis.photoAnalysis.qualityLevel;
    }

    // Add user answers
    Object.values(answers).forEach(answer => {
      formData[answer.questionId] = answer.value;
    });

    return formData;
  };

  // Navigate forward in questions
  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  // Navigate backward
  const handleBack = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      // Go back to review phase
      setPhase('review');
    }
  };

  // Handle final completion
  const handleComplete = async () => {
    setPhase('generating');
    setError(null);

    try {
      const formData = convertAnswersToFormData();
      console.log('Final assessment data:', formData);

      let response: any;

      // Always use multimodal endpoint when we have photos
      const formDataMultipart = new FormData();
      formDataMultipart.append('form_data', JSON.stringify(formData));

      uploadedFiles.forEach((file) => {
        formDataMultipart.append('files', file);
      });

      // INTEGRATION: Include planning data if available from Planning module
      if (planningData) {
        formDataMultipart.append('planning_data', JSON.stringify(planningData));
        console.log('Including planning data in Multimodal Cost Estimate:', {
          buildingType: planningData.projectPlan?.buildingType,
          budget: planningData.projectPlan?.budget,
          goals: planningData.projectPlan?.goals,
          hasPlanPhases: !!planningData.apiPlanData?.plan?.phases,
          planPhasesCount: planningData.apiPlanData?.plan?.phases?.length || 0
        });
      }

      const apiResponse = await fetch('/api/financing/multimodal-cost-estimate/', {
        method: 'POST',
        body: formDataMultipart,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.message || errorData.error || 'Analysis failed');
      }

      response = await apiResponse.json();
      console.log('Cost estimate received:', response);

      setPhase('complete');

      // Convert answers to a simple key-value format for financing analysis
      const userAnswersForFinancing: Record<string, any> = {};
      Object.entries(answers).forEach(([questionId, answer]) => {
        userAnswersForFinancing[questionId] = answer.value;
      });

      // Create full result with photo analysis and user answers for financing options
      const fullResult: AssessmentWizardResult = {
        costEstimate: response,
        photoAnalysis: photoAnalysis,
        userAnswers: userAnswersForFinancing
      };

      console.log('Full assessment result for financing:', {
        hasPhotoAnalysis: !!photoAnalysis,
        userAnswersCount: Object.keys(userAnswersForFinancing).length,
        photoConditionScore: photoAnalysis?.photoAnalysis?.conditionScore,
        detectedIssuesCount: photoAnalysis?.detectedIssues?.length || 0
      });

      setTimeout(() => {
        onComplete(response, fullResult);
      }, 1500);

    } catch (err) {
      console.error('Assessment error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPhase('questions');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      filePreviews.forEach(preview => {
        URL.revokeObjectURL(preview.preview);
      });
    };
  }, []);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setPhase('upload');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setPhotoAnalysis(null);
      setDynamicQuestions([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Render different phases
  const renderPhase = () => {
    switch (phase) {
      case 'upload':
        return renderUploadPhase();
      case 'analyzing':
        return renderAnalyzingPhase();
      case 'review':
        return renderReviewPhase();
      case 'questions':
        return renderQuestionsPhase();
      case 'generating':
        return renderGeneratingPhase();
      case 'complete':
        return renderCompletePhase();
      default:
        return null;
    }
  };

  // PHASE 1: Upload Photos
  const renderUploadPhase = () => (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Upload Photos of Your Space
          </h2>
          <p className="text-gray-500">
            Our AI will analyze your photos to detect condition, features, and issues for accurate estimation
          </p>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 bg-blue-50 hover:bg-blue-100 transition cursor-pointer mb-6">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              handleFileUpload(files);
            }}
            className="hidden"
            id="photo-upload"
          />
          <label htmlFor="photo-upload" className="cursor-pointer block text-center">
            <div className="flex gap-4 mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-blue-700 font-semibold mb-2">
              Click to upload photos or videos
            </p>
            <p className="text-blue-600 text-sm">
              Multiple files supported • Max 50MB each
            </p>
          </label>
        </div>

        {/* Preview Grid */}
        {filePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {filePreviews.map((preview, index) => (
              <div key={index} className="relative group">
                {preview.type === 'image' ? (
                  <img
                    src={preview.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={preview.preview}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                )}
                <button
                  onClick={() => handleFileRemove(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={analyzePhotos}
          disabled={uploadedFiles.length === 0}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
            uploadedFiles.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Zap className="w-6 h-6" />
          Analyze {uploadedFiles.length} Photo{uploadedFiles.length !== 1 ? 's' : ''} with AI
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );

  // PHASE 2: Analyzing Photos
  const renderAnalyzingPhase = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto">
            <Loader2 className="w-24 h-24 text-blue-600 animate-spin" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">{analysisProgress}%</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          AI Analyzing Your Photos...
        </h2>
        <div className="space-y-3 text-left bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${analysisProgress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}>
              {analysisProgress >= 20 && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <span className={analysisProgress >= 20 ? 'text-green-700' : 'text-gray-500'}>
              Processing images...
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${analysisProgress >= 40 ? 'bg-green-500' : 'bg-gray-300'}`}>
              {analysisProgress >= 40 && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <span className={analysisProgress >= 40 ? 'text-green-700' : 'text-gray-500'}>
              Detecting features and fixtures...
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${analysisProgress >= 60 ? 'bg-green-500' : 'bg-gray-300'}`}>
              {analysisProgress >= 60 && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <span className={analysisProgress >= 60 ? 'text-green-700' : 'text-gray-500'}>
              Identifying issues and conditions...
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${analysisProgress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`}>
              {analysisProgress >= 80 && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <span className={analysisProgress >= 80 ? 'text-green-700' : 'text-gray-500'}>
              Generating smart questions...
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${analysisProgress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`}>
              {analysisProgress >= 100 && <CheckCircle className="w-4 h-4 text-white" />}
            </div>
            <span className={analysisProgress >= 100 ? 'text-green-700' : 'text-gray-500'}>
              Preparing preliminary estimate...
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // PHASE 3: Review AI Findings
  const renderReviewPhase = () => {
    if (!photoAnalysis) return null;

    const { photoAnalysis: analysis, detectedFeatures, detectedIssues, preliminaryEstimate, analysisConfidence } = photoAnalysis;

    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              AI Photo Analysis Complete
            </h2>
            <p className="text-gray-500">
              Review what our AI detected. Answer a few targeted questions for maximum accuracy.
            </p>
          </div>

          {/* Overall Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-blue-900">Overall Assessment</h3>
                <p className="text-blue-700">{analysis.summary}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{analysis.conditionScore}/10</div>
                <div className="text-sm text-blue-500">Condition Score</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500">Condition</div>
                <div className="font-semibold text-gray-800 capitalize">{analysis.overallCondition}</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500">Estimated Size</div>
                <div className="font-semibold text-gray-800">{analysis.estimatedSize.sqm} m²</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500">Age</div>
                <div className="font-semibold text-gray-800">{analysis.estimatedAge}</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500">Quality Level</div>
                <div className="font-semibold text-gray-800 capitalize">{analysis.qualityLevel}</div>
              </div>
            </div>
          </div>

          {/* Preliminary Estimate */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 mb-6 border border-emerald-200">
            <h3 className="text-lg font-bold text-emerald-900 mb-2">Preliminary Estimate</h3>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-emerald-600">
                €{preliminaryEstimate.rangeMin.toLocaleString()} - €{preliminaryEstimate.rangeMax.toLocaleString()}
              </span>
              <span className="text-emerald-500 text-sm">EUR</span>
            </div>
            <p className="text-emerald-700 text-sm mb-3">{preliminaryEstimate.confidence}</p>
            <div className="flex flex-wrap gap-2">
              {preliminaryEstimate.keyFactors.map((factor, idx) => (
                <span key={idx} className="px-3 py-1 bg-white text-emerald-700 text-sm rounded-full">
                  {factor}
                </span>
              ))}
            </div>
          </div>

          {/* Detected Features */}
          {detectedFeatures.length > 0 && (
            <div className="bg-white rounded-2xl p-6 mb-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                Detected Features ({detectedFeatures.length})
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {detectedFeatures.map((feature, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border ${
                    feature.condition === 'good' ? 'bg-green-50 border-green-200' :
                    feature.condition === 'fair' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">{feature.feature}</div>
                        <div className="text-sm text-gray-600">{feature.notes}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        feature.condition === 'good' ? 'bg-green-200 text-green-800' :
                        feature.condition === 'fair' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {feature.condition}
                      </span>
                    </div>
                    {feature.replacementNeeded && (
                      <div className="mt-2 text-sm text-amber-700 font-medium">
                        Replacement recommended
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected Issues */}
          {detectedIssues.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-6 mb-6 border border-amber-200">
              <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Issues Detected ({detectedIssues.length})
              </h3>
              <div className="space-y-3">
                {detectedIssues.map((issue, idx) => (
                  <div key={idx} className={`p-4 rounded-lg bg-white border-l-4 ${
                    issue.severity === 'critical' ? 'border-red-500' :
                    issue.severity === 'major' ? 'border-orange-500' :
                    issue.severity === 'minor' ? 'border-yellow-500' :
                    'border-gray-300'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">{issue.issue}</div>
                        <div className="text-sm text-gray-600">Location: {issue.location}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          issue.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                          issue.severity === 'minor' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {issue.severity}
                        </span>
                        <div className="text-sm font-semibold text-gray-700 mt-1">
                          {issue.estimatedRepairCost}
                        </div>
                      </div>
                    </div>
                    {issue.germanRegulationRelevant && (
                      <div className="mt-2 text-sm text-blue-700">
                        🇩🇪 German regulation relevant
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Observations */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Key Observations</h3>
            <ul className="space-y-2">
              {analysis.keyObservations.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700">{obs}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Step CTA */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
              <h3 className="text-lg font-bold text-blue-900 mb-2">
                Smart Budget Questions
              </h3>
              <p className="text-blue-700 mb-3">
                Answer {dynamicQuestions.length} targeted questions to understand your financing budget precisely.
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <span className="px-3 py-1 bg-white text-blue-700 rounded-full border border-blue-200">Budget & Financing</span>
                <span className="px-3 py-1 bg-white text-blue-700 rounded-full border border-blue-200">German Programs (KfW/BAFA)</span>
                <span className="px-3 py-1 bg-white text-blue-700 rounded-full border border-blue-200">Quality & Materials</span>
                <span className="px-3 py-1 bg-white text-blue-700 rounded-full border border-blue-200">Hidden Cost Factors</span>
              </div>
            </div>
            <button
              onClick={() => setPhase('questions')}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition shadow-lg flex items-center gap-3 mx-auto"
            >
              <Sparkles className="w-6 h-6" />
              Continue to {dynamicQuestions.length} Smart Questions
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // PHASE 4: Answer Dynamic Questions
  const renderQuestionsPhase = () => {
    if (!currentQuestion) {
      // If no dynamic questions, complete immediately
      handleComplete();
      return null;
    }

    // Convert dynamic question to QuestionCard format
    const questionForCard: AssessmentQuestion = {
      id: currentQuestion.id,
      category: currentQuestion.category,
      text: currentQuestion.question,
      type: currentQuestion.type as any,
      required: currentQuestion.required,
      options: currentQuestion.options,
      min: currentQuestion.min,
      max: currentQuestion.max,
      step: currentQuestion.step,
      unit: currentQuestion.unit,
      defaultValue: currentQuestion.defaultValue,
      expertHint: currentQuestion.expertHint ? {
        title: 'Expert Insight',
        content: currentQuestion.expertHint
      } : undefined,
      helperText: currentQuestion.reason
    };

    // Get category info for current question
    const currentCategory = currentQuestion.category || '';
    const categoryQuestions = dynamicQuestions.filter(q => q.category === currentCategory);
    const categoryIndex = categoryQuestions.findIndex(q => q.id === currentQuestion.id);

    return (
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">
                {currentCategory}
              </span>
              <span className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {dynamicQuestions.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / dynamicQuestions.length) * 100}%` }}
              />
            </div>
            {/* Milestone markers for 15 questions */}
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>Start</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>Done</span>
            </div>
          </div>

          <QuestionCard
            question={questionForCard}
            value={getCurrentAnswerValue()}
            onChange={handleAnswerChange}
          />
        </div>
      </div>
    );
  };

  // PHASE 5: Generating Final Estimate
  const renderGeneratingPhase = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Generating Your Detailed Estimate...
        </h2>
        <p className="text-gray-500">
          Combining photo analysis + your answers for maximum accuracy
        </p>
      </div>
    </div>
  );

  // PHASE 6: Complete
  const renderCompletePhase = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Assessment Complete!
        </h2>
        <div className="space-y-3 text-left mb-6">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Photo analysis integrated</span>
          </div>
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Smart questions answered</span>
          </div>
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Highly accurate estimate generated</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Sparkles className="w-5 h-5" />
          <span>Redirecting to results...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Smart Renovation Assessment</h1>
            <p className="text-sm text-gray-500">AI-powered photo analysis for 99% accurate estimates</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={`flex max-w-7xl mx-auto px-6 py-6 gap-6 ${
        phase === 'questions' ? 'min-h-[calc(100vh-140px)] pb-20' : 'h-[calc(100vh-140px)]'
      }`}>
        {/* Left Sidebar - Smart Progress */}
        <div className="hidden lg:block w-72 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-lg p-5 sticky top-24 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Smart Analysis Flow
            </h3>
            <div className="space-y-3">
              {getSmartProgressItems().map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    item.status === 'current'
                      ? 'bg-blue-50 border border-blue-200'
                      : item.status === 'completed'
                      ? 'bg-green-50 border border-green-100'
                      : 'bg-gray-50 border border-transparent'
                  }`}
                >
                  {/* Step Number & Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.status === 'completed'
                      ? 'bg-green-500 text-white'
                      : item.status === 'current'
                      ? 'bg-blue-500 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {item.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      getIconComponent(item.icon, `w-5 h-5 ${
                        item.status === 'current' ? 'text-white' : 'text-gray-400'
                      }`)
                    )}
                  </div>

                  {/* Step Title */}
                  <div className="flex-1">
                    <span className={`font-medium text-sm ${
                      item.status === 'current'
                        ? 'text-blue-700'
                        : item.status === 'completed'
                        ? 'text-green-700'
                        : 'text-gray-400'
                    }`}>
                      {item.title}
                    </span>
                    {item.status === 'current' && (
                      <span className="block text-xs text-blue-500 mt-0.5">In progress...</span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {item.status === 'current' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </div>
              ))}
            </div>

            {/* Help Text */}
            <div className="mt-5 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                AI-powered analysis for accurate estimates
              </p>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-visible">
          {renderPhase()}
        </div>
      </div>

      {/* Footer Navigation */}
      {phase === 'questions' && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <div className="text-gray-600">
              <span className="font-semibold text-blue-600">{currentQuestionIndex + 1}</span>
              <span className="mx-1">/</span>
              <span>{dynamicQuestions.length}</span>
            </div>

            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered() && currentQuestion?.required}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
                isCurrentQuestionAnswered() || !currentQuestion?.required
                  ? isLastQuestion
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLastQuestion ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Final Estimate
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default AssessmentWizard;
