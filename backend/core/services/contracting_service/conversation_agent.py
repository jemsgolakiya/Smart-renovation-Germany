"""
Conversation Agent Service - Handles AI-powered contractor communication with Gemini
"""
import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from django.conf import settings
from django.utils import timezone

from core.models import (
    ContractingPlanning,
    Message,
    MessageAction,
    Contractor,
    EmailCredential,
    ContractorOffer,
    OfferAnalysis
)
from core.services.gemini_service.gemini_service import get_gemini_service
from core.services.contracting_service.gmail_service import GmailService
from core.services.contracting_service.offer_service import OfferService, convert_to_serializable
import google.generativeai as genai

logger = logging.getLogger(__name__)


class ConversationAgent:
    """
    AI agent that facilitates communication between users and contractors
    using Gemini AI with function calling capabilities.
    """
    
    # Tool definition for Gemini function calling
    SEND_EMAIL_TOOL = genai.protos.FunctionDeclaration(
        name="send_email",
        description="Draft and send an email to the contractor on behalf of the user",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "subject": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Email subject line (concise, clear, in German)"
                ),
                "body_html": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Email body in HTML format (professional, polite, in German)"
                ),
                "reasoning": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief explanation of why this email helps the user (1-2 sentences)"
                ),
                "action_summary": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="One-sentence summary for future conversation context"
                ),
                "suggested_actions": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="2-4 short, actionable suggestions for the user's next steps (e.g., 'Check their reply', 'Modify the draft')",
                    items=genai.protos.Schema(type=genai.protos.Type.STRING)
                ),
            },
            required=["subject", "body_html", "reasoning", "action_summary", "suggested_actions"]
        )
    )
    
    FETCH_EMAIL_TOOL = genai.protos.FunctionDeclaration(
        name="fetch_email",
        description="Fetch and review recent emails from the contractor to understand their responses, questions, or any communication history",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "max_emails": genai.protos.Schema(
                    type=genai.protos.Type.INTEGER,
                    description="Maximum number of recent emails to fetch (default: 5, max: 10)"
                ),
                "reasoning": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief explanation of why fetching these emails will help the user"
                ),
                "action_summary": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="One-sentence summary for future conversation context"
                ),
                "suggested_actions": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="2-4 short, actionable suggestions for the user's next steps (e.g., 'Reply to them', 'Ask follow-up')",
                    items=genai.protos.Schema(type=genai.protos.Type.STRING)
                ),
            },
            required=["reasoning", "action_summary", "suggested_actions"]
        )
    )
    
    ANALYZE_OFFER_TOOL = genai.protos.FunctionDeclaration(
        name="analyze_offer",
        description="Analyze a detected contractor offer to provide detailed insights about pricing, timeline, quality, risks, and recommendations",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "offer_id": genai.protos.Schema(
                    type=genai.protos.Type.INTEGER,
                    description="ID of the offer to analyze"
                ),
                "contractor_name": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Name of the contractor who submitted this offer"
                ),
                "offer_title": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief title or description of the offer (e.g., 'Kitchen Renovation Offer - €25,000')"
                ),
                "total_price": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Total price of the offer with currency (e.g., '€25,000')"
                ),
                "timeline": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Timeline information (e.g., '30 days', 'Start: Jan 15, End: Feb 15')"
                ),
                "reasoning": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief explanation of why analyzing this offer will help the user"
                ),
                "action_summary": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="One-sentence summary for future conversation context (e.g., 'Analyzed BauMeister GmbH offer for €25,000')"
                ),
                "suggested_actions": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="2-4 short, actionable suggestions for the user's next steps (e.g., 'Compare all offers', 'Negotiate price')",
                    items=genai.protos.Schema(type=genai.protos.Type.STRING)
                ),
            },
            required=["offer_id", "contractor_name", "offer_title", "reasoning", "action_summary", "suggested_actions"]
        )
    )
    
    COMPARE_OFFERS_TOOL = genai.protos.FunctionDeclaration(
        name="compare_offers",
        description="Compare multiple contractor offers side-by-side to help the user choose the best option based on price, quality, timeline, and value",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "primary_offer_id": genai.protos.Schema(
                    type=genai.protos.Type.INTEGER,
                    description="ID of the primary offer to compare"
                ),
                "primary_offer_title": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief title of the primary offer (e.g., 'BauMeister GmbH - €25,000')"
                ),
                "compare_with_ids": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="Optional: Array of offer IDs to compare against. If not provided, compares with all other offers for this project",
                    items=genai.protos.Schema(type=genai.protos.Type.INTEGER)
                ),
                "compare_with_titles": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="Optional: Brief titles of the offers being compared against",
                    items=genai.protos.Schema(type=genai.protos.Type.STRING)
                ),
                "reasoning": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief explanation of why comparing these offers will help the user"
                ),
                "action_summary": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="One-sentence summary for future conversation context (e.g., 'Compared BauMeister GmbH offer with 2 other offers')"
                ),
                "suggested_actions": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="2-4 short, actionable suggestions for the user's next steps (e.g., 'Analyze top offer', 'Negotiate price')",
                    items=genai.protos.Schema(type=genai.protos.Type.STRING)
                ),
            },
            required=["primary_offer_id", "primary_offer_title", "reasoning", "action_summary", "suggested_actions"]
        )
    )
    
    QUERY_OFFER_ANALYSIS_TOOL = genai.protos.FunctionDeclaration(
        name="query_offer_analysis",
        description="Query recent offer analysis or comparison reports to provide context for drafting emails or answering questions about the offer. Use this when you need to reference specific details from previous analysis.",
        parameters=genai.protos.Schema(
            type=genai.protos.Type.OBJECT,
            properties={
                "analysis_type": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Type of analysis to query: 'single' for offer analysis or 'comparison' for offer comparison"
                ),
                "reasoning": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="Brief explanation of why you need the analysis data to complete the user's request"
                ),
                "action_summary": genai.protos.Schema(
                    type=genai.protos.Type.STRING,
                    description="One-sentence summary describing what analysis is being queried (e.g., 'Retrieving offer analysis for email drafting')"
                ),
                "suggested_actions": genai.protos.Schema(
                    type=genai.protos.Type.ARRAY,
                    description="2-4 short, actionable suggestions for the user's next steps",
                    items=genai.protos.Schema(type=genai.protos.Type.STRING)
                ),
            },
            required=["analysis_type", "reasoning", "action_summary", "suggested_actions"]
        )
    )
    
    def __init__(self):
        """Initialize the conversation agent with Gemini service."""
        self.gemini_service = get_gemini_service()
        self.offer_service = OfferService()
    
    def _load_prompt_template(self) -> str:
        """Load the conversation agent prompt template."""
        prompt_path = os.path.join(
            settings.BASE_DIR,
            'core',
            'services',
            'gemini_service',
            'prompts',
            'contracting',
            'conversation_agent_prompt.md'
        )
        
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template not found at {prompt_path}")
            raise
    
    def _parse_model_response(self, response_text: str) -> Dict:
        """
        Parse model response from JSON format with fallback to text.
        
        Args:
            response_text: Raw response text from the model
            
        Returns:
            Dictionary with 'response' and 'suggested_actions' keys
        """
        try:
            # Try to parse as JSON
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                # Remove first line (```json or ```)
                if lines[0].strip().startswith('```'):
                    lines = lines[1:]
                # Remove last line (```)
                if lines and lines[-1].strip() == '```':
                    lines = lines[:-1]
                response_text = '\n'.join(lines).strip()
            
            parsed = json.loads(response_text)
            
            # Validate required fields
            if 'response' not in parsed:
                logger.warning("JSON response missing 'response' field, using raw text")
                return {
                    'response': response_text,
                    'suggested_actions': parsed.get('suggested_actions', [])
                }
            
            return {
                'response': parsed.get('response', ''),
                'suggested_actions': parsed.get('suggested_actions', [])
            }
            
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON response: {str(e)}, falling back to text parsing")
            
            # Fallback: Try to extract suggestions from old format (---SUGGESTIONS---)
            suggested_actions = []
            clean_response = response_text
            
            if '---SUGGESTIONS---' in response_text and '---END---' in response_text:
                try:
                    parts = response_text.split('---SUGGESTIONS---')
                    clean_response = parts[0].strip()
                    suggestions_part = parts[1].split('---END---')[0].strip()
                    suggested_actions = [s.strip() for s in suggestions_part.split('\n') if s.strip()]
                except Exception as ex:
                    logger.warning(f"Error parsing suggestions from old format: {str(ex)}")
            
            return {
                'response': clean_response,
                'suggested_actions': suggested_actions
            }
    
    def _build_context(
        self,
        planning: ContractingPlanning,
        contractor_id: int,
        user
    ) -> Dict[str, str]:
        """
        Build context dictionary for the Gemini prompt.
        
        Args:
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            user: User instance
            
        Returns:
            Dictionary with all context variables
        """
        project = planning.project
        
        # Get contractor info
        contractor = Contractor.objects.filter(id=contractor_id).first()
        contractor_name = contractor.name if contractor else "Unknown"
        contractor_email = contractor.email if contractor else "Unknown"
        contractor_specialties = ", ".join(contractor.project_types) if contractor and contractor.project_types else "General contractor"
        
        # Get conversation history (last 15 messages)
        messages = Message.objects.filter(
            contracting_planning=planning,
            contractor_id=contractor_id
        ).order_by('-timestamp')[:15]
        
        # Reverse to chronological order
        messages = list(reversed(messages))
        
        # Format conversation history
        conversation_history = self._format_conversation_history(messages)
        
        # Get available offers for this contractor
        offers_summary = self._format_available_offers(planning, contractor_id)
        
        # Build context dictionary
        context = {
            'current_date': datetime.now().strftime('%Y-%m-%d'),
            'project_name': project.name or "Renovation Project",
            'project_type': project.project_type or "Not specified",
            'project_location': f"{project.address}, {project.postal_code} {project.city}" if project.address else "Not specified",
            'project_budget': f"€{project.budget:,.0f}" if project.budget else "Not specified",
            'contractor_name': contractor_name,
            'contractor_email': contractor_email,
            'contractor_specialties': contractor_specialties,
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'user_email': user.email,
            'user_phone': getattr(user, 'phone', 'Not provided'),
            'conversation_history': conversation_history,
            'available_offers': offers_summary,
        }
        
        return context
    
    def _format_conversation_history(self, messages: List[Message]) -> str:
        """
        Format conversation history for the prompt.
        
        Args:
            messages: List of Message objects in chronological order
            
        Returns:
            Formatted conversation history string
        """
        if not messages:
            return "No previous messages."
        
        history_lines = []
        for msg in messages:
            if msg.message_type == 'user':
                history_lines.append(f"[User]: {msg.content}")
            elif msg.message_type == 'ai':
                history_lines.append(f"[AI]: {msg.content}")
            elif msg.message_type == 'ai_action_executed':
                # For executed actions, show the action summary
                try:
                    action = msg.action
                    history_lines.append(f"[Action]: {action.action_summary}")
                except MessageAction.DoesNotExist:
                    history_lines.append(f"[AI]: {msg.content}")
        
        return "\n".join(history_lines)
    
    def _format_conversation_for_analysis(self, messages: List[Message]) -> str:
        """
        Format conversation history for offer analysis context.
        Includes questions asked, contractor responses, and important details.
        
        Args:
            messages: List of Message objects in chronological order
            
        Returns:
            Formatted conversation context string for analysis
        """
        if not messages:
            return "No conversation history available."
        
        history_lines = []
        for msg in messages:
            timestamp = msg.timestamp.strftime('%Y-%m-%d %H:%M') if msg.timestamp else ''
            
            if msg.message_type == 'user':
                history_lines.append(f"[{timestamp}] User: {msg.content}")
            elif msg.message_type == 'ai':
                history_lines.append(f"[{timestamp}] AI: {msg.content}")
            elif msg.message_type == 'ai_action_executed':
                # For executed actions, show details based on type
                try:
                    action = msg.action
                    if action.action_type == 'send_email':
                        # Show email subject and a snippet of the body
                        subject = action.action_data.get('subject', 'No subject')
                        history_lines.append(f"[{timestamp}] Email Sent: {subject}")
                    elif action.action_type == 'fetch_email':
                        history_lines.append(f"[{timestamp}] Fetched emails from contractor")
                    else:
                        history_lines.append(f"[{timestamp}] Action: {action.action_summary}")
                except MessageAction.DoesNotExist:
                    history_lines.append(f"[{timestamp}] {msg.content}")
        
        return "\n".join(history_lines)
    
    def _format_available_offers(self, planning: ContractingPlanning, contractor_id: int) -> str:
        """
        Format available offers for the context.
        Shows the most recent offer from each contractor.
        Marks which contractor is current (for analyze restrictions).
        
        Args:
            planning: ContractingPlanning instance
            contractor_id: ID of the CURRENT contractor in this conversation
            
        Returns:
            Formatted string with available offers (most recent per contractor)
        """
        # Get all offers for this planning (all contractors)
        # Order by email_received_at (most recent first), fallback to created_at if null
        all_offers = ContractorOffer.objects.filter(
            contracting_planning=planning
        ).select_related('contracting_planning').order_by('-email_received_at', '-created_at')
        
        if not all_offers.exists():
            return "No offers received yet."
        
        # Group offers by contractor_id and keep only the most recent one for each
        seen_contractors = set()
        recent_offers = []
        
        for offer in all_offers:
            if offer.contractor_id not in seen_contractors:
                seen_contractors.add(offer.contractor_id)
                recent_offers.append(offer)
        
        offer_lines = []
        for offer in recent_offers:
            # Get contractor info
            contractor = None
            if offer.contractor_id:
                contractor = Contractor.objects.filter(id=offer.contractor_id).first()
            
            contractor_name = contractor.name if contractor else "Unknown Contractor"
            
            # Format price
            price_str = f"€{offer.total_price:,.0f}" if offer.total_price else "Price not specified"
            
            # Format timeline
            timeline_str = ""
            if offer.timeline_start and offer.timeline_end:
                timeline_str = f"{offer.timeline_start.strftime('%b %d')} to {offer.timeline_end.strftime('%b %d, %Y')}"
            elif offer.timeline_duration_days:
                timeline_str = f"{offer.timeline_duration_days} days"
            else:
                timeline_str = "Timeline not specified"
            
            # Format scope (truncated)
            scope_str = ""
            if offer.scope_of_work:
                scope_truncated = offer.scope_of_work[:100] + "..." if len(offer.scope_of_work) > 100 else offer.scope_of_work
                scope_str = f" • Scope: {scope_truncated}"
            
            # Mark if this is the current contractor's offer
            is_current = offer.contractor_id == contractor_id
            current_marker = " **(CURRENT - can analyze)**" if is_current else " (can only compare, not analyze)"
            
            # Build offer line - DO NOT expose offer ID to user, only for internal tool use
            offer_line = f"• {contractor_name} - {price_str} ({timeline_str}){current_marker}{scope_str}\n  [Internal ID for tool use only: {offer.id}]"
            offer_lines.append(offer_line)
        
        return "\n\n".join(offer_lines)
    
    def _build_prompt(self, context: Dict[str, str], user_message: str) -> str:
        """
        Build the complete prompt with context and user message.
        
        Args:
            context: Context dictionary
            user_message: Current user message
            
        Returns:
            Complete prompt string
        """
        template = self._load_prompt_template()
        
        # Add user message to context
        context['user_message'] = user_message
        
        # Replace all placeholders
        prompt = template
        for key, value in context.items():
            placeholder = "{" + key + "}"
            prompt = prompt.replace(placeholder, str(value))
        
        return prompt
    
    def process_user_message(
        self,
        planning: ContractingPlanning,
        contractor_id: int,
        message_content: str,
        user,
        attachments: List = None,
        attachment_ids: List[int] = None
    ) -> Dict:
        """
        Process a user message and generate AI response.
        
        Args:
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            message_content: User's message content
            user: User instance
            attachments: Optional list of file attachments
            
        Returns:
            Dictionary with response data
        """
        try:
            # Build context
            context = self._build_context(planning, contractor_id, user)
            
            # Build prompt
            prompt = self._build_prompt(context, message_content)
            
            # Process attachments if present
            uploaded_files = []
            if attachments:
                for attachment in attachments:
                    try:
                        # Upload file to Gemini
                        file_content = attachment.read()
                        mime_type = attachment.content_type or 'application/octet-stream'
                        
                        # Upload file to Gemini API
                        uploaded_file = genai.upload_file(
                            path=None,
                            mime_type=mime_type,
                            name=attachment.name,
                            display_name=attachment.name
                        )
                        # For files uploaded via bytes, we need to use a different approach
                        # Create a temporary file
                        import tempfile
                        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{attachment.name}") as tmp_file:
                            tmp_file.write(file_content)
                            tmp_path = tmp_file.name
                        
                        # Upload the temporary file
                        uploaded_file = genai.upload_file(path=tmp_path, display_name=attachment.name)
                        uploaded_files.append(uploaded_file)
                        
                        # Clean up temp file
                        import os
                        os.unlink(tmp_path)
                        
                        logger.info(f"Uploaded file: {attachment.name} to Gemini")
                    except Exception as e:
                        logger.error(f"Error uploading file {attachment.name}: {str(e)}")
            
            # Create tool wrapper with all tools
            tools = genai.protos.Tool(
                function_declarations=[
                    self.SEND_EMAIL_TOOL,
                    self.FETCH_EMAIL_TOOL,
                    self.ANALYZE_OFFER_TOOL,
                    self.COMPARE_OFFERS_TOOL
                ]
            )
            
            # Configure tool usage mode
            tool_config = genai.protos.ToolConfig(
                function_calling_config=genai.protos.FunctionCallingConfig(
                    mode=genai.protos.FunctionCallingConfig.Mode.AUTO
                )
            )
            
            # Create model with function calling enabled
            model = genai.GenerativeModel(
                self.gemini_service.model_name,
                tools=[tools],
                tool_config=tool_config
            )
            
            # Prepare content for generation (text + files)
            content_parts = [prompt]
            if uploaded_files:
                content_parts.extend(uploaded_files)
                # Add instruction about files
                file_names = ', '.join([f.display_name for f in uploaded_files])
                content_parts.insert(1, f"\n\n**User has attached the following files:** {file_names}\nPlease review these files and respond accordingly.")
            
            # Generate response
            response = model.generate_content(content_parts)
            
            # Check if function call was made
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        # Function call detected - extract suggested_actions from function call args
                        function_args = convert_to_serializable(dict(part.function_call.args))
                        suggested_actions = function_args.get('suggested_actions', [])
                        
                        return self._handle_function_call(
                            part.function_call,
                            planning,
                            contractor_id,
                            attachment_ids=attachment_ids,
                            suggested_actions=suggested_actions
                        )
            
            # No function call, parse JSON response
            if response.text:
                parsed_data = self._parse_model_response(response.text)
                return self._create_normal_response(
                    parsed_data['response'],
                    planning,
                    contractor_id,
                    suggested_actions=parsed_data.get('suggested_actions', [])
                )
            else:
                # Fallback response
                return self._create_normal_response(
                    "I'm here to help with your contractor communication. How can I assist you?",
                    planning,
                    contractor_id,
                    suggested_actions=["Send introduction", "Ask about availability", "Request site visit"]
                )
        
        except Exception as e:
            logger.error(f"Error processing user message: {str(e)}", exc_info=True)
            # Return fallback response
            return self._create_normal_response(
                f"I apologize, but I encountered an error processing your message. Please try again.",
                planning,
                contractor_id,
                suggested_actions=["Try again", "Ask a question", "Send email", "Check for reply"]
            )
    
    def _handle_function_call(
        self,
        function_call,
        planning: ContractingPlanning,
        contractor_id: int,
        attachment_ids: List[int] = None,
        suggested_actions: List[str] = None
    ) -> Dict:
        """
        Handle a function call from Gemini.
        
        Args:
            function_call: FunctionCall object from Gemini
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            attachment_ids: Optional list of MessageAttachment IDs
            suggested_actions: Optional list of suggested action strings from model response
            
        Returns:
            Dictionary with action request data
        """
        function_name = function_call.name
        args = convert_to_serializable(dict(function_call.args))
        
        if function_name == 'send_email':
            return self._create_action_request(
                'send_email',
                args,
                planning,
                contractor_id,
                attachment_ids=attachment_ids,
                suggested_actions=suggested_actions
            )
        elif function_name == 'fetch_email':
            return self._create_action_request(
                'fetch_email',
                args,
                planning,
                contractor_id,
                suggested_actions=suggested_actions
            )
        elif function_name == 'analyze_offer':
            return self._create_action_request(
                'analyze_offer',
                args,
                planning,
                contractor_id,
                suggested_actions=suggested_actions
            )
        elif function_name == 'compare_offers':
            return self._create_action_request(
                'compare_offers',
                args,
                planning,
                contractor_id,
                suggested_actions=suggested_actions
            )
        elif function_name == 'query_offer_analysis':
            # This triggers the multi-step flow
            return self._handle_query_offer_analysis(
                args,
                planning,
                contractor_id,
                attachment_ids=attachment_ids
            )
        else:
            logger.warning(f"Unknown function call: {function_name}")
            return self._create_normal_response(
                "I'm here to help. What would you like to know?",
                planning,
                contractor_id,
                suggested_actions=suggested_actions or ["Ask a question", "Send email", "Check for reply"]
            )
    
    def _create_normal_response(
        self,
        content: str,
        planning: ContractingPlanning,
        contractor_id: int,
        suggested_actions: List[str] = None
    ) -> Dict:
        """
        Create a normal AI response message.
        
        Args:
            content: Response content
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            suggested_actions: Optional list of suggested action strings
            
        Returns:
            Dictionary with message data
        """
        # Use provided suggested_actions or extract from old format if present
        if suggested_actions is None:
            suggested_actions = []
            clean_content = content
            
            if '---SUGGESTIONS---' in content and '---END---' in content:
                try:
                    # Split content to extract suggestions
                    parts = content.split('---SUGGESTIONS---')
                    clean_content = parts[0].strip()
                    
                    suggestions_part = parts[1].split('---END---')[0].strip()
                    suggested_actions = [s.strip() for s in suggestions_part.split('\n') if s.strip()]
                except Exception as e:
                    logger.warning(f"Error parsing suggestions: {str(e)}")
                    # If parsing fails, keep the original content
                    clean_content = content
            else:
                clean_content = content
        else:
            clean_content = content
        
        message = Message.objects.create(
            contracting_planning=planning,
            contractor_id=contractor_id,
            sender='ai',
            message_type='ai',
            content=clean_content
        )
        
        return {
            'type': 'normal',
            'message': message,
            'suggested_actions': suggested_actions
        }
    
    def _create_action_request(
        self,
        action_type: str,
        args: Dict,
        planning: ContractingPlanning,
        contractor_id: int,
        attachment_ids: List[int] = None,
        suggested_actions: List[str] = None
    ) -> Dict:
        """
        Create an action request message.
        
        Args:
            action_type: Type of action ('send_email' or 'fetch_email')
            args: Function call arguments
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            attachment_ids: Optional list of MessageAttachment IDs to include
            suggested_actions: Optional list of suggested action strings
            
        Returns:
            Dictionary with action request data
        """
        reasoning = args.get('reasoning', '')
        action_summary = args.get('action_summary', '')
        
        # Get contractor info
        contractor = Contractor.objects.filter(id=contractor_id).first()
        contractor_name = contractor.name if contractor else "the contractor"
        
        # Default suggested actions based on action type
        default_suggestions = {
            'send_email': ["Check their reply", "Modify the draft", "Ask about pricing", "Discuss project scope"],
            'fetch_email': ["Reply to them", "Ask follow-up", "Analyze their offer", "Schedule a call"],
            'analyze_offer': ["Compare all offers", "Ask about pricing", "Negotiate price", "Schedule meeting"],
            'compare_offers': ["Analyze top offer", "Ask about differences", "Negotiate price", "Schedule meetings"]
        }
        
        # Use provided suggestions or defaults
        if suggested_actions is None or not suggested_actions:
            suggested_actions = default_suggestions.get(action_type, ["Continue conversation", "Ask a question"])
        
        # Create action data and message content based on action type
        if action_type == 'send_email':
            subject = args.get('subject', '')
            body_html = args.get('body_html', '')
            
            message_content = f"I've drafted an email for {contractor_name}. Please review it below and let me know if you'd like me to send it or make any changes! 📧"
            
            action_data = {
                'subject': subject,
                'body_html': body_html,
                'recipient_email': self._get_contractor_email(contractor_id),
                'reasoning': reasoning
            }
            
            # Add attachment IDs if present
            if attachment_ids:
                action_data['attachment_ids'] = attachment_ids
        
        elif action_type == 'fetch_email':
            max_emails = args.get('max_emails', 5)
            # Ensure max_emails is within bounds
            max_emails = min(max(1, int(max_emails)), 10)
            
            message_content = f"I'll fetch the last {max_emails} email(s) from {contractor_name} to review their communication. 📬"
            
            action_data = {
                'max_emails': max_emails,
                'contractor_email': self._get_contractor_email(contractor_id),
                'reasoning': reasoning
            }
        
        elif action_type == 'analyze_offer':
            offer_id = args.get('offer_id')
            contractor_name_from_args = args.get('contractor_name', contractor_name)
            offer_title = args.get('offer_title', 'offer')
            
            message_content = f"I can analyze the {offer_title} from {contractor_name_from_args} to provide detailed insights about pricing, timeline, quality, and recommendations. 📊"
            
            action_data = {
                'offer_id': offer_id,
                'reasoning': reasoning
            }
        
        elif action_type == 'compare_offers':
            primary_offer_id = args.get('primary_offer_id')
            primary_offer_title = args.get('primary_offer_title', 'offer')
            compare_with_ids = args.get('compare_with_ids')
            compare_with_titles = args.get('compare_with_titles', [])
            
            # Determine how many offers will be compared
            if compare_with_ids:
                offer_count = len(compare_with_ids) + 1
                if compare_with_titles and len(compare_with_titles) > 0:
                    titles_text = ", ".join(compare_with_titles)
                    message_content = f"I can compare the {primary_offer_title} with {titles_text} to help you choose the best contractor. 📈"
                else:
                    message_content = f"I can compare {offer_count} offers side-by-side to help you choose the best contractor. 📈"
            else:
                message_content = f"I can compare the {primary_offer_title} with all other offers you've received to help you make the best decision. 📈"
            
            action_data = {
                'primary_offer_id': primary_offer_id,
                'compare_with_ids': compare_with_ids,
                'reasoning': reasoning
            }
        
        else:
            raise ValueError(f"Unknown action type: {action_type}")
        
        # Create message
        message = Message.objects.create(
            contracting_planning=planning,
            contractor_id=contractor_id,
            sender='ai',
            message_type='ai_action_request',
            content=message_content
        )
        
        # Convert action_data to JSON-serializable format
        action_data = convert_to_serializable(action_data)
        
        # Create MessageAction
        action = MessageAction.objects.create(
            message=message,
            action_type=action_type,
            action_status='pending',
            action_data=action_data,
            action_summary=action_summary
        )
        
        return {
            'type': 'action_request',
            'message': message,
            'action': action,
            'suggested_actions': suggested_actions
        }
    
    def _get_contractor_email(self, contractor_id: int) -> str:
        """Get contractor email address."""
        contractor = Contractor.objects.filter(id=contractor_id).first()
        return contractor.email if contractor else ""
    
    def execute_action(
        self,
        action_id: int,
        user,
        modifications: Optional[str] = None,
        modified_email_html: Optional[str] = None
    ) -> Dict:
        """
        Execute a pending action.
        
        Args:
            action_id: ID of the MessageAction
            user: User instance
            modifications: Optional modification instructions from user
            modified_email_html: Optional directly modified email HTML
            
        Returns:
            Dictionary with execution result
        """
        try:
            # Get the action
            action = MessageAction.objects.select_related('message').get(id=action_id)
            
            # Verify action can be executed (pending or failed - allow retry)
            if action.action_status not in ['pending', 'failed']:
                raise ValueError(f"Action cannot be executed (status: {action.action_status}). Only pending or failed actions can be executed.")
            
            # Verify user owns this action
            message = action.message
            planning = message.contracting_planning
            if planning.project.user != user:
                raise ValueError("User does not have permission to execute this action")
            
            # Reset status to pending if it was failed (for retry)
            if action.action_status == 'failed':
                action.action_status = 'pending'
                action.execution_result = None
                action.save()
                logger.info(f"Retrying failed action {action_id}")
            
            # Handle modifications if provided
            if modifications or modified_email_html:
                action = self._apply_modifications(
                    action,
                    modifications,
                    modified_email_html,
                    user
                )
            
            # Execute the action based on type
            if action.action_type == 'send_email':
                result = self._execute_send_email(action, user)
            elif action.action_type == 'fetch_email':
                result = self._execute_fetch_email(action, user)
            elif action.action_type == 'analyze_offer':
                result = self._execute_analyze_offer(action, user)
            elif action.action_type == 'compare_offers':
                result = self._execute_compare_offers(action, user)
            else:
                raise ValueError(f"Unknown action type: {action.action_type}")
            
            # Update action status
            action.action_status = 'executed'
            action.execution_result = convert_to_serializable(result)
            action.save()
            
            # Update message type
            message.message_type = 'ai_action_executed'
            message.content = f"✓ {action.action_summary}"
            message.save()
            
            # Create confirmation message based on action type with suggested actions
            suggested_actions = []
            
            if action.action_type == 'send_email':
                confirmation_content = f"Email successfully sent to {action.action_data.get('recipient_email', 'contractor')}."
                detected_offer = None
                suggested_actions = ["Check for reply", "Send follow-up", "Ask about timeline", "Review project"]
            elif action.action_type == 'fetch_email':
                emails_fetched = result.get('emails_count', 0)
                total_fetched = result.get('total_fetched', 0)
                filtered_count = result.get('filtered_count', 0)
                
                if emails_fetched > 0:
                    # Analyze the fetched emails and provide a summary (also detects offers)
                    email_summary, detected_offer = self._analyze_fetched_emails(
                        result.get('emails', []),
                        planning,
                        message.contractor_id,
                        user
                    )
                    confirmation_content = email_summary
                    # Prioritize offer-related actions if an offer was detected
                    if detected_offer:
                        suggested_actions = ["Analyze this offer", "Compare all offers", "Ask about pricing", "Negotiate terms"]
                    else:
                        suggested_actions = ["Reply to them", "Ask follow-up", "Analyze their offer", "Schedule a call"]
                elif filtered_count > 0:
                    # All emails were previously fetched
                    confirmation_content = f"I checked for new emails and found {total_fetched} email(s) from this contractor, but I've already read all of them. There are no new messages since the last time I checked."
                    detected_offer = None
                    suggested_actions = ["Send a message", "Ask about progress", "Request update", "Check back later"]
                else:
                    # No emails found at all
                    confirmation_content = "I couldn't find any recent emails from this contractor in your inbox. They may not have sent anything yet, or the emails might be in a different folder."
                    detected_offer = None
                    suggested_actions = ["Send introduction", "Ask about availability", "Request quote", "Check again later"]
            elif action.action_type == 'analyze_offer':
                confirmation_content = "I've generated a detailed analysis of this offer! 📊 Check it out to understand the strengths, weaknesses, and key considerations."
                detected_offer = None
                suggested_actions = ["Compare all offers", "Negotiate price", "Ask about timeline", "Schedule meeting"]
            elif action.action_type == 'compare_offers':
                offer_count = len(result.get('compared_offer_ids', [])) + 1
                confirmation_content = f"I've compared {offer_count} offers side-by-side! 📈 The comparison includes pricing, timelines, quality, and recommendations."
                detected_offer = None
                suggested_actions = ["Analyze top offer", "Negotiate with winner", "Ask about differences", "Schedule meetings"]
            else:
                confirmation_content = "Action completed successfully."
                detected_offer = None
                suggested_actions = ["Continue conversation", "Ask a question"]


            
            confirmation_message = Message.objects.create(
                contracting_planning=planning,
                contractor_id=message.contractor_id,
                sender='ai',
                message_type='ai',
                content=confirmation_content
            )

            # If an offer was detected, create an analyze_offer action
            offer_analysis_action = None
            if action.action_type == 'fetch_email' and 'detected_offer' in locals() and detected_offer:
                try:
                    # Get contractor information for better message
                    contractor = Contractor.objects.filter(id=message.contractor_id).first()
                    contractor_name = contractor.name if contractor else 'the contractor'
                    
                    # Build informative message with key offer details
                    price_str = f"€{detected_offer.total_price:,.0f}" if detected_offer.total_price else "pricing details"
                    timeline_str = f"{detected_offer.timeline_duration_days} days" if detected_offer.timeline_duration_days else "timeline information"
                    
                    # Create action request message for offer analysis
                    offer_action_message = Message.objects.create(
                        contracting_planning=planning,
                        contractor_id=message.contractor_id,
                        sender='ai',
                        message_type='ai_action_request',
                        content=f"📄 Great news! I've found an offer from {contractor_name}. Would you like me to analyze this offer in detail?"
                    )
                    
                    # Create the analyze_offer action
                    offer_analysis_action = MessageAction.objects.create(
                        message=offer_action_message,
                        action_type='analyze_offer',
                        action_status='pending',
                        action_data=convert_to_serializable({
                            'offer_id': detected_offer.id,
                            'reasoning': 'Detected an offer in the fetched emails'
                        }),
                        action_summary=f"Analyze offer from {contractor_name}"
                    )
                    logger.info(f"Created analyze_offer action {offer_analysis_action.id} for offer {detected_offer.id}")
                except Exception as e:
                    logger.error(f"Error creating offer analysis action: {str(e)}", exc_info=True)
            
            result_dict = {
                'success': True,
                'action': action,
                'confirmation_message': confirmation_message,
                'result': result,
                'suggested_actions': suggested_actions
            }
            
            # Add offer analysis action if created
            if 'offer_analysis_action' in locals() and offer_analysis_action:
                result_dict['offer_analysis_action'] = offer_analysis_action
            
            return result_dict
        
        except Exception as e:
            logger.error(f"Error executing action: {str(e)}", exc_info=True)
            
            # Update action status to failed
            if 'action' in locals():
                action.action_status = 'failed'
                action.execution_result = convert_to_serializable({'error': str(e)})
                action.save()
            
            return {
                'success': False,
                'error': str(e)
            }
    
    def _apply_modifications(
        self,
        action: MessageAction,
        modifications: Optional[str],
        modified_email_html: Optional[str],
        user
    ) -> MessageAction:
        """
        Apply user modifications to the action.
        
        Args:
            action: MessageAction instance
            modifications: Modification instructions
            modified_email_html: Direct HTML modifications
            user: User instance
            
        Returns:
            Updated MessageAction instance
        """
        if modified_email_html:
            # User directly edited the HTML
            action.action_data['body_html'] = modified_email_html
            action.action_data = convert_to_serializable(action.action_data)
            action.save()
        elif modifications:
            # User provided modification instructions - re-prompt Gemini
            current_email_html = action.action_data.get('body_html', '')
            planning = action.message.contracting_planning
            contractor_id = action.message.contractor_id
            
            # Build context for modification
            context = self._build_context(planning, contractor_id, user)
            
            # Load email modification prompt template
            prompt_path = os.path.join(
                settings.BASE_DIR,
                'core',
                'services',
                'gemini_service',
                'prompts',
                'contracting',
                'email_modification_prompt.md'
            )
            
            with open(prompt_path, 'r', encoding='utf-8') as f:
                template = f.read()
            
            # Build modification prompt
            prompt = template.replace('{project_name}', context['project_name'])
            prompt = prompt.replace('{project_type}', context['project_type'])
            prompt = prompt.replace('{project_location}', context['project_location'])
            prompt = prompt.replace('{current_email_html}', current_email_html)
            prompt = prompt.replace('{user_prompt}', modifications)
            
            # Call Gemini for modification
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(prompt)
            
            if response.text:
                try:
                    # Parse JSON response
                    response_text = response.text.strip()
                    # Remove markdown code blocks if present
                    if response_text.startswith('```'):
                        lines = response_text.split('\n')
                        response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
                    
                    result = json.loads(response_text)
                    action.action_data['body_html'] = result.get('email_html', current_email_html)
                    action.action_data = convert_to_serializable(action.action_data)
                    action.save()
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse Gemini modification response: {response.text}")
        
        return action
    
    def _execute_send_email(self, action: MessageAction, user) -> Dict:
        """
        Execute send email action.
        
        Args:
            action: MessageAction instance
            user: User instance
            
        Returns:
            Execution result dictionary
        """
        from core.models import MessageAttachment
        
        # Get user's email credentials
        email_cred = EmailCredential.objects.filter(user=user).first()
        
        if not email_cred or not email_cred.access_token:
            raise ValueError("User does not have email credentials configured. Please connect your Gmail account first.")
        
        # Check if token needs refresh
        if email_cred.token_expiry and timezone.now() >= email_cred.token_expiry:
            if not email_cred.refresh_token:
                raise ValueError("Gmail credentials have expired and cannot be refreshed. Please reconnect your Gmail account.")
            
            try:
                # Refresh the access token
                refreshed = GmailService.refresh_access_token(email_cred.refresh_token)
                email_cred.access_token = refreshed['access_token']
                email_cred.token_expiry = refreshed['token_expiry']
                email_cred.save()
                logger.info(f"Successfully refreshed access token for user {user.id}")
            except Exception as e:
                logger.error(f"Failed to refresh access token: {str(e)}", exc_info=True)
                raise ValueError("Failed to refresh Gmail credentials. Please reconnect your Gmail account.")
        
        # Get email data
        subject = action.action_data.get('subject', '')
        body_html = action.action_data.get('body_html', '')
        recipient_email = action.action_data.get('recipient_email', '')
        attachment_ids = action.action_data.get('attachment_ids', [])
        
        if not recipient_email:
            raise ValueError("Recipient email not found")
        
        # Prepare attachments if any
        attachments = []
        if attachment_ids:
            for att_id in attachment_ids:
                try:
                    msg_attachment = MessageAttachment.objects.get(id=att_id)
                    # Read file content
                    msg_attachment.file.open('rb')
                    file_content = msg_attachment.file.read()
                    msg_attachment.file.close()
                    
                    attachments.append({
                        'filename': msg_attachment.filename,
                        'content': file_content,
                        'content_type': msg_attachment.content_type
                    })
                    logger.info(f"Added attachment: {msg_attachment.filename}")
                except MessageAttachment.DoesNotExist:
                    logger.warning(f"MessageAttachment {att_id} not found, skipping")
                except Exception as e:
                    logger.error(f"Error reading attachment {att_id}: {str(e)}")
        
        # Send email via Gmail API
        result = GmailService.send_email(
            access_token=email_cred.access_token,
            to=recipient_email,
            subject=subject,
            body=body_html,  # Plain text fallback
            html_body=body_html,
            attachments=attachments if attachments else None
        )
        
        return {
            'message_id': result.get('message_id'),
            'thread_id': result.get('thread_id'),
            'recipient': recipient_email,
            'subject': subject,
            'attachments_count': len(attachments)
        }
    
    def _analyze_fetched_emails(
        self,
        emails: List[Dict],
        planning: ContractingPlanning,
        contractor_id: int,
        user
    ) -> Tuple[str, Optional[ContractorOffer]]:
        """
        Analyze fetched emails using Gemini and provide a helpful summary.
        Also detects if emails contain an offer and extracts it.
        
        Args:
            emails: List of fetched email dictionaries
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            user: User instance
            
        Returns:
            Tuple of (AI-generated summary, detected Offer or None)
        """
        if not emails:
            return "No emails found from this contractor.", None
        
        # NEW: Detect and extract offer
        detected_offer = None
        try:
            # Get user's email credentials for downloading attachments
            email_cred = EmailCredential.objects.filter(user=user).first()
            if email_cred and email_cred.access_token:
                # Detect offer using offer service
                extracted_data = self.offer_service.detect_and_extract_offer(
                    emails=emails,
                    contractor_id=contractor_id,
                    access_token=email_cred.access_token
                )
                
                # If offer detected and not already analyzed
                if extracted_data:
                    gmail_message_id = extracted_data.get('gmail_message_id')
                    if not self.offer_service.offer_already_analyzed(gmail_message_id):
                        # Store the offer
                        detected_offer = self.offer_service.store_offer(
                            extracted_data=extracted_data,
                            planning=planning
                        )
                        logger.info(f"Detected and stored new offer {detected_offer.id} from contractor {contractor_id}")
        except Exception as e:
            logger.error(f"Error detecting offer: {str(e)}", exc_info=True)
            # Continue with normal email analysis even if offer detection fails
        
        # Build context for analysis
        context = self._build_context(planning, contractor_id, user)
        
        # Build offer detection context if offer was found
        offer_context = ""
        if detected_offer:
            offer_context = f"""

**IMPORTANT: Offer Detected!**
- Acknowledge clearly that an offer has been received from the contractor
- State that the offer has already been processed by the system
- Ask the user if they want the offer analyzed
- Use a professional, calm, non-chatty tone
- Do NOT use greetings like “Hey there”
- Do NOT use emojis
- Do NOT mention opening emails or attachments
- Keep the message concise and decision-focused
"""
        
        # Format emails for the prompt (emails are already sorted by date, most recent first)
        emails_text = ""
        for i, email in enumerate(emails, 1):
            received_at = email.get('received_at', 'Unknown date')
            subject = email.get('subject', 'No subject')
            body = email.get('body', 'No content')
            
            # Truncate very long emails
            if len(body) > 2000:
                body = body[:2000] + "... [email continues]"
            
            # Mark the first email as most recent
            label = f"Email {i}" + (" (MOST RECENT)" if i == 1 else f" (older)")
            emails_text += f"\n\n--- {label} ---\n"
            emails_text += f"Date: {received_at}\n"
            emails_text += f"Subject: {subject}\n"
            emails_text += f"Content:\n{body}\n"
        
        # Create analysis prompt
        prompt = f"""You are analyzing emails from a contractor for a renovation project.

**Project Context:**
- Project: {context['project_name']} ({context['project_type']})
- Location: {context['project_location']}
- Contractor: {context['contractor_name']}

**User's Recent Conversation:**
{context['conversation_history'][-500:] if len(context['conversation_history']) > 500 else context['conversation_history']}

**Fetched Emails from Contractor (sorted by date, most recent first):**
{emails_text}
{offer_context}
**Your Task:**
Analyze these emails and provide a helpful, conversational summary for the user. Focus on:
1. Key information or responses from the contractor (especially from the most recent email)
2. Any questions they're asking
3. Important dates, availability, or timeline mentions
4. Any concerns or issues raised
5. Next steps or action items

**CRITICAL Style Guidelines:**
- Write in a natural, flowing conversational style like you're talking to a friend
- DO NOT use markdown formatting (no asterisks, no bold, no bullet points)
- DO NOT use lists or bullet points - write in complete sentences and paragraphs
- Be warm and friendly (use 1-2 emojis max, placed naturally in the text)
- Focus primarily on the MOST RECENT email, mentioning key points naturally
- If there are multiple points, connect them with words like "They also mentioned..." or "Additionally..."
- Keep it conversational and easy to read (2-4 short paragraphs maximum)
- End with a helpful suggestion for next steps if appropriate

Provide your summary now:"""
        
        try:
            model = genai.GenerativeModel(self.gemini_service.model_name)
            response = model.generate_content(prompt)
            
            email_summary = ""
            if response.text:
                email_summary = response.text.strip()
            else:
                email_summary = f"I found {len(emails)} email(s) from the contractor, but I couldn't generate a summary. Please review them directly."
            
            # # If offer was detected, append offer notification to summary
            # if detected_offer:
            #     contractor_name = context.get('contractor_name', 'the contractor')
            #     price_text = f"€{detected_offer.total_price:,.0f}" if detected_offer.total_price else "pricing details"
            #     timeline_text = f"{detected_offer.timeline_duration_days} days" if detected_offer.timeline_duration_days else "timeline information"
            #
            #     offer_notification = f"\n\n📄 Great news! I detected an offer from {contractor_name} with {price_text} and {timeline_text}. Would you like me to analyze this offer for you?"
            #     email_summary += offer_notification
            
            return email_summary, detected_offer
        
        except Exception as e:
            logger.error(f"Error analyzing emails: {str(e)}", exc_info=True)
            # Fallback to simple summary
            summary = f"I found {len(emails)} email(s) from {context['contractor_name']}. The most recent one was about: {emails[0].get('subject', 'No subject')}"
            return summary, detected_offer
    
    def _execute_fetch_email(self, action: MessageAction, user) -> Dict:
        """
        Execute fetch email action.
        
        Args:
            action: MessageAction instance
            user: User instance
            
        Returns:
            Execution result dictionary with fetched emails
        """
        # Get user's email credentials
        email_cred = EmailCredential.objects.filter(user=user).first()
        
        if not email_cred or not email_cred.access_token:
            raise ValueError("User does not have email credentials configured. Please connect your Gmail account first.")
        
        # Check if token needs refresh
        if email_cred.token_expiry and timezone.now() >= email_cred.token_expiry:
            if not email_cred.refresh_token:
                raise ValueError("Gmail credentials have expired and cannot be refreshed. Please reconnect your Gmail account.")
            
            try:
                # Refresh the access token
                refreshed = GmailService.refresh_access_token(email_cred.refresh_token)
                email_cred.access_token = refreshed['access_token']
                email_cred.token_expiry = refreshed['token_expiry']
                email_cred.save()
                logger.info(f"Successfully refreshed access token for user {user.id}")
            except Exception as e:
                logger.error(f"Failed to refresh access token: {str(e)}", exc_info=True)
                raise ValueError("Failed to refresh Gmail credentials. Please reconnect your Gmail account.")
        
        # Get fetch parameters
        max_emails = action.action_data.get('max_emails', 5)
        contractor_email = action.action_data.get('contractor_email', '')
        
        if not contractor_email:
            raise ValueError("Contractor email not found")
        
        # Get planning and contractor_id from the action's message
        planning = action.message.contracting_planning
        contractor_id = action.message.contractor_id
        
        # Collect previously fetched email message IDs to avoid re-processing
        previously_fetched_ids = set()
        previous_fetch_actions = MessageAction.objects.filter(
            message__contracting_planning=planning,
            message__contractor_id=contractor_id,
            action_type='fetch_email',
            action_status='executed'
        ).order_by('-created_at')
        
        for prev_action in previous_fetch_actions:
            if prev_action.execution_result and 'emails' in prev_action.execution_result:
                for email in prev_action.execution_result['emails']:
                    if 'message_id' in email:
                        previously_fetched_ids.add(email['message_id'])
        
        logger.info(f"Found {len(previously_fetched_ids)} previously fetched emails for contractor {contractor_id}")
        
        # Search for emails from the contractor
        message_list = GmailService.search_messages(
            access_token=email_cred.access_token,
            from_email=contractor_email,
            max_results=max_emails
        )
        
        # Fetch full details for each email
        fetched_emails = []
        for msg in message_list:
            try:
                details = GmailService.get_message_details(
                    access_token=email_cred.access_token,
                    message_id=msg['id']
                )
                fetched_emails.append({
                    'message_id': details['message_id'],
                    'thread_id': details['thread_id'],
                    'from': details['from'],
                    'subject': details['subject'],
                    'body': details['body'],
                    'received_at': details['received_at'].isoformat() if details['received_at'] else None,
                    'received_at_datetime': details['received_at'],  # Keep datetime object for sorting
                    'attachments': details.get('attachments', []),  # Include attachments for offer detection
                })
            except Exception as e:
                logger.warning(f"Failed to fetch details for message {msg['id']}: {str(e)}")
                continue
        
        # Sort emails by received date (most recent first)
        fetched_emails.sort(
            key=lambda x: x['received_at_datetime'] if x['received_at_datetime'] else datetime.min.replace(tzinfo=timezone.utc),
            reverse=True
        )
        
        # Filter out previously fetched emails
        total_fetched = len(fetched_emails)
        new_emails = [e for e in fetched_emails if e['message_id'] not in previously_fetched_ids]
        filtered_count = total_fetched - len(new_emails)
        
        if filtered_count > 0:
            logger.info(f"Filtered out {filtered_count} previously fetched emails, {len(new_emails)} new emails remain")
        
        # Remove the temporary datetime field before returning
        for email in new_emails:
            email.pop('received_at_datetime', None)
        
        return {
            'emails_count': len(new_emails),
            'total_fetched': total_fetched,
            'filtered_count': filtered_count,
            'contractor_email': contractor_email,
            'emails': new_emails
        }
    
    def _execute_analyze_offer(self, action: MessageAction, user) -> Dict:
        """
        Execute analyze offer action.
        
        Args:
            action: MessageAction instance
            user: User instance
            
        Returns:
            Execution result dictionary with analysis
        """
        try:
            offer_id = action.action_data.get('offer_id')
            if not offer_id:
                raise ValueError("Offer ID not found in action data")
            
            # Get the offer
            offer = ContractorOffer.objects.select_related('contracting_planning').get(id=offer_id)
            
            # Verify user owns this offer
            if offer.contracting_planning.project.user != user:
                raise ValueError("User does not have permission to analyze this offer")
            
            # GUARDRAIL: Verify the offer is from the CURRENT contractor in this conversation
            current_contractor_id = action.message.contractor_id
            if offer.contractor_id != current_contractor_id:
                current_contractor = Contractor.objects.filter(id=current_contractor_id).first()
                offer_contractor = Contractor.objects.filter(id=offer.contractor_id).first()
                current_name = current_contractor.name if current_contractor else "this contractor"
                offer_name = offer_contractor.name if offer_contractor else "another contractor"
                raise ValueError(
                    f"You are in {current_name}'s conversation and can only analyze their offer. "
                    f"The offer you're trying to analyze is from {offer_name}. "
                    f"Please switch to {offer_name}'s chat to analyze their offer."
                )
            
            # Get conversation history for context (last 30 messages)
            messages = Message.objects.filter(
                contracting_planning=offer.contracting_planning,
                contractor_id=current_contractor_id
            ).order_by('-timestamp')[:30]
            
            # Reverse to chronological order
            messages = list(reversed(messages))
            
            # Format conversation history for analysis
            conversation_context = self._format_conversation_for_analysis(messages)
            
            # Generate analysis with conversation context
            analysis = self.offer_service.analyze_single_offer(
                offer=offer,
                planning=offer.contracting_planning,
                conversation_history=conversation_context
            )
            
            return {
                'offer_id': offer.id,
                'analysis_id': analysis.id,
                'analysis_report': analysis.analysis_report,
                'analysis_data': analysis.analysis_data,
                'analysis_type': 'single'
            }
        
        except Exception as e:
            logger.error(f"Error executing analyze_offer action: {str(e)}", exc_info=True)
            raise
    
    def _execute_compare_offers(self, action: MessageAction, user) -> Dict:
        """
        Execute compare offers action.
        
        Args:
            action: MessageAction instance
            user: User instance
            
        Returns:
            Execution result dictionary with comparison
        """
        try:
            primary_offer_id = action.action_data.get('primary_offer_id')
            compare_with_ids = action.action_data.get('compare_with_ids')  # Optional
            
            if not primary_offer_id:
                raise ValueError("Primary offer ID not found in action data")
            
            # Get the primary offer
            primary_offer = ContractorOffer.objects.select_related('contracting_planning').get(id=primary_offer_id)
            
            # Verify user owns this offer
            if primary_offer.contracting_planning.project.user != user:
                raise ValueError("User does not have permission to compare this offer")
            
            # GUARDRAIL: Verify primary offer is the most recent from its contractor
            most_recent_primary = ContractorOffer.objects.filter(
                contracting_planning=primary_offer.contracting_planning,
                contractor_id=primary_offer.contractor_id
            ).order_by('-email_received_at', '-created_at').first()
            
            if most_recent_primary and most_recent_primary.id != primary_offer.id:
                contractor = Contractor.objects.filter(id=primary_offer.contractor_id).first()
                contractor_name = contractor.name if contractor else "this contractor"
                raise ValueError(
                    f"The primary offer is not the most recent one from {contractor_name}. "
                    f"Only the most recent offer from each contractor can be compared."
                )
            
            # Get comparison offers if specified
            comparison_offers = None
            if compare_with_ids:
                comparison_offers = list(ContractorOffer.objects.filter(id__in=compare_with_ids))
                
                # GUARDRAIL: Verify each comparison offer is the most recent from its contractor
                for comp_offer in comparison_offers:
                    most_recent_comp = ContractorOffer.objects.filter(
                        contracting_planning=comp_offer.contracting_planning,
                        contractor_id=comp_offer.contractor_id
                    ).order_by('-email_received_at', '-created_at').first()
                    
                    if most_recent_comp and most_recent_comp.id != comp_offer.id:
                        contractor = Contractor.objects.filter(id=comp_offer.contractor_id).first()
                        contractor_name = contractor.name if contractor else "a contractor"
                        raise ValueError(
                            f"One of the comparison offers from {contractor_name} is not their most recent offer. "
                            f"Only the most recent offer from each contractor can be compared."
                        )
            
            # Generate comparison
            comparison = self.offer_service.compare_offers(
                primary_offer=primary_offer,
                comparison_offers=comparison_offers
            )
            
            return {
                'primary_offer_id': primary_offer.id,
                'compared_offer_ids': comparison.compared_offer_ids,
                'comparison_id': comparison.id,
                'analysis_id': comparison.id,  # For consistency with analyze_offer
                'comparison_report': comparison.analysis_report,
                'comparison_data': comparison.analysis_data,
                'analysis_type': 'comparison'
            }
        
        except Exception as e:
            logger.error(f"Error executing compare_offers action: {str(e)}", exc_info=True)
            raise
    
    def reject_action(self, action_id: int, user) -> Dict:
        """
        Reject a pending action.
        
        Args:
            action_id: ID of the MessageAction
            user: User instance
            
        Returns:
            Dictionary with rejection result
        """
        try:
            # Get the action
            action = MessageAction.objects.select_related('message').get(id=action_id)
            
            # Verify action is pending
            if action.action_status != 'pending':
                raise ValueError(f"Action is not pending (status: {action.action_status})")
            
            # Verify user owns this action
            message = action.message
            planning = message.contracting_planning
            if planning.project.user != user:
                raise ValueError("User does not have permission to reject this action")
            
            # Update action status
            action.action_status = 'rejected'
            action.save()
            
            # Update message to indicate rejection
            message.content = f"[Rejected] {action.action_summary}"
            message.save()
            
            return {
                'success': True,
                'action': action
            }
        
        except Exception as e:
            logger.error(f"Error rejecting action: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def _handle_query_offer_analysis(
        self,
        args: Dict,
        planning: ContractingPlanning,
        contractor_id: int,
        attachment_ids: List[int] = None
    ) -> Dict:
        """
        Handle query_offer_analysis function call - this triggers a multi-step flow.
        
        Step 1: Query the recent analysis
        Step 2: Make a second Gemini call with the analysis context to generate response
        
        Args:
            args: Function call arguments
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            attachment_ids: Optional list of MessageAttachment IDs
            
        Returns:
            Dictionary with response (usually an action request)
        """
        try:
            analysis_type = args.get('analysis_type', 'single')
            reasoning = args.get('reasoning', '')
            action_summary = args.get('action_summary', '')
            
            # Step 1: Query recent analysis
            logger.info(f"Querying {analysis_type} analysis for contractor {contractor_id}")

            # Fetch the most recent analysis for this contractor
            analysis = self.offer_service.get_recent_analysis_for_contractor(
                contractor_id=contractor_id,
                planning=planning,
                analysis_type=analysis_type
            )
            
            if not analysis:
                # No analysis found - inform user
                logger.warning(f"No {analysis_type} analysis found for contractor {contractor_id}")
                
                return {
                    'type': 'normal',
                }

            
            # Step 2: Process with analysis context
            # Get the original user message from the most recent user message
            recent_user_message = Message.objects.filter(
                contracting_planning=planning,
                contractor_id=contractor_id,
                sender='user'
            ).order_by('-timestamp').first()
            
            user_message_content = recent_user_message.content if recent_user_message else "Please help me with this contractor."
            
            # Process with analysis context
            return self._process_with_analysis_context(
                user_message_content,
                analysis,
                planning,
                contractor_id,
                attachment_ids=attachment_ids
            )
            
        except Exception as e:
            logger.error(f"Error handling query_offer_analysis: {str(e)}", exc_info=True)
            return self._create_normal_response(
                f"I encountered an error retrieving the analysis: {str(e)}",
                planning,
                contractor_id,
                suggested_actions=["Try again", "Ask a question", "Analyze offer", "Compare offers"]
            )
    
    def _process_with_analysis_context(
        self,
        user_message: str,
        analysis: 'OfferAnalysis',
        planning: ContractingPlanning,
        contractor_id: int,
        attachment_ids: List[int] = None
    ) -> Dict:
        """
        Process user message with analysis context - makes second Gemini call.
        
        Args:
            user_message: Original user message
            analysis: OfferAnalysis instance with the report
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            attachment_ids: Optional list of MessageAttachment IDs
            
        Returns:
            Dictionary with response (usually an action request for email)
        """
        try:
            # Build context with analysis
            context = self._build_context(planning, contractor_id, planning.project.user)
            
            # Add analysis data to context
            analysis_summary = f"""
**Analysis Report Available:**
Type: {analysis.analysis_type}
Generated: {analysis.created_at.strftime('%Y-%m-%d %H:%M')}

**Structured Analysis Data:**
```json
{json.dumps(analysis.analysis_data.get('structured_data', {}), indent=2)}
```

**Full Analysis Report:**
{analysis.analysis_report}
"""
            
            # Load prompt template for analysis-based communication
            try:
                prompt_template = self._load_prompt_template_by_name('email_draft_with_analysis_prompt.md')
            except FileNotFoundError:
                # Fallback to regular prompt if template doesn't exist yet
                prompt_template = self._load_prompt_template()
            
            # Build enhanced prompt
            context['analysis_summary'] = analysis_summary
            context['user_message'] = user_message
            
            # Replace placeholders
            prompt = prompt_template
            for key, value in context.items():
                placeholder = "{" + key + "}"
                prompt = prompt.replace(placeholder, str(value))
            
            # Create tool wrapper (all tools available)
            tools = genai.protos.Tool(
                function_declarations=[
                    self.SEND_EMAIL_TOOL,
                    self.FETCH_EMAIL_TOOL,
                    self.ANALYZE_OFFER_TOOL,
                    self.COMPARE_OFFERS_TOOL
                    # Note: NOT including QUERY_OFFER_ANALYSIS_TOOL to avoid recursion
                ]
            )
            
            # Configure tool usage mode
            tool_config = genai.protos.ToolConfig(
                function_calling_config=genai.protos.FunctionCallingConfig(
                    mode=genai.protos.FunctionCallingConfig.Mode.AUTO
                )
            )
            
            # Create model
            model = genai.GenerativeModel(
                self.gemini_service.model_name,
                tools=[tools],
                tool_config=tool_config
            )
            
            # Generate response
            response = model.generate_content(prompt)
            
            # Check if function call was made
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        # Function call detected - extract suggested_actions from function call args
                        function_args = convert_to_serializable(dict(part.function_call.args))
                        suggested_actions = function_args.get('suggested_actions', [])
                        
                        return self._handle_function_call(
                            part.function_call,
                            planning,
                            contractor_id,
                            attachment_ids=attachment_ids,
                            suggested_actions=suggested_actions
                        )
            
            # No function call, parse JSON response
            if response.text:
                parsed_data = self._parse_model_response(response.text)
                return self._create_normal_response(
                    parsed_data['response'],
                    planning,
                    contractor_id,
                    suggested_actions=parsed_data.get('suggested_actions', [])
                )
            else:
                return self._create_normal_response(
                    "I've reviewed the analysis. How can I help you with this contractor?",
                    planning,
                    contractor_id,
                    suggested_actions=["Ask about pricing", "Negotiate terms", "Schedule meeting", "Compare offers"]
                )
            
        except Exception as e:
            logger.error(f"Error processing with analysis context: {str(e)}", exc_info=True)
            return self._create_normal_response(
                f"I encountered an error processing the analysis: {str(e)}",
                planning,
                contractor_id,
                suggested_actions=["Try again", "Ask a question", "Analyze offer", "Compare offers"]
            )
    
    def post_system_email_notification(
        self,
        planning: ContractingPlanning,
        contractor_id: int,
        email_data: Dict,
        detected_offer: Optional[ContractorOffer] = None,
        user = None
    ) -> Message:
        """
        Post a system-generated notification message about a new contractor email.
        This is called by the background email monitoring task.
        
        Args:
            planning: ContractingPlanning instance
            contractor_id: ID of the contractor
            email_data: Dictionary with email details (subject, body, etc.)
            detected_offer: Optional ContractorOffer if an offer was detected
            user: User instance
            
        Returns:
            Created Message instance
        """
        from core.services.contracting_service.system_message_generator import SystemMessageGenerator
        
        try:
            # Get contractor info
            contractor = Contractor.objects.filter(id=contractor_id).first()
            if not contractor:
                raise ValueError(f"Contractor {contractor_id} not found")
            
            # Generate natural language notification
            message_generator = SystemMessageGenerator()
            notification_data = message_generator.generate_email_notification(
                email_data=email_data,
                contractor=contractor,
                detected_offer=detected_offer
            )
            
            message_content = notification_data.get('message', f"I've received a new email from {contractor.name}.")

            # Create system message in the chat timeline
            message = Message.objects.create(
                contracting_planning=planning,
                contractor_id=contractor_id,
                sender='ai',
                message_type='ai',
                content=message_content
            )

            logger.info(f"Posted system email notification for contractor {contractor_id}: {message.id}")
            
            # If an offer was detected, optionally create a pending analyze_offer action
            if detected_offer:
                try:
                    # Build informative message with key offer details
                    price_str = f"€{detected_offer.total_price:,.0f}" if detected_offer.total_price else "pricing details"
                    timeline_str = f"{detected_offer.timeline_duration_days} days" if detected_offer.timeline_duration_days else "timeline information"
                    
                    # Create action request message for offer analysis
                    offer_action_message = Message.objects.create(
                        contracting_planning=planning,
                        contractor_id=contractor_id,
                        sender='ai',
                        message_type='ai_action_request',
                        content=f"Would you like me to analyze this offer in detail?."
                    )
                    
                    # Create the analyze_offer action
                    MessageAction.objects.create(
                        message=offer_action_message,
                        action_type='analyze_offer',
                        action_status='pending',
                        action_data=convert_to_serializable({
                            'offer_id': detected_offer.id,
                            'reasoning': 'Detected an offer in the automatically fetched email'
                        }),
                        action_summary=f"Analyze offer from {contractor.name}"
                    )
                    
                    logger.info(f"Created analyze_offer action for offer {detected_offer.id}")
                except Exception as e:
                    logger.error(f"Error creating offer analysis action: {str(e)}", exc_info=True)
            
            return message
            
        except Exception as e:
            logger.error(f"Error posting system email notification: {str(e)}", exc_info=True)
            # Create fallback message
            contractor = Contractor.objects.filter(id=contractor_id).first()
            contractor_name = contractor.name if contractor else "the contractor"
            
            message = Message.objects.create(
                contracting_planning=planning,
                contractor_id=contractor_id,
                sender='ai',
                message_type='ai',
                content=f"I've received a new email from {contractor_name}."
            )
            return message
    
    def _load_prompt_template_by_name(self, filename: str) -> str:
        """Load a specific prompt template by filename."""
        prompt_path = os.path.join(
            settings.BASE_DIR,
            'core',
            'services',
            'gemini_service',
            'prompts',
            'contracting',
            filename
        )
        
        with open(prompt_path, 'r', encoding='utf-8') as f:
            return f.read()