// ============================================================
// AuthContext — Supabase email/password authentication
// ============================================================
import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirmationSent: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authErrorMessage(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
    case 'Invalid email or password':
      return 'Invalid email or password. Please try again.';
    case 'Email not confirmed':
      return 'Please confirm your email address before signing in.';
    case 'User already registered':
      return 'An account with this email already exists.';
    case 'Signup requires a valid password':
      return 'Password must be at least 6 characters.';
    case 'For security purposes, you can only request this once every 60 seconds':
      return 'Please wait at least 60 seconds before trying again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // ── Initial session hydration ──
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Auth actions ──

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) return { error: authErrorMessage(error) };
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<{ error: string | null; confirmationSent: boolean }> => {
    // Set emailRedirectTo to current origin so confirmation links work in previews
    const { error, data } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) return { error: authErrorMessage(error), confirmationSent: false };

    // If user is null but no error, email confirmation was sent
    const confirmationSent = data.user?.identities?.length === 0 || !data.session;
    return { error: null, confirmationSent };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) return { error: authErrorMessage(error) };
    return { error: null };
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}