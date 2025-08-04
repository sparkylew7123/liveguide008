#!/bin/bash

# Seed script for development branch database
# This script uses the development branch connection string

echo "Seeding development branch database for mark.lewis@sparkytek.com..."

# Development branch connection string from .env.local
DEV_DB_URI="postgres://postgres.hlwxmfwrksflvcacjafg:VM5pboJJDOfwle3s@aws-0-eu-west-2.pooler.supabase.com:6543/postgres"

# Run the seed script on the dev branch database
psql "$DEV_DB_URI" -f ./scripts/seed-mark-lewis-final.sql

echo "Seeding complete!"