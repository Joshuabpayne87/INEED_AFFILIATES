import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface PhoneData {
  countryIso: string;
  countryCode: string;
  phoneNational: string;
  phoneE164: string;
  canSend: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, phoneData: PhoneData, communicationConsent: boolean, referralCode?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phoneData: PhoneData,
    communicationConsent: boolean,
    referralCode?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          referral_code: referralCode || null,
        },
      },
    });
    if (error) throw error;

    if (!data.user) {
      throw new Error('Failed to create user account');
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('users')
      .update({
        sms_country_iso: phoneData.countryIso,
        sms_country_code: phoneData.countryCode,
        sms_phone_national: phoneData.phoneNational,
        sms_phone_e164: phoneData.phoneE164,
        sms_can_send: phoneData.canSend,
        communication_consent: communicationConsent,
        communication_consent_at: communicationConsent ? now : null,
        communication_consent_source: 'signup',
        email_verified_at: now,
      })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Failed to update user data:', updateError);
      throw updateError;
    }
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) {
      throw new Error('No user email found');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}