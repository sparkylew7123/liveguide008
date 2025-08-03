#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { createSupabaseClient, executeSql } from './supabase-client.js';
import { 
  GraphOperations,
  CreateNodeSchema,
  UpdateNodeSchema,
  CreateEdgeSchema,
  DeleteNodeSchema,
  DeleteEdgeSchema
} from './tools/graph-operations.js';

dotenv.config();

const ExecuteSqlSchema = z.object({
  query: z.string().describe('The SQL query to execute'),
});

const ListTablesSchema = z.object({
  schemas: z.array(z.string()).optional().default(['public']).describe('List of schemas to include'),
});

const ApplyMigrationSchema = z.object({
  name: z.string().describe('The name of the migration in snake_case'),
  query: z.string().describe('The SQL query to apply'),
});

const GraphOperationSchema = z.object({
  operation: z.enum(['createNode', 'updateNode', 'createEdge', 'deleteNode', 'deleteEdge']),
  data: z.record(z.any()).describe('Operation-specific data'),
});

const SearchDocsSchema = z.object({
  query: z.string().describe('Search query for documentation'),
  limit: z.number().optional().default(5),
});

class LiveGuideMcpServer {
  private server: Server;
  private supabase: any;
  private graphOps: GraphOperations;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-liveguide-dev',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.supabase = createSupabaseClient();
    this.graphOps = new GraphOperations(this.supabase);

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'execute_sql',
          description: 'Execute raw SQL query in the database',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The SQL query to execute',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_tables',
          description: 'List all tables in specified schemas',
          inputSchema: {
            type: 'object',
            properties: {
              schemas: {
                type: 'array',
                items: { type: 'string' },
                default: ['public'],
                description: 'List of schemas to include',
              },
            },
          },
        },
        {
          name: 'apply_migration',
          description: 'Apply a database migration',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name of the migration in snake_case',
              },
              query: {
                type: 'string',
                description: 'The SQL query to apply',
              },
            },
            required: ['name', 'query'],
          },
        },
        {
          name: 'graph_operation',
          description: 'Perform graph operations (create/update nodes and edges)',
          inputSchema: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['createNode', 'updateNode', 'createEdge', 'deleteNode', 'deleteEdge'],
                description: 'The operation to perform',
              },
              data: {
                type: 'object',
                description: 'Operation-specific data',
              },
            },
            required: ['operation', 'data'],
          },
        },
        {
          name: 'search_knowledge',
          description: 'Search knowledge base using semantic search',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              limit: {
                type: 'number',
                default: 5,
                description: 'Maximum results to return',
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'execute_sql': {
            const { query } = ExecuteSqlSchema.parse(args);
            const data = await executeSql(this.supabase, query);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'list_tables': {
            const { schemas } = ListTablesSchema.parse(args);
            const query = `
              SELECT table_schema, table_name 
              FROM information_schema.tables 
              WHERE table_schema = ANY($1::text[]) 
              AND table_type = 'BASE TABLE'
              ORDER BY table_schema, table_name;
            `;
            
            const data = await executeSql(this.supabase, query, [schemas]);
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'apply_migration': {
            const { name, query } = ApplyMigrationSchema.parse(args);
            
            await executeSql(this.supabase, query);
            
            try {
              const migrationRecord = {
                name,
                executed_at: new Date().toISOString(),
                sql: query,
              };
              
              await this.supabase
                .from('_migrations')
                .insert(migrationRecord);
            } catch (error) {
              // Migration table might not exist, but migration was applied
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Migration '${name}' applied successfully`,
                },
              ],
            };
          }

          case 'graph_operation': {
            const { operation, data } = GraphOperationSchema.parse(args);
            
            let result;
            switch (operation) {
              case 'createNode': {
                const nodeData = CreateNodeSchema.parse(data);
                result = await this.graphOps.createNode(nodeData);
                break;
              }
                
              case 'updateNode': {
                const nodeData = UpdateNodeSchema.parse(data);
                result = await this.graphOps.updateNode(nodeData);
                break;
              }
                
              case 'createEdge': {
                const edgeData = CreateEdgeSchema.parse(data);
                result = await this.graphOps.createEdge(edgeData);
                break;
              }
                
              case 'deleteNode': {
                const nodeData = DeleteNodeSchema.parse(data);
                result = await this.graphOps.deleteNode(nodeData);
                break;
              }
                
              case 'deleteEdge': {
                const edgeData = DeleteEdgeSchema.parse(data);
                result = await this.graphOps.deleteEdge(edgeData);
                break;
              }
                
              default:
                throw new Error(`Unknown operation: ${operation}`);
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          }

          case 'search_knowledge': {
            const { query, limit } = SearchDocsSchema.parse(args);
            
            const { data, error } = await this.supabase
              .rpc('search_knowledge_chunks', {
                query_text: query,
                match_count: limit,
              });
            
            if (error) throw error;
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${error.errors.map((e: any) => e.message).join(', ')}`
          );
        }
        
        if (error instanceof McpError) {
          throw error;
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LiveGuide MCP server running on stdio');
  }
}

const server = new LiveGuideMcpServer();
server.run().catch(console.error);