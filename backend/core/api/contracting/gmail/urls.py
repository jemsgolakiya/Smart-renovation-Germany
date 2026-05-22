"""
URL patterns for Gmail API endpoints
"""
from django.urls import path
from .gmail_oauth_initiate_view import GmailOAuthInitiateView
from .gmail_oauth_callback_view import GmailOAuthCallbackView
from .gmail_status_view import GmailStatusView
from .gmail_revoke_view import GmailRevokeView

app_name = "gmail"

urlpatterns = [
	path('oauth/initiate/', GmailOAuthInitiateView.as_view(), name='oauth-initiate'),
	path('oauth/callback/', GmailOAuthCallbackView.as_view(), name='oauth-callback'),
	path('status/', GmailStatusView.as_view(), name='status'),
	path('revoke/', GmailRevokeView.as_view(), name='revoke'),
]

