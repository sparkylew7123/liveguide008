"use client";

// Import the client-side helper to ensure we're using the same configuration
import { createClient as createSSRClient } from '@/utils/supabase/client';

// For backwards compatibility
export const supabase = createSSRClient();

export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/verify-email`,
        data: {
          // Add any additional user metadata here if needed
        }
      },
    });
    
    if (error) {
      console.error('Supabase signup error:', error);
    }
    
    return { data, error };
  } catch (err) {
    console.error('Signup exception:', err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error('Unknown signup error') 
    };
  }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/reset-password`,
  });
  return { data, error };
}

export async function signInWithProvider(provider: 'google' | 'github') {
  // Force localhost for development
  let redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`;
  
  // If we're on 127.0.0.1, force localhost
  if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
    redirectUrl = redirectUrl.replace('127.0.0.1', 'localhost');
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: false,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
}

// Helper to update a user's password (used in reset-password flow)
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}