/**
 * Global Application State Types
 * Enterprise-grade type definitions for cross-module state management
 *
 * @module types/appState.types
 * @version 1.0.0
 */

import { FinancingFormData, CostEstimateResponse } from './financing.types';
import { AssessmentAnswers } from './assessment.types';

// ============================================================================
// Module State Interfaces
// ============================================================================

/**
 * Planning Module State
 * Stores all data related to the planning workflow
 */
export interface PlanningModuleState {
  // Form Data
  formData: {
    buildingType?: string;
    location?: string;
    budget?: number;
    goals?: string[];
    propertyDetails?: Record<string, any>;
  };

  // API Response Data
  projectPlan?: {
    buildingType?: string;
    location?: string;
    budget?: number;
    goals?: string[];
    timeline?: string;
    phases?: any[];
    recommendations?: any[];
  };

  // Generated Content
  generatedImages?: Array<{
    id: string;
    url: string;
    prompt: string;
    createdAt: string;
  }>;

  // Workflow State
  currentStep: number;
  isComplete: boolean;
  lastUpdated: string;
}

/**
 * Financing Module State
 * Stores all data related to financing analysis
 */
export interface FinancingModuleState {
  // Form Data
  formData: Partial<FinancingFormData>;

  // Analysis Results
  costEstimate?: CostEstimateResponse;
  financingOptions?: any;
  photoAnalysis?: any;

  // Assessment Data
  assessmentAnswers?: AssessmentAnswers;

  // Uploaded Files (metadata only - actual files stored separately)
  uploadedFiles?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;

  // Workflow State
  currentStep: number;
  analysisComplete: boolean;
  lastUpdated: string;
}

/**
 * Contracting Module State
 * Stores all data related to contractor management
 */
export interface ContractingModuleState {
  // Search Criteria
  searchCriteria?: {
    location?: string;
    renovationType?: string;
    budget?: number;
    timeline?: string;
    specializations?: string[];
  };

  // Contractor Data
  selectedContractors?: Array<{
    id: string;
    name: string;
    rating?: number;
    specializations?: string[];
    savedAt: string;
  }>;

  // Quotes & Communications
  requestedQuotes?: Array<{
    contractorId: string;
    requestedAt: string;
    status: 'pending' | 'received' | 'accepted' | 'rejected';
  }>;

  // Workflow State
  currentStep: number;
  lastUpdated: string;
}

// ============================================================================
// Session & User State
// ============================================================================

/**
 * User Session State
 * Tracks user session information and preferences
 */
export interface UserSessionState {
  sessionId: string;
  startedAt: string;
  lastActiveAt: string;
  preferences: {
    language: 'de' | 'en';
    currency: 'EUR';
    notifications: boolean;
  };
}

// ============================================================================
// Global Application State
// ============================================================================

/**
 * Complete Application State
 * Root state object containing all module states
 */
export interface AppState {
  version: string;
  session: UserSessionState;
  modules: {
    planning: PlanningModuleState;
    financing: FinancingModuleState;
    contracting: ContractingModuleState;
  };
  metadata: {
    createdAt: string;
    lastModified: string;
    lastSavedAt?: string;
  };
}

// ============================================================================
// State Actions
// ============================================================================

export type ModuleName = 'planning' | 'financing' | 'contracting';

export interface StateAction {
  type: string;
  module?: ModuleName;
  payload?: any;
  timestamp: string;
}

// ============================================================================
// Storage Configuration
// ============================================================================

export interface StorageConfig {
  storageKey: string;
  version: string;
  encryptionEnabled: boolean;
  autoSaveInterval: number; // milliseconds
  maxStorageSize: number; // bytes
}

// ============================================================================
// Default State Factory
// ============================================================================

export const createDefaultPlanningState = (): PlanningModuleState => ({
  formData: {},
  currentStep: 0,
  isComplete: false,
  lastUpdated: new Date().toISOString(),
});

export const createDefaultFinancingState = (): FinancingModuleState => ({
  formData: {},
  currentStep: 0,
  analysisComplete: false,
  lastUpdated: new Date().toISOString(),
});

export const createDefaultContractingState = (): ContractingModuleState => ({
  currentStep: 0,
  lastUpdated: new Date().toISOString(),
});

export const createDefaultSession = (): UserSessionState => ({
  sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  startedAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  preferences: {
    language: 'de',
    currency: 'EUR',
    notifications: true,
  },
});

export const createDefaultAppState = (): AppState => ({
  version: '1.0.0',
  session: createDefaultSession(),
  modules: {
    planning: createDefaultPlanningState(),
    financing: createDefaultFinancingState(),
    contracting: createDefaultContractingState(),
  },
  metadata: {
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
});
