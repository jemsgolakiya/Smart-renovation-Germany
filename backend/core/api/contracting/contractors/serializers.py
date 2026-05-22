from rest_framework import serializers
from core.models import Contractor


class ContractorSerializer(serializers.ModelSerializer):
	class Meta:
		model = Contractor
		fields = [
			"id",
			"name",
			"address",
			"city",
			"postal_code",
			"state",
			"phone",
			"website",
			"email",
			"price_range",
			"service_area",
			"business_size",
			"years_in_business",
			"services",
			"description",
			"specializations",
			"rating",
			"reviews_count",
			"certifications",
			"kfw_eligible",
			"source",
			"additional_info",
			"project_types",
		]

