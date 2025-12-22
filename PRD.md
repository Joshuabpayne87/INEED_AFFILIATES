# Product Requirements Document (PRD)
## ineedaffiliates.com - High-Ticket Affiliate Partnership Platform

**Version:** 1.0
**Last Updated:** December 18, 2025
**Status:** Active Development

---

## Executive Summary

ineedaffiliates.com is a B2B SaaS platform connecting businesses with affiliate partners for high-ticket product/service promotions. The platform provides a CRM-style experience for managing affiliate partnerships, an offer marketplace with 1,000+ products, and tools for tracking commissions and collaboration.

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3.1 + TypeScript 5.5.3 |
| Build Tool | Vite 5.4.21 |
| Backend/DB | Supabase (PostgreSQL + Auth) |
| Styling | TailwindCSS 3.4.1 |
| Routing | React Router v7.9.6 |
| Icons | Lucide React |
| Payments | Stripe |

---

## Feature Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| User Authentication | DONE | Email/password, verification, password reset |
| Business Profiles | DONE | Full profile with onboarding flow |
| Partnership Directory | DONE | Search, filters, connection requests |
| Offer Marketplace | DONE | 1,000+ offers, filtering, AI suggestions |
| Offer Vault | BROKEN | Missing `offer_vault` table in database |
| CRM Kanban Board | BROKEN | Missing `crm_cards` table in database |
| Connection System | PARTIAL | Works, but notifications table missing |
| Favorites/Bookmarks | BROKEN | Missing `favorites` table in database |
| Referral System | DONE | Click tracking, conversions, commissions |
| Subscription/Payments | PARTIAL | UI done, backend endpoint missing |
| Messaging | NOT STARTED | UI only, no backend |
| Analytics Dashboard | NOT STARTED | Placeholder only |
| Email Notifications | NOT STARTED | No email service integrated |

---

## Completed Features (What's Done)

### 1. Authentication System
- Email/password signup with phone number collection
- Email verification with rate limiting (max 3/day, 60-second cooldown)
- Password reset functionality
- Referral code tracking at signup
- Communication consent tracking (SMS, email marketing)
- Session management via Supabase Auth

### 2. Business Profile Management
- Complete onboarding wizard (multi-step)
- Profile fields:
  - Company info (name, website, industry)
  - Contact details (email, phone)
  - Partnership preferences
  - Offer details (commission rates, promo methods)
  - Media (logo, founder headshot, video URL)
- Profile state management (draft/live)
- Profile completion tracking

### 3. Partnership Directory
- Browse all business profiles
- Search by keyword
- Filter by:
  - Industry (15+ categories)
  - Partnership type (Affiliate, JV, Referral, etc.)
- Connection request system:
  - Send request
  - Accept/decline requests
  - View pending connections

### 4. Offer Marketplace
- Display 1,000+ affiliate offers
- Filter by commission type:
  - Recurring
  - One-time
  - Revenue share
  - Hybrid
- AI-suggested offers based on user profile
- Affiliate signup link tracking
- Commission structure display

### 5. CRM Partner Management (UI Complete)
- 8-stage Kanban board:
  1. Connection Pending
  2. Connected
  3. Booked Call
  4. Call Completed
  5. Pending Agreement
  6. Scheduled Collaboration
  7. Generating Revenue
  8. Inactive
- Drag-and-drop card movement
- Partner notes
- Task/follow-up creation

### 6. Follow-Up System
- Task creation with due dates
- Task completion tracking
- Overdue task highlighting
- Filter by status (open/done)

### 7. Referral Program
- Unique referral code per user
- Click tracking (IP, user agent, referrer)
- Conversion tracking on signup
- Commission calculation
- Commission status (payable/paid/void)

### 8. Subscription System (UI Complete)
- Three pricing tiers:
  - Monthly: $97/month (30-day free trial with code GET30)
  - Annual: $931/year (20% savings)
  - Lifetime: $815 (limited to 30 units)
- Stripe integration configured
- Subscription status tracking

### 9. UI Components Library
- Reusable components:
  - Button, Card, Input, Modal
  - Select, Tabs, Toggle, Avatar
  - Dropdown
- Consistent design system
- Responsive layout

---

## Critical Issues (Must Fix Before Launch)

