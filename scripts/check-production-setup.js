const { createClient } = require('@supabase/supabase-js');
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

async function checkProductionSetup() {
  console.log('🔍 Checking Production Setup for Knowledge Upload\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  let issues = [];
  let warnings = [];

  try {
    // 1. Check agent_knowledge_bases table
    console.log('1. Checking agent_knowledge_bases table...');
    const { data: kbTable, error: kbTableError } = await supabase
      .from('agent_knowledge_bases')
      .select('*')
      .limit(1);

    if (kbTableError) {
      issues.push('❌ agent_knowledge_bases table is missing or inaccessible');
      console.error('   Error:', kbTableError.message);
    } else {
      console.log('   ✅ Table exists');
      
      // Check for Maya's knowledge base
      const { data: mayaKb, error: mayaKbError } = await supabase
        .from('agent_knowledge_bases')
        .select('*')
        .eq('agent_id', 'SuIlXQ4S6dyjrNViOrQ8')
        .single();

      if (!mayaKb && mayaKbError?.code === 'PGRST116') {
        warnings.push('⚠️  Maya\'s knowledge base doesn\'t exist yet');
        console.log('   ⚠️  Maya\'s knowledge base not found');
      } else if (mayaKb) {
        console.log('   ✅ Maya\'s knowledge base exists');
      }
    }

    // 2. Check knowledge_documents table
    console.log('\n2. Checking knowledge_documents table...');
    const { data: docsTable, error: docsTableError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .limit(1);

    if (docsTableError) {
      issues.push('❌ knowledge_documents table is missing or inaccessible');
      console.error('   Error:', docsTableError.message);
    } else {
      console.log('   ✅ Table exists');
    }

    // 3. Check document_chunks table
    console.log('\n3. Checking document_chunks table...');
    const { data: chunksTable, error: chunksTableError } = await supabase
      .from('document_chunks')
      .select('*')
      .limit(1);

    if (chunksTableError) {
      issues.push('❌ document_chunks table is missing or inaccessible');
      console.error('   Error:', chunksTableError.message);
    } else {
      console.log('   ✅ Table exists');
    }

    // 4. Check storage bucket
    console.log('\n4. Checking storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      issues.push('❌ Unable to check storage buckets');
      console.error('   Error:', bucketsError.message);
    } else {
      const documentsBucket = buckets.find(b => b.name === 'documents');
      if (!documentsBucket) {
        issues.push('❌ documents storage bucket is missing');
        console.log('   ❌ Bucket not found');
      } else {
        console.log('   ✅ documents bucket exists');
      }
    }

    // 5. Check pgvector extension
    console.log('\n5. Checking pgvector extension...');
    const { data: extensions, error: extError } = await supabase
      .rpc('pg_extension_installed', { extname: 'vector' });

    if (extError) {
      console.log('   ⚠️  Unable to check pgvector extension');
      warnings.push('⚠️  Unable to verify pgvector extension');
    } else if (!extensions) {
      issues.push('❌ pgvector extension is not installed');
      console.log('   ❌ pgvector not installed');
    } else {
      console.log('   ✅ pgvector is installed');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY\n');

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ All checks passed! Production is ready for knowledge upload.');
    } else {
      if (issues.length > 0) {
        console.log('CRITICAL ISSUES (must fix):');
        issues.forEach(issue => console.log(issue));
        console.log('\n🔧 To fix these issues, run the migration in apply_rag_migrations.sql');
      }
      
      if (warnings.length > 0) {
        console.log('\nWARNINGS (non-critical):');
        warnings.forEach(warning => console.log(warning));
      }
    }

    console.log('\n' + '='.repeat(50));

  } catch (error) {
    console.error('\n❌ Unexpected error during checks:', error.message);
  }
}

// Add a function to check if pgvector is installed
async function checkPgVector() {
  try {
    const { data, error } = await supabase.rpc('pg_available_extensions');
    if (!error && data) {
      const hasVector = data.some(ext => ext.name === 'vector');
      return hasVector;
    }
    return false;
  } catch {
    return false;
  }
}

checkProductionSetup().catch(console.error);