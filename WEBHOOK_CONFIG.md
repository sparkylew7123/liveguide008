# ElevenLabs Webhook Configuration

## Current Setup

### 🔗 Webhook Details
- **Name**: callstart
- **ID**: `759865b1c81c4b6b875aafc324e07651`
- **URL**: `https://aesefwyijcsynbbhozhb.supabase.co/functions/v1/elevenlabs-webhook`
- **Secret**: `***REMOVED***`

### 🎯 Agent Configuration
- **Agent Name**: Maya - LiveGuide Onboarding Specialist
- **Agent ID**: `SuIlXQ4S6dyjrNViOrQ8`
- **Voice**: Sarah (EXAVITQu4vr4xnSDxMaL)
- **Purpose**: Goal discovery and coaching style assessment

## Webhook Events

The webhook listens for these events:
- `conversation_started` - Creates conversation record
- `conversation_ended` - Processes transcript for goal/preference extraction
- `message_received` - Stores user messages
- `message_sent` - Stores agent responses with real-time analysis
- `error` - Handles conversation errors

## Signature Verification

The webhook uses HMAC-SHA256 signature verification:
- **Header**: `ElevenLabs-Signature`
- **Format**: `sha256=<hash>`
- **Secret**: Uses the webhook secret for verification

## Data Flow

1. **Conversation Start**: User initiates voice conversation
2. **Real-time Processing**: Messages stored and analyzed
3. **Goal Detection**: AI extracts goals from conversation
4. **Preference Detection**: Coaching style preferences identified
5. **Data Persistence**: All data saved to Supabase database

## Database Tables

- `elevenlabs_conversations` - Conversation metadata
- `voice_chat_conversations` - Individual messages
- `user_goals` - Detected and selected goals
- `profiles` - User coaching preferences

## Testing

1. Access voice-guided onboarding: `http://localhost:3000/onboarding/voice-guided`
2. Start conversation with Maya
3. Monitor webhook logs in Supabase Functions dashboard
4. Check database for captured data

## Environment Variables

```env
ELEVENLABS_API_KEY=***REMOVED***
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=SuIlXQ4S6dyjrNViOrQ8
ELEVENLABS_WEBHOOK_SECRET=***REMOVED***
```

## Deployment Status

✅ **Supabase Edge Function**: Deployed with signature verification
✅ **Agent Configuration**: Maya configured with onboarding prompts
✅ **Webhook Registration**: Registered with ElevenLabs as "callstart"
✅ **Secret Configuration**: Webhook secret configured in Supabase
✅ **Database Integration**: All tables and relationships ready

## Next Steps

1. Test the complete onboarding flow
2. Monitor webhook logs for any issues
3. Adjust agent prompts based on user feedback
4. Implement additional goal extraction using MCP tools
5. Enhance agent matching algorithm with conversation data

The webhook system is now fully configured and ready for production use!