"""
Offer Views - Handle offer listing, analysis, and comparison operations
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.models import ContractingPlanning, ContractorOffer, OfferAnalysis
from core.services.contracting_service.offer_service import OfferService
from .offer_serializers import OfferSerializer, OfferAnalysisSerializer

logger = logging.getLogger(__name__)


class OfferListView(APIView):
    """
    GET /api/projects/<project_id>/contracting/offers/
    List all offers for a project
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        """List all offers for the project"""
        try:
            # Verify the planning belongs to the user
            planning = ContractingPlanning.objects.filter(
                project_id=project_id,
                project__user=request.user
            ).first()
            
            if not planning:
                return Response(
                    {'detail': 'Contracting planning not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get all offers for this planning
            offers = ContractorOffer.objects.filter(
                contracting_planning=planning
            ).order_by('-created_at')
            
            serializer = OfferSerializer(offers, many=True)
            
            return Response({
                'offers': serializer.data,
                'total': offers.count()
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error listing offers: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error listing offers: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OfferDetailView(APIView):
    """
    GET /api/projects/<project_id>/contracting/offers/<offer_id>/
    Get details of a specific offer
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, offer_id):
        """Get offer details"""
        try:
            # Verify the offer belongs to the user
            offer = ContractorOffer.objects.select_related('contracting_planning__project').filter(
                id=offer_id,
                contracting_planning__project_id=project_id,
                contracting_planning__project__user=request.user
            ).first()
            
            if not offer:
                return Response(
                    {'detail': 'Offer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = OfferSerializer(offer)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error getting offer details: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error getting offer details: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalyzeOfferView(APIView):
    """
    POST /api/projects/<project_id>/contracting/offers/<offer_id>/analyze/
    Analyze a specific offer
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id, offer_id):
        """Analyze an offer"""
        try:
            # Verify the offer belongs to the user
            offer = ContractorOffer.objects.select_related('contracting_planning__project').filter(
                id=offer_id,
                contracting_planning__project_id=project_id,
                contracting_planning__project__user=request.user
            ).first()
            
            if not offer:
                return Response(
                    {'detail': 'Offer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Generate analysis
            offer_service = OfferService()
            analysis = offer_service.analyze_single_offer(
                offer=offer,
                planning=offer.contracting_planning
            )
            
            # Serialize the analysis
            analysis_serializer = OfferAnalysisSerializer(analysis)
            offer_serializer = OfferSerializer(offer)
            
            return Response({
                'success': True,
                'analysis': analysis_serializer.data,
                'offer': offer_serializer.data
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error analyzing offer: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error analyzing offer: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CompareOffersView(APIView):
    """
    POST /api/projects/<project_id>/contracting/offers/compare/
    Compare multiple offers
    
    Body:
    {
        "primary_offer_id": 123,
        "compare_with": [124, 125]  // Optional - if not provided, compares with all
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        """Compare offers"""
        try:
            primary_offer_id = request.data.get('primary_offer_id')
            compare_with_ids = request.data.get('compare_with')
            
            if not primary_offer_id:
                return Response(
                    {'detail': 'primary_offer_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify the primary offer belongs to the user
            primary_offer = ContractorOffer.objects.select_related('contracting_planning__project').filter(
                id=primary_offer_id,
                contracting_planning__project_id=project_id,
                contracting_planning__project__user=request.user
            ).first()
            
            if not primary_offer:
                return Response(
                    {'detail': 'Primary offer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get comparison offers if specified
            comparison_offers = None
            if compare_with_ids:
                comparison_offers = list(
                    ContractorOffer.objects.filter(
                        id__in=compare_with_ids,
                        contracting_planning=primary_offer.contracting_planning
                    )
                )
                
                if len(comparison_offers) != len(compare_with_ids):
                    return Response(
                        {'detail': 'Some comparison offers not found or do not belong to this project'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Generate comparison
            offer_service = OfferService()
            comparison = offer_service.compare_offers(
                primary_offer=primary_offer,
                comparison_offers=comparison_offers
            )
            
            # Serialize the comparison
            comparison_serializer = OfferAnalysisSerializer(comparison)
            primary_offer_serializer = OfferSerializer(primary_offer)
            
            # Get all compared offers
            all_compared_offers = []
            if comparison.compared_offer_ids:
                all_compared_offers = ContractorOffer.objects.filter(
                    id__in=comparison.compared_offer_ids
                )
            compared_offers_serializer = OfferSerializer(all_compared_offers, many=True)
            
            return Response({
                'success': True,
                'comparison': comparison_serializer.data,
                'primary_offer': primary_offer_serializer.data,
                'compared_offers': compared_offers_serializer.data
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error comparing offers: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error comparing offers: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OfferAnalysisDetailView(APIView):
    """
    GET /api/projects/<project_id>/contracting/offers/<offer_id>/analysis/
    Get existing analysis for an offer
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, offer_id):
        """Get offer analysis"""
        try:
            # Verify the offer belongs to the user
            offer = ContractorOffer.objects.select_related('contracting_planning__project').filter(
                id=offer_id,
                contracting_planning__project_id=project_id,
                contracting_planning__project__user=request.user
            ).first()
            
            if not offer:
                return Response(
                    {'detail': 'Offer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get the most recent analysis
            analysis = OfferAnalysis.objects.filter(
                offer=offer
            ).order_by('-created_at').first()
            
            if not analysis:
                return Response(
                    {'detail': 'No analysis found for this offer'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = OfferAnalysisSerializer(analysis)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error getting offer analysis: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error getting offer analysis: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StructuredComparisonView(APIView):
    """
    GET /api/projects/<project_id>/contracting/offers/comparison-dashboard/
    Generate structured comparison data for the interactive dashboard
    
    Returns comprehensive comparison data with:
    - All offers with full details
    - AI scoring metrics for each offer
    - Executive summary and recommendations
    - Missing items and issues
    - Detailed comparisons in markdown
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        """Generate structured comparison for dashboard"""
        try:
            # Verify the planning belongs to the user
            planning = ContractingPlanning.objects.filter(
                project_id=project_id,
                project__user=request.user
            ).first()
            
            if not planning:
                return Response(
                    {'detail': 'Contracting planning not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if there are enough offers
            offer_count = ContractorOffer.objects.filter(
                contracting_planning=planning
            ).count()
            
            if offer_count < 2:
                return Response(
                    {'detail': f'Need at least 2 offers for comparison. Currently have {offer_count}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate structured comparison
            offer_service = OfferService()
            dashboard_data = offer_service.generate_structured_comparison(planning)
            
            return Response(dashboard_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            logger.warning(f"Validation error in structured comparison: {str(e)}")
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error generating structured comparison: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error generating comparison: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalysisDetailView(APIView):
    """
    GET /api/projects/<project_id>/contracting/analyses/<analysis_id>/
    Retrieve a specific analysis by ID (for re-viewing previously generated analyses)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, analysis_id):
        """Get analysis by ID"""
        try:
            # Get the analysis and verify it belongs to the user's project
            analysis = OfferAnalysis.objects.select_related(
                'offer__contracting_planning__project'
            ).filter(
                id=analysis_id,
                offer__contracting_planning__project_id=project_id,
                offer__contracting_planning__project__user=request.user
            ).first()
            
            if not analysis:
                return Response(
                    {'detail': 'Analysis not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = OfferAnalysisSerializer(analysis)
            
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error retrieving analysis: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error retrieving analysis: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
