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
        emailRedirectTo: `${window.location.origin}/verify-email`,
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
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

export async function signInWithProvider(provider: 'google' | 'github') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      skipBrowserRedirect: false,
    },
  });
  return { data, error };
}

// Helper to update a user's password (used in reset-password flow)
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}