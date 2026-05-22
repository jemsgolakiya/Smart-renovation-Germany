from rest_framework import serializers
from core.models import ContractingPlanningFile


class ContractingPlanningFileSerializer(serializers.ModelSerializer):
	"""Serializer for contracting planning files"""
	
	class Meta:
		model = ContractingPlanningFile
		fields = ['id', 'file', 'filename', 'uploaded_at']
		read_only_fields = ['id', 'uploaded_at']

