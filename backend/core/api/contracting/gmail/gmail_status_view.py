"""
Gmail Status View - Check if user has valid Gmail authentication
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from core.models import EmailCredential

logger = logging.getLogger(__name__)


class GmailStatusView(APIView):
	"""
	Check if the current user has valid Gmail authentication.
	"""
	permission_classes = [IsAuthenticated]
	
	def get(self, request):
		"""
		Check Gmail authentication status for the current user.
		
		Returns:
			JSON response with authentication status and details
		"""
		try:
			# Check if user has EmailCredential
			try:
				credential = EmailCredential.objects.get(user=request.user)
				has_auth = credential.is_valid()
				
				response_data = {
					'authenticated': has_auth,
					'gmail_email': credential.email_address if has_auth else None,
				}
				
				if has_auth and credential.token_expiry:
					response_data['token_expiry'] = credential.token_expiry.isoformat()
			except EmailCredential.DoesNotExist:
				has_auth = False
				response_data = {
					'authenticated': False,
					'gmail_email': None,
				}
			
			logger.info(f"Gmail status check for user {request.user.id}: authenticated={has_auth}")
			
			return Response(response_data, status=status.HTTP_200_OK)
			
		except Exception as e:
			logger.error(f"Error checking Gmail status: {str(e)}", exc_info=True)
			return Response({
				'detail': f"Failed to check Gmail status: {str(e)}"
			}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


