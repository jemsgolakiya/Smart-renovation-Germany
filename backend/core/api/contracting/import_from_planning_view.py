import logging
from rest_framework.views import APIView
from rest_framework import permissions, status
from rest_framework.response import Response
from core.models import Project, ContractingPlanning
from core.services.contracting_service.contracting_service import ContractingService

logger = logging.getLogger(__name__)


class ImportFromPlanningView(APIView):
    """Import planning data from the Planning module (generate or fetch a plan)

    This endpoint will call the planning_work service to generate or fetch
    a renovation plan for the given project, then create or update a
    ContractingPlanning instance for the project so it can be used inside
    the contracting workflow.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        # Verify project exists and belongs to the user
        try:
            project = Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response({'detail': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # Import planning_work generator (only GeminiService expected)
        try:
            from core.api.planning_work.services import GeminiService
        except Exception as e:
            logger.error(f"Failed to import planning service: {e}", exc_info=True)
            return Response({'detail': 'Planning service unavailable'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Choose service: try to instantiate GeminiService; if it fails, use a light-weight local Mock
        try:
            planning_service = GeminiService()
        except Exception:
            # Minimal local mock used only when Gemini isn't available/initialization fails.
            class MockGeminiServiceLocal:
                def generate_renovation_plan(self, *args, **kwargs):
                    # Provide a conservative fallback plan structure so contracting can continue
                    project_summary = {
                        'total_estimated_cost': '€0 - €0',
                        'total_duration': '0-0 months',
                        'funding_readiness': 'Needs Review',
                        'complexity_level': 'Low',
                        'key_considerations': [
                            kwargs.get('dynamic_context', {}).get('note', '') or 'No additional information provided.'
                        ]
                    }
                    return {
                        'success': True,
                        'plan': {
                            'project_summary': project_summary,
                            'ai_questions': [],
                        }
                    }

            planning_service = MockGeminiServiceLocal()

        # Map project fields to planning service inputs
        project_type_map = {
            'kitchen': ['Kitchen'],
            'bathroom': ['Bathroom'],
            'basement': ['Basement'],
            'roofing': ['Roof'],
            'electrical': ['Electrical'],
            'plumbing': ['Plumbing'],
            'hvac': ['HVAC'],
            'flooring': ['Flooring'],
            'windows_doors': ['Windows & Doors'],
            'exterior': ['Exterior'],
            'general': ['General Renovation'],
        }

        renovation_goals = project_type_map.get(project.project_type, ['General Renovation'])

        # Provide sensible defaults for missing fields required by generator
        building_size = 100
        building_age = '1990-01-01'
        target_start_date = '2026-01-01'
        financing_preference = 'personal-savings'
        incentive_intent = 'no'
        living_during_renovation = 'yes'
        heritage_protection = 'no'

        try:
            result = planning_service.generate_renovation_plan(
                building_type=project.project_type,
                budget=float(project.budget or 0),
                location=project.state or project.city,
                building_size=building_size,
                renovation_goals=renovation_goals,
                building_age=building_age,
                target_start_date=target_start_date,
                financing_preference=financing_preference,
                incentive_intent=incentive_intent,
                living_during_renovation=living_during_renovation,
                heritage_protection=heritage_protection,
            )
        except Exception as e:
            logger.error(f"Planning generation failed: {e}", exc_info=True)
            return Response({'detail': 'Failed to generate planning'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create or update ContractingPlanning for this project
        try:
            planning_obj, created = ContractingPlanning.objects.get_or_create(project=project)

            # Build a human-readable description from the plan if available
            plan_data = result.get('plan') if isinstance(result, dict) else None
            if plan_data and isinstance(plan_data, dict):
                project_summary = plan_data.get('project_summary') or {}
                key_considerations = project_summary.get('key_considerations') or []
                description_text = '\n'.join(key_considerations) if key_considerations else project.additional_information or ''
                planning_obj.description = description_text or planning_obj.description or ''

                # Store AI summary as JSON string of project_summary for now
                try:
                    import json as _json
                    planning_obj.ai_summary = _json.dumps(project_summary)
                except Exception:
                    planning_obj.ai_summary = str(project_summary)

                # No AI questions generated by planning_work; leave empty
                planning_obj.ai_questions = plan_data.get('ai_questions') if plan_data.get('ai_questions') else []
            else:
                # Fallback to using project additional_information
                planning_obj.description = project.additional_information or planning_obj.description or ''

            planning_obj.save()

            # Post-process with ContractingService to generate AI summary/questions
            try:
                contracting_service = ContractingService()
                ai_result = contracting_service.process_planning_with_ai(planning_obj)

                # If the service returned a better summary/questions, persist them
                if ai_result.get('summary'):
                    planning_obj.ai_summary = ai_result.get('summary')
                if ai_result.get('questions') is not None:
                    planning_obj.ai_questions = ai_result.get('questions')

                planning_obj.save()
            except Exception as e:
                logger.warning(f"ContractingService post-processing failed: {e}")
            # Serialize response using existing serializer
            from .contracting_planning_serializer import ContractingPlanningSerializer
            serializer = ContractingPlanningSerializer(planning_obj)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to save ContractingPlanning: {e}", exc_info=True)
            return Response({'detail': 'Failed to import planning data'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
