#!/bin/bash

# Test storage upload with service role key
# Replace with your actual values

SUPABASE_URL="https://aesefwyijcsynbbhozhb.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlc2Vmd3lpamNzeW5iYmhvemhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzMyMTM1MiwiZXhwIjoyMDYyODk3MzUyfQ.VSFwIgrVgRcVXfnYWS-JrfhJDdUsZktAEB-l6eNBmaE"
FILE_PATH="test.txt"

# Create a test file
echo "Test knowledge base content" > test.txt

# Upload using service role key
curl -X POST \
  "${SUPABASE_URL}/storage/v1/object/documents/knowledge/test-agent/test.txt" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: text/plain" \
  --data-binary @test.txt

# Check if file exists
curl -X GET \
  "${SUPABASE_URL}/storage/v1/object/documents/knowledge/test-agent/test.txt" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}"