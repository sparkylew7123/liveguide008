#!/bin/bash

# Deploy ElevenLabs webhook with environment variable
echo "Deploying ElevenLabs webhook Edge Function..."

# Set the webhook secret as an environment variable for the function
npx supabase secrets set ELEVENLABS_WEBHOOK_SECRET=***REMOVED*** --project-ref aesefwyijcsynbbhozhb

# Deploy the function
npx supabase functions deploy elevenlabs-webhook --no-verify-jwt --project-ref aesefwyijcsynbbhozhb

echo "Deployment complete!"
echo ""
echo "Webhook URL: https://aesefwyijcsynbbhozhb.supabase.co/functions/v1/elevenlabs-webhook"
echo ""
echo "Next steps:"
echo "1. Verify the function is deployed in Supabase dashboard"
echo "2. Test with a conversation in ElevenLabs"
echo "3. Check logs: npx supabase functions logs elevenlabs-webhook --project-ref aesefwyijcsynbbhozhb"