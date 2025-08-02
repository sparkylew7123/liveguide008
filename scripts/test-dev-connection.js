const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testConnection() {
  console.log('Testing connection to Supabase development branch...');
  console.log('URL:', supabaseUrl);
  console.log('Project Ref:', process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test basic query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return;
    }
    
    console.log('✅ Successfully connected to development branch!');
    
    // Test schema
    const { data: tables, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (!schemaError && tables) {
      console.log('\nSample tables found:', tables.map(t => t.table_name).join(', '));
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();