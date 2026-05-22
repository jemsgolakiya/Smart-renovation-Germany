import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from core.models import ContractingPlanning, Project
from core.services.contracting_service.contracting_service import get_contracting_service
from .contracting_planning_serializer import ContractingPlanningSerializer

logger = logging.getLogger(__name__)


class ContractingPlanningDetailView(generics.RetrieveAPIView):
	"""
	Retrieve contracting planning for a specific project
	
	Query Parameters:
		- regenerate_ai: If 'true', regenerates AI insights
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
	
	def retrieve(self, request, *args, **kwargs):
		instance = self.get_object()
		if instance is None:
			return Response(
				{'detail': 'Planning not found'},
				status=status.HTTP_404_NOT_FOUND
			)
		
		serializer = self.get_serializer(instance)
		response_data = serializer.data
		
		# Check if AI insights should be regenerated
		regenerate_ai = request.query_params.get('regenerate_ai', '').lower() == 'true'
		
		if regenerate_ai:
			try:
				logger.info(f"Regenerating AI insights for planning {instance.id}")
				contracting_service = get_contracting_service()
				
				ai_results = contracting_service.process_planning_with_ai(
					planning=instance,
					generate_questions=True,
					analyze_files=instance.files.exists()
				)
				
				response_data['ai_insights'] = {
					'generated_questions': ai_results.get('questions', []),
					'file_analysis': ai_results.get('file_analysis'),
					'recommendations': ai_results.get('recommendations'),
					'ai_available': ai_results.get('success', False)
				}
				
			except Exception as e:
				logger.error(f"Failed to regenerate AI insights: {str(e)}", exc_info=True)
				response_data['ai_insights'] = {
					'error': 'AI processing temporarily unavailable'
				}
		
		return Response(response_data)

