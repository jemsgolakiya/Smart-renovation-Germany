# Offer Re-Analysis with Conversation Context

## Overview

The system now supports re-analyzing contractor offers with conversation context. This allows users to:
1. Analyze an initial offer
2. Ask questions to the contractor via the conversation agent
3. Receive contractor responses
4. Re-analyze the offer with the new information from the conversation

## How It Works

### Flow Diagram

```
1. User requests initial offer analysis
   ↓
2. AI analyzes offer with original data only
   ↓
3. User asks questions to contractor (e.g., "Can you clarify the warranty?")
   ↓
4. AI sends email to contractor
   ↓
5. Contractor replies via email
   ↓
6. User fetches contractor emails
   ↓
7. User requests offer re-analysis
   ↓
8. AI analyzes offer WITH conversation history
   ↓
9. Updated analysis includes contractor's clarifications
```

### Example Scenario

#### Step 1: Initial Analysis
**User:** "Analyze this offer from BauMeister GmbH"

**AI Analysis (Initial):**
```markdown
### Executive Summary
BauMeister GmbH offers a kitchen renovation for €25,000 over 30 days...

### Weaknesses
- Warranty details are vague (mentions "standard warranty" without specifics)
- Material brands not specified
- Payment schedule lacks milestone details

### Questions to Ask Contractor
1. What specific warranty period and coverage do you provide?
2. Which brands will be used for cabinets and appliances?
3. Can you provide a detailed payment milestone schedule?
```

#### Step 2: User Asks Questions
**User:** "Ask them about the warranty and material brands"

**AI sends email:**
```
Subject: Questions about Kitchen Renovation Offer

Dear BauMeister GmbH,

Thank you for your offer. Before we proceed, we'd like to clarify:

1. What specific warranty period and coverage do you provide?
2. Which brands will you use for cabinets and appliances?

Best regards
```

#### Step 3: Contractor Responds
**Contractor's Email:**
```
Subject: Re: Questions about Kitchen Renovation Offer

Hello,

Regarding your questions:

1. We provide a 5-year warranty on all installation work and a 2-year warranty 
   on materials. This covers any defects in workmanship or materials.

2. For cabinets, we use Nolte (German brand, premium quality). For appliances, 
   we'll install Bosch appliances (dishwasher, oven, and cooktop).

Let me know if you have any other questions.

Best,
BauMeister Team
```

#### Step 4: Re-Analysis with Conversation Context
**User:** "Analyze the offer again"

**AI Analysis (Updated):**
```markdown
### Executive Summary
BauMeister GmbH offers a kitchen renovation for €25,000 over 30 days. 
**Since the initial analysis, the contractor has provided important clarifications 
about warranty and materials that significantly improve the offer's transparency.**

### Conversation-Based Updates
Recent communication with the contractor has addressed several concerns:

**Questions Asked:**
- Warranty period and coverage details
- Material brands for cabinets and appliances

**Contractor's Responses:**
- **Warranty:** 5-year warranty on installation work, 2-year on materials
- **Materials:** Nolte cabinets (German premium brand) and Bosch appliances

**Impact on Evaluation:**
These clarifications address two of the major weaknesses identified in the initial 
analysis. The warranty is now clearly defined and exceeds industry standards. 
The material brands are reputable and appropriate for the price point.

### Pricing Analysis
€25,000 is reasonable for a kitchen renovation with Nolte cabinets and Bosch 
appliances. These are premium German brands that justify the price...

### Quality Indicators
- Nolte cabinets are a well-respected German brand (premium tier)
- Bosch appliances are industry standard for quality
- 5-year installation warranty exceeds typical 2-year standard
- Professional and responsive communication

### Risk Assessment
**Risks Addressed Through Conversation:**
- ✓ Warranty details are now clear (5-year installation, 2-year materials)
- ✓ Material quality is confirmed (premium German brands)

**Remaining Risks:**
- Payment schedule still needs clarification
- Start date needs to be confirmed

### Strengths
- Premium German brands (Nolte, Bosch)
- Excellent warranty coverage (5 years on installation)
- Responsive to questions
- Reasonable pricing for quality offered
- Clear project timeline (30 days)

### Weaknesses
- Payment milestone schedule needs detail *(unchanged)*
- Start date not yet confirmed *(unchanged)*
- ~~Warranty vague~~ *(RESOLVED via conversation)*
- ~~Materials not specified~~ *(RESOLVED via conversation)*

### Questions to Ask Contractor
1. Can you provide a detailed payment milestone schedule?
2. What is your earliest available start date?
3. Will you provide a detailed materials list before starting?

*Note: Questions about warranty and material brands have been answered.*

### Recommendation
**Acceptable with Clarification** → **Recommended**

The offer has improved significantly with the clarifications provided. The 5-year 
warranty and premium material brands make this a strong offer. We recommend accepting 
once the payment schedule and start date are confirmed.
```

