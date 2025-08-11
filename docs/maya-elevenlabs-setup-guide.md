# Maya ElevenLabs Agent Setup Guide

## Overview
This guide provides step-by-step instructions for configuring Maya, LiveGuide's Chief Onboarding Officer, in the ElevenLabs dashboard with all necessary webhooks and system prompts.

## 1. Access ElevenLabs Dashboard

1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Log in with your account
3. Navigate to **Agents** section
4. Find or create agent named "Maya" (Agent ID: `SuIlXQ4S6dyjrNViOrQ8`)

## 2. Configure System Prompt

### Navigate to "Agent" Tab
In the agent configuration, go to the **"Agent"** tab and update the system prompt with the content from `/prompts/maya-elevenlabs-complete.txt`.

**Key sections to include:**
- Identity and personality
- Operational guardrails
- Crisis protocols
- Professional boundaries
- Conversation flow
- RAG awareness

## 3. Configure Webhooks

### Navigate to "Widget" Tab
Go to the **"Widget"** tab and scroll down to the **"Webhooks"** section.

### A. Initiation Webhook (Pre-conversation)
**Purpose**: Loads user context and knowledge graph before conversation starts

**Configuration:**
- **Event Type**: "Conversation Start" or "Before Conversation"
- **URL**: `https://liveguide.ai/api/elevenlabs-init-rag`
- **Method**: `POST`
- **Headers**: 
  ```
  X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac
  ```

### B. Post-Call Webhook (After conversation)
**Purpose**: Processes conversation analysis and saves to knowledge graph

**Configuration:**
- **Event Type**: "Conversation End" or "After Conversation"  
- **URL**: `https://liveguide.ai/api/elevenlabs-post-webhook`
- **Method**: `POST`
- **Headers**:
  ```
  X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac
  ```

## 4. Configure Analysis Tab

### Navigate to "Analysis" Tab
Set up data extraction and evaluation criteria.

### Evaluation Criteria
Add the following evaluation fields:

1. **User_Goals**
   - Type: Array of objects
   - Description: Goals identified during conversation
   - Schema:
     ```json
     {
       "text": "string",
       "timeframe": "string",
       "title": "string",
       "confidence": "string"
     }
     ```

2. **User_Insights**
   - Type: Array of objects
   - Description: Key insights and realizations
   - Schema:
     ```json
     {
       "text": "string",
       "category": "string",
       "title": "string"
     }
     ```

3. **Obstacles_Identified**
   - Type: Array of strings
   - Description: Challenges or blockers mentioned

4. **Emotional_State**
   - Type: String
   - Description: Primary emotional state during conversation
   - Options: motivated, anxious, confident, uncertain, excited, overwhelmed

5. **Session_Quality**
   - Type: Number (1-10)
   - Description: Quality rating of the conversation

6. **Next_Steps**
   - Type: Array of strings
   - Description: Recommended actions for user

### Analysis Prompt
Add this to guide the analysis:
```
Extract structured data from the conversation:
1. User goals with specific timeframes
2. Key insights and self-discoveries
3. Obstacles or challenges mentioned
4. Emotional state throughout conversation
5. Quality of engagement (1-10)
6. Concrete next steps discussed

Focus on actionable, specific information that can guide future conversations.
```

## 5. Configure Security Tab

### Authentication Settings
1. Enable **"Require Authentication"** if you want only logged-in users
2. Set **"Authentication Type"** to "Custom"
3. Configure **"Custom Authentication Endpoint"**:
   ```
   https://liveguide.ai/api/auth/verify
   ```

### CORS Settings
Add allowed origins:
```
https://liveguide.ai
https://www.liveguide.ai
http://localhost:3000
```

## 6. Configure Voice Settings

### Navigate to "Voice" Tab
1. Select preferred voice for Maya (e.g., "Rachel" for professional, warm tone)
2. Adjust voice settings:
   - **Stability**: 0.5 (balanced)
   - **Similarity Boost**: 0.75 (natural)
   - **Style**: 0.3 (slight expressiveness)
   - **Use Speaker Boost**: Enabled

## 7. Configure Widget Settings

### Navigate back to "Widget" Tab
Configure the embedded widget settings:

