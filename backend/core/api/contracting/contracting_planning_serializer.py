from rest_framework import serializers
from core.models import ContractingPlanning, ContractingPlanningFile
from .contracting_planning_file_serializer import ContractingPlanningFileSerializer


class ContractingPlanningSerializer(serializers.ModelSerializer):
	"""Serializer for contracting planning with file uploads"""
	files = ContractingPlanningFileSerializer(many=True, read_only=True)
	uploaded_files = serializers.ListField(
		child=serializers.FileField(),
		write_only=True,
		required=False,
		help_text="List of files to upload"
	)
	
	class Meta:
		model = ContractingPlanning
		fields = [
			'id',
			'project',
			'description',
			'files',
			'uploaded_files',
			'ai_summary',
			'ai_questions',
			'user_answers',
			'current_step',
			'created_at',
			'updated_at'
		]
		read_only_fields = ['id', 'created_at', 'updated_at', 'files']

	def create(self, validated_data):
		"""Create planning with file uploads"""
		uploaded_files = validated_data.pop('uploaded_files', [])
		planning = ContractingPlanning.objects.create(**validated_data)
		
		# Create file records for each uploaded file
		for file in uploaded_files:
			ContractingPlanningFile.objects.create(
				contracting_planning=planning,
				file=file,
				filename=file.name
			)
		
		return planning

	def update(self, instance, validated_data):
		"""Update planning and handle new file uploads"""
		uploaded_files = validated_data.pop('uploaded_files', [])
		
		# Update the planning instance
		instance.description = validated_data.get('description', instance.description)
		instance.ai_summary = validated_data.get('ai_summary', instance.ai_summary)
		instance.ai_questions = validated_data.get('ai_questions', instance.ai_questions)
		instance.user_answers = validated_data.get('user_answers', instance.user_answers)
		instance.current_step = validated_data.get('current_step', instance.current_step)
		instance.save()
		
		# Add new files if provided
		for file in uploaded_files:
			ContractingPlanningFile.objects.create(
				contracting_planning=instance,
				file=file,
				filename=file.name
			)
		
		return instance

