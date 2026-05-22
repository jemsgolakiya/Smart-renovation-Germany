"""
Serializers for conversation and message data
"""
from rest_framework import serializers
from core.models import Message, MessageAction


class MessageActionSerializer(serializers.ModelSerializer):
	"""Serializer for message actions"""
	
	class Meta:
		model = MessageAction
		fields = [
			'id',
			'action_type',
			'action_status',
			'action_data',
			'action_summary',
			'execution_result',
			'created_at',
			'updated_at'
		]
		read_only_fields = ['id', 'created_at', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
	"""Serializer for conversation messages"""
	action = MessageActionSerializer(read_only=True, required=False)
	
	class Meta:
		model = Message
		fields = ['id', 'sender', 'message_type', 'content', 'timestamp', 'contractor_id', 'action']
		read_only_fields = ['id', 'timestamp']


class ConversationListItemSerializer(serializers.Serializer):
	"""Serializer for conversation list items"""
	contractor_id = serializers.IntegerField()
	contractor_name = serializers.CharField()
	contractor_email = serializers.EmailField()
	last_message = serializers.CharField(allow_blank=True)
	last_message_timestamp = serializers.DateTimeField(allow_null=True)
	unread_count = serializers.IntegerField(default=0)
