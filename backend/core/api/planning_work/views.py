from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
import logging
import os
from core.models import RenovationPlan, Project

from .serializers import (
    RenovationPlanRequestSerializer, 
    RenovationPlanResponseSerializer,
    NextQuestionRequestSerializer,
    NextQuestionResponseSerializer
)
from .services import GeminiService
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def generate_next_question(request):
    """
    Generate the next contextual question based on current answers.
    Endpoint: POST /api/renovation/next-question/
    """
    print('Data from Frontend: ', request.data)
    serializer = NextQuestionRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        service = GeminiService()
        result = service.generate_next_question(
            current_answers=serializer.validated_data['current_answers']
        )
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating question: {e}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def generate_renovation_plan(request):
    """
    Generate a renovation plan using Gemini AI.
    Supports both legacy arguments and the new 'dynamic_answers' dict.
    Endpoint: POST /api/renovation/generate-plan/
    """
    serializer = RenovationPlanRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(
            {'success': False, 'error': 'Invalid request', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    validated_data = serializer.validated_data
    print(f"User: {request.user}")
    print(f"Is Authenticated: {request.user.is_authenticated}")
    print(f"Auth Header: {request.headers.get('Authorization')}")
    
    try:
        service = GeminiService()
        
        dynamic_answers = validated_data.get('dynamic_answers')
        
        if dynamic_answers:
            result = service.generate_renovation_plan(
                building_type=dynamic_answers.get('building_type', 'unknown'),
                budget=float(dynamic_answers.get('budget', 0)),
                location=dynamic_answers.get('location', 'Germany'),
                building_size=int(dynamic_answers.get('building_size', 0)),
                renovation_goals=dynamic_answers.get('goals', []),
                dynamic_context=dynamic_answers,
                **{k:v for k,v in dynamic_answers.items() if k not in ['building_type', 'budget', 'location']}
            )
        else:
            result = service.generate_renovation_plan(
                building_type=validated_data.get('building_type'),
                budget=float(validated_data.get('budget', 0)),
                location=validated_data.get('location'),
                building_size=validated_data.get('building_size', 0),
                renovation_goals=validated_data.get('renovation_goals', []),
                building_age=str(validated_data.get('building_age')),
                target_start_date=str(validated_data.get('target_start_date')),
                financing_preference=validated_data.get('financing_preference', ''),
                incentive_intent=validated_data.get('incentive_intent', ''),
                living_during_renovation=validated_data.get('living_during_renovation', ''),
                heritage_protection=validated_data.get('heritage_protection', '')
            )
        # Save the plan to database if generation was successful
        if result.get('success') and result.get('plan'):
            # Get user (if authenticated) or None
            user = request.user if request.user.is_authenticated else None
            print('User:', user)
            if user:
                # Prepare input data to save
                input_data = validated_data.get('dynamic_answers') or {
                    'building_type': validated_data.get('building_type'),
                    'budget': float(validated_data.get('budget', 0)),
                    'location': validated_data.get('location'),
                    'building_size': validated_data.get('building_size'),
                    'renovation_goals': validated_data.get('renovation_goals'),
                }
                
                if 'budget' in input_data:
                    input_data['budget'] = float(input_data['budget'])
                
                # Get project_id from request if provided
                project_id = request.data.get('project_id')
                project = None
                if project_id:
                    try:
                        project = Project.objects.get(id=project_id, user=user)
                    except Project.DoesNotExist:
                        logger.warning(f"Project with ID {project_id} not found for user {user.id}")
                # Create the renovation plan record
                saved_plan = RenovationPlan.objects.create(
                    user=request.user if request.user.is_authenticated else User.objects.first(),
                    project=project,
                    plan_name=f"Renovation Plan - {input_data.get('building_type', 'Unknown')}",
                    plan_data=result.get('plan'),
                    input_data=input_data,
                    status='generated'
                )

                # Add the saved plan ID to the response
                result['saved_plan_id'] = saved_plan.id
                logger.info(f"Plan saved with ID: {saved_plan.id} for project: {project_id}")

        return Response(result, status=status.HTTP_200_OK)
            
    except Exception as e:
        logger.error(f"Error generating plan: {str(e)}", exc_info=True)
        return Response(
            {'success': False, 'error': 'An unexpected error occurred', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_building_types(request):
    return Response({'success': True, 'building_types': []}) 

@api_view(['GET'])
@permission_classes([AllowAny])
def get_renovation_types(request):
    return Response({'success': True, 'renovation_types': []})

@api_view(['GET'])
@permission_classes([AllowAny])
def api_health_check(request):
    return Response({'success': True, 'message': 'Renovation API is running'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_renovation_plans(request):
    """
    Get all renovation plans for the authenticated user
    Endpoint: GET /api/renovation/plans/
    """
    try:
        user = request.user
        plans = RenovationPlan.objects.filter(user=user).order_by('-created_at')
        
        # Serialize the plans
        serialized_plans = []
        for plan in plans:
            serialized_plans.append({
                'id': plan.id,
                'plan_name': plan.plan_name,
                'plan_data': plan.plan_data,
                'input_data': plan.input_data,
                'status': plan.status,
                'project_id': plan.project.id if plan.project else None,
                'project_name': plan.project.name if plan.project else None,
                'created_at': plan.created_at.isoformat(),
                'updated_at': plan.updated_at.isoformat(),
            })
        
        return Response(serialized_plans, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching renovation plans: {e}")
        return Response(
            {'error': 'Failed to fetch renovation plans'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_renovation_plan_by_project(request, project_id):
    """
    Get the most recent renovation plan for a specific project
    Endpoint: GET /api/renovation/plans/project/<project_id>/
    """
    try:
        user = request.user
        plan = RenovationPlan.objects.filter(
            user=user,
            project_id=project_id
        ).order_by('-created_at').first()
        
        if not plan:
            return Response(
                {'error': 'No renovation plan found for this project'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize the plan
        serialized_plan = {
            'id': plan.id,
            'plan_name': plan.plan_name,
            'plan_data': plan.plan_data,
            'input_data': plan.input_data,
            'status': plan.status,
            'project_id': plan.project.id if plan.project else None,
            'project_name': plan.project.name if plan.project else None,
            'created_at': plan.created_at.isoformat(),
            'updated_at': plan.updated_at.isoformat(),
        }
        
        return Response(serialized_plan, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error fetching renovation plan for project {project_id}: {e}")
        return Response(
            {'error': 'Failed to fetch renovation plan'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )