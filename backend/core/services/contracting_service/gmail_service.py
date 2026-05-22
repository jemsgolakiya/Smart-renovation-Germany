"""
Gmail Service - Handles Gmail OAuth and email sending via Gmail API
"""
import os
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Dict, Optional, List
from django.conf import settings
from django.utils import timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
import mimetypes


class GmailService:
	"""Service for handling Gmail OAuth and email operations."""

	@staticmethod
	def get_oauth_flow(redirect_uri: Optional[str] = None) -> Flow:
		"""
		Create and return a Google OAuth flow for Gmail API.
		
		Args:
			redirect_uri: Optional redirect URI, defaults to settings value
			
		Returns:
			Flow object configured for Gmail API
		"""
		client_config = {
			"web": {
				"client_id": settings.GMAIL_API_CLIENT_ID,
				"client_secret": settings.GMAIL_API_CLIENT_SECRET,
				"auth_uri": "https://accounts.google.com/o/oauth2/auth",
				"token_uri": "https://oauth2.googleapis.com/token",
				"redirect_uris": [redirect_uri or settings.GMAIL_OAUTH_REDIRECT_URI],
			}
		}
		
		flow = Flow.from_client_config(
			client_config,
			scopes=settings.GMAIL_OAUTH_SCOPES,
			redirect_uri=redirect_uri or settings.GMAIL_OAUTH_REDIRECT_URI
		)
		
		return flow

	@staticmethod
	def get_authorization_url(state: Optional[str] = None) -> str:
		"""
		Generate the Google OAuth authorization URL.
		
		Args:
			state: Optional state parameter for CSRF protection
			
		Returns:
			Authorization URL string
		"""
		flow = GmailService.get_oauth_flow()
		
		auth_url, _ = flow.authorization_url(
			access_type='offline',
			include_granted_scopes='true',
			prompt='consent',
			state=state
		)
		
		return auth_url

	@staticmethod
	def exchange_code_for_tokens(code: str) -> Dict[str, any]:
		"""
		Exchange authorization code for access and refresh tokens.
		
		Args:
			code: Authorization code from OAuth callback
			
		Returns:
			Dictionary containing token information
		"""
		flow = GmailService.get_oauth_flow()
		flow.fetch_token(code=code)
		
		credentials = flow.credentials
		
		# Calculate token expiry
		expiry = None
		if credentials.expiry:
			# Make timezone-aware if naive
			if timezone.is_naive(credentials.expiry):
				expiry = timezone.make_aware(credentials.expiry, timezone=dt_timezone.utc)
			else:
				expiry = credentials.expiry
		else:
			# Default to 1 hour from now
			expiry = timezone.now() + timedelta(hours=1)
		
		return {
			'access_token': credentials.token,
			'refresh_token': credentials.refresh_token,
			'token_expiry': expiry,
			'scopes': credentials.scopes,
		}

	@staticmethod
	def refresh_access_token(refresh_token: str) -> Dict[str, any]:
		"""
		Refresh an expired access token using a refresh token.
		
		Args:
			refresh_token: The refresh token
			
		Returns:
			Dictionary with new access token and expiry
		"""
		credentials = Credentials(
			token=None,
			refresh_token=refresh_token,
			token_uri="https://oauth2.googleapis.com/token",
			client_id=settings.GMAIL_API_CLIENT_ID,
			client_secret=settings.GMAIL_API_CLIENT_SECRET,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		
		# Refresh the token
		credentials.refresh(Request())
		
		# Calculate expiry
		expiry = timezone.now() + timedelta(hours=1)
		if credentials.expiry:
			# Make timezone-aware if naive
			if timezone.is_naive(credentials.expiry):
				expiry = timezone.make_aware(credentials.expiry, timezone=timezone.get_current_timezone())
			else:
				expiry = credentials.expiry
		
		return {
			'access_token': credentials.token,
			'token_expiry': expiry,
		}

	@staticmethod
	def get_user_email(access_token: str) -> str:
		"""
		Get the user's email address from their Gmail account.
		
		Args:
			access_token: Valid access token
			
		Returns:
			User's email address
		"""
		credentials = Credentials(token=access_token)
		service = build('gmail', 'v1', credentials=credentials)
		
		profile = service.users().getProfile(userId='me').execute()
		return profile['emailAddress']

	@staticmethod
	def create_message(
		sender: str,
		to: str,
		subject: str,
		body: str,
		html_body: Optional[str] = None,
		attachments: Optional[List[Dict]] = None
	) -> Dict:
		"""
		Create a message for an email.
		
		Args:
			sender: Email address of the sender
			to: Email address of the receiver
			subject: Subject of the email
			body: Plain text body of the email
			html_body: Optional HTML body of the email
			attachments: Optional list of attachment dicts with 'filename' and 'content' (bytes)
			
		Returns:
			Message object as a dictionary
		"""
		# If we have attachments, use multipart/mixed
		if attachments:
			message = MIMEMultipart('mixed')
			
			# Create the message body part
			if html_body:
				body_part = MIMEMultipart('alternative')
				body_part.attach(MIMEText(body, 'plain'))
				body_part.attach(MIMEText(html_body, 'html'))
			else:
				body_part = MIMEText(body, 'plain')
			
			message.attach(body_part)
			
			# Add attachments
			for attachment in attachments:
				filename = attachment.get('filename', 'attachment')
				content = attachment.get('content')
				content_type = attachment.get('content_type')
				
				if content:
					# Guess content type if not provided
					if not content_type:
						content_type, _ = mimetypes.guess_type(filename)
						if not content_type:
							content_type = 'application/octet-stream'
					
					# Parse content type
					main_type, sub_type = content_type.split('/', 1) if '/' in content_type else ('application', 'octet-stream')
					
					attachment_part = MIMEBase(main_type, sub_type)
					attachment_part.set_payload(content)
					encoders.encode_base64(attachment_part)
					attachment_part.add_header('Content-Disposition', f'attachment; filename="{filename}"')
					message.attach(attachment_part)
		else:
			# No attachments - use simpler structure
			if html_body:
				message = MIMEMultipart('alternative')
				part1 = MIMEText(body, 'plain')
				part2 = MIMEText(html_body, 'html')
				message.attach(part1)
				message.attach(part2)
			else:
				message = MIMEText(body)
		
		message['to'] = to
		message['from'] = sender
		message['subject'] = subject
		
		raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
		return {'raw': raw}

	@staticmethod
	def send_email(
		access_token: str,
		to: str,
		subject: str,
		body: str,
		html_body: Optional[str] = None,
		sender: Optional[str] = None,
		attachments: Optional[List[Dict]] = None,
		thread_id: Optional[str] = None
	) -> Dict:
		"""
		Send an email using the Gmail API.
		
		Args:
			access_token: Valid access token
			to: Recipient email address
			subject: Email subject
			body: Plain text email body
			html_body: Optional HTML email body
			sender: Optional sender email (defaults to 'me')
			attachments: Optional list of attachment dicts with 'filename' and 'content'
			thread_id: Optional thread ID to reply in existing thread
			
		Returns:
			API response dictionary
		"""
		credentials = Credentials(
			token=access_token,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		service = build('gmail', 'v1', credentials=credentials)
		
		# Get sender email if not provided
		if not sender:
			profile = service.users().getProfile(userId='me').execute()
			sender = profile['emailAddress']
		
		message = GmailService.create_message(sender, to, subject, body, html_body, attachments)
		
		# Add thread_id to reply in existing thread
		if thread_id:
			message['threadId'] = thread_id
		
		result = service.users().messages().send(
			userId='me',
			body=message
		).execute()
		
		# Return structured result with message_id and thread_id
		return {
			'message_id': result.get('id'),
			'thread_id': result.get('threadId'),
			'label_ids': result.get('labelIds', []),
			'raw_response': result
		}

	@staticmethod
	def send_bulk_emails(
		access_token: str,
		recipients: List[str],
		subject: str,
		body: str,
		html_body: Optional[str] = None,
		attachments: Optional[List[Dict]] = None,
		thread_id: Optional[str] = None
	) -> Dict[str, any]:
		"""
		Send emails to multiple recipients.
		
		Args:
			access_token: Valid access token
			recipients: List of recipient email addresses
			subject: Email subject
			body: Plain text email body
			html_body: Optional HTML email body
			attachments: Optional list of attachment dicts with 'filename' and 'content'
			thread_id: Optional thread ID to reply in existing thread
			
		Returns:
			Dictionary with success count and any errors
		"""
		results = {
			'success': 0,
			'failed': 0,
			'errors': [],
			'sent_details': []
		}
		
		for recipient in recipients:
			try:
				result = GmailService.send_email(
					access_token=access_token,
					to=recipient,
					subject=subject,
					body=body,
					html_body=html_body,
					attachments=attachments,
					thread_id=thread_id
				)
				results['success'] += 1
				results['sent_details'].append({
					'recipient': recipient,
					'message_id': result.get('message_id'),
					'thread_id': result.get('thread_id')
				})
			except Exception as e:
				results['failed'] += 1
				results['errors'].append({
					'recipient': recipient,
					'error': str(e)
				})
		
		return results

	@staticmethod
	def fetch_new_messages(
		access_token: str,
		query: str = 'is:unread',
		max_results: int = 50
	) -> List[Dict]:
		"""
		Fetch new/unread messages from Gmail.
		
		Args:
			access_token: Valid access token
			query: Gmail search query (default: 'is:unread')
			max_results: Maximum number of messages to fetch
			
		Returns:
			List of message objects with basic info
		"""
		credentials = Credentials(
			token=access_token,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		service = build('gmail', 'v1', credentials=credentials)
		
		try:
			# List messages matching the query
			results = service.users().messages().list(
				userId='me',
				q=query,
				maxResults=max_results
			).execute()
			
			messages = results.get('messages', [])
			return messages
		except Exception as e:
			raise Exception(f"Failed to fetch messages: {str(e)}")

	@staticmethod
	def get_message_details(access_token: str, message_id: str) -> Dict:
		"""
		Get full details of a specific message including headers, body, thread_id, and attachments.
		
		Args:
			access_token: Valid access token
			message_id: Gmail message ID
			
		Returns:
			Dictionary with message details (from, subject, body, thread_id, received_at, attachments, etc.)
		"""
		credentials = Credentials(
			token=access_token,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		service = build('gmail', 'v1', credentials=credentials)
		
		try:
			# Get the full message
			message = service.users().messages().get(
				userId='me',
				id=message_id,
				format='full'
			).execute()
			
			# Extract headers
			headers = {}
			for header in message.get('payload', {}).get('headers', []):
				headers[header['name'].lower()] = header['value']
			
			# Extract body
			body = GmailService._extract_body(message.get('payload', {}))
			
			# Extract attachments metadata
			attachments = GmailService._extract_attachments_metadata(message.get('payload', {}))
			
			# Parse date
			import email.utils
			from datetime import datetime
			from django.utils import timezone as django_timezone
			date_str = headers.get('date', '')
			received_at = None
			if date_str:
				try:
					date_tuple = email.utils.parsedate_tz(date_str)
					if date_tuple:
						timestamp = email.utils.mktime_tz(date_tuple)
						# Create timezone-aware datetime
						received_at = django_timezone.make_aware(
							datetime.fromtimestamp(timestamp),
							django_timezone.get_current_timezone()
						)
				except:
					pass
			
			return {
				'message_id': message_id,
				'thread_id': message.get('threadId'),
				'from': headers.get('from', ''),
				'to': headers.get('to', ''),
				'subject': headers.get('subject', ''),
				'body': body,
				'received_at': received_at,
				'attachments': attachments,
				'raw_data': message
			}
		except Exception as e:
			raise Exception(f"Failed to get message details: {str(e)}")

	@staticmethod
	def _extract_body(payload: Dict) -> str:
		"""
		Extract the email body from the message payload.
		Handles both plain text and HTML, nested parts, etc.
		
		Args:
			payload: Message payload from Gmail API
			
		Returns:
			Email body as string
		"""
		body = ""
		
		# If the payload has a body directly
		if 'body' in payload and 'data' in payload['body']:
			body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
			return body
		
		# If the payload has parts (multipart message)
		if 'parts' in payload:
			for part in payload['parts']:
				# Recursively extract from parts
				if part.get('mimeType') == 'text/plain':
					if 'data' in part.get('body', {}):
						body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
						return body
				elif part.get('mimeType') == 'text/html' and not body:
					if 'data' in part.get('body', {}):
						body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
				elif 'parts' in part:
					# Nested parts (e.g., multipart/alternative)
					nested_body = GmailService._extract_body(part)
					if nested_body:
						body = nested_body
		
		return body
	
	@staticmethod
	def _extract_attachments_metadata(payload: Dict, parts: List = None) -> List[Dict]:
		"""
		Extract attachment metadata from the message payload.
		
		Args:
			payload: Message payload from Gmail API
			parts: Internal parameter for recursion
			
		Returns:
			List of attachment metadata dicts with filename, mimeType, size, and attachmentId
		"""
		if parts is None:
			parts = []
		
		if 'parts' in payload:
			for part in payload['parts']:
				# Check if this part is an attachment
				if part.get('filename'):
					body = part.get('body', {})
					if body.get('attachmentId'):
						parts.append({
							'filename': part.get('filename'),
							'mimeType': part.get('mimeType'),
							'size': body.get('size', 0),
							'attachmentId': body.get('attachmentId')
						})
				
				# Recursively check nested parts
				if 'parts' in part:
					GmailService._extract_attachments_metadata(part, parts)
		
		return parts
	
	@staticmethod
	def download_attachment(access_token: str, message_id: str, attachment_id: str) -> bytes:
		"""
		Download an attachment from a message.
		
		Args:
			access_token: Valid access token
			message_id: Gmail message ID
			attachment_id: Attachment ID from Gmail API
			
		Returns:
			Attachment content as bytes
		"""
		credentials = Credentials(
			token=access_token,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		service = build('gmail', 'v1', credentials=credentials)
		
		try:
			attachment = service.users().messages().attachments().get(
				userId='me',
				messageId=message_id,
				id=attachment_id
			).execute()
			
			# Decode the attachment data
			file_data = base64.urlsafe_b64decode(attachment['data'])
			return file_data
		except Exception as e:
			raise Exception(f"Failed to download attachment: {str(e)}")

	@staticmethod
	def mark_as_read(access_token: str, message_id: str) -> Dict:
		"""
		Mark a message as read by removing the UNREAD label.
		
		Args:
			access_token: Valid access token
			message_id: Gmail message ID
			
		Returns:
			API response dictionary
		"""
		credentials = Credentials(
			token=access_token,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		service = build('gmail', 'v1', credentials=credentials)
		
		try:
			result = service.users().messages().modify(
				userId='me',
				id=message_id,
				body={'removeLabelIds': ['UNREAD']}
			).execute()
			return result
		except Exception as e:
			raise Exception(f"Failed to mark message as read: {str(e)}")

	@staticmethod
	def search_messages(
		access_token: str,
		from_email: Optional[str] = None,
		max_results: int = 50
	) -> List[Dict]:
		"""
		Search for messages from a specific sender.
		
		Args:
			access_token: Valid access token
			from_email: Email address to filter by
			max_results: Maximum number of messages to fetch
			
		Returns:
			List of message objects
		"""
		query = f'from:{from_email}' if from_email else ''
		return GmailService.fetch_new_messages(access_token, query=query, max_results=max_results)

	@staticmethod
	def get_thread_messages(access_token: str, thread_id: str) -> List[Dict]:
		"""
		Get all messages in a conversation thread.
		
		Args:
			access_token: Valid access token
			thread_id: Gmail thread ID
			
		Returns:
			List of message details in the thread
		"""
		credentials = Credentials(
			token=access_token,
			scopes=settings.GMAIL_OAUTH_SCOPES
		)
		service = build('gmail', 'v1', credentials=credentials)
		
		try:
			thread = service.users().threads().get(
				userId='me',
				id=thread_id,
				format='full'
			).execute()
			
			messages = []
			for message in thread.get('messages', []):
				message_id = message.get('id')
				# Get full details for each message
				details = GmailService.get_message_details(access_token, message_id)
				messages.append(details)
			
			return messages
		except Exception as e:
			raise Exception(f"Failed to get thread messages: {str(e)}")

