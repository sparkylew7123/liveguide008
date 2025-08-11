# Google OAuth Setup Guide for LiveGuide

## Overview
This guide explains how to properly configure Google OAuth for both development and production environments.

## Important: Environment Variable Naming

**Supabase Dashboard expects**: `AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
**Your .env files use**: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`

The environment variables in your .env files are for your Next.js application, NOT for Supabase. You must manually configure OAuth in the Supabase dashboard.

## Current OAuth Credentials

```
Client ID: 17241085980-6q4rt8l6o9pv5h93kljneq4eigl9f9eb.apps.googleusercontent.com
Secret: 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
```

## Setup Steps

### 1. Configure Supabase Development Environment

1. Go to: https://supabase.com/dashboard/project/hlwxmfwrksflvcacjafg/auth/providers
2. Find "Google" in the providers list
3. Toggle it ON
4. Enter:
   - **Client ID**: `17241085980-6q4rt8l6o9pv5h93kljneq4eigl9f9eb.apps.googleusercontent.com`
   - **Client Secret**: `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`
5. Save changes

### 2. Configure Supabase Production Environment

1. Go to: https://supabase.com/dashboard/project/aesefwyijcsynbbhozhb/auth/providers
2. Repeat the same steps as development

### 3. Google Cloud Console Configuration

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Add these Authorized redirect URIs:

**For Development:**
```
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://hlwxmfwrksflvcacjafg.supabase.co/auth/v1/callback
```

**For Production:**
```
https://your-production-domain.com/auth/callback
https://aesefwyijcsynbbhozhb.supabase.co/auth/v1/callback
```

### 4. Environment Variables (for Next.js app)

These are already configured in your .env files and are used by your Next.js application:

**.env.local (Development)**
```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=17241085980-6q4rt8l6o9pv5h93kljneq4eigl9f9eb.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=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
```

**.env.production**
```env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=17241085980-6q4rt8l6o9pv5h93kljneq4eigl9f9eb.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=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
```

## Troubleshooting

### Error: "The OAuth client was not found"
- This means Google OAuth is not configured in Supabase dashboard
- Follow step 1 above to configure it

### Error: "Redirect URI mismatch"
- Check Google Cloud Console for correct redirect URIs
- Make sure you've added all required URIs from step 3

### Still not working?
1. Clear browser cache and cookies
2. Check that you're using the correct Client ID (verify there's no typo)
3. Make sure Google OAuth is enabled in Supabase dashboard
4. Verify the redirect URIs match exactly (including http vs https)

## Notes

- The environment variables in .env files are NOT automatically synced to Supabase
- Each Supabase project (dev/prod) must be configured separately
- Google OAuth credentials can be shared between dev and prod, but it's recommended to use separate ones for security