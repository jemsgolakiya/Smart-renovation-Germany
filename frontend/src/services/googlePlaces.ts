/**
 * Google Places API v1 Service (New)
 * 
 * Backend-first architecture for contractor discovery using Google Places API (New) v1
 * All API calls are proxied through Django backend for security and caching
 */

import { apiRequest } from './http';
import { ContractorProfile, ContractorRole, PlanData } from '../types/contractorMatching.types';

/**
 * Response from backend search-contractors endpoint
 */
interface SearchContractorsResponse {
  contractors: ContractorProfile[];
  search_terms_used: string[];
  places_types_used: string[];
  total_found: number;
}

/**
 * Location coordinates
 */
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Search for contractors by role using Google Places API v1
 * 
 * @param role - Contractor role (e.g., "SHK", "Electrician")
 * @param projectLocation - Project coordinates
 * @param radiusKm - Search radius in kilometers (default: 25)
 * @param planContext - Optional PlanData for enhanced matching
 * @returns Array of contractor profiles
 */
export async function searchContractorsByRole(
  role: ContractorRole,
  projectLocation: LocationCoordinates,
  radiusKm: number = 25,
  planContext?: PlanData
): Promise<ContractorProfile[]> {
  try {
    const response = await apiRequest<SearchContractorsResponse>(
      '/places/search-contractors/',
      {
        method: 'POST',
        body: JSON.stringify({
          role,
          project_location: projectLocation,
          radius_km: radiusKm,
          plan_context: planContext,
        }),
      }
    );

    return response.contractors;
  } catch (error) {
    console.error('Failed to search contractors:', error);
    throw error;
  }
}

/**
 * Geocode an address to latitude/longitude coordinates
 * 
 * @param address - Street address
 * @param city - City name (optional)
 * @param state - State/region name (optional)
 * @param postalCode - Postal code (optional)
 * @returns Location coordinates or null if geocoding fails
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  postalCode?: string
): Promise<LocationCoordinates | null> {
  try {
    const response = await apiRequest<LocationCoordinates>(
      '/places/geocode/',
      {
        method: 'POST',
        body: JSON.stringify({
          address,
          city: city || '',
          state: state || '',
          postal_code: postalCode || '',
        }),
      }
    );

    return response;
  } catch (error) {
    console.error('Failed to geocode address:', error);
    return null;
  }
}

/**
 * Response from backend derive-roles endpoint
 */
interface DeriveRolesResponse {
  roles: Array<{
    role: ContractorRole;
    label: string;
    required: boolean;
    target_count: number;
    reasoning: string;
  }>;
}

/**
 * Derive required contractor roles from PlanData using Gemini AI
 * 
 * @param planData - The renovation plan data
 * @returns Array of required contractor roles with reasoning
 */
export async function deriveContractorRoles(
  planData: PlanData
): Promise<DeriveRolesResponse['roles']> {
  try {
    const response = await apiRequest<DeriveRolesResponse>(
      '/places/derive-roles/',
      {
        method: 'POST',
        body: JSON.stringify({
          plan_data: planData,
        }),
      }
    );

    return response.roles;
  } catch (error) {
    console.error('Failed to derive contractor roles:', error);
    // Return empty array on error - frontend will handle fallback
    return [];
  }
}

/**
 * Google Places service object
 */
export const googlePlacesService = {
  searchContractorsByRole,
  geocodeAddress,
  deriveContractorRoles,
};
