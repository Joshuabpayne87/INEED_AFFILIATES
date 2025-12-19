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

    // Wait for database trigger to create user record
    await new Promise(resolve => setTimeout(resolve, 1000));

    const now = new Date().toISOString();

    // First try to update (if trigger created the user)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
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

    // If update fails (user doesn't exist), try to insert
    if (updateError) {
      console.log('User update failed, attempting insert:', updateError.message);

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: 'user',
          sms_country_iso: phoneData.countryIso,
          sms_country_code: phoneData.countryCode,
          sms_phone_national: phoneData.phoneNational,
          sms_phone_e164: phoneData.phoneE164,
          sms_can_send: phoneData.canSend,
          communication_consent: communicationConsent,
          communication_consent_at: communicationConsent ? now : null,
          communication_consent_source: 'signup',
          email_verified_at: now,
        });

      if (insertError) {
        // If insert also fails due to conflict, the trigger created it - try update again
        if (insertError.code === '23505') {
          const { error: retryError } = await supabase
            .from('users')
            .update({
              first_name: firstName,
              last_name: lastName,
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

          if (retryError) {
            console.error('Failed to update user data on retry:', retryError);
          }
        } else {
          console.error('Failed to insert user data:', insertError);
          throw insertError;
        }
      }
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