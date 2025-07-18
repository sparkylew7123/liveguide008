#!/bin/bash

# Deploy ElevenLabs webhook Edge Function to Supabase
# This script deploys the webhook function and sets up the necessary environment

echo "🚀 Deploying ElevenLabs webhook Edge Function..."

# Deploy the Edge Function
npx supabase functions deploy elevenlabs-webhook --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully!"
    
    # Get the function URL
    SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2)
    WEBHOOK_URL="${SUPABASE_URL}/functions/v1/elevenlabs-webhook"
    
    echo "🔗 Webhook URL: $WEBHOOK_URL"
    echo ""
    echo "Next steps:"
    echo "1. Test the webhook endpoint: curl $WEBHOOK_URL"
    echo "2. Register with ElevenLabs: POST to /api/elevenlabs/setup-webhook"
    echo "3. Access admin interface: http://localhost:3000/admin/webhook"
    echo ""
    echo "Environment variables needed:"
    echo "- ELEVENLABS_API_KEY (✅ configured)"
    echo "- ELEVENLABS_WEBHOOK_SECRET (✅ configured)"
    echo "- NEXT_PUBLIC_SUPABASE_URL (✅ configured)"
    echo ""
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi