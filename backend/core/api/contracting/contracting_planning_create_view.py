import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.models import ContractingPlanning, Project
from core.services.contracting_service.contracting_service import get_contracting_service
from .contracting_planning_serializer import ContractingPlanningSerializer

logger = logging.getLogger(__name__)


class ContractingPlanningCreateView(generics.CreateAPIView):
    """
    Create contracting planning with file uploads and AI processing
    """
    serializer_class = ContractingPlanningSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def create(self, request, *args, **kwargs):
        # Get the project ID from request data
        project_id = request.data.get('project_id')

        if not project_id:
            return Response(
                {'detail': 'Project ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the project exists and belongs to the user
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {'detail': 'Project not found or you do not have permission to access it'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if planning already exists for this project
        existing_planning = ContractingPlanning.objects.filter(project=project).first()

        if existing_planning:
            # Update existing planning
            serializer = self.get_serializer(
                existing_planning,
                data=request.data,
                partial=True
            )
        else:
            # Create new planning
            data = request.data.copy()
            data['project'] = project.id
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)

        # Handle file uploads
        files = request.FILES.getlist('files')
        if files:
            serializer.validated_data['uploaded_files'] = files

        # Save the planning
        planning = serializer.save()
        is_update = existing_planning is not None

        # Process with Gemini AI
        contracting_service = get_contracting_service()
        ai_results = None
        
        try:
            logger.info(f"Processing planning {planning.id} with Gemini AI")
            
            # Process user input and files with Gemini
            ai_results = contracting_service.process_planning_with_ai(planning=planning)
            
            # Save AI insights to database
            if ai_results.get('success'):
                planning.ai_summary = ai_results.get('summary', '')
                planning.ai_questions = ai_results.get('questions', [])
                planning.save(update_fields=['ai_summary', 'ai_questions'])
                logger.info(f"AI insights saved to database for planning {planning.id}")
            
            logger.info(f"AI processing completed for planning {planning.id}")
            
        except Exception as e:
            # Log error but don't fail the request
            logger.error(f"AI processing failed for planning {planning.id}: {str(e)}", exc_info=True)
            ai_results = {
                'success': False,
                'error': 'AI processing temporarily unavailable',
                'summary': '',
                'questions': []
            }

        # Refresh from database to get latest data
        planning.refresh_from_db()
        
        # Build response with AI insights
        response_data = {
            **serializer.data,
            'ai_summary': planning.ai_summary,
            'ai_questions': planning.ai_questions,
            'user_answers': planning.user_answers,
        }

        # Return appropriate status code
        response_status = status.HTTP_200_OK if is_update else status.HTTP_201_CREATED
        return Response(response_data, status=response_status)

