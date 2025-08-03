import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database.js';

export function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

export async function executeSql(supabase: any, query: string, params?: any[]) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { 
      query,
      params 
    });
    
    if (error) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('function public.execute_sql does not exist')) {
      const { data, error: directError } = await supabase
        .from('_sql_execution')
        .insert({ query })
        .select()
        .single();
      
      if (directError) {
        throw new Error(`Direct SQL execution failed: ${directError.message}`);
      }
      
      return data?.result || [];
    }
    throw error;
  }
}