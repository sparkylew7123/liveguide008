# Development Workflow with Supabase Branches

## Overview

This project uses Supabase branching for database development, providing isolated database environments that sync with your Git workflow.

## Current Setup

### Environments

1. **Production Database**
   - URL: `https://aesefwyijcsynbbhozhb.supabase.co`
   - Branch: `main`
   - Used for: Live production application

2. **Development Branch**
   - URL: `https://hlwxmfwrksflvcacjafg.supabase.co`
   - Branch: `dev`
   - Used for: Development and testing
   - Created: August 2, 2025

## Quick Start

### Switching Between Environments

```bash
# Switch to development branch
npm run use:dev

# Switch to production database
npm run use:prod

# Start development server with dev branch
npm run dev:branch
```

## Environment Files

- `.env.production` - Production database credentials (DO NOT EDIT)
- `.env.development` - Development branch credentials
- `.env.local` - Active environment (automatically updated by npm scripts)

All environment files are git-ignored for security.

## Database Passwords

- **Production**: `ixnRQI6HC6SRKL77`
- **Development**: `VM5pboJJDOfwle3s`

## MCP Server Configuration

The `.mcp.json` file now includes both environments:

- `supabase-dev` - Development branch MCP server
- `supabase-prod` - Production database MCP server

Claude will use the appropriate server based on your current task.

## Development Workflow

### 1. Start Development

```bash
# Ensure you're on the dev branch
git checkout dev

# Switch to development database
npm run use:dev

# Start development server
npm run dev
```

### 2. Database Changes

When making database changes:

1. **Via MCP Server**: Use the `supabase-dev` MCP server for migrations
2. **Via SQL**: Connect to `db.hlwxmfwrksflvcacjafg.supabase.co`
3. **Via Dashboard**: Select the `dev` branch in Supabase dashboard

### 3. Testing Changes

The development branch has the full production schema, so you can:
- Test migrations safely
- Experiment with schema changes
- Validate data transformations

### 4. Promoting to Production

When ready to deploy:

1. Ensure all migrations are captured in `supabase/migrations/`
2. Create a pull request from `dev` to `main`
3. Once merged, the database changes will automatically deploy

## Direct Database Access

### Development Branch
```bash
PGPASSWORD=VM5pboJJDOfwle3s psql \
  -h db.hlwxmfwrksflvcacjafg.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres
```

### Production Database
```bash
PGPASSWORD=ixnRQI6HC6SRKL77 psql \
  -h db.aesefwyijcsynbbhozhb.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres
```

## Backup Strategy

### Manual Backups

```bash
# Backup production
supabase db dump --linked -p "ixnRQI6HC6SRKL77" \
  -f supabase/backups/production_$(date +%Y%m%d_%H%M%S).sql

# Backup development
PGPASSWORD=VM5pboJJDOfwle3s pg_dump \
  -h db.hlwxmfwrksflvcacjafg.supabase.co \
  -p 5432 \
  -U postgres \
  postgres > supabase/backups/dev_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
# Restore to development
PGPASSWORD=VM5pboJJDOfwle3s psql \
  -h db.hlwxmfwrksflvcacjafg.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f supabase/backups/backup_file.sql
```

## Branch Management

### Benefits of Branching

1. **Isolated Development**: Test changes without affecting production
2. **Automatic Sync**: Schema changes sync when merging Git branches
3. **Preview Deployments**: Each PR can have its own database
4. **Easy Rollback**: PITR enabled for recovery

### Costs

- Development branch: $0.01344/hour (~$9.68/month)
- Remember to delete unused branches

### Creating New Branches

1. Go to Supabase dashboard
2. Click branch selector
3. Create new branch from `main`
4. Update `.env` files with new credentials
5. Apply schema if needed

## Troubleshooting

### Connection Issues

1. **Wrong password**: Check you're using the correct password for the branch
2. **Pooler vs Direct**: Use direct connection (`db.*.supabase.co`) for migrations
3. **API vs Database**: API connections work even if database is empty

### Schema Sync Issues

1. New branches start empty
2. Apply production backup to sync schema
3. Use `supabase db push` after linking to correct project

### MCP Server Issues

1. Restart Claude after updating `.mcp.json`
2. Ensure service role keys are correct
3. Check server logs for connection errors

## Best Practices

1. **Always test on dev branch first**
2. **Keep migrations in version control**
3. **Document breaking changes**
4. **Regular backups before major changes**
5. **Use meaningful commit messages for database changes**

## Security Notes

- Never commit `.env` files
- Rotate keys if exposed
- Use read-only credentials where possible
- Enable RLS policies on all tables