"""
Google Places API (New) v1 Web Service Integration
Handles contractor discovery using the new Google Places API with Field Masks
"""

import os
import requests
import logging
from typing import List, Dict, Any, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2
from django.conf import settings

logger = logging.getLogger(__name__)


class GooglePlacesV1Service:
    """Service for Google Places API (New) v1 operations"""
    
    BASE_URL = "https://places.googleapis.com/v1"
    
    # Field masks for different operations
    FIELD_MASK_NEARBY = (
        "places.id,"
        "places.displayName,"
        "places.formattedAddress,"
        "places.location,"
        "places.rating,"
        "places.userRatingCount,"
        "places.nationalPhoneNumber,"
        "places.internationalPhoneNumber,"
        "places.websiteUri,"
        "places.businessStatus,"
        "places.types,"
        "places.primaryType"
    )
    
    FIELD_MASK_DETAILS = (
        "id,"
        "displayName,"
        "formattedAddress,"
        "location,"
        "rating,"
        "userRatingCount,"
        "nationalPhoneNumber,"
        "internationalPhoneNumber,"
        "websiteUri,"
        "businessStatus,"
        "types,"
        "primaryType,"
        "regularOpeningHours"
    )
    
    def __init__(self):
        self.api_key = os.getenv('GOOGLE_PLACES_API_KEY') or getattr(settings, 'GOOGLE_PLACES_API_KEY', None)
        if not self.api_key:
            logger.warning("GOOGLE_PLACES_API_KEY not configured")
    
    def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        headers: Dict[str, str], 
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Optional[Dict]:
        """Make HTTP request to Google Places API v1"""
        url = f"{self.BASE_URL}/{endpoint}"
        
        try:
            if method == "POST":
                response = requests.post(url, json=data, headers=headers, params=params)
            else:
                response = requests.get(url, headers=headers, params=params)
            
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Google Places API request failed: {e}")
            if hasattr(e.response, 'text'):
                logger.error(f"Response: {e.response.text}")
            return None
    
    def search_nearby(
        self,
        location: Dict[str, float],
        radius_meters: float,
        included_types: Optional[List[str]] = None,
        language: str = 'de',
        max_results: int = 20
    ) -> List[Dict]:
        """
        Search for places nearby using Google Places API (New) Nearby Search
        
        Args:
            location: {"latitude": 52.52, "longitude": 13.405}
            radius_meters: Search radius in meters (e.g., 25000 for 25km)
            included_types: List of place types (e.g., ["plumber", "electrician"])
            language: Language code (default: 'de' for German)
            max_results: Maximum results to return (1-20)
        
        Returns:
            List of place dictionaries
        """
        if not self.api_key:
            logger.error("Cannot search nearby: API key not configured")
            return []
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK_NEARBY
        }
        
        data = {
            "maxResultCount": min(max_results, 20),
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": location["latitude"],
                        "longitude": location["longitude"]
                    },
                    "radius": radius_meters
                }
            },
            "languageCode": language
        }
        
        if included_types:
            data["includedTypes"] = included_types
        
        logger.info(f"Searching nearby: location={location}, radius={radius_meters}m, types={included_types}")
        
        result = self._make_request("POST", "places:searchNearby", headers, data)
        
        if result and "places" in result:
            logger.info(f"Found {len(result['places'])} places nearby")
            return result["places"]
        
        logger.warning("No places found in nearby search")
        return []
    
    def search_text(
        self,
        text_query: str,
        location: Optional[Dict[str, float]] = None,
        radius_meters: Optional[float] = None,
        language: str = 'de',
        max_results: int = 20
    ) -> List[Dict]:
        """
        Search for places using text query
        
        Args:
            text_query: Search query (e.g., "Sanitärinstallateur Berlin")
            location: Optional location bias
            radius_meters: Optional search radius
            language: Language code
            max_results: Maximum results
        
        Returns:
            List of place dictionaries
        """
        if not self.api_key:
            logger.error("Cannot search text: API key not configured")
            return []
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK_NEARBY
        }
        
        data = {
            "textQuery": text_query,
            "maxResultCount": min(max_results, 20),
            "languageCode": language
        }
        
        if location and radius_meters:
            data["locationBias"] = {
                "circle": {
                    "center": {
                        "latitude": location["latitude"],
                        "longitude": location["longitude"]
                    },
                    "radius": radius_meters
                }
            }
        
        logger.info(f"Text search: query='{text_query}'")
        
        result = self._make_request("POST", "places:searchText", headers, data)
        
        if result and "places" in result:
            logger.info(f"Found {len(result['places'])} places from text search")
            return result["places"]
        
        return []
    
    def get_place_details(self, place_id: str) -> Optional[Dict]:
        """
        Get detailed information about a place
        
        Args:
            place_id: Google Places ID (e.g., "places/ChIJ...")
        
        Returns:
            Place details dictionary or None
        """
        if not self.api_key:
            logger.error("Cannot get place details: API key not configured")
            return None
        
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": self.FIELD_MASK_DETAILS
        }
        
        result = self._make_request("GET", place_id, headers)
        
        if result:
            logger.debug(f"Retrieved details for {place_id}")
            return result
        
        return None
    
    def geocode_address(
        self,
        address: str,
        city: str = "",
        state: str = "",
        postal_code: str = ""
    ) -> Optional[Dict[str, float]]:
        """
        Geocode an address to latitude/longitude using Google Geocoding API
        
        Args:
            address: Street address
            city: City name
            state: State/region name
            postal_code: Postal code
        
        Returns:
            {"latitude": float, "longitude": float} or None
        """
        if not self.api_key:
            logger.error("Cannot geocode: API key not configured")
            return None
        
        # Build full address
        address_parts = [p.strip() for p in [address, city, postal_code, state] if p.strip()]
        full_address = ", ".join(address_parts)
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": full_address,
            "key": self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                logger.info(f"Geocoded '{full_address}' to {location}")
                return {
                    "latitude": location["lat"],
                    "longitude": location["lng"]
                }
            else:
                logger.warning(f"Geocoding failed: {data.get('status')} - {data.get('error_message', 'Unknown error')}")
                return None
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Geocoding request failed: {e}")
            return None
    
    @staticmethod
    def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        
        Args:
            lat1, lng1: First coordinate
            lat2, lng2: Second coordinate
        
        Returns:
            Distance in kilometers
        """
        # Earth radius in kilometers
        R = 6371.0
        
        # Convert to radians
        lat1_rad = radians(lat1)
        lng1_rad = radians(lng1)
        lat2_rad = radians(lat2)
        lng2_rad = radians(lng2)
        
        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlng = lng2_rad - lng1_rad
        
        a = sin(dlat / 2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlng / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        distance = R * c
        return round(distance, 2)
    
    def convert_to_contractor_profile(
        self,
        place: Dict,
        project_location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Convert Google Places API v1 result to ContractorProfile format
        
        Args:
            place: Place dictionary from API
            project_location: Optional project location for distance calculation
        
        Returns:
            Contractor profile dictionary
        """
        # Extract basic info
        place_id = place.get("id", "")
        name = place.get("displayName", {}).get("text", "Unknown")
        address = place.get("formattedAddress", "")
        
        # Parse address components
        city = ""
        state = ""
        postal_code = ""
        
        # Simple address parsing (formattedAddress example: "Street, City, State ZIP, Country")
        if address:
            parts = [p.strip() for p in address.split(",")]
            if len(parts) >= 2:
                # Try to extract city from second-to-last part
                city_part = parts[-2] if len(parts) > 1 else parts[0]
                # Extract postal code and state if present
                tokens = city_part.split()
                if len(tokens) >= 2:
                    for token in tokens:
                        if token.isdigit() and len(token) >= 4:
                            postal_code = token
                        elif len(token) == 2 and token.isupper():
                            state = token
                    city = " ".join([t for t in tokens if t != postal_code and t != state])
        
        # Extract location
        location = place.get("location", {})
        lat = location.get("latitude")
        lng = location.get("longitude")
        
        # Calculate distance if project location provided
        distance_km = None
        if project_location and lat and lng:
            distance_km = self.calculate_distance(
                project_location["latitude"],
                project_location["longitude"],
                lat,
                lng
            )
        
        # Extract contact info
        phone = place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber", "")
        website = place.get("websiteUri", "")
        
        # Extract quality metrics
        rating = place.get("rating")
        reviews_count = place.get("userRatingCount", 0)
        
        # Extract business status
        business_status = place.get("businessStatus", "OPERATIONAL")
        
        # Extract types/categories
        types = place.get("types", [])
        primary_type = place.get("primaryType", "")
        
        # Build contractor profile
        contractor = {
            "id": None,  # No database ID for transient results
            "place_id": place_id,
            "name": name,
            "address": address,
            "city": city,
            "postal_code": postal_code,
            "state": state,
            "phone": phone,
            "website": website,
            "email": "",  # Not available from Places API
            "price_range": "",  # Not available from Places API
            "service_area": f"{distance_km}km" if distance_km else "",
            "business_size": "",  # Not available from Places API
            "years_in_business": None,  # Not available from Places API
            "services": name,
            "description": name,
            "specializations": primary_type or ", ".join(types[:3]),
            "rating": float(rating) if rating else None,
            "reviews_count": int(reviews_count),
            "certifications": "",
            "kfw_eligible": False,  # Unknown from Places API
            "source": "Google Places v1",
            "additional_info": f"Business Status: {business_status}",
            "project_types": "",
            "distance_km": distance_km,
            "latitude": lat,
            "longitude": lng,
        }
        
        return contractor
