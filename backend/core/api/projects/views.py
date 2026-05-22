from rest_framework import generics, permissions
from core.models import Project
from .serializers import ProjectSerializer


class ProjectListCreate(generics.ListCreateAPIView):
	serializer_class = ProjectSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		"""Return projects filtered by the authenticated user"""
		return Project.objects.filter(user=self.request.user).order_by("id")

	def perform_create(self, serializer):
		"""Automatically assign the current user to the project"""
		serializer.save(user=self.request.user)


class ProjectDetail(generics.RetrieveUpdateDestroyAPIView):
	serializer_class = ProjectSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		"""Return projects filtered by the authenticated user"""
		return Project.objects.filter(user=self.request.user)


