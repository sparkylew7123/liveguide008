#!/bin/bash

echo "Testing production knowledge upload health..."
echo ""

# Test health endpoint
echo "1. Testing health endpoint:"
curl -s https://liveguide.ai/api/knowledge/health | jq .

echo ""
echo "2. Testing if you're authenticated:"
echo "Please ensure you're logged in at https://liveguide.ai/login"
echo ""

echo "3. To test upload manually, use this curl command after logging in:"
echo "curl -X POST https://liveguide.ai/api/knowledge/upload \\"
echo "  -H 'Cookie: [YOUR-AUTH-COOKIE]' \\"
echo "  -F 'file=@test.md' \\"
echo "  -F 'agentId=SuIlXQ4S6dyjrNViOrQ8' \\"
echo "  -F 'category=Test' \\"
echo "  -F 'metadata={\"test\":true}'"