### PRIORITY 1: Missing Database Tables

The following tables are referenced in code but DO NOT EXIST in the database schema:

| Table | Used In | Impact |
|-------|---------|--------|
| `offer_vault` | offerVaultUtils.ts | Offer vault feature completely broken |
| `notifications` | connectionUtils.ts | Connection notifications fail silently |
| `favorites` | BusinessProfile.tsx | Bookmark feature broken |
| `crm_cards` | CRMKanban.tsx | Entire CRM feature non-functional |

**Action Required:** Create these tables in Supabase with proper RLS policies.

**Suggested Schema:**

```sql
-- offer_vault (user's saved offers)
CREATE TABLE offer_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  personal_affiliate_link TEXT,
  affiliate_portal_url TEXT,
  portal_username TEXT,
  portal_password TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, offer_id)
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- favorites
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- crm_cards
CREATE TABLE crm_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES connections(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'connection_pending',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### PRIORITY 2: Broken SQL Query

**File:** `src/lib/connectionUtils.ts` (lines 144-148)

**Problem:** Complex subquery in `.or()` filter won't work with Supabase:
```typescript
.or(`and(user_id.eq.${...},business_id.in.(select id from businesses where owner_user_id=${...})),...`)
```

**Fix:** Replace with proper query using separate calls or Supabase RPC function.

### PRIORITY 3: Missing Stripe Backend

**Problem:** Checkout calls `/functions/v1/stripe-checkout` which doesn't exist.

**Action Required:** Create Supabase Edge Function for Stripe checkout:

```typescript
// supabase/functions/stripe-checkout/index.ts
import Stripe from 'stripe'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)

