"""
Gmail Revoke View - Disconnect user's Gmail authentication
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from core.models import EmailCredential

logger = logging.getLogger(__name__)


class GmailRevokeView(APIView):
	"""
	Revoke/disconnect the user's Gmail authentication.
	"""
	permission_classes = [IsAuthenticated]
	
	def post(self, request):
		"""
		Revoke Gmail authentication by clearing stored tokens.
		
		Returns:
			Success response
		"""
		try:
			# Delete EmailCredential if exists
			try:
				credential = EmailCredential.objects.get(user=request.user)
				credential.delete()
				logger.info(f"Revoked Gmail authentication for user {request.user.id}")
			except EmailCredential.DoesNotExist:
				logger.info(f"No Gmail authentication to revoke for user {request.user.id}")
				pass  # Already disconnected
			
			return Response({
				'success': True,
				'message': 'Gmail authentication has been disconnected'
			}, status=status.HTTP_200_OK)
			
		except Exception as e:
			logger.error(f"Error revoking Gmail authentication: {str(e)}", exc_info=True)
			return Response({
				'detail': f"Failed to revoke Gmail authentication: {str(e)}"
			}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