1. **Widget Title**: "Chat with Maya"
2. **Initial Message**: "Hi! I'm Maya, your Chief Onboarding Officer. I'm here to help you articulate and achieve your goals. What brings you to LiveGuide today?"
3. **Privacy Message**: "Your conversation is private and will be used to build your personal knowledge graph."
4. **Color Theme**: Match LiveGuide branding
5. **Allow Audio Input**: Enabled
6. **Allow Text Input**: Enabled

## 8. Testing the Integration

### Test Webhook Connectivity

#### Test Initiation Webhook:
```bash
curl -X POST https://liveguide.ai/api/elevenlabs-init-rag \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac" \
  -d '{
    "userId": "test-user-123",
    "conversationId": "test-conv-456",
    "agentId": "maya"
  }'
```

Expected: Returns user context and knowledge graph data

#### Test Post-Call Webhook:
```bash
curl -X POST https://liveguide.ai/api/elevenlabs-post-webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac" \
  -d '{
    "conversationId": "test-conv-789",
    "userId": "test-user-123",
    "agentId": "maya",
    "analysis": {
      "goals": [
        {
          "text": "Test goal",
          "timeframe": "1 month"
        }
      ]
    }
  }'
```

Expected: Saves data to knowledge graph

### Test Widget Embedding
1. Go to LiveGuide test page: `https://liveguide.ai/test-maya`
2. Click "Start Conversation"
3. Verify Maya loads with correct greeting
4. Have a test conversation about goals
5. Check database for created nodes

## 9. Monitoring and Debugging

### Check Webhook Logs
Monitor webhook activity in Vercel logs:
```bash
vercel logs --filter elevenlabs
```

### Check Supabase Logs
Monitor edge function logs:
```bash
supabase functions logs agent-rag --project-ref aesefwyijcsynbbhozhb
```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Webhook returns 401 | Check webhook secret matches exactly |
| No context loaded | Verify user ID is being passed correctly |
| Goals not saved | Check post-webhook analysis structure |
| CORS errors | Add origin to allowed list in Security tab |
| Voice cuts out | Check audio settings and latency optimization |

## 10. Production Checklist

- [ ] System prompt uploaded and formatted correctly
- [ ] Initiation webhook configured with correct URL and secret
- [ ] Post-call webhook configured with correct URL and secret
- [ ] Analysis criteria defined for all data types
- [ ] Voice settings optimized for natural conversation
- [ ] Widget styling matches LiveGuide branding
- [ ] Authentication configured (if required)
- [ ] CORS settings include all necessary domains
- [ ] Test conversation completed successfully
- [ ] Nodes created in knowledge graph verified
- [ ] Webhook logs show successful requests
- [ ] Error handling tested with invalid inputs

## 11. Advanced Configuration

### Custom Variables
You can access these variables in your system prompt using `{{variable_name}}`:
- `{{userId}}` - User's unique identifier
- `{{userName}}` - User's display name
- `{{userState}}` - first_time, returning, or active
- `{{currentGoals}}` - Comma-separated list of active goals
- `{{hasGoals}}` - "true" or "false"
- `{{goalCount}}` - Number of goals
- `{{insightCount}}` - Number of insights
- `{{knowledgeContext}}` - Full RAG context (up to 50k chars)

### Conversation Flow Control
Add these to your system prompt for better flow:
```
## Dynamic Responses Based on User State

If userState == "first_time":
  - Focus on discovery and exploration
  - Ask about aspirations and challenges
  - Explain LiveGuide's value proposition

If userState == "returning":
  - Reference previous conversations if context available
  - Check on progress since last session
  - Deepen existing goals

If userState == "active":
  - Assume familiarity with process
  - Focus on refinement and accountability
  - Challenge assumptions constructively
```

## 12. Maintenance

### Regular Updates
1. Review conversation logs weekly
2. Update analysis criteria based on common patterns
3. Refine system prompt based on user feedback
4. Monitor webhook performance metrics

### Backup Configuration
Export your agent configuration regularly:
1. Go to agent settings
2. Click "Export Configuration"
3. Save to version control

## Support

For issues or questions:
- ElevenLabs Support: support@elevenlabs.io
- LiveGuide Technical: Check logs at `/api/elevenlabs-webhook`
- Documentation: This guide at `/docs/maya-elevenlabs-setup-guide.md`

---

Last Updated: January 2025
Agent ID: SuIlXQ4S6dyjrNViOrQ8
Webhook Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac