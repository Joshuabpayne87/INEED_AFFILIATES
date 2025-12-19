import { supabase } from './supabase';

export interface VerificationToken {
  token: string;
  hash: string;
  expiresAt: Date;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}

const RATE_LIMIT_COOLDOWN_SECONDS = 60;
const MAX_EMAILS_PER_DAY = 3;
const TOKEN_EXPIRY_HOURS = 24;

export async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function checkRateLimit(userId: string): Promise<RateLimitCheck> {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('last_verification_email_sent_at, verification_email_count_today')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false, reason: 'Failed to check rate limit' };
    }

    if (!userData) {
      return { allowed: false, reason: 'User not found' };
    }

    const now = Date.now();
    const lastSent = userData.last_verification_email_sent_at
      ? new Date(userData.last_verification_email_sent_at).getTime()
      : 0;
    const timeSinceLastEmail = (now - lastSent) / 1000;

    if (timeSinceLastEmail < RATE_LIMIT_COOLDOWN_SECONDS) {
      const retryAfter = Math.ceil(RATE_LIMIT_COOLDOWN_SECONDS - timeSinceLastEmail);
      return {
        allowed: false,
        reason: `Please wait ${retryAfter} seconds before requesting another email`,
        retryAfter,
      };
    }

    const emailCount = userData.verification_email_count_today || 0;
    if (emailCount >= MAX_EMAILS_PER_DAY) {
      return {
        allowed: false,
        reason: 'Daily email limit reached. Please try again tomorrow.',
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: false, reason: 'An error occurred' };
  }
}

export function getTokenExpiryDate(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
  return expiry;
}

export async function validateTokenFormat(token: string): Promise<boolean> {
  return /^[0-9a-f]{64}$/.test(token);
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
