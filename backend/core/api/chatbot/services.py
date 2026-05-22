import uuid
from django.core.cache import cache
import google.generativeai as genai
from django.conf import settings


class ChatbotService:
	def __init__(self):
		genai.configure(api_key=settings.GEMINI_API_KEY)
		# Using gemini-2.0-flash for compatibility
		self.model = genai.GenerativeModel('gemini-2.0-flash')
		self.model = genai.GenerativeModel('gemini-2.5-pro')
	
	def get_session_key(self, session_id):
		"""Generate cache key for session"""
		return f"chatbot_session_{session_id}"
	
	def get_conversation_history(self, session_id):
		"""Retrieve conversation history from cache"""
		cache_key = self.get_session_key(session_id)
		history = cache.get(cache_key, [])
		return history
	
	def save_conversation_history(self, session_id, history):
		"""Save conversation history to cache (expires in 1 hour)"""
		cache_key = self.get_session_key(session_id)
		history = history[-10:]
		cache.set(cache_key, history, 3600)
	
	def generate_response(self, message, session_id=None, image=None):
		"""Generate AI response for user message"""
		if not session_id:
			session_id = str(uuid.uuid4())
		
		history = self.get_conversation_history(session_id)
		print('Conversation history:', history)
		
		system_prompt = """You are a friendly renovation planning assistant for buildings in Germany. Your goal is to have a natural conversation to understand what the user wants to renovate and gather enough details to create a useful renovation plan.

## YOUR APPROACH:
- Be conversational and natural, not like a form or checklist
- Adapt your questions based on what the user wants to do
- If they want to change tiles, ask about tiles. If they want energy efficiency, ask about that.
- Ask follow-up questions that make sense for THEIR specific renovation goals
- One question at a time, but keep it flowing naturally

## CORE INFORMATION TO EVENTUALLY UNDERSTAND:
- What they want to renovate or change (could be anything: tiles, windows, heating, kitchen, bathroom, roof, facade, energy upgrades, full renovation, etc.)
- Basic building info (type, approximate size, age - but only if relevant to their project)
- Location in Germany (Bundesland) - for regulations
- Their budget range
- When they want to do it
- Current state of what they want to change

## ADAPTIVE QUESTIONING EXAMPLES:

If user says "I want to change my bathroom tiles":
- What kind of tiles are you thinking? (floor, wall, both?)
- How big is the bathroom approximately?
- Are the current tiles damaged or just outdated?
- Do you want to change just tiles or also fixtures?

If user says "I want to improve energy efficiency":
- What's your main concern? (heating costs, insulation, windows?)
- How old is your building approximately?
- Do you know your current energy rating?
- What's causing the most heat loss?

If user says "complete renovation":
- What's the building type?
- Which areas are priority for you?
- What's the current condition?
- What's your overall budget range?

## RULES:
1. DO NOT ask robotic checklist questions
2. DO NOT force all 8 data points if they're not relevant
3. DO adapt to what the user actually cares about
4. DO ask relevant follow-up questions for their specific project
5. DO remember what they've told you - don't repeat questions
6. Keep responses concise - 2-3 sentences max, then your question
7. If user uploads an image, analyze it and ask relevant questions about what you see

## WHEN YOU HAVE ENOUGH INFORMATION:
When you feel you understand their project well enough (usually after 4-8 exchanges), summarize what you've learned naturally and tell them to click the "Generate Plan" button. 

DO NOT generate the plan yourself. DO NOT offer to create it. Just confirm the details and direct them to the button.

Example: "Great! I have a good understanding of your project now - you're looking to renovate the bathroom in your 1970s apartment in Bavaria, with new tiles and modern fixtures, around €8,000 budget, hoping to start in spring. 

When you're ready, click the **Generate Plan** button below and I'll create a detailed renovation plan based on everything we discussed!"""		
		
		conversation_context = "\n".join([
			f"User: {msg['user']}\nAssistant: {msg['assistant']}" 
			for msg in history
		])
		
		full_prompt = f"""{system_prompt}

Previous conversation:
{conversation_context}

User: {message}
Assistant:"""
		
		try:
			if image:
				image_bytes = image.read()
				image_part = {"mime_type": image.content_type, "data": image_bytes}
				response = self.model.generate_content([full_prompt, image_part])
			else:
				response = self.model.generate_content(full_prompt)
			ai_response = response.text
		except Exception as e:
			ai_response = f"I'm sorry, I'm having trouble processing your request right now. Error: {str(e)}"
		
		history.append({
			"user": message,
			"assistant": ai_response
		})
		self.save_conversation_history(session_id, history)
		
		return {
			"response": ai_response,
			"session_id": session_id
		}
	
	def extract_plan_data(self, session_id):
		"""Extract structured renovation plan data from conversation history"""
		
		history = self.get_conversation_history(session_id)
		print('===========================================')
		print('Extracting from conversation history:', history)
		print('===========================================')

		if not history:
			return {
				"success": False,
				"error": "No conversation history found",
				"data": None
			}
		
		conversation_text = "\n".join([
			f"User: {msg['user']}\nAssistant: {msg['assistant']}" 
			for msg in history
		])
		
		extraction_prompt = f"""Analyze this conversation and extract ALL renovation-related information the user provided.

	CONVERSATION:
	{conversation_text}

	EXTRACT INTO THIS EXACT JSON STRUCTURE:
	{{
		"project_type": "string - brief description of what they want to do",
		"building_type": "string - Single Family Home/Apartment/Multi-Family House/Commercial Building or Unknown",
		"building_age": "string - year or decade if mentioned, otherwise Unknown",
		"building_size": number or 0 if not mentioned,
		"location": "string - German Bundesland if mentioned, otherwise Germany",
		"budget": number or 0 if not mentioned,
		"timeline": "string - when they want to start, or Flexible",
		"current_condition": "string - Good/Moderate/Poor/Very Poor or Unknown",
		"renovation_goals": ["array", "of", "specific", "goals"],
		"specific_details": {{
			"rooms_affected": ["list of rooms if mentioned"],
			"materials_mentioned": ["any specific materials discussed"],
			"fixtures_or_systems": ["specific items to change"],
			"dimensions": "any size/dimension details",
			"style_preferences": "any style or design preferences",
			"priorities": "what matters most to them"
		}},
		"concerns": ["any concerns or constraints mentioned"],
		"additional_context": "any other relevant information"
	}}

	RULES:
	- Extract ONLY what the user explicitly stated
	- DO NOT invent or assume values
	- For budget and building_size, extract as numbers only (no symbols)
	- renovation_goals should be specific to what they want to do
	- Be thorough - capture everything useful for creating a plan
	- Return ONLY the JSON object, no markdown, no explanation"""

		try:
			response = self.model.generate_content(extraction_prompt)
			response_text = response.text.strip()
			
			if response_text.startswith("```"):
				lines = response_text.split("\n")
				response_text = "\n".join(lines[1:-1])
			
			import json
			extracted_data = json.loads(response_text)
			
			return {
				"success": True,
				"error": None,
				"data": extracted_data,
				"session_id": session_id
			}
			
		except json.JSONDecodeError as e:
			return {
				"success": False,
				"error": f"Failed to parse extracted data: {str(e)}",
				"raw_response": response_text,
				"data": None
			}
		except Exception as e:
			return {
				"success": False,
				"error": f"Extraction failed: {str(e)}",
				"data": None
			}


class MockChatbotService:
	def generate_response(self, message, session_id=None):
		"""Mock response for testing"""
		if not session_id:
			session_id = str(uuid.uuid4())
		
		message_lower = message.lower()
		
		if "kfw" in message_lower or "funding" in message_lower:
			response = "KfW offers various funding programs for energy-efficient renovations in Germany. The most popular programs include KfW 261 for residential buildings with grants up to 45% of costs for certain energy efficiency levels."
		elif "cost" in message_lower or "price" in message_lower:
			response = "Renovation costs in Germany vary widely depending on the scope. On average, energy-efficient window replacement costs €400-800 per window, roof insulation €50-100 per m², and heating system upgrades €8,000-15,000."
		elif "permit" in message_lower or "approval" in message_lower:
			response = "Building permits (Baugenehmigung) are required for structural changes, extensions, and changes to the building's appearance. Energy efficiency improvements typically don't require permits unless they affect the building's structure."
		else:
			response = f"Thank you for your question about renovation in Germany. I can help you with planning, costs, regulations, and financing. Could you provide more specific details about what you'd like to know?"
		
		return {
			"response": response,
			"session_id": session_id
		}