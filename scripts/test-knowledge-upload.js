const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testKnowledgeUpload() {
  try {
    console.log('Testing knowledge upload...\n');

    // 1. Check if tables exist
    console.log('1. Checking if tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('agent_knowledge_bases')
      .select('*')
      .limit(1);

    if (tablesError) {
      console.error('Error checking tables:', {
        message: tablesError.message,
        code: tablesError.code,
        details: tablesError.details,
        hint: tablesError.hint
      });
      
      // Try to check if the migration needs to be applied
      console.log('\nTables might not exist. Please run the migration in apply_rag_migrations.sql');
      return;
    }

    console.log('✓ Tables exist\n');

    // 2. Check for existing knowledge base
    const agentId = 'SuIlXQ4S6dyjrNViOrQ8';
    console.log(`2. Checking for knowledge base for agent ${agentId}...`);
    
    const { data: kb, error: kbError } = await supabase
      .from('agent_knowledge_bases')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (kbError && kbError.code !== 'PGRST116') {
      console.error('Error checking knowledge base:', kbError);
      return;
    }

    if (kb) {
      console.log('✓ Knowledge base found:', {
        id: kb.id,
        name: kb.name,
        document_count: kb.document_count
      });
    } else {
      console.log('✗ No knowledge base found for agent\n');
      
      // 3. Create knowledge base
      console.log('3. Creating knowledge base...');
      const { data: newKb, error: createError } = await supabase
        .from('agent_knowledge_bases')
        .insert({
          agent_id: agentId,
          name: 'Maya Coaching Knowledge Base',
          description: 'Knowledge base for Maya AI coach',
          document_count: 0,
          total_chunks: 0,
          indexing_status: 'pending'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating knowledge base:', {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint
        });
        return;
      }

      console.log('✓ Knowledge base created:', {
        id: newKb.id,
        name: newKb.name
      });
    }

    // 4. Test creating a document
    console.log('\n4. Testing document creation...');
    const testContent = 'This is a test document for Maya\'s knowledge base.';
    
    const { data: existingKb } = await supabase
      .from('agent_knowledge_bases')
      .select('id')
      .eq('agent_id', agentId)
      .single();

    const { data: doc, error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        knowledge_base_id: existingKb.id,
        title: 'Test Document',
        content: testContent,
        document_type: 'text',
        source_url: 'test/document.txt',
        content_hash: `test-${Date.now()}`,
        chunk_count: 0,
        metadata: { test: true }
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', {
        message: docError.message,
        code: docError.code,
        details: docError.details,
        hint: docError.hint
      });
      return;
    }

    console.log('✓ Document created successfully:', {
      id: doc.id,
      title: doc.title
    });

    // 5. Check storage bucket
    console.log('\n5. Checking storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
    } else {
      const documentsBucket = buckets.find(b => b.name === 'documents');
      if (documentsBucket) {
        console.log('✓ Documents bucket exists');
      } else {
        console.log('✗ Documents bucket not found, creating...');
        const { error: createBucketError } = await supabase.storage.createBucket('documents', {
          public: false,
          allowedMimeTypes: ['text/plain', 'text/markdown', 'application/pdf', 'text/html']
        });
        
        if (createBucketError) {
          console.error('Error creating bucket:', createBucketError);
        } else {
          console.log('✓ Documents bucket created');
        }
      }
    }

    console.log('\n✅ All tests passed! The knowledge upload should work now.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testKnowledgeUpload().catch(console.error);