Deno.serve(async (req) => {
  const { priceId, userId, email } = await req.json()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${req.headers.get('origin')}/dashboard?success=true`,
    cancel_url: `${req.headers.get('origin')}/pricing?canceled=true`,
    customer_email: email,
    metadata: { userId }
  })

  return new Response(JSON.stringify({ url: session.url }))
})
```

---

## High Priority Issues

### 1. Profile Completion Logic Too Strict
**File:** `src/types/business.ts`
**Problem:** `isProfileComplete()` requires 26 fields including optional ones like `founder_headshot_url` and `email_open_rate`.
**Fix:** Remove optional fields from completion check.

### 2. Column Name Mismatch
**File:** `src/pages/Onboarding.tsx` (line 185)
**Problem:** Saves `company_name` but database uses `business_name`.
**Fix:** Align field names.

### 3. Large Component Files
| File | Size | Recommendation |
|------|------|----------------|
| Settings.tsx | 77KB | Split into sub-components |
| BusinessProfile.tsx | 34KB | Extract sections |
| Onboarding.tsx | Large | Split wizard steps |

### 4. Missing Pagination
- PartnershipDirectory loads ALL businesses at once
- OfferMarketplace loads ALL offers at once
- Will cause performance issues at scale

---

## Medium Priority Issues

### 1. N+1 Query Problems
**File:** `Dashboard.tsx` (lines 170-195)
Loads tasks then queries each connection individually.
**Fix:** Use JOIN query or batch fetch.

### 2. Missing Error Specificity
**File:** `AuthContext.tsx`
Generic "Failed to sign in" for all errors.
**Fix:** Map Supabase error codes to user-friendly messages.

### 3. Console Logging
69 console.error/warning statements throughout codebase.
**Fix:** Replace with proper logging service or remove for production.

### 4. Backup File in Source
`BusinessProfile.tsx.bak` should be deleted or gitignored.

---

## Features Not Yet Implemented

### 1. Messaging System
**Current State:** MessagingModal UI exists, no backend
**Requirements:**
- Create `messages` table
- Implement real-time subscriptions
- Add conversation threads
- Notification integration

### 2. Analytics Dashboard
**Current State:** Placeholder only
**Requirements:**
- Total connections over time
- Offer vault stats
- Revenue tracking
- Conversion rates
- Partner engagement metrics

### 3. Email Notifications
**Current State:** Not implemented
**Requirements:**
- Welcome email on signup
- Connection request notifications
- Task reminders
- Weekly digest

### 4. Call Scheduling Integration
**Current State:** Click-to-call only
**Requirements:**
- Calendly or similar integration
- In-app booking calendar
- Call reminders

### 5. Video Support
**Current State:** URL field exists, no display
**Requirements:**
- Video upload or embed support
- Video player in profile
- Thumbnail generation

### 6. Two-Factor Authentication
**Current State:** Not implemented
**Requirements:**
- TOTP support
- SMS verification option
- Recovery codes

---

## Database Schema (Current)

### Existing Tables

| Table | Purpose | Status |
|-------|---------|--------|
| users | Auth & profile | Working |
| businesses | Company profiles | Working |
| connections | Partner connections | Working |
| offers | Marketplace offers | Working |
| user_offers | User-offer relationship | Unclear |
| partner_tasks | CRM follow-ups | Working |
| calls | Call scheduling | Working |
| ina_referral_clicks | Referral click tracking | Working |
| ina_referral_conversions | Signup conversions | Working |
| ina_referral_commissions | Commission tracking | Working |
| connection_notes | Notes on connections | Working |
| call_click_logs | Call button tracking | Working |

### Tables Needed (Not Created)

| Table | Purpose |
|-------|---------|
| offer_vault | User's saved offers |
| notifications | In-app notifications |
| favorites | Bookmarked businesses |
| crm_cards | CRM Kanban cards |
| messages | Direct messaging |

---

## Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Password hashing | DONE | Supabase handles |
| Email verification | DONE | With rate limiting |
| Token hashing | DONE | Constant-time comparison |
| Rate limiting | DONE | Email resend limits |
| RLS policies | UNKNOWN | Need audit |
| Input validation | PARTIAL | Phone validation done |
| XSS prevention | DONE | React handles |
| CSRF protection | PARTIAL | Need review |
| Environment vars | PARTIAL | Not validated at runtime |

---

## Testing Status

| Type | Status |
|------|--------|
| Unit Tests | NOT STARTED |
| Integration Tests | NOT STARTED |
| E2E Tests | NOT STARTED |
| Manual Testing | IN PROGRESS |

**Recommendation:** Add Vitest for unit tests, Playwright for E2E.

---

## DevOps & Deployment

| Item | Status |
|------|--------|
| Docker config | NOT STARTED |
| CI/CD pipeline | NOT STARTED |
| Environment config | PARTIAL (.env.example missing) |
| Deployment scripts | NOT STARTED |
| Monitoring | NOT STARTED |
| Error tracking | NOT STARTED |

---

## Documentation Status

| Item | Status |
|------|--------|
| README.md | Placeholder only |
| API docs | NOT STARTED |
| Setup guide | NOT STARTED |
| Contributing guide | NOT STARTED |
| Architecture docs | NOT STARTED |

---

## Recommended Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Create missing database tables (offer_vault, notifications, favorites, crm_cards)
- [ ] Add RLS policies for all tables
- [ ] Fix connectionUtils.ts SQL query
- [ ] Create Stripe checkout Edge Function
- [ ] Fix column name mismatch in Onboarding

### Phase 2: Stabilization (Week 2)
- [ ] Add pagination to PartnershipDirectory and OfferMarketplace
- [ ] Fix N+1 query in Dashboard
- [ ] Refactor large components (Settings.tsx, BusinessProfile.tsx)
- [ ] Remove/reduce console logging
- [ ] Add proper error messages

### Phase 3: Missing Features (Weeks 3-4)
- [ ] Implement messaging system
- [ ] Build analytics dashboard
- [ ] Add email notification service
- [ ] Integrate call scheduling (Calendly)

### Phase 4: Polish & Launch Prep (Week 5)
- [ ] Add unit tests for utilities
- [ ] Add E2E tests for critical flows
- [ ] Create deployment pipeline
- [ ] Write documentation
- [ ] Security audit
- [ ] Performance optimization

---

## Summary

**Overall Completion: ~65%**

The platform has a solid React/TypeScript foundation with most UI components and flows implemented. The critical blocker is **4 missing database tables** that break core features (CRM, Offer Vault, Favorites, Notifications). The Stripe backend is also missing.

**Immediate Actions:**
1. Run the SQL to create missing tables
2. Deploy Stripe Edge Function
3. Fix the broken SQL query in connectionUtils.ts

Once these are resolved, the platform will be functional for beta testing.

---

*Document generated by codebase analysis on December 18, 2025*
