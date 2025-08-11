# ElevenLabs Webhook URLs for Maya

## Production URLs (Use These in ElevenLabs Dashboard)

### 1. Initiation Webhook (Pre-conversation)
**Purpose**: Loads user context before conversation starts

**URL**: 
```
https://liveguide.ai/api/elevenlabs-init-rag
```

**Method**: `POST`

**Headers to Configure**:
```
X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac
```

### 2. Post-Call Webhook (After conversation)
**Purpose**: Saves goals, insights, and conversation data to knowledge graph

**URL**:
```
https://liveguide.ai/api/elevenlabs-post-webhook
```

**Method**: `POST`

**Headers to Configure**:
```
X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac
```

---

## Development/Testing URLs (For Local Testing)

### If using ngrok or local tunnel:
```
https://your-tunnel-url.ngrok.io/api/elevenlabs-init-rag
https://your-tunnel-url.ngrok.io/api/elevenlabs-post-webhook
```

### If using localhost (only works with ElevenLabs SDK):
```
http://localhost:3000/api/elevenlabs-init-rag
http://localhost:3000/api/elevenlabs-post-webhook
```

---

## Testing the Webhooks

### Test Initiation Webhook:
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

Expected Response:
```json
{
  "success": true,
  "customVariables": {
    "userId": "test-user-123",
    "userName": "Guest User",
    "userState": "first_time",
    "currentGoals": "",
    "hasGoals": "false",
    "goalCount": "0",
    "insightCount": "0",
    "knowledgeContext": ""
  },
  "metadata": {
    "timestamp": "2025-08-11T...",
    "conversationId": "test-conv-456",
    "agentId": "maya"
  }
}
```

### Test Post-Call Webhook:
```bash
curl -X POST https://liveguide.ai/api/elevenlabs-post-webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac" \
  -d '{
    "conversationId": "test-conv-789",
    "userId": "test-user-123",
    "agentId": "maya",
    "transcript": "Test conversation transcript",
    "analysis": {
      "summary": "User discussed goal setting",
      "goals": [
        {
          "text": "Learn public speaking",
          "timeframe": "3 months",
          "title": "Public Speaking Mastery"
        }
      ],
      "insights": [
        {
          "text": "User recognizes need for practice",
          "category": "self-awareness"
        }
      ],
      "emotional_state": "motivated"
    },
    "duration": 300,
    "startTime": "2025-08-11T10:00:00Z",
    "endTime": "2025-08-11T10:05:00Z"
  }'
```

Expected Response:
```json
{
  "success": true,
  "message": "Conversation processed successfully",
  "data": {
    "sessionNodeId": "uuid",
    "nodesCreated": 3,
    "edgesCreated": 3,
    "goals": 1,
    "insights": 1,
    "obstacles": 0
  }
}
```

---

## In ElevenLabs Dashboard

1. Go to **Conversational AI** → **Agents** → **Maya**
2. Click on **"Widget"** tab
3. Scroll to **"Webhooks"** section
4. Add the URLs above with the webhook secret

### For Initiation Webhook:
- **Event**: "Conversation Start" or "Before Conversation"
- **URL**: `https://liveguide.ai/api/elevenlabs-init-rag`
- **Headers**: Add `X-Webhook-Secret` with the value above

### For Post-Call Webhook:
- **Event**: "Conversation End" or "After Conversation"
- **URL**: `https://liveguide.ai/api/elevenlabs-post-webhook`
- **Headers**: Add `X-Webhook-Secret` with the value above

---

## Troubleshooting

### If webhooks aren't working:

1. **Check Domain**: Ensure `liveguide.ai` is deployed and accessible
2. **Check SSL**: HTTPS is required, HTTP won't work
3. **Check Headers**: Webhook secret must match exactly
4. **Check Logs**: Look at Vercel/deployment logs for errors
5. **Test Manually**: Use the curl commands above to test

### Common Issues:

- **401 Unauthorized**: Webhook secret mismatch
- **404 Not Found**: URL path is incorrect or not deployed
- **500 Error**: Check server logs for the specific error
- **CORS Error**: The OPTIONS endpoints should handle this

---

## Important Notes

- The webhook secret (`wsec_027e0bbe...`) is from your `.env.production` file
- Both webhooks are now created and ready to deploy
- The webhooks handle both authenticated and anonymous users
- Goals and insights are only saved for authenticated users
- The RAG context is loaded dynamically based on user history