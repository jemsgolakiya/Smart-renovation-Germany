"""
View for listing all conversations with contractors
"""
import logging
from datetime import datetime
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Max, Q

from core.models import ContractingPlanning, Message, Contractor
from .conversation_serializer import ConversationListItemSerializer

logger = logging.getLogger(__name__)


class ConversationListView(APIView):
	"""
	GET /contracting/planning/<project_id>/conversations/
	
	Returns list of contractors with their last message preview
	"""
	permission_classes = [IsAuthenticated]
	
	def get(self, request, project_id):
		"""Get list of conversations for a project"""
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
			
			# Get selected contractor IDs from the planning
			selected_contractor_ids = planning.selected_contractors or []
			
			if not selected_contractor_ids:
				return Response({'conversations': []})
			
			# Get contractor details
			contractors = Contractor.objects.filter(id__in=selected_contractor_ids)
			contractor_map = {c.id: c for c in contractors}
			
			# Get the last message for each contractor
			conversations = []
			for contractor_id in selected_contractor_ids:
				contractor = contractor_map.get(contractor_id)
				if not contractor:
					continue
				
				# Get last message for this contractor
				last_message = Message.objects.filter(
					contracting_planning=planning,
					contractor_id=contractor_id
				).order_by('-timestamp').first()
				
				# Count unread messages (only from AI and contractor, not user's own messages)
				unread_count = Message.objects.filter(
					contracting_planning=planning,
					contractor_id=contractor_id,
					is_read=False,
					sender__in=['ai', 'contractor']
				).count()
				
				conversation_data = {
					'contractor_id': contractor.id,
					'contractor_name': contractor.name,
					'contractor_email': contractor.email or '',
					'last_message': last_message.content if last_message else '',
					'last_message_timestamp': last_message.timestamp if last_message else None,
					'unread_count': unread_count
				}
				conversations.append(conversation_data)
			
			# Sort by last message timestamp (most recent first)
			# Use a minimum datetime for conversations without messages
			min_datetime = timezone.make_aware(datetime.min)
			conversations.sort(
				key=lambda x: x['last_message_timestamp'] or min_datetime,
				reverse=True
			)
			
			serializer = ConversationListItemSerializer(conversations, many=True)
			
			return Response({'conversations': serializer.data})
			
		except Exception as e:
			logger.error(f"Error fetching conversation list: {str(e)}", exc_info=True)
			return Response(
				{'detail': f'Error fetching conversations: {str(e)}'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
