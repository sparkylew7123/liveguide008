# Claude Code Project Memory

## Project Overview
LiveGuide AI - A voice-enabled AI coaching platform using Next.js, Supabase, and ElevenLabs

## Recent Work Summary (2025-07-25)

### Completed Tasks

1. **Fixed Supabase Security Warnings**
   - Created migration to fix function search paths (9 functions)
   - Moved vector extension from public to extensions schema
   - Updated anonymous access policies for better security
   - Configured OTP expiry to 30 minutes (1800 seconds)
   - Enabled leaked password protection
   - Successfully pushed migrations to remote Supabase instance

2. **Fixed Login/CAPTCHA Issues**
   - Updated CAPTCHA component to use environment variable
   - Changed from hardcoded site key to `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - Issue resolved and login now working properly

3. **Fixed Double Voice Issue in Onboarding**
   - Problem: Both browser TTS and ElevenLabs voices playing simultaneously
   - Root cause: Race condition where browser fallback was speaking even when ElevenLabs was connected
   - Solutions implemented:
     - Added safeguards to prevent browser TTS when ElevenLabs is connected
     - Cancel any browser speech when ElevenLabs connects
     - Added 1.5s delay for first phase to allow ElevenLabs greeting
     - Enhanced logging for debugging voice systems
   - File modified: `src/components/onboarding/TypeformGoalSelection.tsx`

4. **Configured OpenAI API Key for RAG Features**
   - Added OPENAI_API_KEY to .env.local and Netlify environment variables
   - Enables knowledge base embeddings and RAG functionality
   - Resolves build errors related to missing API key

### Pending Tasks

1. **Verify Security Warnings Resolved in Production**
   - Need to check Supabase dashboard to confirm all security warnings are cleared
   - Verify migrations were applied successfully

### Key Files Modified
- `/Users/marklewis/CascadeProjects/liveguide008/supabase/migrations/20250722_security_fixes.sql`
- `/Users/marklewis/CascadeProjects/liveguide008/supabase/config.toml`
- `/Users/marklewis/CascadeProjects/liveguide008/src/components/auth/LoginForm.tsx`
- `/Users/marklewis/CascadeProjects/liveguide008/src/components/onboarding/TypeformGoalSelection.tsx`

### Environment Variables in Use
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile for CAPTCHA
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` - ElevenLabs agent ID for voice
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENAI_API_KEY` - OpenAI API key for RAG embeddings (now configured)

### Commands to Run
- `npm run lint` - Check for linting issues
- `npm run build` - Build the project (now working with OPENAI_API_KEY configured)
- `supabase db push` - Push migrations to remote database

### Known Issues
- Multiple linting warnings across the codebase (not critical)
- RAG features require vector extension and proper database setup

### Build Status
- ✅ Build successful after adding OPENAI_API_KEY
- All 43 pages generated successfully
- Ready for deployment to Netlify

### Technical Context
- Using ElevenLabs WebSocket API for real-time voice conversations
- Conversation phases system for guided onboarding
- Fallback to browser speech synthesis when ElevenLabs unavailable
- Real-time goal detection via webhooks during conversations
- RAG system implemented with:
  - OpenAI text-embedding-3-small model (1536 dimensions)
  - pgvector for similarity search
  - Hybrid search (70% semantic, 30% keyword)
  - Document chunking with overlap
  - Knowledge base management via admin interface