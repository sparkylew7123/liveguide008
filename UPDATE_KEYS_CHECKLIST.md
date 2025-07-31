# API Key Rotation Checklist

## 1. ElevenLabs Dashboard
- [ ] Log in to https://elevenlabs.io/
- [ ] Revoke old API keys:
  - `***REMOVED***`
  - `***REMOVED***`
- [ ] Generate new API key
- [ ] Generate new webhook secret

## 2. Update Local Environment (.env.local)
```bash
ELEVENLABS_API_KEY=your_new_api_key_here
ELEVENLABS_WEBHOOK_SECRET=your_new_webhook_secret_here
```

## 3. Update Netlify Environment Variables
- [ ] Go to Netlify Dashboard → Site Settings → Environment Variables
- [ ] Update `ELEVENLABS_API_KEY`
- [ ] Update `ELEVENLABS_WEBHOOK_SECRET`
- [ ] Trigger a new deployment

## 4. Update Supabase Secrets
```bash
# Update Supabase Edge Function secrets
npx supabase secrets set ELEVENLABS_API_KEY=your_new_api_key_here --project-ref aesefwyijcsynbbhozhb
npx supabase secrets set ELEVENLABS_WEBHOOK_SECRET=your_new_webhook_secret_here --project-ref aesefwyijcsynbbhozhb
```

## 5. Test Everything
- [ ] Test local development with new keys
- [ ] Test voice chat functionality
- [ ] Verify webhook integration
- [ ] Check Netlify deployment

## 6. Clean Git History (CRITICAL)
After confirming everything works with new keys, clean the git history to remove exposed keys permanently.