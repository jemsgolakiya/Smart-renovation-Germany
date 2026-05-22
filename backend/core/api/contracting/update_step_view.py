"""
View for updating the current step in contracting workflow
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.models import ContractingPlanning

logger = logging.getLogger(__name__)


class UpdateStepView(APIView):
	"""
	PUT /contracting/planning/<project_id>/step/
	
	Update the current step in the contracting workflow
	"""
	permission_classes = [IsAuthenticated]
	
	def put(self, request, project_id):
		"""Update current step"""
		try:
			# Get the contracting planning for this project
			planning = ContractingPlanning.objects.filter(
				project_id=project_id,
				project__user=request.user
			).first()
			
			if not planning:
				return Response(
					{'detail': 'Contracting planning not found for this project'},
					status=status.HTTP_404_NOT_FOUND
				)
			
			# Get the new step from request
			new_step = request.data.get('current_step')
			if new_step is None:
				return Response(
					{'detail': 'current_step is required'},
					status=status.HTTP_400_BAD_REQUEST
				)
			
			# Validate step is in valid range
			if not isinstance(new_step, int) or new_step < 1 or new_step > 4:
				return Response(
					{'detail': 'current_step must be between 1 and 4'},
					status=status.HTTP_400_BAD_REQUEST
				)
			
			# Update the step
			planning.current_step = new_step
			planning.save()
			
			logger.info(f"Updated contracting step to {new_step} for project {project_id}")
			
			return Response({
				'current_step': planning.current_step,
				'message': f'Step updated to {new_step}'
			})
			
		except Exception as e:
			logger.error(f"Error updating step: {str(e)}", exc_info=True)
			return Response(
				{'detail': f'Error updating step: {str(e)}'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
