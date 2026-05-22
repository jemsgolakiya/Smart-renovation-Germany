"""
Gmail OAuth Initiate View - Returns OAuth URL for user authentication
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.services.contracting_service.gmail_service import GmailService

logger = logging.getLogger(__name__)


class GmailOAuthInitiateView(APIView):
	"""
	Returns the Gmail OAuth authorization URL for the user to authenticate.
	"""
	permission_classes = [IsAuthenticated]
	
	def get(self, request):
		"""
		Generate and return the OAuth authorization URL.
		
		Returns:
			JSON response with authorization_url
		"""
		try:
			# Generate a state parameter for CSRF protection (use user ID)
			state = f"user_{request.user.id}"
			
			# Get the authorization URL
			auth_url = GmailService.get_authorization_url(state=state)
			
			logger.info(f"Generated OAuth URL for user {request.user.id}")
			
			return Response({
				'authorization_url': auth_url,
				'state': state
			}, status=status.HTTP_200_OK)
			
		except Exception as e:
			logger.error(f"Error generating OAuth URL: {str(e)}", exc_info=True)
			return Response({
				'detail': f"Failed to generate authorization URL: {str(e)}"
			}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

