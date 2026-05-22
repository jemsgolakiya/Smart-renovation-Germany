import React, { useState, useEffect } from "react";
import { Project } from "../../services/projects";
import Heading from "../../components/Heading/Heading";
import Text from "../../components/Text/Text";
import {
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  contractingPlanningApi,
  ContractingPlanningResponse,
  UserAnswers,
} from "../../services/contractingPlanning";

interface PlanningSourceStepProps {
  selectedProject: Project;
  onStepChange: (step: number) => void;
  onRequirementsChange?: (description: string, files: File[]) => void;
}

const PlanningSourceStep: React.FC<PlanningSourceStepProps> = ({
  selectedProject,
  onStepChange,
  onRequirementsChange,
}) => {
  const [showSubStage, setShowSubStage] = useState(false);
  const [showQuestionsStage, setShowQuestionsStage] = useState(false);
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingPlanning, setExistingPlanning] =
    useState<ContractingPlanningResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});

  // Automatically import from planning module on mount
  useEffect(() => {
    const autoImportFromPlanning = async () => {
      if (!selectedProject.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const planning = await contractingPlanningApi.importFromPlanning(
          selectedProject.id
        );

        if (planning) {
          setExistingPlanning(planning);
          setDescription(planning.description || "");
          setUserAnswers(planning.user_answers || {});

          // Automatically navigate to Contractor Matching Screen (step 2)
          onStepChange(2);
        }
      } catch (err) {
        console.error("Failed to import planning:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to import planning data. Please try again."
        );
        setIsLoading(false);
      }
    };

    autoImportFromPlanning();
  }, [selectedProject.id, onStepChange]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (!description.trim()) return;

    // Ensure project has an ID
    if (!selectedProject.id) {
      setError("Project ID is missing. Please select a valid project.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit requirements to backend (this triggers AI processing)
      const response = await contractingPlanningApi.submitRequirements({
        project_id: selectedProject.id,
        description: description.trim(),
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });

      // Update existing planning with AI response
      setExistingPlanning(response);

      // Call the callback with the data
      if (onRequirementsChange) {
        onRequirementsChange(description, uploadedFiles);
      }

      // If AI generated questions, show them
      if (response.ai_questions && response.ai_questions.length > 0) {
        setShowQuestionsStage(true);
        setIsSubmitting(false);
      } else {
        // No questions generated, proceed to next step
        onStepChange(2);
      }
    } catch (err) {
      console.error("Failed to submit planning requirements:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit requirements. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleTextInputChange = (questionId: string, value: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitAnswers = async () => {
    if (!selectedProject.id || !existingPlanning) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Submit answers to backend
      await contractingPlanningApi.submitAnswers(
        selectedProject.id,
        userAnswers
      );

      // Proceed to next step
      onStepChange(2);
    } catch (err) {
      console.error("Failed to submit answers:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit answers. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setShowSubStage(false);
    setDescription("");
    setUploadedFiles([]);
  };

  // Show loading state while automatically importing from planning
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
        <div className="text-center">
          <Heading level={3} className="text-xl mb-2 text-gray-900">
            Importing Your Renovation Plan
          </Heading>
          <Text className="text-gray-600">
            We're gathering your project details to find the perfect contractors...
          </Text>
        </div>
      </div>
    );
  }

  // Show error state if import fails
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <Heading level={3} className="text-lg text-red-900 mb-2">
                Unable to Import Planning Data
              </Heading>
              <Text className="text-red-800 text-sm">{error}</Text>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Sub-Stage - Custom Requirements Form */}
      <div
        className={`transition-all duration-500 ${
          showSubStage && !showQuestionsStage
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-8 h-0 overflow-hidden pointer-events-none"
        }`}
      >
        <div className="bg-white border-2 border-emerald-200 rounded-lg p-6 sm:p-8 space-y-6">
          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block mb-2">
              <Heading level={3} className="text-lg sm:text-xl mb-1">
                What do you need help with?
              </Heading>
              <Text className="text-gray-600 text-sm">
                Describe your specific contracting needs, requirements, or
                challenges
              </Text>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-4 min-h-32 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors text-sm sm:text-base"
              placeholder="Example: I need help with kitchen renovation, including plumbing and electrical work..."
            />
          </div>

          {/* File Upload Section */}
          <div>
            <Heading level={3} className="text-lg sm:text-xl mb-2">
              Upload photos or documents
            </Heading>
            <Text className="text-gray-600 text-sm mb-3">
              Share any relevant photos, plans, or documents to help contractors
              understand your needs
            </Text>

            {/* Previously Uploaded Files (from backend) */}
            {existingPlanning && existingPlanning.files.length > 0 && (
              <div className="mb-4 space-y-2">
                <Text className="text-sm font-medium text-gray-700">
                  Previously uploaded files ({existingPlanning.files.length}):
                </Text>
                <div className="space-y-2">
                  {existingPlanning.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <a
                          href={file.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 hover:text-blue-900 underline truncate"
                        >
                          {file.filename}
                        </a>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="relative">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors cursor-pointer text-sm sm:text-base"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>
                  {existingPlanning ? "Upload More Files" : "Choose Files"}
                </span>
              </label>
            </div>

            {/* Newly Selected Files (not yet uploaded) */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <Text className="text-sm font-medium text-gray-700">
                  New files to upload ({uploadedFiles.length}):
                </Text>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium ml-3 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <Text className="text-red-800 text-sm">{error}</Text>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleNext}
              disabled={!description.trim() || isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  <span>
                    {existingPlanning ? "Updating..." : "Submitting..."}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {existingPlanning ? "Update & Continue" : "Continue"}
                  </span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Questions Stage - AI-Generated Questions */}
      <div
        className={`transition-all duration-500 ${
          showQuestionsStage
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-8 h-0 overflow-hidden pointer-events-none"
        }`}
      >
        <div className="space-y-6">
          {/* AI Summary Card */}
          {existingPlanning?.ai_summary && (
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full opacity-20 -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-100 rounded-full opacity-20 -ml-12 -mb-12" />
              <div className="relative flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1">
                  <Text className="text-gray-800 text-sm sm:text-base leading-relaxed">
                    {existingPlanning.ai_summary}
                  </Text>
                </div>
              </div>
            </div>
          )}

          {/* Questions Section */}
          {existingPlanning?.ai_questions &&
            existingPlanning.ai_questions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 sm:px-6 py-5 sm:py-6">
                  <Heading
                    level={2}
                    className="text-xl sm:text-2xl text-white mb-1.5"
                  >
                    A few quick questions
                  </Heading>
                  <Text className="text-emerald-50 text-xs sm:text-sm">
                    Help us match you with the perfect contractors for your
                    project
                  </Text>
                </div>

                {/* Questions List */}
                <div className="p-5 sm:p-6 space-y-5">
                  {existingPlanning.ai_questions.map((question, index) => (
                    <div key={question.id} className="space-y-3">
                      {/* Question Number Badge & Text */}
                      <div className="flex items-start gap-2.5">
                        <div className="flex-shrink-0 w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <div className="flex-1 pt-0.5">
                          <Text className="font-semibold text-gray-900 text-sm sm:text-base">
                            {question.question}
                          </Text>
                        </div>
                      </div>

                      {/* Answer Input - Multiple Choice or Text */}
                      <div className="pl-9 space-y-2.5">
                        {question.type === "multiple_choice" &&
                        question.options ? (
                          // Multiple Choice Options
                          question.options.map((option) => {
                            const isSelected =
                              userAnswers[question.id] === option.id;
                            return (
                              <label
                                key={option.id}
                                className={`group relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                  isSelected
                                    ? "border-emerald-500 bg-emerald-50 shadow-md scale-[1.02]"
                                    : "border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-sm"
                                }`}
                              >
                                {/* Custom Radio */}
                                <div className="relative flex-shrink-0">
                                  <input
                                    type="radio"
                                    name={question.id}
                                    value={option.id}
                                    checked={isSelected}
                                    onChange={() =>
                                      handleAnswerChange(question.id, option.id)
                                    }
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                                      isSelected
                                        ? "border-emerald-500 bg-emerald-500"
                                        : "border-gray-300 bg-white group-hover:border-emerald-400"
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Option Text */}
                                <Text
                                  className={`flex-1 text-xs sm:text-sm transition-colors ${
                                    isSelected
                                      ? "text-gray-900 font-medium"
                                      : "text-gray-700 group-hover:text-gray-900"
                                  }`}
                                >
                                  {option.text}
                                </Text>

                                {/* Selected Indicator */}
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                )}
                              </label>
                            );
                          })
                        ) : question.type === "text_input" ? (
                          // Text Input Field
                          <div className="relative">
                            <input
                              type="text"
                              id={question.id}
                              value={userAnswers[question.id] || ""}
                              onChange={(e) =>
                                handleTextInputChange(
                                  question.id,
                                  e.target.value
                                )
                              }
                              placeholder={
                                question.placeholder || "Enter your answer..."
                              }
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Divider (except for last question) */}
                      {existingPlanning?.ai_questions &&
                        index < existingPlanning.ai_questions.length - 1 && (
                          <div className="pt-2">
                            <div className="border-t border-gray-200" />
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mx-5 sm:mx-6 mb-5 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-3">
                    <Text className="text-red-800 text-xs sm:text-sm font-medium">
                      {error}
                    </Text>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="bg-gray-50 px-5 sm:px-6 py-4 sm:py-5 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSubmitAnswers}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-600 transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-xs sm:text-sm shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PlanningSourceStep;
