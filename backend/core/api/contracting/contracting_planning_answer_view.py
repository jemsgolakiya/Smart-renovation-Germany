import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from core.models import ContractingPlanning, Project
from .contracting_planning_serializer import ContractingPlanningSerializer

logger = logging.getLogger(__name__)


class ContractingPlanningAnswerView(generics.UpdateAPIView):
    """
    Submit user answers to AI-generated questions
    """
    serializer_class = ContractingPlanningSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'project_id'

    def get_object(self):
        project_id = self.kwargs.get('project_id')
        
        # Verify the project belongs to the user
        try:
            project = Project.objects.get(id=project_id, user=self.request.user)
        except Project.DoesNotExist:
            return None
        
        # Get planning for this project
        try:
            return ContractingPlanning.objects.get(project=project)
        except ContractingPlanning.DoesNotExist:
            return None

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance is None:
            return Response(
                {'detail': 'Planning not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get user answers from request
        user_answers = request.data.get('user_answers', {})
        
        if not user_answers:
            return Response(
                {'detail': 'user_answers is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save user answers
        instance.user_answers = user_answers
        instance.save(update_fields=['user_answers'])
        
        logger.info(f"User answers saved for planning {instance.id}")
        
        # Return updated planning
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

