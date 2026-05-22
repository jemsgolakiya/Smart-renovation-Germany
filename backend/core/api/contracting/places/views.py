"""
API Views for Google Places Integration
Handles contractor discovery using Google Places API v1
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import logging

from core.services.google_places_v1_service import GooglePlacesV1Service
from core.services.gemini_service.gemini_role_derivation_service import GeminiRoleDerivationService
from core.services.contracting_service.contractor_cache_service import ContractorCacheService
from core.api.contracting.contractor_matching_views import ContractorMatchingGeminiService

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_contractors(request):
    """
    Search for contractors using Google Places API v1
    
    POST /api/places/search-contractors/
    
    Request Body:
    {
        "role": "SHK",
        "project_location": {"latitude": 52.52, "longitude": 13.405},
        "radius_km": 25,
        "plan_context": { ... }  // Optional
    }
    
    Response:
    {
        "contractors": [ContractorProfile[]],
        "search_terms_used": ["Sanitärinstallateur", ...],
        "places_types_used": ["plumber", ...],
        "total_found": 45
    }
    """
    try:
        # Validate request data
        role = request.data.get('role')
        project_location = request.data.get('project_location')
        radius_km = request.data.get('radius_km', 25)
        plan_context = request.data.get('plan_context')
        
        if not role:
            return Response(
                {'error': 'role is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not project_location or 'latitude' not in project_location or 'longitude' not in project_location:
            return Response(
                {'error': 'project_location with latitude and longitude is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use cache service to get contractors (checks DB first, then Places API)
        cache_service = ContractorCacheService()
        contractors, source = cache_service.search_contractors_with_cache(
            role=role,
            project_location=project_location,
            radius_km=radius_km,
            plan_context=plan_context
        )
        
        logger.info(f"✅ Returned {len(contractors)} contractors from {source}")
        
        # OPTIONAL: Add "Why Match" explanations (only if plan_context provided and from Places API)
        # Skip this for cached results as they already have enrichment
        if plan_context and source == 'places_api':
            try:
                enrichment_service = ContractorMatchingGeminiService()
                for contractor in contractors[:20]:  # Limit to top 20
                    try:
                        contractor_summary = {
                            'name': contractor['name'],
                            'distance_km': contractor.get('distance_km'),
                            'years_in_business': contractor.get('years_in_business'),
                            'rating': contractor.get('rating'),
                            'signals': contractor.get('signals', {})
                        }
                        
                        plan_summary = {
                            'complexity_level': plan_context.get('project_summary', {}).get('complexity_level', 'Medium'),
                            'funding_readiness': plan_context.get('project_summary', {}).get('funding_readiness', 'Unknown'),
                            'total_duration': plan_context.get('project_summary', {}).get('total_duration', 'Unknown')
                        }
                        
                        why_match = enrichment_service.generate_why_match(
                            contractor_summary,
                            plan_summary,
                            role
                        )
                        
                        contractor['whyMatch'] = why_match
                    except Exception as e:
                        logger.warning(f"Failed to generate why_match: {e}")
                        contractor['whyMatch'] = "Good match for your project"
            except Exception as e:
                logger.warning(f"Match explanation service failed: {e}")
        
        return Response({
            'contractors': contractors,
            'source': source,
            'total_found': len(contractors)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Search contractors endpoint error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to search contractors: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def derive_roles(request):
    """
    Derive required contractor roles from PlanData using Gemini AI
    
    POST /api/places/derive-roles/
    
    Request Body:
    {
        "plan_data": {
            "project_summary": {...},
            "stakeholders": [...],
            "phases": [...]
        }
    }
    
    Response:
    {
        "roles": [
            {
                "role": "SHK",
                "label": "Plumber/Heating (SHK)",
                "required": true,
                "target_count": 3,
                "reasoning": "Bathroom renovation requires plumbing work"
            }
        ]
    }
    """
    try:
        plan_data = request.data.get('plan_data')
        
        if not plan_data:
            return Response(
                {'error': 'plan_data is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        role_service = GeminiRoleDerivationService()
        roles = role_service.derive_roles_from_plan(plan_data)
        
        return Response({'roles': roles}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Derive roles endpoint error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to derive roles: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invalidate_cache(request):
    """
    Invalidate contractor cache
    
    POST /api/places/invalidate-cache/
    
    Request Body:
    {
        "role": "SHK",  // Optional - invalidate specific role
        "place_id": "ChIJ..."  // Optional - invalidate specific contractor
    }
    
    Response:
    {
        "message": "Cache invalidated successfully"
    }
    """
    try:
        role = request.data.get('role')
        place_id = request.data.get('place_id')
        
        cache_service = ContractorCacheService()
        cache_service.invalidate_cache(role=role, place_id=place_id)
        
        message = "Cache invalidated successfully"
        if role:
            message = f"Cache invalidated for role: {role}"
        elif place_id:
            message = f"Cache invalidated for place_id: {place_id}"
        
        return Response({'message': message}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to invalidate cache: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def geocode_address(request):
    """
    Geocode an address to latitude/longitude
    
    POST /api/places/geocode/
    
    Request Body:
    {
        "address": "Musterstraße 1",
        "city": "Berlin",
        "state": "Berlin",
        "postal_code": "10115"
    }
    
    Response:
    {
        "latitude": 52.52,
        "longitude": 13.405
    }
    """
    try:
        address = request.data.get('address', '')
        city = request.data.get('city', '')
        state = request.data.get('state', '')
        postal_code = request.data.get('postal_code', '')
        
        if not any([address, city, postal_code]):
            return Response(
                {'error': 'At least one of address, city, or postal_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        places_service = GooglePlacesV1Service()
        location = places_service.geocode_address(
            address=address,
            city=city,
            state=state,
            postal_code=postal_code
        )
        
        if not location:
            return Response(
                {'error': 'Could not geocode address'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(location, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Geocode endpoint error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to geocode address: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
