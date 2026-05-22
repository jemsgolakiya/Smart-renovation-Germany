/**
 * Global Application State Context
 * Enterprise-grade state management for cross-module data persistence
 *
 * Provides:
 * - Centralized state management
 * - Automatic persistence to localStorage
 * - Cross-module data sharing
 * - State restoration on page reload
 *
 * @module contexts/AppStateContext
 * @version 1.0.0
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  AppState,
  ModuleName,
  PlanningModuleState,
  FinancingModuleState,
  ContractingModuleState,
  createDefaultAppState,
} from '../types/appState.types';
import { storageService } from '../services/storage.service';

// ============================================================================
// Context Types
// ============================================================================

interface AppStateContextType {
  // Full State
  state: AppState;
  isLoading: boolean;
  isInitialized: boolean;

  // Generic State Operations
  updateModuleState: <T extends ModuleName>(
    moduleName: T,
    updates: Partial<AppState['modules'][T]>
  ) => void;
  clearModuleState: (moduleName: ModuleName) => void;
  clearAllState: () => void;

  // Planning Module
  planningState: PlanningModuleState;
  updatePlanningState: (updates: Partial<PlanningModuleState>) => void;
  clearPlanningState: () => void;

  // Financing Module
  financingState: FinancingModuleState;
  updateFinancingState: (updates: Partial<FinancingModuleState>) => void;
  clearFinancingState: () => void;

  // Contracting Module
  contractingState: ContractingModuleState;
  updateContractingState: (updates: Partial<ContractingModuleState>) => void;
  clearContractingState: () => void;

  // Cross-Module Operations
  transferPlanningToFinancing: () => void;
  transferFinancingToContracting: () => void;
  transferAllToContracting: () => void;

  // Utility
  getStorageUsage: () => { used: number; max: number; percentage: number };
  exportState: () => string;
  importState: (json: string) => boolean;
}

// ============================================================================
// Context Creation
// ============================================================================

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>(createDefaultAppState());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  useEffect(() => {
    const initializeState = () => {
      try {
        console.log('[AppStateContext] Initializing state from storage...');
        const loadedState = storageService.loadState();
        setState(loadedState);
        setIsInitialized(true);
        console.log('[AppStateContext] State initialized successfully');
      } catch (error) {
        console.error('[AppStateContext] Failed to initialize state:', error);
        setState(createDefaultAppState());
      } finally {
        setIsLoading(false);
      }
    };

    initializeState();

    // Subscribe to storage changes from other tabs
    const unsubscribe = storageService.subscribe('sync', (newState) => {
      console.log('[AppStateContext] State synced from another tab');
      setState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Generic State Operations
  // --------------------------------------------------------------------------

  const updateModuleState = useCallback(<T extends ModuleName>(
    moduleName: T,
    updates: Partial<AppState['modules'][T]>
  ) => {
    setState((prevState) => {
      const newState: AppState = {
        ...prevState,
        modules: {
          ...prevState.modules,
          [moduleName]: {
            ...prevState.modules[moduleName],
            ...updates,
            lastUpdated: new Date().toISOString(),
          },
        },
        session: {
          ...prevState.session,
          lastActiveAt: new Date().toISOString(),
        },
        metadata: {
          ...prevState.metadata,
          lastModified: new Date().toISOString(),
        },
      };

      // Persist to storage
      storageService.saveState(newState);

      return newState;
    });
  }, []);

  const clearModuleState = useCallback((moduleName: ModuleName) => {
    const defaultState = createDefaultAppState();

    setState((prevState) => {
      const newState: AppState = {
        ...prevState,
        modules: {
          ...prevState.modules,
          [moduleName]: defaultState.modules[moduleName],
        },
        metadata: {
          ...prevState.metadata,
          lastModified: new Date().toISOString(),
        },
      };

      storageService.saveState(newState, true);
      return newState;
    });
  }, []);

  const clearAllState = useCallback(() => {
    const defaultState = createDefaultAppState();
    setState(defaultState);
    storageService.clearState();
  }, []);

  // --------------------------------------------------------------------------
  // Planning Module Operations
  // --------------------------------------------------------------------------

  const planningState = useMemo(() => state.modules.planning, [state.modules.planning]);

  const updatePlanningState = useCallback((updates: Partial<PlanningModuleState>) => {
    updateModuleState('planning', updates);
  }, [updateModuleState]);

  const clearPlanningState = useCallback(() => {
    clearModuleState('planning');
  }, [clearModuleState]);

  // --------------------------------------------------------------------------
  // Financing Module Operations
  // --------------------------------------------------------------------------

  const financingState = useMemo(() => state.modules.financing, [state.modules.financing]);

  const updateFinancingState = useCallback((updates: Partial<FinancingModuleState>) => {
    updateModuleState('financing', updates);
  }, [updateModuleState]);

  const clearFinancingState = useCallback(() => {
    clearModuleState('financing');
  }, [clearModuleState]);

  // --------------------------------------------------------------------------
  // Contracting Module Operations
  // --------------------------------------------------------------------------

  const contractingState = useMemo(() => state.modules.contracting, [state.modules.contracting]);

  const updateContractingState = useCallback((updates: Partial<ContractingModuleState>) => {
    updateModuleState('contracting', updates);
  }, [updateModuleState]);

  const clearContractingState = useCallback(() => {
    clearModuleState('contracting');
  }, [clearModuleState]);

  // --------------------------------------------------------------------------
  // Cross-Module Data Transfer
  // --------------------------------------------------------------------------

  const transferPlanningToFinancing = useCallback(() => {
    const planning = state.modules.planning;

    if (planning.projectPlan || Object.keys(planning.formData).length > 0) {
      updateModuleState('financing', {
        formData: {
          ...state.modules.financing.formData,
          propertyLocation: planning.formData.location,
          renovationType: planning.formData.buildingType,
        },
      });
      console.log('[AppStateContext] Transferred Planning → Financing');
    }
  }, [state.modules.planning, state.modules.financing.formData, updateModuleState]);

  const transferFinancingToContracting = useCallback(() => {
    const financing = state.modules.financing;
    const planning = state.modules.planning;

    updateModuleState('contracting', {
      searchCriteria: {
        location: financing.formData.propertyLocation || planning.formData.location,
        renovationType: financing.formData.renovationType || planning.formData.buildingType,
        budget: financing.costEstimate?.totalEstimatedCost || planning.formData.budget,
      },
    });
    console.log('[AppStateContext] Transferred Financing → Contracting');
  }, [state.modules.financing, state.modules.planning, updateModuleState]);

  const transferAllToContracting = useCallback(() => {
    const planning = state.modules.planning;
    const financing = state.modules.financing;

    updateModuleState('contracting', {
      searchCriteria: {
        location: financing.formData.propertyLocation || planning.formData.location,
        renovationType: financing.formData.renovationType || planning.formData.buildingType,
        budget: financing.costEstimate?.totalEstimatedCost || planning.formData.budget,
        timeline: planning.projectPlan?.timeline,
      },
    });
    console.log('[AppStateContext] Transferred All Data → Contracting');
  }, [state.modules.planning, state.modules.financing, updateModuleState]);

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  const getStorageUsage = useCallback(() => {
    return storageService.getStorageUsage();
  }, []);

  const exportState = useCallback(() => {
    return storageService.exportState();
  }, []);

  const importState = useCallback((json: string) => {
    const success = storageService.importState(json);
    if (success) {
      setState(storageService.loadState());
    }
    return success;
  }, []);

  // --------------------------------------------------------------------------
  // Context Value
  // --------------------------------------------------------------------------

  const contextValue = useMemo<AppStateContextType>(() => ({
    // Full State
    state,
    isLoading,
    isInitialized,

    // Generic Operations
    updateModuleState,
    clearModuleState,
    clearAllState,

    // Planning
    planningState,
    updatePlanningState,
    clearPlanningState,

    // Financing
    financingState,
    updateFinancingState,
    clearFinancingState,

    // Contracting
    contractingState,
    updateContractingState,
    clearContractingState,

    // Cross-Module
    transferPlanningToFinancing,
    transferFinancingToContracting,
    transferAllToContracting,

    // Utility
    getStorageUsage,
    exportState,
    importState,
  }), [
    state,
    isLoading,
    isInitialized,
    updateModuleState,
    clearModuleState,
    clearAllState,
    planningState,
    updatePlanningState,
    clearPlanningState,
    financingState,
    updateFinancingState,
    clearFinancingState,
    contractingState,
    updateContractingState,
    clearContractingState,
    transferPlanningToFinancing,
    transferFinancingToContracting,
    transferAllToContracting,
    getStorageUsage,
    exportState,
    importState,
  ]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Access the full app state context
 */
export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

/**
 * Access only Planning module state
 */
export const usePlanningState = () => {
  const { planningState, updatePlanningState, clearPlanningState, isInitialized } = useAppState();
  return {
    state: planningState,
    updateState: updatePlanningState,
    clearState: clearPlanningState,
    isInitialized,
  };
};

/**
 * Access only Financing module state
 */
export const useFinancingState = () => {
  const { financingState, updateFinancingState, clearFinancingState, isInitialized } = useAppState();
  return {
    state: financingState,
    updateState: updateFinancingState,
    clearState: clearFinancingState,
    isInitialized,
  };
};

/**
 * Access only Contracting module state
 */
export const useContractingState = () => {
  const { contractingState, updateContractingState, clearContractingState, isInitialized } = useAppState();
  return {
    state: contractingState,
    updateState: updateContractingState,
    clearState: clearContractingState,
    isInitialized,
  };
};

// ============================================================================
// Export
// ============================================================================

export default AppStateContext;