## Technical Implementation

### 1. Conversation History Collection
When executing `analyze_offer` action, the system now:
- Fetches the last 30 messages from the conversation
- Formats them with timestamps
- Includes both user messages and AI actions (emails sent/received)

```python
# In conversation_agent.py - _execute_analyze_offer()
messages = Message.objects.filter(
    contracting_planning=offer.contracting_planning,
    contractor_id=current_contractor_id
).order_by('-timestamp')[:30]

conversation_context = self._format_conversation_for_analysis(messages)
```

### 2. Context Formatting
The `_format_conversation_for_analysis()` method creates a structured conversation log:

```
[2024-01-15 14:30] User: Can you clarify the warranty details?
[2024-01-15 14:31] Email Sent: Questions about Kitchen Renovation Offer
[2024-01-15 16:45] Fetched emails from contractor
[2024-01-15 16:45] AI: I found 1 email from BauMeister GmbH...
```

### 3. Analysis Prompt Enhancement
The offer analysis prompt now includes a dedicated section for conversation history:

```markdown
## Conversation History with Contractor

[conversation history here]

**IMPORTANT:** If the conversation history contains relevant information, 
incorporate these insights into your analysis.
```

### 4. Analysis Structure Updates
The analysis now includes:
- **Section 2: Conversation-Based Updates** - New section highlighting what changed
- Updated sections with "Consider conversation context" notes
- Questions to Ask section excludes already-answered questions
- Strengths/Weaknesses show what was resolved

## Benefits

1. **Informed Decision Making:** Users get updated analysis based on actual contractor responses
2. **Efficiency:** No need to manually track what was asked/answered
3. **Transparency:** Clear indication of what concerns were addressed
4. **Continuity:** Analysis evolves with the conversation
5. **Accountability:** Contractor responses are documented in the analysis

## Database Tracking

Each analysis stores metadata about conversation context:

```python
analysis_data = {
    'offer_id': offer.id,
    'analyzed_at': timezone.now().isoformat(),
    'context_used': list(context.keys()),
    'has_conversation_context': bool(conversation_history)  # NEW
}
```

This allows you to:
- Identify which analyses included conversation context
- Track analysis evolution over time
- Compare initial vs. updated analyses

## Future Enhancements

1. **Diff View:** Show side-by-side comparison of initial vs. updated analysis
2. **Auto Re-Analysis:** Automatically trigger re-analysis when contractor replies
3. **Change Highlighting:** Visually highlight what changed in the analysis
4. **Conversation Summary:** Dedicated UI section showing key Q&A points
5. **Multiple Re-Analyses:** Track complete analysis history for an offer

## Testing the Feature

### Test Case 1: Initial Analysis (No Conversation)
```python
# Request analysis immediately after offer detection
# Expected: Analysis shows "No conversation history available"
# Expected: All weaknesses and questions included
```

### Test Case 2: Re-Analysis After Questions
```python
# 1. Initial analysis
# 2. Ask contractor questions via conversation
# 3. Fetch contractor reply
# 4. Request analysis again
# Expected: "Conversation-Based Updates" section appears
# Expected: Answered questions removed from "Questions to Ask"
# Expected: Resolved weaknesses marked as such
```

### Test Case 3: Multiple Re-Analyses
```python
# 1. Initial analysis
# 2. Ask questions → re-analyze
# 3. Ask more questions → re-analyze again
# Expected: Latest analysis includes all conversation history
# Expected: Each re-analysis builds on previous context
```

## API Usage

The API remains unchanged. The conversation context is automatically included:

```python
# Execute analyze_offer action
POST /api/contracting/messages/actions/{action_id}/execute/

# The conversation history is automatically fetched and included
# No additional parameters needed
```

## Conclusion

This feature transforms offer analysis from a one-time snapshot into a living document that evolves with the conversation. Users can now confidently re-analyze offers as they receive more information, making the decision-making process more dynamic and informed.

