export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          photo_url: string | null
          role: string
          created_at: string
          communication_consent: boolean
          communication_consent_at: string | null
          communication_consent_source: string | null
          email_verified_at: string | null
          last_verification_email_sent_at: string | null
          verification_email_count_today: number
          highlevel_contact_id: string | null
          highlevel_synced_at: string | null
          referral_code: string | null
          referred_by_user_id: string | null
          referred_by_code: string | null
        }
        Insert: {
          id: string
          first_name?: string
          last_name?: string
          email: string
          photo_url?: string | null
          role?: string
          created_at?: string
          communication_consent?: boolean
          communication_consent_at?: string | null
          communication_consent_source?: string | null
          email_verified_at?: string | null
          last_verification_email_sent_at?: string | null
          verification_email_count_today?: number
          highlevel_contact_id?: string | null
          highlevel_synced_at?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          referred_by_code?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          photo_url?: string | null
          role?: string
          created_at?: string
          communication_consent?: boolean
          communication_consent_at?: string | null
          communication_consent_source?: string | null
          email_verified_at?: string | null
          last_verification_email_sent_at?: string | null
          verification_email_count_today?: number
          highlevel_contact_id?: string | null
          highlevel_synced_at?: string | null
          referral_code?: string | null
          referred_by_user_id?: string | null
          referred_by_code?: string | null
        }
      }
      businesses: {
        Row: {
          id: string
          owner_user_id: string
          business_name: string
          industry: string
          niche: string
          target_audience: string
          website_url: string | null
          offer_summary: string | null
          offer_type: string | null
          price_point: string | null
          email_list_size: number | null
          social_following_size: number | null
          booking_link: string | null
          affiliate_signup_link: string | null
          tier2_affiliate_link: string | null
          purchase_affiliate_link: string | null
          is_profile_published: boolean
          collaboration_types: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          business_name?: string
          industry?: string
          niche?: string
          target_audience?: string
          website_url?: string | null
          offer_summary?: string | null
          offer_type?: string | null
          price_point?: string | null
          email_list_size?: number | null
          social_following_size?: number | null
          booking_link?: string | null
          affiliate_signup_link?: string | null
          tier2_affiliate_link?: string | null
          purchase_affiliate_link?: string | null
          is_profile_published?: boolean
          collaboration_types?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          business_name?: string
          industry?: string
          niche?: string
          target_audience?: string
          website_url?: string | null
          offer_summary?: string | null
          offer_type?: string | null
          price_point?: string | null
          email_list_size?: number | null
          social_following_size?: number | null
          booking_link?: string | null
          affiliate_signup_link?: string | null
          tier2_affiliate_link?: string | null
          purchase_affiliate_link?: string | null
          is_profile_published?: boolean
          collaboration_types?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      connections: {
        Row: {
          id: string
          requester_user_id: string
          recipient_user_id: string
          status: 'pending' | 'accepted' | 'declined'
          is_favorite: boolean
          last_interaction_at: string | null
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          requester_user_id: string
          recipient_user_id: string
          status?: 'pending' | 'accepted' | 'declined'
          is_favorite?: boolean
          last_interaction_at?: string | null
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          requester_user_id?: string
          recipient_user_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          is_favorite?: boolean
          last_interaction_at?: string | null
          created_at?: string
          accepted_at?: string | null
        }
      }
      connection_notes: {
        Row: {
          id: string
          connection_id: string
          user_id: string
          note_text: string
          created_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          user_id: string
          note_text: string
          created_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          user_id?: string
          note_text?: string
          created_at?: string
        }
      }
      offers: {
        Row: {
          id: string
          business_id: string
          offer_name: string
          description: string
          price_point: string
          commission_percent: number
          offer_type: string
          promo_methods: string[]
          resources_link: string | null
          affiliate_signup_link: string | null
          purchase_affiliate_link: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          offer_name: string
          description?: string
          price_point?: string
          commission_percent?: number
          offer_type?: string
          promo_methods?: string[]
          resources_link?: string | null
          affiliate_signup_link?: string | null
          purchase_affiliate_link?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          offer_name?: string
          description?: string
          price_point?: string
          commission_percent?: number
          offer_type?: string
          promo_methods?: string[]
          resources_link?: string | null
          affiliate_signup_link?: string | null
          purchase_affiliate_link?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      user_offers: {
        Row: {
          id: string
          user_id: string
          offer_id: string
          personal_affiliate_link: string
          affiliate_portal_login_url: string | null
          affiliate_username: string | null
          notes: string | null
          last_promo_date: string | null
          last_promo_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          offer_id: string
          personal_affiliate_link: string
          affiliate_portal_login_url?: string | null
          affiliate_username?: string | null
          notes?: string | null
          last_promo_date?: string | null
          last_promo_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          offer_id?: string
          personal_affiliate_link?: string
          affiliate_portal_login_url?: string | null
          affiliate_username?: string | null
          notes?: string | null
          last_promo_date?: string | null
          last_promo_type?: string | null
          created_at?: string
        }
      }
      partner_tasks: {
        Row: {
          id: string
          user_id: string
          connection_id: string
          title: string
          due_at: string
          status: 'open' | 'done'
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          connection_id: string
          title: string
          due_at: string
          status?: 'open' | 'done'
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          connection_id?: string
          title?: string
          due_at?: string
          status?: 'open' | 'done'
          created_at?: string
          completed_at?: string | null
        }
      }
      call_click_logs: {
        Row: {
          id: string
          clicked_by_user_id: string
          connection_id: string
          source: 'partner_crm' | 'offer_marketplace' | 'profile'
          created_at: string
        }
        Insert: {
          id?: string
          clicked_by_user_id: string
          connection_id: string
          source: 'partner_crm' | 'offer_marketplace' | 'profile'
          created_at?: string
        }
        Update: {
          id?: string
          clicked_by_user_id?: string
          connection_id?: string
          source?: 'partner_crm' | 'offer_marketplace' | 'profile'
          created_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          connection_id: string
          user_id: string
          scheduled_at: string
          status: 'planned' | 'completed'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          user_id: string
          scheduled_at: string
          status?: 'planned' | 'completed'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          user_id?: string
          scheduled_at?: string
          status?: 'planned' | 'completed'
          notes?: string | null
          created_at?: string
        }
      }
      ina_referral_clicks: {
        Row: {
          id: string
          referrer_user_id: string
          referral_code: string
          ip_address: string | null
          user_agent: string | null
          referrer_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_user_id: string
          referral_code: string
          ip_address?: string | null
          user_agent?: string | null
          referrer_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          referrer_user_id?: string
          referral_code?: string
          ip_address?: string | null
          user_agent?: string | null
          referrer_url?: string | null
          created_at?: string
        }
      }
      ina_referral_conversions: {
        Row: {
          id: string
          referrer_user_id: string
          referred_user_id: string
          referral_code: string
          created_at: string
        }
        Insert: {
          id?: string
          referrer_user_id: string
          referred_user_id: string
          referral_code: string
          created_at?: string
        }
        Update: {
          id?: string
          referrer_user_id?: string
          referred_user_id?: string
          referral_code?: string
          created_at?: string
        }
      }
      ina_referral_commissions: {
        Row: {
          id: string
          referrer_user_id: string
          referred_user_id: string
          stripe_payment_id: string | null
          payment_amount: number
          commission_rate: number
          commission_amount: number
          currency: string
          status: 'payable' | 'paid' | 'void'
          payable_at: string
          paid_at: string | null
          paid_method: string | null
          paid_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_user_id: string
          referred_user_id: string
          stripe_payment_id?: string | null
          payment_amount: number
          commission_rate?: number
          commission_amount: number
          currency?: string
          status?: 'payable' | 'paid' | 'void'
          payable_at?: string
          paid_at?: string | null
          paid_method?: string | null
          paid_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          referrer_user_id?: string
          referred_user_id?: string
          stripe_payment_id?: string | null
          payment_amount?: number
          commission_rate?: number
          commission_amount?: number
          currency?: string
          status?: 'payable' | 'paid' | 'void'
          payable_at?: string
          paid_at?: string | null
          paid_method?: string | null
          paid_notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
