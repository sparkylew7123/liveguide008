# Claude Desktop Configuration

To use this MCP server with Claude Desktop, add the following to your Claude Desktop configuration file:

## Configuration File Location

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

## Configuration

```json
{
  "mcpServers": {
    "liveguide-dev": {
      "command": "node",
      "args": ["/Users/marklewis/CascadeProjects/liveguide008/mcp-liveguide-dev/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://aesefwyijcsynbbhozhb.supabase.co",
        "SUPABASE_ANON_KEY": "your-supabase-anon-key-here",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
      }
    }
  }
}
```

## Environment Variables

You'll need to replace the following with your actual Supabase credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (optional, for admin operations)

## Usage

After adding the configuration and restarting Claude Desktop, you can use the MCP server tools:

```
# Execute SQL queries
execute_sql({ query: "SELECT * FROM graph_nodes LIMIT 5" })

# List tables
list_tables({ schemas: ["public"] })

# Create a graph node
graph_operation({
  operation: "createNode",
  data: {
    node_type: "concept",
    label: "Machine Learning",
    description: "Core ML concepts"
  }
})
```