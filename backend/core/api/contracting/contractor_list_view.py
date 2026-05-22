from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from core.models import Contractor
from .contractor_serializer import ContractorSerializer


class ContractorListView(generics.ListAPIView):
	"""
	List contractors with optional filtering
	Supports filtering by IDs via query parameter: ?ids=1,2,3
	"""
	serializer_class = ContractorSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		queryset = Contractor.objects.all()
		
		# Filter by IDs if provided
		ids_param = self.request.query_params.get('ids', None)
		if ids_param:
			try:
				# Parse comma-separated IDs
				contractor_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
				if contractor_ids:
					queryset = queryset.filter(id__in=contractor_ids)
			except ValueError:
				# Invalid ID format - return empty queryset
				return Contractor.objects.none()
		
		return queryset.order_by("-rating", "name")

