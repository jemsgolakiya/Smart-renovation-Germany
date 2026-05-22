"""
Gmail OAuth Callback View - Handles OAuth callback and exchanges code for tokens
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.services.contracting_service.gmail_service import GmailService
from core.models import EmailCredential

logger = logging.getLogger(__name__)


class GmailOAuthCallbackView(APIView):
	"""
	Handles the OAuth callback from Google and exchanges the authorization code for tokens.
	"""
	permission_classes = [IsAuthenticated]
	
	def post(self, request):
		"""
		Exchange authorization code for access and refresh tokens.
		
		Request body:
			{
				"code": "authorization_code_from_google",
				"state": "csrf_state_token"
			}
		
		Returns:
			Success or error response
		"""
		code = request.data.get('code')
		state = request.data.get('state')
		
		if not code:
			return Response({
				'detail': 'Authorization code is required'
			}, status=status.HTTP_400_BAD_REQUEST)
		
		try:
			# Verify state matches user (CSRF protection)
			expected_state = f"user_{request.user.id}"
			if state and state != expected_state:
				logger.warning(f"State mismatch for user {request.user.id}: expected {expected_state}, got {state}")
				return Response({
					'detail': 'Invalid state parameter'
				}, status=status.HTTP_400_BAD_REQUEST)
			
			# Exchange code for tokens
			token_data = GmailService.exchange_code_for_tokens(code)
			
			# Get user's Gmail email address
			gmail_email = GmailService.get_user_email(token_data['access_token'])
			
			# Save tokens to EmailCredential model
			credential, created = EmailCredential.objects.get_or_create(
				user=request.user,
				defaults={'provider': 'gmail'}
			)
			credential.access_token = token_data['access_token']
			credential.refresh_token = token_data['refresh_token']
			credential.token_expiry = token_data['token_expiry']
			credential.email_address = gmail_email
			credential.scopes = token_data['scopes']
			credential.save()
			
			logger.info(f"Successfully saved Gmail OAuth tokens for user {request.user.id} ({gmail_email})")
			
			return Response({
				'success': True,
				'gmail_email': gmail_email,
				'message': 'Gmail authentication successful'
			}, status=status.HTTP_200_OK)
			
		except Exception as e:
			logger.error(f"Error in OAuth callback for user {request.user.id}: {str(e)}", exc_info=True)
			return Response({
				'detail': f"Failed to complete OAuth authentication: {str(e)}"
			}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

