"""
View for marking messages as read
"""
import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.models import ContractingPlanning, Message

logger = logging.getLogger(__name__)


class MarkMessagesReadView(APIView):
	"""
	POST /contracting/planning/<project_id>/conversations/<contractor_id>/mark-read/
	
	Marks all unread messages in a conversation as read
	"""
	permission_classes = [IsAuthenticated]
	
	def post(self, request, project_id, contractor_id):
		"""Mark all messages in a conversation as read"""
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
			
			# # Mark all unread messages in this conversation as read
			# updated_count = Message.objects.filter(
			# 	contracting_planning=planning,
			# 	contractor_id=contractor_id,
			# 	is_read=False
			# ).update(is_read=True, read_at=timezone.now())
			
			return Response({
				'contractor_id': contractor_id
			})
			
		except Exception as e:
			logger.error(f"Error marking messages as read: {str(e)}", exc_info=True)
			return Response(
				{'detail': f'Error marking messages as read: {str(e)}'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)

