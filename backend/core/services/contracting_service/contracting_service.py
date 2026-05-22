"""
Contracting Service for processing planning data with Gemini AI.

This service handles the business logic for contracting planning,
including AI-powered question generation and file analysis.
"""

import logging
import mimetypes
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from google import genai

from core.models import ContractingPlanning, ContractingPlanningFile

logger = logging.getLogger(__name__)


class ContractingService:
    """Service for handling contracting planning business logic with Gemini AI."""
    
    def __init__(self):
        """Initialize the contracting service with Gemini."""
        self.client = genai.Client()
    
    def process_planning_with_ai(
        self, 
        planning: ContractingPlanning,
    ) -> Dict[str, Any]:
        """
        Process contracting planning with Gemini AI.
        
        Args:
            planning: ContractingPlanning instance
            
        Returns:
            Dictionary containing AI-generated insights with summary and questions
        """
        result = {
            'summary': '',
            'questions': [],
            'success': False,
            'error': None
        }
        
        try:
            # Upload files to Gemini if present
            gemini_uploaded_files = []
            if planning.files.exists():
                files = planning.files.all()
                logger.info(f"Uploading {len(files)} files to Gemini")
                for file_obj in files:
                    uploaded_file = self._upload_file_to_gemini(file_obj)
                    if uploaded_file:
                        gemini_uploaded_files.append(uploaded_file)
                logger.info(f"Successfully uploaded {len(gemini_uploaded_files)} files to Gemini")

            # Generate clarifying questions (returns dict with summary and questions)
            ai_response = self.generate_planning_questions(planning, gemini_uploaded_files)
            
            result['summary'] = ai_response.get('summary', '')
            result['questions'] = ai_response.get('questions', [])
            result['success'] = True
            
            logger.info(f"Successfully processed planning {planning.id} with AI")
            
        except Exception as e:
            logger.error(f"Error processing planning {planning.id} with AI: {str(e)}", exc_info=True)
            result['error'] = str(e)
            raise  # Re-raise to avoid silent failures
        
        return result
    
    def generate_planning_questions(self, planning: ContractingPlanning, uploaded_files: List) -> Dict[str, Any]:
        """
        Generate planning questions using Gemini with uploaded files.
        
        Args:
            planning: ContractingPlanning instance
            uploaded_files: List of uploaded file objects from Gemini
            
        Returns:
            Dictionary containing summary and questions with options
        """
        # Build the content array: files first, then prompt
        content_parts = []
        
        # Add uploaded files to content
        for uploaded_file in uploaded_files:
            content_parts.append(uploaded_file)

        # Add the prompt
        prompt = self._build_questions_prompt(planning)
        content_parts.append(prompt)
        
        logger.info(f"Generating questions with {len(uploaded_files)} files")
        
        # Call Gemini API with combined content
        response = self.client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=content_parts
        )
        
        parsed_response = self._parse_questions_response(response.text)

        return parsed_response
    
    def generate_invitation_content(
        self,
        planning: ContractingPlanning,
        contractors: List[Any]
    ) -> Dict[str, Any]:
        """
        Generate invitation email and renovation plan using Gemini AI.
        
        Args:
            planning: ContractingPlanning instance
            contractors: List of Contractor objects selected for invitation
            
        Returns:
            Dictionary containing email_html, renovation_plan_html, and relevant_file_ids
        """
        result = {
            'email_html': '',
            'renovation_plan_html': '',
            'relevant_file_ids': [],
            'success': False,
            'error': None
        }
        
        try:
            # Upload files to Gemini if present
            gemini_uploaded_files = []
            file_id_mapping = {}  # Map Gemini file order to ContractingPlanningFile IDs
            
            if planning.files.exists():
                files = planning.files.all()
                logger.info(f"Uploading {len(files)} files to Gemini for invitation generation")
                for idx, file_obj in enumerate(files):
                    uploaded_file = self._upload_file_to_gemini(file_obj)
                    if uploaded_file:
                        gemini_uploaded_files.append(uploaded_file)
                        # Map the index (1-based) to the actual file ID
                        file_id_mapping[idx + 1] = file_obj.id
                logger.info(f"Successfully uploaded {len(gemini_uploaded_files)} files to Gemini")
            
            # Build content parts
            content_parts = []
            
            # Add uploaded files to content
            for uploaded_file in gemini_uploaded_files:
                content_parts.append(uploaded_file)
            
            # Add the prompt
            prompt = self._build_invitation_prompt(planning, contractors)
            content_parts.append(prompt)
            
            logger.info(f"Generating invitation content with {len(gemini_uploaded_files)} files for {len(contractors)} contractors")
            
            # Call Gemini API with combined content
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=content_parts
            )
            
            # Parse the response
            parsed_response = self._parse_invitation_response(response.text)
            
            # Map file indices back to actual file IDs
            relevant_file_ids = []
            for file_idx in parsed_response.get('relevant_file_ids', []):
                if file_idx in file_id_mapping:
                    relevant_file_ids.append(file_id_mapping[file_idx])
            
            result['email_html'] = parsed_response.get('email_html', '')
            result['renovation_plan_html'] = parsed_response.get('renovation_plan_html', '')
            result['relevant_file_ids'] = relevant_file_ids
            result['success'] = True
            
            logger.info(f"Successfully generated invitation content for planning {planning.id}")
            
        except Exception as e:
            logger.error(f"Error generating invitation content for planning {planning.id}: {str(e)}", exc_info=True)
            result['error'] = str(e)
            raise  # Re-raise to avoid silent failures
        
        return result
    
    def _build_questions_prompt(self, planning: ContractingPlanning) -> str:
        """
        Build prompt for generating questions by reading from template file.
        
        Args:
            planning: ContractingPlanning instance
            
        Returns:
            Formatted prompt string with all template variables replaced
        """
        project = planning.project
        
        # Read the prompt template from file
        prompt_file = Path(__file__).parent.parent / 'gemini_service' / 'prompts' / 'contracting' / 'questions_prompt.md'
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template file not found: {prompt_file}")
            raise
        
        # Get current date
        current_date = datetime.now().strftime("%B %d, %Y")
        
        # Build project context
        context = self._build_project_context(planning)
        
        # Build attachment context
        attachment_context = self._build_attachment_context(planning)
        
        # Replace template variables using simple string replacement
        # (avoid .format() since the template contains JSON with curly braces)
        prompt = prompt_template.replace('{current_date}', current_date)
        prompt = prompt.replace('{context}', context)
        prompt = prompt.replace('{attachment_context}', attachment_context)
        
        return prompt
    
    def _build_project_context(self, planning: ContractingPlanning) -> str:
        """Build the project context section for the prompt."""
        project = planning.project
        
        context = f"""
- Project Name: {project.name}
- Type: {project.get_project_type_display()}
- Location: {project.address}, {project.city}, {project.state} {project.postal_code}
- Budget: €{project.budget:,.2f}"""
        
        if project.additional_information:
            context += f"\n- Additional Information: {project.additional_information}"
        
        context += f"\n\nUser's Planning Description:\n{planning.description}"
        
        return context
    
    def _build_attachment_context(self, planning: ContractingPlanning) -> str:
        """Build the attachment context section for the prompt."""
        if not planning.files.exists():
            return ""
        
        files = planning.files.all()
        file_count = len(files)
        
        file_list = "\n".join([
            f"  - {file_obj.filename}"
            for file_obj in files
        ])
        
        attachment_context = f"""

ATTACHMENTS PROVIDED ({file_count} file{'s' if file_count != 1 else ''}):
{file_list}

The attachments are included in this conversation. Analyze them carefully to understand the current state and avoid asking for information that is visible in the images/documents."""
        
        return attachment_context

    def _upload_file_to_gemini(self, file_obj: ContractingPlanningFile):
        """
        Upload a file to Gemini API.

        Args:
            file_obj: ContractingPlanningFile instance

        Returns:
            Uploaded file object from Gemini, or None if upload fails
        """
        try:
            # Get the file path
            file_path = file_obj.file.path

            # Guess the mime type
            mime_type, _ = mimetypes.guess_type(file_path)

            # Use a default mime type if guess fails
            if not mime_type:
                mime_type = 'application/octet-stream'

            logger.info(f"Uploading file {file_obj.filename} (path: {file_path}) with mime type {mime_type}")

            # Upload file to Gemini using the 'file' parameter (not 'path')
            uploaded_file = self.client.files.upload(file=file_path)

            logger.info(f"Successfully uploaded file {file_obj.filename} to Gemini (URI: {uploaded_file.uri})")
            return uploaded_file

        except Exception as e:
            logger.error(f"Error uploading file {file_obj.filename} to Gemini: {str(e)}", exc_info=True)
            return None\


    def _build_invitation_prompt(self, planning: ContractingPlanning, contractors: List[Any]) -> str:
        """
        Build prompt for generating invitation email and renovation plan.
        
        Args:
            planning: ContractingPlanning instance
            contractors: List of Contractor objects
            
        Returns:
            Formatted prompt string with all template variables replaced
        """
        # Read the prompt template from file
        prompt_file = Path(__file__).parent.parent / 'gemini_service' / 'prompts' / 'contracting' / 'invitation_prompt.md'
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template file not found: {prompt_file}")
            raise
        
        # Get current date
        current_date = datetime.now().strftime("%B %d, %Y")
        
        # Build project context
        context = self._build_project_context(planning)
        
        # Build attachment context
        attachment_context = self._build_attachment_context(planning)
        
        # Build user answers context
        user_answers = self._build_user_answers_context(planning)
        
        # Build contractors info
        contractors_info = self._build_contractors_info(contractors)
        
        # Build user info
        user_info = self._build_user_info(planning)
        
        # Replace template variables
        prompt = prompt_template.replace('{current_date}', current_date)
        prompt = prompt.replace('{context}', context)
        prompt = prompt.replace('{attachment_context}', attachment_context)
        prompt = prompt.replace('{user_answers}', user_answers)
        prompt = prompt.replace('{contractors_info}', contractors_info)
        prompt = prompt.replace('{user_info}', user_info)
        
        return prompt
    
    def _build_user_answers_context(self, planning: ContractingPlanning) -> str:
        """Build the user answers section for the prompt."""
        if not planning.user_answers or not planning.ai_questions:
            return "No additional clarifying questions were answered."
        
        # Create a mapping of question IDs to questions
        question_map = {}
        for question in planning.ai_questions:
            question_map[question['id']] = question
        
        # Build the answers text
        answers_text = []
        for question_id, answer in planning.user_answers.items():
            question_data = question_map.get(question_id)
            if not question_data:
                continue
            
            question_text = question_data.get('question', 'Unknown question')
            
            # If it's a multiple choice, find the option text
            if question_data.get('type') == 'multiple_choice' and question_data.get('options'):
                option_text = answer
                for option in question_data.get('options', []):
                    if option.get('id') == answer:
                        option_text = option.get('text', answer)
                        break
                answers_text.append(f"Q: {question_text}\nA: {option_text}")
            else:
                # Text input
                answers_text.append(f"Q: {question_text}\nA: {answer}")
        
        if not answers_text:
            return "No additional clarifying questions were answered."
        
        return "\n\n".join(answers_text)
    
    def _build_contractors_info(self, contractors: List[Any]) -> str:
        """Build the contractors information section for the prompt."""
        if not contractors:
            return "No contractors selected."
        
        contractors_text = []
        for contractor in contractors:
            contractor_info = f"- {contractor.name}"
            if hasattr(contractor, 'specializations') and contractor.specializations:
                contractor_info += f" (Specializations: {contractor.specializations})"
            if hasattr(contractor, 'city') and hasattr(contractor, 'state'):
                contractor_info += f" - Location: {contractor.city}, {contractor.state}"
            contractors_text.append(contractor_info)
        
        return "\n".join(contractors_text)
    
    def _build_user_info(self, planning: ContractingPlanning) -> str:
        """Build the user information section for the prompt."""
        user_info_parts = []
        
        # Get the project and user
        project = planning.project
        user = project.user
        
        # User basic info
        full_name = ""
        if hasattr(user, 'first_name') and user.first_name:
            full_name = user.first_name
        if hasattr(user, 'last_name') and user.last_name:
            full_name = f"{full_name} {user.last_name}".strip()
        
        if full_name:
            user_info_parts.append(f"Name: {full_name}")
        
        if hasattr(user, 'email') and user.email:
            user_info_parts.append(f"Email: {user.email}")
        
        # Project info
        if project.name:
            user_info_parts.append(f"Project Name: {project.name}")
        
        # Project type
        if project.project_type:
            project_type_display = project.get_project_type_display() if hasattr(project, 'get_project_type_display') else project.project_type
            user_info_parts.append(f"Project Type: {project_type_display}")
        
        # Location info
        location_parts = []
        if project.address:
            location_parts.append(project.address)
        if project.city:
            location_parts.append(project.city)
        if project.postal_code:
            location_parts.append(project.postal_code)
        if project.state:
            location_parts.append(project.state)
        
        if location_parts:
            user_info_parts.append(f"Project Location: {', '.join(location_parts)}")
        
        # Budget info
        if project.budget and project.budget > 0:
            user_info_parts.append(f"Budget: €{project.budget:,.2f}")
        
        if not user_info_parts:
            return "No user information available."
        
        return "\n".join(user_info_parts)
    
    def modify_email_with_ai(
        self,
        current_email_html: str,
        user_prompt: str,
        planning: ContractingPlanning
    ) -> Dict[str, Any]:
        """
        Modify the invitation email based on user's AI prompt.
        
        Args:
            current_email_html: Current HTML content of the email
            user_prompt: User's instruction for how to modify the email
            planning: ContractingPlanning instance for context
            
        Returns:
            Dictionary containing modified email_html and success status
        """
        result = {
            'email_html': '',
            'success': False,
            'error': None
        }
        
        try:
            # Build the modification prompt
            prompt = self._build_email_modification_prompt(
                current_email_html,
                user_prompt,
                planning
            )
            
            logger.info(f"Modifying email for planning {planning.id} with user prompt")
            
            # Call Gemini API
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[prompt]
            )
            
            # Parse the response
            parsed_response = self._parse_email_modification_response(response.text)
            
            result['email_html'] = parsed_response.get('email_html', current_email_html)
            result['success'] = True
            
            logger.info(f"Successfully modified email for planning {planning.id}")
            
        except Exception as e:
            logger.error(f"Error modifying email for planning {planning.id}: {str(e)}", exc_info=True)
            result['error'] = str(e)
            result['email_html'] = current_email_html  # Return original on error
            raise  # Re-raise to avoid silent failures
        
        return result
    
    def _build_email_modification_prompt(
        self,
        current_email_html: str,
        user_prompt: str,
        planning: ContractingPlanning
    ) -> str:
        """
        Build prompt for modifying the email based on user instructions.
        
        Args:
            current_email_html: Current HTML content of the email
            user_prompt: User's instruction for modification
            planning: ContractingPlanning instance
            
        Returns:
            Formatted prompt string
        """
        project = planning.project
        
        # Read the prompt template from file
        prompt_file = Path(__file__).parent.parent / 'gemini_service' / 'prompts' / 'contracting' / 'email_modification_prompt.md'
        
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template file not found: {prompt_file}")
            raise
        
        # Build project location string
        location_parts = []
        if project.city:
            location_parts.append(project.city)
        if project.state:
            location_parts.append(project.state)
        project_location = ', '.join(location_parts) if location_parts else 'Not specified'
        
        # Replace template variables
        prompt = prompt_template.replace('{project_name}', project.name)
        prompt = prompt.replace('{project_type}', project.get_project_type_display())
        prompt = prompt.replace('{project_location}', project_location)
        prompt = prompt.replace('{current_email_html}', current_email_html)
        prompt = prompt.replace('{user_prompt}', user_prompt)
        
        return prompt
    
    def _parse_email_modification_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse Gemini email modification response.
        
        Expected format:
        {{
          "email_html": "<html>..."
        }}
        
        Returns:
            Dictionary with modified email_html
        """
        try:
            # Clean the response text - remove markdown code blocks if present
            cleaned_text = response_text.strip()
            
            # Remove markdown code fences if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]  # Remove ```json
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]  # Remove ```
            
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]  # Remove trailing ```
            
            cleaned_text = cleaned_text.strip()
            
            # Parse JSON
            parsed_response = json.loads(cleaned_text)
            
            # Validate structure
            if not isinstance(parsed_response, dict):
                logger.error(f"Response is not a dictionary: {type(parsed_response)}")
                raise ValueError("Response must be a dictionary")
            
            if 'email_html' not in parsed_response:
                logger.warning("Response missing 'email_html' field")
                parsed_response['email_html'] = ''
            
            logger.info(f"Successfully parsed email modification response")
            
            return parsed_response
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON email modification response: {str(e)}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            
            # Return empty structure on parse failure
            return {
                "email_html": ""
            }
        except Exception as e:
            logger.error(f"Error parsing email modification response: {str(e)}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            return {
                "email_html": ""
            }
    
    def _parse_questions_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse Gemini response which should be in JSON format.
        
        Expected format:
        {
          "summary": "...",
          "questions": [
            {
              "id": "q1",
              "question": "...",
              "options": [...]
            }
          ]
        }
        
        Returns:
            Dictionary with summary and questions, or empty structure on error
        """
        try:
            # Clean the response text - remove markdown code blocks if present
            cleaned_text = response_text.strip()
            
            # Remove markdown code fences if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]  # Remove ```json
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]  # Remove ```
            
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]  # Remove trailing ```
            
            cleaned_text = cleaned_text.strip()
            
            # Parse JSON
            parsed_response = json.loads(cleaned_text)
            
            # Validate structure
            if not isinstance(parsed_response, dict):
                logger.error(f"Response is not a dictionary: {type(parsed_response)}")
                raise ValueError("Response must be a dictionary")
            
            if 'summary' not in parsed_response:
                logger.warning("Response missing 'summary' field")
                parsed_response['summary'] = ''
            
            if 'questions' not in parsed_response:
                logger.warning("Response missing 'questions' field")
                parsed_response['questions'] = []
            
            question_count = len(parsed_response.get('questions', []))
            logger.info(f"Successfully parsed response with {question_count} questions")
            
            return parsed_response
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            
            # Return empty structure on parse failure
            return {
                "summary": "Unable to generate summary due to parsing error",
                "questions": []
            }
        except Exception as e:
            logger.error(f"Error parsing questions response: {str(e)}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            return {
                "summary": "Unable to generate summary due to unexpected error",
                "questions": []
            }
    
    def _parse_invitation_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse Gemini invitation response which should be in JSON format.
        
        Expected format:
        {
          "email_html": "<html>...",
          "renovation_plan_html": "<html>...",
          "relevant_file_ids": [1, 3, 5]
        }
        
        Returns:
            Dictionary with email_html, renovation_plan_html, and relevant_file_ids
        """
        try:
            # Clean the response text - remove markdown code blocks if present
            cleaned_text = response_text.strip()
            
            # Remove markdown code fences if present
            if cleaned_text.startswith('```json'):
                cleaned_text = cleaned_text[7:]  # Remove ```json
            elif cleaned_text.startswith('```'):
                cleaned_text = cleaned_text[3:]  # Remove ```
            
            if cleaned_text.endswith('```'):
                cleaned_text = cleaned_text[:-3]  # Remove trailing ```
            
            cleaned_text = cleaned_text.strip()
            
            # Parse JSON
            parsed_response = json.loads(cleaned_text)
            
            # Validate structure
            if not isinstance(parsed_response, dict):
                logger.error(f"Response is not a dictionary: {type(parsed_response)}")
                raise ValueError("Response must be a dictionary")
            
            if 'email_html' not in parsed_response:
                logger.warning("Response missing 'email_html' field")
                parsed_response['email_html'] = ''
            
            if 'renovation_plan_html' not in parsed_response:
                logger.warning("Response missing 'renovation_plan_html' field")
                parsed_response['renovation_plan_html'] = ''
            
            if 'relevant_file_ids' not in parsed_response:
                logger.warning("Response missing 'relevant_file_ids' field")
                parsed_response['relevant_file_ids'] = []
            
            logger.info(f"Successfully parsed invitation response with {len(parsed_response.get('relevant_file_ids', []))} relevant files")
            
            return parsed_response
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON invitation response: {str(e)}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            
            # Return empty structure on parse failure
            return {
                "email_html": "<p>Unable to generate email due to parsing error</p>",
                "renovation_plan_html": "<p>Unable to generate renovation plan due to parsing error</p>",
                "relevant_file_ids": []
            }
        except Exception as e:
            logger.error(f"Error parsing invitation response: {str(e)}")
            logger.error(f"Response text (first 500 chars): {response_text[:500]}")
            return {
                "email_html": "<p>Unable to generate email due to unexpected error</p>",
                "renovation_plan_html": "<p>Unable to generate renovation plan due to unexpected error</p>",
                "relevant_file_ids": []
            }

# Singleton instance (lazy initialization)
_contracting_service: Optional[ContractingService] = None

def get_contracting_service() -> ContractingService:
    """Get or create the singleton contracting service instance."""
    global _contracting_service
    if _contracting_service is None:
        _contracting_service = ContractingService()
    return _contracting_service

