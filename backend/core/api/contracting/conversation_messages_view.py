"""
View for retrieving and sending messages in a conversation with a specific contractor
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.models import ContractingPlanning, Message, Contractor, MessageAttachment
from core.services.contracting_service.conversation_agent import ConversationAgent
from .conversation_serializer import MessageSerializer, MessageActionSerializer
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


class ConversationMessagesView(APIView):
	"""
	GET /contracting/planning/<project_id>/conversations/<contractor_id>/messages/
	Returns all messages in chronological order for a specific contractor
	
	POST /contracting/planning/<project_id>/conversations/<contractor_id>/messages/
	Send a message and receive an AI response
	"""
	permission_classes = [IsAuthenticated]
	
	def get(self, request, project_id, contractor_id):
		"""Get all messages for a specific contractor conversation"""
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
			
			# Verify this contractor is in the selected contractors
			selected_contractor_ids = planning.selected_contractors or []
			if contractor_id not in selected_contractor_ids:
				return Response(
					{'detail': 'Contractor not found in selected contractors'},
					status=status.HTTP_404_NOT_FOUND
				)
			
			# Get all messages for this contractor
			messages = Message.objects.filter(
				contracting_planning=planning,
				contractor_id=contractor_id
			).order_by('timestamp')
			
			serializer = MessageSerializer(messages, many=True)
			
			return Response({'messages': serializer.data})
			
		except Exception as e:
			logger.error(f"Error fetching messages: {str(e)}", exc_info=True)
			return Response(
				{'detail': f'Error fetching messages: {str(e)}'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
	
	def post(self, request, project_id, contractor_id):
		"""Send a message and get AI response (with optional file attachments)"""
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
			
			# Verify this contractor is in the selected contractors
			selected_contractor_ids = planning.selected_contractors or []
			if contractor_id not in selected_contractor_ids:
				return Response(
					{'detail': 'Contractor not found in selected contractors'},
					status=status.HTTP_404_NOT_FOUND
				)
			
			# Get message content from request
			content = request.data.get('content', '').strip()
			
			# Get attachments (optional)
			attachments = request.FILES.getlist('attachments', [])
			
			# At least content or attachments must be present
			if not content and not attachments:
				return Response(
					{'detail': 'Message content or attachments are required'},
					status=status.HTTP_400_BAD_REQUEST
				)
			
			# Display message content (show file info if no text)
			display_content = content
			if not content and attachments:
				file_names = ', '.join([f.name for f in attachments])
				display_content = f"📎 Uploaded {len(attachments)} file(s): {file_names}"
			elif attachments:
				file_names = ', '.join([f.name for f in attachments])
				display_content = f"{content}\n\n📎 Attached: {file_names}"
			
			# Save user message
			user_message = Message.objects.create(
				contracting_planning=planning,
				contractor_id=contractor_id,
				sender='user',
				message_type='user',
				content=display_content
			)
			
			# Save attachments if any
			attachment_ids = []
			if attachments:
				for attachment in attachments:
					# Save the file
					msg_attachment = MessageAttachment.objects.create(
						message=user_message,
						file=ContentFile(attachment.read(), name=attachment.name),
						filename=attachment.name,
						content_type=attachment.content_type or 'application/octet-stream',
						file_size=attachment.size
					)
					attachment_ids.append(msg_attachment.id)
					# Reset file pointer for potential reuse
					attachment.seek(0)
			
			# Process message with ConversationAgent (pass files to agent)
			agent = ConversationAgent()
			result = agent.process_user_message(
				planning,
				contractor_id,
				content or "Please review the attached files",
				request.user,
				attachments=attachments,
				attachment_ids=attachment_ids
			)
			
			# Serialize user message
			user_serializer = MessageSerializer(user_message)
			
			# Handle different response types
			if result['type'] == 'normal':
				# Normal AI response
				ai_serializer = MessageSerializer(result['message'])
				response_data = {
					'user_message': user_serializer.data,
					'ai_message': ai_serializer.data,
					'type': 'normal'
				}
				
				# Add suggested actions if present
				if 'suggested_actions' in result:
					response_data['suggested_actions'] = result['suggested_actions']
				
				return Response(response_data, status=status.HTTP_201_CREATED)
			
			elif result['type'] == 'action_request':
				# AI wants to perform an action
				ai_serializer = MessageSerializer(result['message'])
				action_serializer = MessageActionSerializer(result['action'])
				
				response_data = {
					'user_message': user_serializer.data,
					'ai_message': ai_serializer.data,
					'action': action_serializer.data,
					'type': 'action_request'
				}
				
				# Add suggested actions if present
				if 'suggested_actions' in result:
					response_data['suggested_actions'] = result['suggested_actions']
				
				return Response(response_data, status=status.HTTP_201_CREATED)
			
			else:
				# Unknown type, return error
				return Response(
					{'detail': 'Unknown response type from AI agent'},
					status=status.HTTP_500_INTERNAL_SERVER_ERROR
				)
			
		except Exception as e:
			logger.error(f"Error sending message: {str(e)}", exc_info=True)
			return Response(
				{'detail': f'Error sending message: {str(e)}'},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
	
