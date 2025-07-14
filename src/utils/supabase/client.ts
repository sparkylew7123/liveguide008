"use client";

import { createEnhancedClient } from './enhanced-client';
import { SupabaseClient } from '@supabase/supabase-js';

export function createClient(): SupabaseClient {
  return createEnhancedClient();
}