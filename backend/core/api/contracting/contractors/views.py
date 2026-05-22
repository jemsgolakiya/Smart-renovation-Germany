from rest_framework import generics, permissions
from django.db.models import Q
from core.models import Contractor
from .serializers import ContractorSerializer


class ContractorListView(generics.ListAPIView):
	serializer_class = ContractorSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		"""Filter contractors by project_type and location"""
		queryset = Contractor.objects.all()

		# Filter by project_type (required)
		project_type = self.request.query_params.get("project_type", None)
		if project_type:
			# Strip whitespace from project_type parameter
			project_type = project_type.strip()
			
			# Build Q objects to check if project_type is in the comma-separated list
			# We need to check if project_type appears as a whole word in project_types
			# This handles: "kitchen", "kitchen,bathroom", "bathroom,kitchen", "bathroom,kitchen,renovation"
			conditions = Q()
			
			# Check if project_type is the exact value
			conditions |= Q(project_types__iexact=project_type)
			
			# Check if project_type is at the start (followed by comma)
			conditions |= Q(project_types__istartswith=f"{project_type},")
			
			# Check if project_type is at the end (preceded by comma)
			conditions |= Q(project_types__iendswith=f",{project_type}")
			
			# Check if project_type is in the middle (preceded and followed by comma)
			conditions |= Q(project_types__icontains=f",{project_type},")
			
			queryset = queryset.filter(conditions)

		# Filter by location fields (city, postal_code, state)
		location_conditions = Q()
		has_location_filter = False

		city = self.request.query_params.get("city", None)
		state = self.request.query_params.get("state", None)

		# Filter by city (case-insensitive partial match)
		if city and city.strip():
			location_conditions &= Q(city__icontains=city.strip())
			has_location_filter = True

		# Filter by state (case-insensitive partial match)
		if state and state.strip():
			location_conditions &= Q(state__icontains=state.strip())
			has_location_filter = True

		# Apply location filters if any were provided
		if has_location_filter:
			queryset = queryset.filter(location_conditions)

		# Order by rating (descending), then by name
		return queryset.order_by("-rating", "name")

