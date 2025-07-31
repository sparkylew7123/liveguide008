# Complete List of Compromised API Keys

## CRITICAL: These keys must be revoked immediately in ElevenLabs dashboard

### ElevenLabs API Keys (Found in git history)
1. **API Key #1**: `sk_e8ceabd5643db57e9705819fee38276e139b7dd9eee23530`
   - Found in: `scripts/configure-agent-tools.ts` (line 5)
   - Found in: `scripts/upload-knowledge-to-elevenlabs.ts` (line 7)
   - Status: Removed from code, but exists in git history

2. **API Key #2**: `sk_f084342b4b7d26a0b93f8f3703df6f7a325502416b043a65`
   - Found in: `WEBHOOK_CONFIG.md` (line 58)
   - Status: Removed from code, but exists in git history

### ElevenLabs Webhook Secrets (Found in git history)
1. **Webhook Secret #1**: `wsec_ca9bf28bcec74a06e7e72aebfa306621eb019dc75fb54c7b79ba15b32d0f7d91`
   - Found in: `src/lib/elevenlabs-webhook.ts` (line 131)
   - Found in: `WEBHOOK_CONFIG.md` (line 60)
   - Status: Removed from code, but exists in git history

2. **Webhook Secret #2**: `wsec_027e0bbe730f62aac78d910ebc80fda85950f280f57d3f540fabec2d28e521ac`
   - Found in: `deploy-webhook.sh` (line 7)
   - Status: Removed from code, but exists in git history

## Revocation Steps

### 1. Log in to ElevenLabs Dashboard
- Go to: https://elevenlabs.io/
- Navigate to: Profile Settings → API Keys

### 2. Delete ALL Listed API Keys
- Delete: `sk_e8ceabd5643db57e9705819fee38276e139b7dd9eee23530`
- Delete: `sk_f084342b4b7d26a0b93f8f3703df6f7a325502416b043a65`

### 3. Revoke Webhook Secrets
- Navigate to: Conversational AI → Webhooks
- Delete/regenerate secrets for any webhooks using the compromised secrets

### 4. Generate New Credentials
- Create a new API key with appropriate name (e.g., "LiveGuide Production - Secure")
- Generate a new webhook secret
- Store these securely and NEVER commit to git

## Files That Contained Exposed Keys
1. `scripts/configure-agent-tools.ts` - Hardcoded API key as fallback
2. `scripts/upload-knowledge-to-elevenlabs.ts` - Hardcoded API key as fallback
3. `src/lib/elevenlabs-webhook.ts` - Hardcoded webhook secret as fallback
4. `WEBHOOK_CONFIG.md` - Exposed API key and webhook secret in documentation
5. `deploy-webhook.sh` - Hardcoded webhook secret in deployment script

## Git History Exposure
All these keys have been committed to git and pushed to the GitHub repository at:
https://github.com/sparkylew7123/liveguide008.git

This means they are permanently stored in git history unless the history is rewritten.

## Next Steps After Revocation
1. Update all environment variables locally
2. Update Netlify environment variables
3. Update Supabase secrets
4. Clean git history using one of these methods:
   - BFG Repo-Cleaner (recommended)
   - git filter-branch
   - Create a new repository

## Prevention Measures
1. Never use hardcoded fallbacks for API keys
2. Use pre-commit hooks to scan for secrets
3. Add secret scanning to CI/CD pipeline
4. Regular security audits