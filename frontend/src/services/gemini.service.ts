/**
 * Gemini AI Service
 * Handles communication with backend API for cost estimation
 *
 * @module services/gemini.service
 */

import { CostEstimateResponse, FinancingFormData } from '../types/financing.types';

class GeminiService {
  private readonly backendUrl: string;

  constructor() {
    this.backendUrl = 'http://localhost:8000/api';
  }

  /**
   * Generate cost estimate via backend API
   * @param formData - User's renovation project data
   * @param planningData - Planning data from Planning module (optional)
   * @returns Cost estimate with breakdown (includes _originalPrompt and _formData)
   */
  public async generateCostEstimate(formData: FinancingFormData, planningData?: any): Promise<CostEstimateResponse> {
    const apiUrl = `${this.backendUrl}/financing/cost-estimate/`;

    console.log('[Gemini Service] Calling backend API for cost estimation');
    console.log('[Gemini Service] API URL:', apiUrl);
    console.log('[Gemini Service] Form data:', JSON.stringify(formData, null, 2));
    console.log('[Gemini Service] Planning Data available:', !!planningData);
    if (planningData) {
      console.log('[Gemini Service] Planning Data:', {
        buildingType: planningData.projectPlan?.buildingType,
        budget: planningData.projectPlan?.budget,
        goals: planningData.projectPlan?.goals
      });
    }

    // INTEGRATION: Include planning data in request body
    const requestBody = {
      ...formData,
      planning_data: planningData || null
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Gemini Service] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Gemini Service] Error response:', errorData);

      // Handle rate limit error (429)
      if (response.status === 429) {
        throw new Error(
          `RATE_LIMIT: ${errorData.message || 'API rate limit exceeded'}\n\n` +
          `Details: ${errorData.details || 'Please wait and try again'}\n\n` +
          `Suggestions:\n${(errorData.suggestions || []).map((s: string) => `• ${s}`).join('\n')}`
        );
      }

      // Handle other errors
      throw new Error(
        `API Error (${response.status}): ${errorData.message || errorData.error || 'Unknown error'}\n` +
        `${errorData.details || ''}`
      );
    }

    const result = await response.json();
    console.log('[Gemini Service] Cost estimate received from backend:', JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * Generate COMPREHENSIVE financing options based on:
   * - Cost estimate data
   * - Photo analysis results (from Smart Photo Analysis)
   * - User's answers to 15 budget/financing questions
   * - Planning data from Planning module (if available)
   *
   * @param originalPrompt - Original prompt sent to Gemini
   * @param costEstimate - Cost estimate response from Gemini
   * @param formData - Original form data
   * @param photoAnalysis - Photo analysis results (optional)
   * @param userAnswers - User's answers to budget questions (optional)
   * @param planningData - Planning data from Planning module (optional)
   * @returns Comprehensive financing options with detailed recommendations
   */
  public async generateFinancingOptions(
    originalPrompt: string,
    costEstimate: any,
    formData: FinancingFormData,
    photoAnalysis?: any,
    userAnswers?: Record<string, any>,
    planningData?: any  // INTEGRATION: Planning data from Planning module
  ): Promise<any> {
    const apiUrl = `${this.backendUrl}/financing/financing-options/`;

    console.log('[Gemini Service] Calling backend API for COMPREHENSIVE financing options');
    console.log('[Gemini Service] API URL:', apiUrl);
    console.log('[Gemini Service] Photo Analysis available:', !!photoAnalysis);
    console.log('[Gemini Service] User Answers available:', !!userAnswers);
    console.log('[Gemini Service] Planning Data available:', !!planningData);
    if (userAnswers) {
      console.log('[Gemini Service] User Answers count:', Object.keys(userAnswers).length);
    }
    if (planningData) {
      console.log('[Gemini Service] Planning Data:', {
        buildingType: planningData.projectPlan?.buildingType,
        budget: planningData.projectPlan?.budget,
        goals: planningData.projectPlan?.goals
      });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_prompt: originalPrompt,
        cost_estimate: costEstimate,
        form_data: formData,
        photo_analysis: photoAnalysis || null,
        user_answers: userAnswers || null,
        planning_data: planningData || null  // INTEGRATION: Pass planning data
      })
    });

    console.log('[Gemini Service] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Gemini Service] Error response:', errorData);

      if (response.status === 429) {
        throw new Error(
          `RATE_LIMIT: ${errorData.message || 'API rate limit exceeded'}\n\n` +
          `Details: ${errorData.details || 'Please wait and try again'}`
        );
      }

      throw new Error(
        `API Error (${response.status}): ${errorData.message || errorData.error || 'Unknown error'}${errorData.details ? '\nDetails: ' + errorData.details : ''}`
      );
    }

    const result = await response.json();
    console.log('[Gemini Service] Comprehensive financing options received');
    console.log('[Gemini Service] Sections included:', Object.keys(result));
    console.log('[Gemini Service] Recommendations count:', result.recommendations?.length || 0);

    return result;
  }

  /**
   * Generate image description
   */
  public async generateImageDescription(
    originalPrompt: string,
    costEstimate: any,
    formData: FinancingFormData,
    uploadedImages?: any[]
  ): Promise<any> {
    const apiUrl = `${this.backendUrl}/financing/image-generation/`;

    console.log('[Gemini Service] Calling backend API for image generation');
    console.log('[Gemini Service] Uploaded images:', uploadedImages?.length || 0);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_prompt: originalPrompt,
        cost_estimate: costEstimate,
        form_data: formData,
        uploaded_images: uploadedImages || []
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to generate image description');
    }

    const result = await response.json();
    console.log('[Gemini Service] Image description received:', result);

    return result;
  }

}

export const geminiService = new GeminiService();
