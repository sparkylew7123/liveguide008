#!/bin/bash

# Verify Embedding Functions Deployment
# This script checks if all embedding functions are properly deployed and accessible

set -e

echo "🔍 Verifying Embedding Functions Deployment"
echo "==========================================="
echo

# Check if required environment variables are set
echo "1. Checking environment variables..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
    exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY not set"
    exit 1
fi

echo "✅ Environment variables configured"
echo

# Check if Edge Functions are deployed
echo "2. Checking Edge Functions deployment..."

# Test generate-embeddings function
echo "   Testing generate-embeddings function..."
GENERATE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/generate-embeddings")

if [ "$GENERATE_RESPONSE" = "200" ]; then
    echo "   ✅ generate-embeddings function is accessible"
else
    echo "   ❌ generate-embeddings function not accessible (HTTP $GENERATE_RESPONSE)"
fi

# Test process-embedding-queue function
echo "   Testing process-embedding-queue function..."
QUEUE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/process-embedding-queue")

if [ "$QUEUE_RESPONSE" = "200" ]; then
    echo "   ✅ process-embedding-queue function is accessible"
else
    echo "   ❌ process-embedding-queue function not accessible (HTTP $QUEUE_RESPONSE)"
fi

echo

# Check if database functions are available
echo "3. Checking database functions..."

# You can extend this to test database functions if needed
echo "   Database function testing requires authentication - use CLI tools for verification"
echo "   Run: node scripts/manage-embeddings.js status"
echo

# Check if migration was applied
echo "4. Checking migration status..."
echo "   Verify that migration 20250803_add_embedding_management_functions.sql was applied"
echo "   Run: supabase db status"
echo

# Summary
echo "✅ Basic deployment verification completed"
echo
echo "Next steps:"
echo "1. Apply the migration: supabase db push"
echo "2. Deploy functions: supabase functions deploy generate-embeddings"
echo "3. Deploy functions: supabase functions deploy process-embedding-queue"
echo "4. Test with CLI: node scripts/manage-embeddings.js status"
echo "5. Run tests: node scripts/test-embeddings.js"