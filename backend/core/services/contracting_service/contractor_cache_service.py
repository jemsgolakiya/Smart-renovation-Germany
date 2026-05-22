"""
Contractor Database Cache Service
Manages contractor caching to avoid redundant Google Places API calls
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal

from core.models.contractor import Contractor
from core.services.google_places_v1_service import GooglePlacesV1Service
from core.services.gemini_service.gemini_places_query_service import GeminiPlacesQueryService
from core.services.contracting_service.contractor_certification_service import ContractorCertificationService

logger = logging.getLogger(__name__)


class ContractorCacheService:
    """
    Service for caching contractors in the database
    Checks DB first, then falls back to Google Places API
    """
    
    # Cache expiration time (7 days)
    CACHE_EXPIRATION_DAYS = 7
    
    # Minimum results to consider cache valid
    MIN_CACHE_RESULTS = 3
    
    def __init__(self):
        self.places_service = GooglePlacesV1Service()
        self.query_service = GeminiPlacesQueryService()
        self.certification_service = ContractorCertificationService()
    
    def search_contractors_with_cache(
        self,
        role: str,
        project_location: Dict[str, float],
        radius_km: int,
        plan_context: Optional[Dict] = None
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Search for contractors using database cache first, then Places API
        
        Args:
            role: Contractor role (e.g., 'SHK', 'Electrician')
            project_location: {'latitude': float, 'longitude': float}
            radius_km: Search radius in kilometers
            plan_context: Optional project context for enrichment
            
        Returns:
            Tuple of (contractors list, source: 'cache' | 'places_api')
        """
        logger.info(f"🔍 Searching for {role} contractors (radius: {radius_km}km)")
        
        # Step 1: Check database cache
        cached_contractors = self._get_from_cache(
            role=role,
            project_location=project_location,
            radius_km=radius_km
        )
        
        if len(cached_contractors) >= self.MIN_CACHE_RESULTS:
            logger.info(f"✅ Found {len(cached_contractors)} contractors in cache for {role}")
            # Convert to dict format and add distance
            contractors_list = self._contractors_to_dict_list(
                cached_contractors,
                project_location
            )
            return contractors_list, 'cache'
        
        # Step 2: Cache miss or insufficient results - call Places API
        logger.info(f"📡 Cache miss for {role} - fetching from Google Places API")
        contractors_list = self._fetch_from_places_api(
            role=role,
            project_location=project_location,
            radius_km=radius_km,
            plan_context=plan_context
        )
        
        # Step 3: Store in database for future use and get contractors with database IDs
        if contractors_list:
            stored_contractors = self._store_in_cache(contractors_list, role)
            logger.info(f"💾 Stored {len(stored_contractors)} contractors in database cache")
            
            # Convert stored contractors (with database IDs) to dict format
            contractors_with_ids = self._contractors_to_dict_list(
                stored_contractors,
                project_location
            )
            
            return contractors_with_ids, 'places_api'
        
        return contractors_list, 'places_api'
    
    def _get_from_cache(
        self,
        role: str,
        project_location: Dict[str, float],
        radius_km: int
    ) -> List[Contractor]:
        """Retrieve contractors from database cache"""
        
        # Calculate expiration date
        expiration_date = timezone.now() - timedelta(days=self.CACHE_EXPIRATION_DAYS)
        
        # Query contractors
        # - Must have this role in project_types
        # - Must have place_id (from Google Places)
        # - Must be updated within expiration period
        # - Must be within radius (we'll filter by distance in Python for simplicity)
        
        contractors = Contractor.objects.filter(
            Q(project_types__icontains=role) & 
            Q(place_id__isnull=False) &
            Q(last_updated__gte=expiration_date) &
            Q(latitude__isnull=False) &
            Q(longitude__isnull=False)
        )
        
        # Filter by distance (Haversine formula in Python)
        project_lat = project_location['latitude']
        project_lng = project_location['longitude']
        
        filtered_contractors = []
        for contractor in contractors:
            distance_km = self._calculate_distance(
                project_lat,
                project_lng,
                float(contractor.latitude),
                float(contractor.longitude)
            )
            
            if distance_km <= radius_km:
                # Attach distance for sorting
                contractor._distance_km = distance_km
                filtered_contractors.append(contractor)
        
        # Sort by distance
        filtered_contractors.sort(key=lambda c: c._distance_km)
        
        return filtered_contractors
    
    def _fetch_from_places_api(
        self,
        role: str,
        project_location: Dict[str, float],
        radius_km: int,
        plan_context: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Fetch contractors from Google Places API"""
        
        # Generate German search terms for the role
        german_terms = self.query_service.generate_german_search_terms(role)
        
        if not german_terms:
            logger.warning(f"Could not generate search terms for role: {role}")
            return []
        
        logger.info(f"🔍 Searching for {role} using German terms: {german_terms}")
        
        # Convert radius to meters
        radius_meters = radius_km * 1000
        
        # Search Places API using text search only (types are not reliable in v1)
        all_places: Dict[str, Dict] = {}
        
        # Use top 4 German terms for comprehensive coverage
        text_search_limit = min(4, len(german_terms))
        logger.info(f"🔍 Performing text search with {text_search_limit} terms")
        
        for term in german_terms[:text_search_limit]:
            try:
                logger.info(f"  → Searching: '{term}'")
                text_results = self.places_service.search_text(
                    text_query=term,
                    location=project_location,
                    radius_meters=radius_meters,
                    max_results=15
                )
                new_places = 0
                for place in text_results:
                    place_id = place.get('id')
                    if place_id and place_id not in all_places:
                        all_places[place_id] = place
                        new_places += 1
                logger.info(f"  ✅ Found {new_places} new places for '{term}'")
            except Exception as e:
                logger.warning(f"  ⚠️ Text search for '{term}' failed: {e}")
        
        # Convert to contractor profiles
        places_list = list(all_places.values())[:50]
        logger.info(f"📊 Total unique places found: {len(all_places)} (using top {len(places_list)})")
        
        contractors = []
        for place in places_list:
            contractor = self.places_service.convert_to_contractor_profile(
                place,
                project_location=project_location
            )
            contractor['project_types'] = role
            contractors.append(contractor)
        
        # Sort by distance
        contractors.sort(key=lambda c: c.get('distance_km', 999))
        
        # Batch enrich with certifications
        try:
            contractors = self.certification_service.enrich_contractors_batch(contractors)
        except Exception as e:
            logger.warning(f"Certification enrichment failed: {e}")
        
        return contractors
    
    def _store_in_cache(self, contractors: List[Dict[str, Any]], role: str) -> List[Contractor]:
        """
        Store contractors in database cache
        
        Returns:
            List of saved Contractor model instances (with database IDs)
        """
        stored_contractors = []
        
        for contractor_data in contractors:
            place_id = contractor_data.get('place_id')
            
            if not place_id:
                logger.debug(f"Skipping contractor without place_id: {contractor_data.get('name')}")
                continue
            
            # Check if contractor already exists
            try:
                contractor = Contractor.objects.get(place_id=place_id)
                # Update existing contractor
                self._update_contractor(contractor, contractor_data, role)
                logger.debug(f"Updated existing contractor: {contractor.name}")
            except Contractor.DoesNotExist:
                # Create new contractor
                contractor = self._create_contractor(contractor_data, role)
                logger.debug(f"Created new contractor: {contractor.name}")
            
            # Add to stored list
            stored_contractors.append(contractor)
        
        return stored_contractors
    
    def _create_contractor(self, data: Dict[str, Any], role: str) -> Contractor:
        """Create a new contractor from Places API data"""
        
        contractor = Contractor(
            place_id=data.get('place_id'),
            name=data.get('name', ''),
            address=data.get('address', ''),
            city=data.get('city', ''),
            postal_code=data.get('postal_code', ''),
            state=data.get('state', ''),
            phone=data.get('phone', ''),
            website=data.get('website', ''),
            email=data.get('email', ''),
            latitude=Decimal(str(data.get('latitude', 0))) if data.get('latitude') else None,
            longitude=Decimal(str(data.get('longitude', 0))) if data.get('longitude') else None,
            rating=Decimal(str(data.get('rating', 0))) if data.get('rating') else None,
            reviews_count=data.get('reviews_count', 0),
            services=data.get('services', ''),
            description=data.get('description', ''),
            years_in_business=data.get('years_in_business'),
            kfw_eligible=data.get('kfw_eligible', False),
            source='google_places',
            project_types=role,
            certification_signals=data.get('signals', {}),
            ai_description=data.get('ai_description', '')
        )
        
        contractor.save()
        return contractor
    
    def _update_contractor(self, contractor: Contractor, data: Dict[str, Any], role: str):
        """Update existing contractor with fresh data"""
        
        # Update basic fields
        contractor.name = data.get('name', contractor.name)
        contractor.address = data.get('address', contractor.address)
        contractor.city = data.get('city', contractor.city)
        contractor.postal_code = data.get('postal_code', contractor.postal_code)
        contractor.state = data.get('state', contractor.state)
        contractor.phone = data.get('phone', contractor.phone)
        contractor.website = data.get('website', contractor.website)
        contractor.rating = Decimal(str(data.get('rating', 0))) if data.get('rating') else contractor.rating
        contractor.reviews_count = data.get('reviews_count', contractor.reviews_count)
        
        # Update email if found (from grounding search)
        if data.get('email'):
            contractor.email = data.get('email')
        
        # Update AI description if available
        if data.get('ai_description'):
            contractor.ai_description = data.get('ai_description')
        
        # Update location
        if data.get('latitude'):
            contractor.latitude = Decimal(str(data.get('latitude')))
        if data.get('longitude'):
            contractor.longitude = Decimal(str(data.get('longitude')))
        
        # Add role to project_types if not already present
        existing_roles = set(contractor.project_types.split(',')) if contractor.project_types else set()
        existing_roles.add(role)
        contractor.project_types = ','.join(existing_roles)
        
        # Update certification signals
        contractor.certification_signals = data.get('signals', contractor.certification_signals)
        
        # last_updated is auto-updated
        contractor.save()
    
    def _contractors_to_dict_list(
        self,
        contractors: List[Contractor],
        project_location: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Convert Django Contractor models to dict format"""
        
        result = []
        for contractor in contractors:
            # Calculate distance if not already attached
            if not hasattr(contractor, '_distance_km'):
                contractor._distance_km = self._calculate_distance(
                    project_location['latitude'],
                    project_location['longitude'],
                    float(contractor.latitude),
                    float(contractor.longitude)
                )
            
            contractor_dict = {
                'id': contractor.id,
                'place_id': contractor.place_id,
                'name': contractor.name,
                'address': contractor.address,
                'city': contractor.city,
                'postal_code': contractor.postal_code,
                'state': contractor.state,
                'phone': contractor.phone,
                'website': contractor.website,
                'email': contractor.email,
                'latitude': float(contractor.latitude) if contractor.latitude else None,
                'longitude': float(contractor.longitude) if contractor.longitude else None,
                'distance_km': contractor._distance_km,
                'rating': float(contractor.rating) if contractor.rating else None,
                'reviews_count': contractor.reviews_count,
                'services': contractor.services,
                'description': contractor.description,
                'specializations': contractor.specializations,
                'years_in_business': contractor.years_in_business,
                'kfw_eligible': contractor.kfw_eligible,
                'source': contractor.source,
                'project_types': contractor.project_types,
                'signals': contractor.certification_signals or {},
                'ai_description': contractor.ai_description if hasattr(contractor, 'ai_description') else None,
            }
            
            result.append(contractor_dict)
        
        return result
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula (in km)"""
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lon = radians(lon2 - lon1)
        
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        distance = R * c
        return round(distance, 2)
    
    def invalidate_cache(self, role: Optional[str] = None, place_id: Optional[str] = None):
        """
        Invalidate cache entries
        
        Args:
            role: If provided, invalidate all contractors with this role
            place_id: If provided, invalidate specific contractor
        """
        if place_id:
            Contractor.objects.filter(place_id=place_id).delete()
            logger.info(f"Invalidated cache for place_id: {place_id}")
        elif role:
            Contractor.objects.filter(
                project_types__icontains=role,
                place_id__isnull=False
            ).delete()
            logger.info(f"Invalidated cache for role: {role}")
        else:
            # Clear all cached contractors (those with place_id)
            count = Contractor.objects.filter(place_id__isnull=False).count()
            Contractor.objects.filter(place_id__isnull=False).delete()
            logger.info(f"Invalidated all cache entries: {count} contractors removed")
