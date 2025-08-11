#!/bin/bash

# Test N8N ElevenLabs Webhook Integration
# Usage: ./test-n8n-webhook.sh [webhook-url]

WEBHOOK_URL="${1:-https://n8n-marklewis.fly.dev/webhook-test/elevenlabs-webhook}"

echo "Testing N8N Webhook at: $WEBHOOK_URL"
echo "================================"

# Test payload simulating ElevenLabs data
PAYLOAD='{
  "conversationId": "test_'$(date +%s)'",
  "userId": "907f679d-b36a-42a8-8b60-ce0d9cc11726",
  "transcript": "I want to learn Spanish by December for my Barcelona trip, and I need to improve my public speaking for a work presentation next quarter.",
  "analysis": {
    "goals": [
      {
        "text": "Learn Spanish for Barcelona trip",
        "title": "Spanish Fluency",
        "timescale": "12 months"
      },
      {
        "text": "Master public speaking for work",
        "title": "Presentation Skills",
        "timescale": "3 months"
      }
    ],
    "insights": [
      {
        "text": "Both goals involve communication skills",
        "title": "Communication Focus"
      }
    ]
  }
}'

echo "Sending test payload..."
echo ""

# Send the webhook
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")

echo "Response Status: $HTTP_STATUS"
echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

# Check if successful
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo ""
  echo "✅ Webhook test successful!"
  echo ""
  echo "Now checking if nodes were created in the database..."
  
  # Test if the MCP server processed the data
  curl -s -X POST https://hlwxmfwrksflvcacjafg.supabase.co/functions/v1/mcp-server \
    -H "Content-Type: application/json" \
    -d '{
      "jsonrpc": "2.0",
      "id": 1,
      "method": "tools/call",
      "params": {
        "name": "get_recent_nodes",
        "arguments": {
          "instructions": "Get the 5 most recent nodes",
          "userId": "907f679d-b36a-42a8-8b60-ce0d9cc11726",
          "limit": 5
        }
      }
    }' | jq '.result[] | {type: .node_type, label: .label, created: .created_at}'
else
  echo ""
  echo "❌ Webhook test failed with status $HTTP_STATUS"
  echo "Check your N8N instance is running and accessible"
fi