"use client";

import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Create the base client
function createBaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Anonymous Key is missing. Authentication will not work.');
    throw new Error('Supabase credentials missing');
  }
  
  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    }
  );
}

// Enhanced client with debug logging
export function createEnhancedClient(): SupabaseClient {
  const client = createBaseClient();
  
  // Debug logging is temporarily disabled due to TypeScript complexity
  // To enable debug logging, set localStorage.setItem('liveguide-debug', 'true')
  if (typeof window !== 'undefined' && localStorage.getItem('liveguide-debug') === 'true') {
    console.log('Supabase debug mode enabled');
  }
  
  return client;
}