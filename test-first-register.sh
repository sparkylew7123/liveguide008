#!/bin/bash

echo "Testing Payload CMS first user registration..."
echo "=========================================="

# Test the first-register endpoint
curl -X POST http://localhost:3000/api/users/first-register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo -e "\n\nTesting login with created user..."
echo "=========================================="

# Test login
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v