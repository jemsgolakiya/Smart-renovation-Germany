from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def get_csrf_token(request):
	"""Get CSRF token for the frontend"""
	from django.middleware.csrf import get_token
	csrf_token = get_token(request)
	return Response({"csrfToken": csrf_token})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
	"""Login endpoint - authenticate user and create session"""
	serializer = LoginSerializer(data=request.data)
	if serializer.is_valid():
		user = serializer.validated_data["user"]
		login(request, user)
		user_data = UserSerializer(user).data
		return Response({"user": user_data, "message": "Login successful"}, status=status.HTTP_200_OK)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
	"""Logout endpoint - destroy session"""
	logout(request)
	return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request):
	"""Register endpoint - create new user account"""
	serializer = RegisterSerializer(data=request.data)
	if serializer.is_valid():
		user = serializer.save()
		# Automatically log in the user after registration
		login(request, user)
		user_data = UserSerializer(user).data
		return Response(
			{"user": user_data, "message": "Registration successful"},
			status=status.HTTP_201_CREATED,
		)
	return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
	"""Get current authenticated user information"""
	user_data = UserSerializer(request.user).data
	return Response({"user": user_data}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def auth_status_view(request):
	"""Check if user is authenticated"""
	if request.user.is_authenticated:
		user_data = UserSerializer(request.user).data
		return Response({"authenticated": True, "user": user_data}, status=status.HTTP_200_OK)
	return Response({"authenticated": False}, status=status.HTTP_200_OK)

