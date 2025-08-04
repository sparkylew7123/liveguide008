#!/bin/bash

# Apply agent_personae seed data to dev instance
echo "Applying agent_personae seed data to dev instance..."

# Check if we're linked to the dev project
CURRENT_PROJECT=$(supabase status --output json 2>/dev/null | jq -r '.LinkedProject // empty')

if [ "$CURRENT_PROJECT" != "hlwxmfwrksflvcacjafg" ]; then
    echo "Linking to dev project..."
    supabase link --project-ref hlwxmfwrksflvcacjafg
fi

# Apply the seed SQL
echo "Seeding agent_personae data..."
psql "$DATABASE_URI" < supabase/seed_agent_personae_dev.sql

echo "Done! Check your dev Supabase Studio to see the agents."