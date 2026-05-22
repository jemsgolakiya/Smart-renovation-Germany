import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from core.models import ContractingPlanning, Contractor, Project
from core.services.contracting_service.contracting_service import get_contracting_service
from .contracting_planning_serializer import ContractingPlanningSerializer

logger = logging.getLogger(__name__)


class ContractingPlanningInvitationView(generics.GenericAPIView):
    """
    Generate invitation email and renovation plan for selected contractors
    """
    serializer_class = ContractingPlanningSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    
    def post(self, request, project_id):
        """
        Generate invitation content for contractors.
        
        Request body:
        {
            "contractor_ids": [1, 2, 3]
        }
        
        Returns:
        {
            "email_html": "<html>...",
            "renovation_plan_html": "<html>...",
            "relevant_files": [
                {"id": 1, "filename": "photo.jpg", "url": "/media/..."},
                ...
            ]
        }
        """
        # Verify the project exists and belongs to the user
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {'detail': 'Project not found or you do not have permission to access it'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get or create contracting planning for this project
        try:
            planning = ContractingPlanning.objects.get(project=project)
        except ContractingPlanning.DoesNotExist:
            return Response(
                {'detail': 'Contracting planning not found. Please complete the planning step first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get contractor IDs from request
        contractor_ids = request.data.get('contractor_ids', [])
        
        if not contractor_ids:
            return Response(
                {'detail': 'contractor_ids is required and must not be empty'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate that contractor IDs are valid
        try:
            contractors = Contractor.objects.filter(id__in=contractor_ids)
            if contractors.count() != len(contractor_ids):
                return Response(
                    {'detail': 'Some contractor IDs are invalid'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            logger.error(f"Error fetching contractors: {str(e)}")
            return Response(
                {'detail': 'Error validating contractor IDs'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save selected contractors to planning
        planning.selected_contractors = list(contractor_ids)
        planning.save(update_fields=['selected_contractors'])
        
        # Generate invitation content with AI
        contracting_service = get_contracting_service()
        
        try:
            logger.info(f"Generating invitation content for planning {planning.id} with {len(contractors)} contractors")
            
            # Generate email and renovation plan
            result = contracting_service.generate_invitation_content(
                planning=planning,
                contractors=list(contractors)
            )
            
            if not result.get('success'):
                return Response(
                    {'detail': 'Failed to generate invitation content', 'error': result.get('error')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Build relevant files list with URLs
            relevant_files = []
            for file_id in result.get('relevant_file_ids', []):
                try:
                    file_obj = planning.files.get(id=file_id)
                    relevant_files.append({
                        'id': file_obj.id,
                        'filename': file_obj.filename,
                        'url': request.build_absolute_uri(file_obj.file.url) if file_obj.file else ''
                    })
                except Exception as e:
                    logger.warning(f"Could not find file with ID {file_id}: {str(e)}")
            
            response_data = {
                'email_html': result.get('email_html', ''),
                'renovation_plan_html': result.get('renovation_plan_html', ''),
                'relevant_files': relevant_files
            }
            
            logger.info(f"Successfully generated invitation content for planning {planning.id}")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating invitation content: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'AI processing temporarily unavailable', 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
