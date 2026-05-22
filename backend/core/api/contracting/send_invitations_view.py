"""
Send Invitations View - Send invitation emails to contractors via Gmail
"""
import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from core.models import Project, ContractingPlanning, Contractor, SentEmail, EmailCredential, Message
from core.services.contracting_service.gmail_service import GmailService

logger = logging.getLogger(__name__)


class SendInvitationsView(generics.GenericAPIView):
	"""
	Send invitation emails to selected contractors via Gmail API.
	"""
	permission_classes = [permissions.IsAuthenticated]
	parser_classes = [JSONParser]
	
	def post(self, request, project_id):
		"""
		Send invitation emails to contractors.
		
		Request body:
		{
			"contractor_ids": [1, 2, 3],
			"email_html": "<html>...</html>",
			"attachment_file_ids": [1, 2] (optional, IDs of ContractingPlanningFile)
		}
		
		Returns: 
		{
			"success": 2,
			"failed": 0,
			"errors": [],
			"sent_emails": [...]
		}
		"""
		# Verify the project exists and belongs to the user
		try:
			project = Project.objects.get(id=project_id, user=request.user)
		except Project.DoesNotExist:
			return Response(
				{'detail': 'Project not found or you do not have permission to access it'},
				status=status.HTTP_404_NOT_FOUND
			)
		
		# Get contracting planning
		try:
			planning = ContractingPlanning.objects.get(project=project)
		except ContractingPlanning.DoesNotExist:
			return Response(
				{'detail': 'Contracting planning not found for this project'},
				status=status.HTTP_404_NOT_FOUND
			)
		
		# Validate user has Gmail authentication
		try:
			credential = EmailCredential.objects.get(user=request.user)
			
			# Check if token is valid
			if not credential.is_valid():
				# Try to refresh token if we have a refresh token
				if credential.refresh_token:
					try:
						token_data = GmailService.refresh_access_token(credential.refresh_token)
						credential.access_token = token_data['access_token']
						credential.token_expiry = token_data['token_expiry']
						credential.save()
						logger.info(f"Successfully refreshed Gmail token for user {request.user.id}")
					except Exception as e:
						logger.error(f"Failed to refresh Gmail token: {str(e)}")
						return Response(
							{'detail': 'Gmail authentication expired. Please reconnect your Gmail account.'},
							status=status.HTTP_401_UNAUTHORIZED
						)
				else:
					return Response(
						{'detail': 'Gmail authentication required. Please connect your Gmail account.'},
						status=status.HTTP_401_UNAUTHORIZED
					)
		except EmailCredential.DoesNotExist:
			return Response(
				{'detail': 'Gmail authentication required. Please connect your Gmail account.'},
				status=status.HTTP_401_UNAUTHORIZED
			)
		
		# Get request data
		contractor_ids = request.data.get('contractor_ids', [])
		email_html = request.data.get('email_html', '')
		attachment_file_ids = request.data.get('attachment_file_ids', [])
		
		if not contractor_ids:
			return Response(
				{'detail': 'contractor_ids is required'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		if not email_html:
			return Response(
				{'detail': 'email_html is required'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Get contractors
		contractors = Contractor.objects.filter(id__in=contractor_ids)
		
		if not contractors.exists():
			return Response(
				{'detail': 'No valid contractors found'},
				status=status.HTTP_400_BAD_REQUEST
			)
		
		# Generate PDF from renovation plan HTML
		pdf_bytes = None
		pdf_filename = f"Renovation_Plan_{project.name.replace(' ', '_')}.pdf"
		
		# Get renovation plan HTML from the latest invitation generation
		# We'll use the existing PDF generation logic
		try:
			from weasyprint import HTML, CSS
			
			# Get the renovation plan HTML - we need to fetch it
			# For now, let's assume it's passed or we generate it
			renovation_plan_html = request.data.get('renovation_plan_html', '')
			
			if renovation_plan_html:
				logger.info(f"Generating PDF for project {project_id}")
				
				default_css = CSS(string='''
					@page {
						size: A4;
						margin: 2cm;
					}
					body {
						font-family: Arial, sans-serif;
						font-size: 11pt;
						line-height: 1.5;
						color: #000;
					}
					h1 { font-size: 20pt; margin-top: 0; margin-bottom: 0.5em; }
					h2 { font-size: 16pt; margin-top: 1em; margin-bottom: 0.5em; }
					h3 { font-size: 14pt; margin-top: 0.8em; margin-bottom: 0.4em; }
					p { margin-bottom: 0.5em; }
				''')
				
				html_obj = HTML(string=renovation_plan_html)
				pdf_bytes = html_obj.write_pdf(stylesheets=[default_css])
				logger.info(f"Successfully generated PDF ({len(pdf_bytes)} bytes)")
		except ImportError:
			logger.warning("WeasyPrint not installed, PDF will not be attached")
		except Exception as e:
			logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
		
		# Prepare attachments list
		attachments = []
		
		# Add PDF if generated
		if pdf_bytes:
			attachments.append({
				'filename': pdf_filename,
				'content': pdf_bytes,
				'content_type': 'application/pdf'
			})
		
		# Add user-selected files
		if attachment_file_ids:
			planning_files = planning.files.filter(id__in=attachment_file_ids)
			for file_obj in planning_files:
				try:
					with file_obj.file.open('rb') as f:
						file_content = f.read()
						attachments.append({
							'filename': file_obj.filename,
							'content': file_content,
						})
					logger.info(f"Added attachment: {file_obj.filename}")
				except Exception as e:
					logger.error(f"Failed to read file {file_obj.filename}: {str(e)}")
		
		# Email subject
		subject = f"Invitation: {project.name} Renovation Project"
		
		# Send emails to contractors
		results = {
			'success': 0,
			'failed': 0,
			'errors': [],
			'sent_emails': []
		}
		
		access_token = credential.access_token
		
		for contractor in contractors:
			if not contractor.email:
				results['failed'] += 1
				results['errors'].append({
					'contractor_id': contractor.id,
					'contractor_name': contractor.name,
					'error': 'No email address available'
				})
				
				# Create failed SentEmail record
				SentEmail.objects.create(
					contracting_planning=planning,
					contractor_email='',
					subject=subject,
					body_html=email_html,
					status='failed',
					error_message='No email address available'
				)
				continue
			
			try:
				# Send email via Gmail
				result = GmailService.send_email(
					access_token=access_token,
					to=contractor.email,
					subject=subject,
					body=self._html_to_plain_text(email_html),
					html_body=email_html,
					attachments=attachments
				)
				
				# Create successful SentEmail record
				sent_email = SentEmail.objects.create(
					contracting_planning=planning,
					contractor_email=contractor.email,
					subject=subject,
					body_html=email_html,
					status='sent',
					gmail_message_id=result.get('message_id'),
					gmail_thread_id=result.get('thread_id')
				)
				
				results['success'] += 1
				results['sent_emails'].append({
					'id': sent_email.id,
					'contractor_id': contractor.id,
					'contractor_name': contractor.name,
					'contractor_email': contractor.email,
					'message_id': result.get('message_id')
				})
				
				logger.info(f"Successfully sent email to {contractor.email} (message_id: {result.get('message_id')})")
				
			except Exception as e:
				logger.error(f"Failed to send email to {contractor.email}: {str(e)}", exc_info=True)
				
				results['failed'] += 1
				results['errors'].append({
					'contractor_id': contractor.id,
					'contractor_name': contractor.name,
					'error': str(e)
				})
				
				# Create failed SentEmail record
				SentEmail.objects.create(
					contracting_planning=planning,
					contractor_email=contractor.email,
					subject=subject,
					body_html=email_html,
					status='failed',
					error_message=str(e)
				)
		
		logger.info(f"Email sending complete: {results['success']} succeeded, {results['failed']} failed")
		
		# Create initial welcome messages for successfully contacted contractors
		for sent_email_info in results['sent_emails']:
			contractor_id = sent_email_info['contractor_id']
			contractor_name = sent_email_info['contractor_name']
			
			# Check if a welcome message already exists for this contractor
			existing_message = Message.objects.filter(
				contracting_planning=planning,
				contractor_id=contractor_id,
				sender='ai'
			).first()
			
			if not existing_message:
				# Create initial AI welcome message
				welcome_message = (
					f"Hello! I'm your AI agent helping you communicate with {contractor_name}. "
					f"I'll facilitate your conversation and help clarify any questions you have about "
					f"your renovation project. Feel free to ask me anything!"
				)
				
				Message.objects.create(
					contracting_planning=planning,
					contractor_id=contractor_id,
					sender='ai',
					content=welcome_message,
                )
				logger.info(f"Created initial welcome message for contractor {contractor_id}")
		
		# Update current step to 4 (Communicate) after successful invitation sending
		if results['success'] > 0:
			planning.current_step = 4
			planning.save()
			logger.info(f"Updated contracting planning to step 4 (Communicate)")
		
		return Response(results, status=status.HTTP_200_OK)
	
	def _html_to_plain_text(self, html: str) -> str:
		"""
		Convert HTML to plain text (simple implementation).
		
		Args:
			html: HTML string
			
		Returns:
			Plain text string
		"""
		import re
		# Remove HTML tags
		text = re.sub(r'<[^>]+>', '', html)
		# Decode HTML entities
		import html as html_module
		text = html_module.unescape(text)
		# Clean up whitespace
		text = re.sub(r'\s+', ' ', text).strip()
		return text
