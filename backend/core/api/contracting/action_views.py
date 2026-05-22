"""
Action Views - Handle approval, rejection, and modification of AI-proposed actions
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.models import ContractingPlanning, MessageAction
from core.services.contracting_service.conversation_agent import ConversationAgent
from .conversation_serializer import MessageSerializer, MessageActionSerializer

logger = logging.getLogger(__name__)


class ApproveActionView(APIView):
    """
    POST /contracting/planning/<project_id>/conversations/<contractor_id>/actions/<action_id>/approve/
    Approve and execute a pending action
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id, contractor_id, action_id):
        """Approve and execute a pending action"""
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
            
            # Get the action
            try:
                action = MessageAction.objects.select_related('message').get(id=action_id)
            except MessageAction.DoesNotExist:
                return Response(
                    {'detail': 'Action not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify action belongs to this conversation
            if (action.message.contracting_planning_id != planning.id or
                action.message.contractor_id != contractor_id):
                return Response(
                    {'detail': 'Action does not belong to this conversation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Execute the action
            agent = ConversationAgent()
            result = agent.execute_action(action_id, request.user)
            
            if not result.get('success'):
                return Response(
                    {'detail': result.get('error', 'Failed to execute action')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Serialize the updated action and confirmation message
            action_serializer = MessageActionSerializer(result['action'])
            confirmation_serializer = MessageSerializer(result['confirmation_message'])
            
            return Response({
                'success': True,
                'action': action_serializer.data,
                'confirmation_message': confirmation_serializer.data,
                'result': result.get('result', {})
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error approving action: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error approving action: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RejectActionView(APIView):
    """
    POST /contracting/planning/<project_id>/conversations/<contractor_id>/actions/<action_id>/reject/
    Reject a pending action
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id, contractor_id, action_id):
        """Reject a pending action"""
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
            
            # Get the action
            try:
                action = MessageAction.objects.select_related('message').get(id=action_id)
            except MessageAction.DoesNotExist:
                return Response(
                    {'detail': 'Action not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify action belongs to this conversation
            if (action.message.contracting_planning_id != planning.id or
                action.message.contractor_id != contractor_id):
                return Response(
                    {'detail': 'Action does not belong to this conversation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reject the action
            agent = ConversationAgent()
            result = agent.reject_action(action_id, request.user)
            
            if not result.get('success'):
                return Response(
                    {'detail': result.get('error', 'Failed to reject action')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Serialize the updated action
            action_serializer = MessageActionSerializer(result['action'])
            
            return Response({
                'success': True,
                'action': action_serializer.data
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error rejecting action: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error rejecting action: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ModifyActionView(APIView):
    """
    POST /contracting/planning/<project_id>/conversations/<contractor_id>/actions/<action_id>/modify/
    Modify a pending action and optionally execute it
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id, contractor_id, action_id):
        """Modify a pending action"""
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
            
            # Get the action
            try:
                action = MessageAction.objects.select_related('message').get(id=action_id)
            except MessageAction.DoesNotExist:
                return Response(
                    {'detail': 'Action not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verify action belongs to this conversation
            if (action.message.contracting_planning_id != planning.id or
                action.message.contractor_id != contractor_id):
                return Response(
                    {'detail': 'Action does not belong to this conversation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get modification data
            modifications = request.data.get('modifications')
            modified_email_html = request.data.get('email_html')
            execute_after_modify = request.data.get('execute', False)
            
            if not modifications and not modified_email_html:
                return Response(
                    {'detail': 'Either modifications or email_html is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Execute with modifications
            agent = ConversationAgent()
            
            if execute_after_modify:
                # Modify and execute
                result = agent.execute_action(
                    action_id,
                    request.user,
                    modifications=modifications,
                    modified_email_html=modified_email_html
                )
                
                if not result.get('success'):
                    return Response(
                        {'detail': result.get('error', 'Failed to execute modified action')},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Serialize the updated action and confirmation message
                action_serializer = MessageActionSerializer(result['action'])
                confirmation_serializer = MessageSerializer(result['confirmation_message'])
                
                return Response({
                    'success': True,
                    'executed': True,
                    'action': action_serializer.data,
                    'confirmation_message': confirmation_serializer.data,
                    'result': result.get('result', {})
                }, status=status.HTTP_200_OK)
            else:
                # Just apply modifications without executing
                from core.services.contracting_service.conversation_agent import ConversationAgent
                agent = ConversationAgent()
                updated_action = agent._apply_modifications(
                    action,
                    modifications,
                    modified_email_html,
                    request.user
                )
                
                # Serialize the updated action
                action_serializer = MessageActionSerializer(updated_action)
                
                return Response({
                    'success': True,
                    'executed': False,
                    'action': action_serializer.data
                }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error modifying action: {str(e)}", exc_info=True)
            return Response(
                {'detail': f'Error modifying action: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
