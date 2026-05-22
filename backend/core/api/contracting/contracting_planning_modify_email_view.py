import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from core.models import ContractingPlanning, Project
from core.services.contracting_service.contracting_service import get_contracting_service
from .contracting_planning_serializer import ContractingPlanningSerializer

logger = logging.getLogger(__name__)


class ContractingPlanningModifyEmailView(generics.GenericAPIView):
    """
    Modify invitation email using AI based on user prompt
    """
    serializer_class = ContractingPlanningSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser]
    
    def post(self, request, project_id):
        """
        Modify invitation email based on user's AI prompt.
        
        Request body:
        {
            "current_email_html": "<html>...</html>",
            "user_prompt": "Make the email more formal and add a deadline"
        }
        
        Returns:
        {
            "email_html": "<html>modified email...</html>"
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
        
        # Get contracting planning for this project
        try:
            planning = ContractingPlanning.objects.get(project=project)
        except ContractingPlanning.DoesNotExist:
            return Response(
                {'detail': 'Contracting planning not found. Please complete the planning step first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get request data
        current_email_html = request.data.get('current_email_html', '')
        user_prompt = request.data.get('user_prompt', '')
        
        if not current_email_html:
            return Response(
                {'detail': 'current_email_html is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user_prompt:
            return Response(
                {'detail': 'user_prompt is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Modify email with AI
        contracting_service = get_contracting_service()
        
        try:
            logger.info(f"Modifying email for planning {planning.id} with user prompt")
            
            # Modify email
            result = contracting_service.modify_email_with_ai(
                current_email_html=current_email_html,
                user_prompt=user_prompt,
                planning=planning
            )
            
            if not result.get('success'):
                return Response(
                    {'detail': 'Failed to modify email', 'error': result.get('error')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            response_data = {
                'email_html': result.get('email_html', current_email_html)
            }
            
            logger.info(f"Successfully modified email for planning {planning.id}")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error modifying email: {str(e)}", exc_info=True)
            return Response(
                {'detail': 'AI processing temporarily unavailable', 'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
