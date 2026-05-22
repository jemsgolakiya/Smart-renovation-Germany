from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .serializers import ChatMessageSerializer, ChatResponseSerializer
from .services import ChatbotService, MockChatbotService
from rest_framework.parsers import MultiPartParser, FormParser
from core.api.planning_work.services import GeminiService

@method_decorator(csrf_exempt, name='dispatch')
class ChatbotMessageView(APIView):
	"""
	POST endpoint to send a message to the chatbot
	"""
	permission_classes = [AllowAny]
	parser_classes = [MultiPartParser, FormParser]
	def post(self, request):
		print('Request data:', request.data)
		serializer = ChatMessageSerializer(data=request.data)
		print('data', serializer)
		if not serializer.is_valid():
			return Response(
				serializer.errors,
				status=status.HTTP_400_BAD_REQUEST
			)
		
		message = serializer.validated_data.get("message")
		session_id = serializer.validated_data.get("session_id", None)
		image = serializer.validated_data.get("image", None)
		service = ChatbotService()
		
		try:
			result = service.generate_response(message, session_id, image) 
			
			response_serializer = ChatResponseSerializer(result)
			
			return Response(
				response_serializer.data,
				status=status.HTTP_200_OK
			)
		
		except Exception as e:
			return Response(
				{"error": f"Failed to generate response: {str(e)}"},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR
			)
@method_decorator(csrf_exempt, name='dispatch')
class ExtractAndGeneratePlanView(APIView):
    """
    POST endpoint to extract data from chat and generate renovation plan
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        session_id = request.data.get("session_id")
        
        if not session_id:
            return Response(
                {"success": False, "error": "session_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        chatbot_service = ChatbotService()
        extraction_result = chatbot_service.extract_plan_data(session_id)
        
        if not extraction_result["success"]:
            return Response(
                {
                    "success": False, 
                    "error": extraction_result["error"],
                    "step": "extraction"
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        extracted_data = extraction_result["data"]
        
        plan_input = {
            "building_type": extracted_data.get("building_type", "Unknown"),
            "budget": float(extracted_data.get("budget", 0)),
            "location": extracted_data.get("location", "Germany"),
            "building_size": int(extracted_data.get("building_size", 0)),
            "goals": extracted_data.get("renovation_goals", []),
            "building_age": extracted_data.get("building_age", "Unknown"),
            "current_condition": extracted_data.get("current_condition", "Unknown"),
            "timeline": extracted_data.get("timeline", "Flexible"),
            "project_type": extracted_data.get("project_type", ""),
            "specific_details": extracted_data.get("specific_details", {}),
            "concerns": extracted_data.get("concerns", []),
            "additional_context": extracted_data.get("additional_context", "")
        }
        
        try:
            gemini_service = GeminiService()
            
            plan_result = gemini_service.generate_renovation_plan(
                building_type=plan_input["building_type"],
                budget=plan_input["budget"],
                location=plan_input["location"],
                building_size=plan_input["building_size"],
                renovation_goals=plan_input["goals"],
                dynamic_context=plan_input
            )
            
            return Response(
                {
                    "success": True,
                    "extracted_data": extracted_data,
                    "plan": plan_result.get("plan"),
                    "session_id": session_id
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {
                    "success": False,
                    "error": f"Plan generation failed: {str(e)}",
                    "step": "generation",
                    "extracted_data": extracted_data
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )