from rest_framework import serializers
from core.models import Project
from core.api.auth.serializers import UserSerializer


class ProjectSerializer(serializers.ModelSerializer):
	user = UserSerializer(read_only=True)

	class Meta:
		model = Project
		fields = [
			"id",
			"user",
			"name",
			"project_type",
			"address",
			"city",
			"postal_code",
			"state",
			"budget",
			"additional_information",
		]
		read_only_fields = ["user"]


