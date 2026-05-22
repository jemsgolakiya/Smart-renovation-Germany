/**
 * Utility to map Project data to Financing form data
 * This allows pre-filling the financing questionnaire with data from an existing project
 */

import { Project } from '../services/projects';
import { FinancingFormData } from '../types/financing.types';
import { DEFAULT_FORM_DATA } from '../constants/financing.constants';

/**
 * Maps project type from Project model to Financing module format
 * Since both forms now use the same PROJECT_TYPES, this is a direct 1:1 mapping
 */
const mapProjectType = (projectType: string): string => {
  // Direct pass-through - both forms use identical project types
  return projectType;
};

/**
 * Main function to map Project to Financing FinancingFormData
 * Pre-fills fields that match between Project and Financing questionnaire
 *
 * @param project - The selected project from Home page
 * @returns FinancingFormData with pre-filled values from project
 */
export const mapProjectToFinancingForm = (project: Project): FinancingFormData => {
  // Start with default form data
  const formData: FinancingFormData = { ...DEFAULT_FORM_DATA };

  // Map project fields to financing form fields
  if (project.project_type) {
    formData.renovationType = mapProjectType(project.project_type);
  }

  return formData;
};

/**
 * Check if a project has enough data to pre-fill the form
 * @param project - The project to check
 * @returns true if project has minimum required data
 */
export const hasMinimumProjectData = (project: Project | null): boolean => {
  if (!project) return false;
  return !!(project.project_type); // At minimum, we need project type
};

/**
 * Get a user-friendly message about what was auto-filled
 * @param project - The project that was used for auto-fill
 * @returns Friendly message to show to user
 */
export const getAutoFillMessage = (project: Project): string => {
  if (project.project_type) {
    return `We've pre-filled the renovation type from your project "${project.name}".`;
  }

  return 'Continue filling out the form for personalized recommendations.';
};
