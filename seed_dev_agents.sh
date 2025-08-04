#!/bin/bash

# Load environment variables from .env.local
export $(grep -v '^#' .env.local | xargs)

echo "Seeding agent_personae data to dev instance..."

# Use the DATABASE_URI from .env.local
psql "$DATABASE_URI" < supabase/seed_agent_personae_dev.sql

if [ $? -eq 0 ]; then
    echo "✅ Successfully seeded agent data to dev instance!"
    echo "Check your dev Supabase Studio at https://supabase.com/dashboard/project/hlwxmfwrksflvcacjafg/editor/agent_personae"
else
    echo "❌ Failed to seed data. Please check your DATABASE_URI in .env.local"
fi