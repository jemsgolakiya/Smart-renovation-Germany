/**
 * Type definitions for the Renovation Assessment Wizard
 * Expert-interview style assessment for accurate cost estimation
 */

// ============================================================================
// Question Types
// ============================================================================

export type QuestionType =
  | 'single_choice'      // Radio buttons
  | 'multi_select'       // Checkboxes
  | 'range_slider'       // Slider with min/max
  | 'confidence'         // How confident is user
  | 'file_upload'        // Photos/videos
  | 'text_input'         // Free text
  | 'number_input';      // Numeric input

export type AnswerConfidence = 'confident' | 'approximate' | 'not_sure';

// ============================================================================
// Question Option
// ============================================================================

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;           // Emoji or icon name
  costImpact?: 'low' | 'medium' | 'high' | 'savings' | 'none';  // Visual indicator for budget impact
}

// ============================================================================
// Question Definition
// ============================================================================

export interface AssessmentQuestion {
  id: string;
  category: string;        // e.g., "BUILDING STRUCTURE"
  categoryIcon?: string;   // Emoji for category
  text: string;            // Main question text
  type: QuestionType;
  required: boolean;

  // For single_choice and multi_select
  options?: QuestionOption[];

  // For range_slider
  min?: number;
  max?: number;
  step?: number;
  unit?: string;           // e.g., "m²", "EUR"
  defaultValue?: number;

  // For text/number input
  placeholder?: string;

  // Expert hint (collapsible)
  expertHint?: {
    title: string;         // "Why is this important?"
    content: string;       // Explanation text
  };

  // Conditional logic
  showIf?: {
    questionId: string;
    values: string[];      // Show if answer is one of these values
  };

  // Helper text
  helperText?: string;     // "You can change this later"
}

// ============================================================================
// Assessment Step (Group of Questions)
// ============================================================================

export interface AssessmentStep {
  id: string;
  title: string;
  icon: string;            // Emoji
  description?: string;
  questions: AssessmentQuestion[];
}

// ============================================================================
// User Answers
// ============================================================================

export interface AssessmentAnswer {
  questionId: string;
  value: string | string[] | number | File[];
  confidence?: AnswerConfidence;
  timestamp: Date;
}

export interface AssessmentAnswers {
  [questionId: string]: AssessmentAnswer;
}

// ============================================================================
// Assessment State
// ============================================================================

export interface AssessmentState {
  currentStepIndex: number;
  currentQuestionIndex: number;
  answers: AssessmentAnswers;
  uploadedFiles: File[];
  filePreviews: FilePreview[];
  isComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface FilePreview {
  file: File;
  preview: string;         // Object URL
  type: 'image' | 'video';
}

// ============================================================================
// Progress Item
// ============================================================================

export interface ProgressItem {
  id: string;
  label: string;
  icon: string;
  status: 'completed' | 'current' | 'upcoming';
}

// ============================================================================
// Assessment Result (sent to backend)
// ============================================================================

export interface AssessmentResult {
  renovationType: string;
  answers: AssessmentAnswers;
  files: File[];
  completedAt: Date;
  totalSteps: number;
  answeredQuestions: number;
}
