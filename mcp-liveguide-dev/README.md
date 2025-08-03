# MCP LiveGuide Dev Server

A Model Context Protocol (MCP) server for LiveGuide development, providing direct access to Supabase database operations and graph functionality.

## Features

- **Database Operations**: Execute SQL queries, list tables, apply migrations
- **Graph Operations**: Create/update/delete nodes and edges
- **Knowledge Search**: Semantic search through knowledge base
- **Type Safety**: Full TypeScript support with Zod validation

## Setup

1. Install dependencies:
```bash
cd mcp-liveguide-dev
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

3. Build the server:
```bash
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "liveguide-dev": {
      "command": "node",
      "args": ["/path/to/mcp-liveguide-dev/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your_supabase_url",
        "SUPABASE_ANON_KEY": "your_anon_key"
      }
    }
  }
}
```

### Development Mode

```bash
npm run dev
```

## Available Tools

### execute_sql
Execute raw SQL queries:
```typescript
{
  "query": "SELECT * FROM graph_nodes LIMIT 10"
}
```

### list_tables
List database tables:
```typescript
{
  "schemas": ["public", "auth"]
}
```

### apply_migration
Apply database migrations:
```typescript
{
  "name": "add_embedding_column",
  "query": "ALTER TABLE graph_nodes ADD COLUMN embedding vector(1536)"
}
```

### graph_operation
Perform graph operations:
```typescript
{
  "operation": "createNode",
  "data": {
    "node_type": "concept",
    "label": "Machine Learning",
    "description": "AI/ML concepts"
  }
}
```

### search_knowledge
Semantic search:
```typescript
{
  "query": "coaching strategies",
  "limit": 10
}
```

## Security

- Uses Supabase Row Level Security (RLS)
- Service role key should only be used in development
- Always scope operations by user_id in production

## Development

The server is built with:
- TypeScript for type safety
- Zod for runtime validation
- MCP SDK for protocol compliance
- Supabase JS client for database access

## License

MIT