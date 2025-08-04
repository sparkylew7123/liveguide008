# Graph Node Embedding Integration Guide

This guide walks you through deploying and using the new embedding generation system for LiveGuide graph nodes.

## 🚀 Quick Start

1. **Apply the database migration**:
   ```bash
   supabase db push
   ```

2. **Deploy the Edge Functions**:
   ```bash
   supabase functions deploy generate-embeddings
   supabase functions deploy process-embedding-queue
   ```

3. **Check system status**:
   ```bash
   node scripts/manage-embeddings.js status
   ```

4. **Generate embeddings for all pending nodes**:
   ```bash
   node scripts/manage-embeddings.js process-queue --max-nodes=100
   ```

## 📁 New Files Created

### Edge Functions
- `/supabase/functions/generate-embeddings/index.ts` - On-demand embedding generation
- `/supabase/functions/process-embedding-queue/index.ts` - Automated batch processing

### Database Migration
- `/supabase/migrations/20250803_add_embedding_management_functions.sql` - Helper functions

### Management Tools
- `/scripts/manage-embeddings.js` - CLI management tool
- `/scripts/test-embeddings.js` - Test suite
- `/scripts/verify-embedding-deployment.sh` - Deployment verification

### Documentation
- `/supabase/functions/README-embeddings.md` - Comprehensive documentation

## 🔧 Configuration Required

### Environment Variables
Ensure these are set in your Supabase project:

```bash
OPENAI_API_KEY=sk-...                    # Your OpenAI API key
SUPABASE_SCHEDULED_SECRET=random-secret  # For automated processing
```

### OpenAI API Key Setup
1. Get API key from https://platform.openai.com/
2. Add to Supabase Edge Functions secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-key-here
   ```

## 📊 Current System Status

Based on your requirements, you have:
- **88 goal nodes** without embeddings
- **12 emotion nodes** without embeddings
- **100 total nodes** needing processing

## 🎯 Usage Examples

### Generate embeddings for a specific user
```bash
node scripts/manage-embeddings.js generate userId123
```

### Process the entire queue (recommended for initial setup)
```bash
node scripts/manage-embeddings.js process-queue --max-nodes=100 --batch-size=20
```

### Check embedding status
```bash
node scripts/manage-embeddings.js status
```

### Force regenerate specific nodes
```bash
node scripts/manage-embeddings.js generate --nodes=uuid1,uuid2,uuid3 --force
```

## 🔄 Automated Processing

For ongoing maintenance, you can set up automated processing:

### Option 1: Supabase Cron Jobs (Recommended)
Set up a cron job in your Supabase dashboard to call the queue processor:

```sql
SELECT cron.schedule(
    'process-embeddings',
    '0 */6 * * *',  -- Every 6 hours
    $$
    SELECT net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/process-embedding-queue',
        headers := '{"X-Scheduled-Secret": "your-secret", "Content-Type": "application/json"}'::jsonb,
        body := '{"maxNodes": 50, "batchSize": 10}'::jsonb
    );
    $$
);
```

### Option 2: External Cron Job
```bash
# Add to your server's crontab
0 */6 * * * curl -X POST \
  -H "X-Scheduled-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"maxNodes": 50, "batchSize": 10}' \
  https://your-project.supabase.co/functions/v1/process-embedding-queue
```

## 🔍 Monitoring

### Key Metrics to Track
1. **Queue Depth**: Number of nodes without embeddings
2. **Processing Success Rate**: Percentage of successful generations
3. **Error Count**: Failed embedding generations
4. **Token Usage**: OpenAI API costs
5. **Processing Time**: How long batch operations take

### Dashboard Queries
You can create monitoring dashboards using these queries:

```sql
-- Overall embedding status
SELECT * FROM get_embedding_queue_stats();

-- Nodes with errors
SELECT id, label, properties->>'embedding_error' as error
FROM graph_nodes 
WHERE properties ? 'embedding_error';

-- Recent processing activity
SELECT id, label, updated_at
FROM graph_nodes 
WHERE embedding IS NOT NULL 
ORDER BY updated_at DESC 
LIMIT 10;
```

## 🚨 Troubleshooting

### Common Issues

1. **OpenAI API Key Not Set**
   ```
   Error: OpenAI API key not configured
   ```
   **Solution**: Set the OPENAI_API_KEY in Supabase secrets

2. **Rate Limiting**
   ```
   Error: OpenAI API error: 429 Rate limit exceeded
   ```
   **Solution**: Reduce batch size or increase delays between batches

3. **Authentication Errors**
   ```
   Error: Invalid authentication
   ```
   **Solution**: Ensure proper JWT token in Authorization header

4. **Database Connection Issues**
   ```
   Error: Failed to fetch nodes for processing
   ```
   **Solution**: Check Supabase connection and RLS policies

### Debug Mode
Run with detailed logging:
```bash
DEBUG=1 node scripts/manage-embeddings.js status
```

### Clear Errors and Retry
If nodes have embedding errors:
```bash
node scripts/manage-embeddings.js clear-errors
node scripts/manage-embeddings.js process-queue --max-nodes=50
```

## 📈 Performance Optimization

### Batch Size Recommendations
- **Small projects** (<100 nodes): batch size 5-10
- **Medium projects** (100-1000 nodes): batch size 10-20
- **Large projects** (>1000 nodes): batch size 20-50

### Cost Optimization
- Use smaller batch sizes during development
- Process during off-peak hours for better rates
- Monitor token usage to avoid unexpected costs
- Consider caching frequently accessed embeddings

## 🔐 Security Considerations

1. **API Key Protection**: Never commit API keys to version control
2. **RLS Compliance**: User functions respect row-level security
3. **Input Validation**: All functions validate inputs
4. **Error Sanitization**: Errors don't leak sensitive information
5. **Rate Limiting**: Built-in protection against API abuse

## 🧪 Testing

### Run the Test Suite
```bash
node scripts/test-embeddings.js
```

### Manual Testing Steps
1. Create a test node without embeddings
2. Generate embeddings for the test node
3. Verify embedding was created with correct dimensions
4. Test similarity search functionality
5. Validate error handling with invalid inputs

## 📋 Integration Checklist

- [ ] Database migration applied (`supabase db push`)
- [ ] Edge functions deployed
- [ ] OpenAI API key configured
- [ ] Environment variables set
- [ ] Test suite passes
- [ ] Embedding generation works for sample nodes
- [ ] Queue processing completes successfully
- [ ] Monitoring queries return expected results
- [ ] Error handling tested
- [ ] Automated processing scheduled (optional)

## 🤝 Next Steps

After successful deployment:

1. **Generate Initial Embeddings**: Process your 100 existing nodes
2. **Integrate with Search**: Use the embeddings in your RAG pipeline
3. **Set Up Monitoring**: Track processing metrics
4. **Schedule Automation**: Set up regular queue processing
5. **Test Similarity Search**: Verify `find_similar_nodes` function works
6. **Performance Tuning**: Optimize batch sizes based on usage

## 📞 Support

If you encounter issues:

1. Check the deployment verification script output
2. Review the function logs in Supabase dashboard
3. Run the test suite to identify specific failures
4. Use the CLI status command to check queue health
5. Review the comprehensive documentation in README-embeddings.md

The system is designed to be robust and self-healing, with comprehensive error handling and monitoring capabilities.