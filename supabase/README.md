# Supabase Edge Functions

This directory contains Supabase Edge Functions that run on Deno runtime.

## Environment Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables in `.env.local`

## Edge Functions

### elevenlabs-webhook
Handles webhooks from ElevenLabs for real-time goal detection and conversation events.

### voice-proxy
Proxies WebSocket connections between the client and ElevenLabs API, adding authentication and monitoring.

### get-user-goals
Retrieves user goals from the database.

### save-session-summary
Saves conversation summaries and session data.

## Local Development

To run edge functions locally:

```bash
# Start all functions
supabase functions serve

# Start a specific function
supabase functions serve voice-proxy
```

## Deployment

Deploy all functions:
```bash
supabase functions deploy
```

Deploy a specific function:
```bash
supabase functions deploy voice-proxy
```

## Environment Variables

Edge functions use the `.env.local` file in this directory. The main differences from the root `.env.local`:

- No `NEXT_PUBLIC_` prefixes needed (edge functions don't use Next.js)
- Additional integrations like MCP, Obsidian, and n8n are configured here
- Edge functions have their own isolated environment

## Important Notes

- Edge functions run in Deno, not Node.js
- They have a 150MB memory limit and 60-second timeout by default
- Environment variables are injected at runtime
- CORS is handled by the `_shared/cors.ts` module