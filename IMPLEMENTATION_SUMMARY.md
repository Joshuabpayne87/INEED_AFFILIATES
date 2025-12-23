# Affiliate Tracking System Implementation Summary

## ✅ Completed Components

### 1. Database Schema ✅
- **Extended businesses table** with all commission fields:
  - `affiliate_commission_type`, `affiliate_commission_value`
  - `ina_commission_type`, `ina_commission_value`
  - `commission_currency`, `commission_terms_locked`
  - `is_live`, `is_suspended`, `late_payout_flag`
  - `max_days_late`, `unpaid_affiliate_total`, `unpaid_ina_total`
  
- **New tables created:**
  - `affiliate_links` - Tracks affiliate tracking links with public codes
  - `clicks` - Logs all clicks with attribution data
  - `leads` - Records conversions (leads, calls, purchases)
  - `commission_events` - Master ledger with dual commission tracking
  - `affiliate_tax_docs` - W-9 form storage and approval workflow
  - `ina_invoices` - Invoice tracking for INA commissions

- **RLS Policies** - All tables secured with proper row-level security
- **Indexes** - All foreign keys and lookup fields indexed
- **Storage Bucket** - `tax-docs` bucket created with proper RLS

### 2. Edge Functions ✅

#### `track-redirect` Function
- **Location**: `supabase/functions/track-redirect/index.ts`
- Handles `/{public_code}` redirects
- Generates unique `ina_click_id` (UUID)
- Logs clicks with full attribution (IP, UA, UTM params, referrer)
- Redirects to destination URL with tracking parameters appended
- Supports both `prtnr.live/[CODE]` and `ineedaffiliates.com/r/[CODE]` domains

#### `conversion-webhook` Function
- **Location**: `supabase/functions/conversion-webhook/index.ts`
- **Endpoint**: POST handler for conversion events
- Validates `ina_click_id` and event types
- Calculates both affiliate and INA commissions from business terms
- Creates leads record with conversion data
- Creates commission_events with dual commission split
- Applies $50 minimum payout threshold logic (pending vs payable)

#### `enforce-late-payments` Function
- **Location**: `supabase/functions/enforce-late-payments/index.ts`
- Calculates days overdue for unpaid commissions
- Sets `late_payout_flag` at 45 days
- Suspends businesses (`is_suspended = true`, `is_live = false`) at 70 days
- Caches totals on business profile (`max_days_late`, `unpaid_affiliate_total`, `unpaid_ina_total`)

### 3. UI Pages ✅

#### W-9 Upload Page (`/w9-upload`)
- **Location**: `src/pages/W9Upload.tsx`
- File upload with validation (PDF, JPEG, PNG, max 10MB)
- Status tracking (none, submitted, approved, rejected)
- Compliance explanation and IRS W-9 download link
- Preview for image uploads
- Storage integration with `tax-docs` bucket

#### Business Leads & Payments Page (`/business-leads`)
- **Location**: `src/pages/BusinessLeads.tsx`
- Grouped by affiliate with summary stats:
  - Clicks, conversions, sales
  - Affiliate owed, INA owed
  - W-9 status indicators
- Unpaid commissions table with days late tracking
- "Mark as Paid" modal with payment method, date, notes
- Late payment warnings (45+ days highlighted)

### 4. Utility Functions ✅

#### Affiliate Link Utils
- **Location**: `src/lib/affiliateLinkUtils.ts`
- `getOrCreateAffiliateLink()` - Generates 8-char public codes
- `getUserAffiliateLinks()` - Fetches all affiliate links
- `getAffiliateLinkStats()` - Calculates clicks, conversions, commissions
- `getAffiliateLinkByCode()` - Lookup by public code

### 5. Routes ✅
- Added `/w9-upload` route
- Added `/business-leads` route
- Updated `App.tsx` with imports

## 🔄 In Progress / Partial

### Offer Vault Updates
- **Status**: Partially implemented
- **Current**: Uses old `offer_affiliate_codes` system
- **Needed**: 
  - Integration with new `affiliate_links` table
  - Display tracking URLs in table
  - Show commission stats (clicks, conversions, earned)
  - W-9 warning banner
  - Generate affiliate links when offers are approved

### Commission Terms Locking
- **Status**: Database schema ready
- **Needed**: 
  - Lock logic when first commission event created
  - Read-only UI in Settings when locked
  - Admin override panel
  - Lock icon and support message

## ❌ Not Yet Implemented

### 1. Offer Tracking Setup Panel
- **Location**: Should be in Settings or Business Profile
- **Features Needed**:
  - Display JS tracking pixel snippet (sessionStorage ina_click_id)
  - S2S webhook example payload
  - Event types documentation
  - Setup status indicators
  - "Request Setup Call" button

### 2. Admin Analytics Dashboard
- **Location**: New page (e.g., `/admin/analytics`)
- **Features Needed**:
  - Tabs: All Platform Leads, Commission Ledger, Business Rollups
  - Filters (date, business, affiliate, status, W-9)
  - CSV export functionality
  - "Create Invoice" → inserts `ina_invoices`
  - Days late indicators

### 3. Cron Job Configuration
- **Location**: Supabase Dashboard → Database → Cron Jobs
- **Needed**: 
  - Schedule `enforce-late-payments` function to run daily
  - Configure via Supabase Dashboard (not code)

### 4. Navigation Updates
- **Status**: Routes added, sidebar not updated
- **Needed**:
  - Add W-9 Upload link to sidebar (affiliates only)
  - Add Business Leads link (business owners only)
  - Badge indicators for:
    - Unpaid commissions count
    - Missing W-9 warning
  - Role-based visibility

### 5. Offer Vault Affiliate Links Display
- **Status**: Migration created to link tables
- **Needed**:
  - Update `OfferVaultPage.tsx` to:
    - Generate affiliate links when offer approved
    - Display tracking URL in table
    - Show stats (clicks, conversions, paid/pending commissions)
    - W-9 warning banner
    - Copy link functionality

## 🔧 Configuration Needed

### Supabase Edge Functions
1. **Deploy Functions**:
   ```bash
   supabase functions deploy track-redirect
   supabase functions deploy conversion-webhook
   supabase functions deploy enforce-late-payments
   ```

2. **Set Environment Variables** (if needed):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. **Configure Cron Job**:
   - Go to Supabase Dashboard → Database → Cron Jobs
   - Create new cron: `0 2 * * *` (daily at 2 AM)
   - Target: `enforce-late-payments` function

### Domain Configuration
1. **prtnr.live** domain needs to route to `track-redirect` function
2. **ineedaffiliates.com/r/[CODE]** needs to route to `track-redirect` function
3. Configure DNS/CNAME records to point to Supabase Edge Function URL

## 📝 Important Notes

### Constants
- **MINIMUM_PAYOUT_THRESHOLD**: $50 (hardcoded in webhook and UI)

### Dual Commission Attribution
- Every conversion creates ONE `commission_events` row
- Always calculates both `affiliate_commission_amount` and `ina_commission_amount`
- Both commissions enforced together for payment tracking

### Click Tracking
- Uses `ina_click_id` (UUID) as primary identifier
- Also stores legacy `click_id` for backward compatibility
- Click ID passed in URL params to destination for conversion tracking

### Payment Enforcement
- 45 days late → `late_payout_flag = true`
- 70 days late → Business suspended (`is_suspended = true`, `is_live = false`)
- Suspended businesses removed from public directory (filter by `is_live = true`)
- Only admin can unsuspend (requires admin UI)

## 🚀 Next Steps

1. **Complete Offer Vault Integration**
   - Update `OfferVaultPage.tsx` to use new affiliate_links system
   - Add stats display and W-9 warnings

2. **Implement Commission Terms Locking**
   - Add lock trigger on first commission event
   - Update Settings UI with read-only fields

3. **Create Admin Dashboard**
   - Build analytics page with filters and exports
   - Add invoice creation functionality

4. **Update Navigation**
   - Add role-based sidebar items
   - Implement badge system for notifications

5. **Create Tracking Setup Panel**
   - Add to Settings or Business Profile
   - Document tracking implementation

6. **Testing**
   - Test end-to-end tracking flow
   - Verify commission calculations
   - Test payment enforcement cron
   - Validate W-9 upload and approval workflow

## 📚 File Reference

### Database Migrations
- `supabase/migrations/20251216013020_create_affiliate_tracking_system.sql`
- `supabase/migrations/20251216182713_update_affiliate_tracking_system_v2.sql`
- `supabase/migrations/20251220000001_link_offer_vault_to_affiliate_links.sql`

### Edge Functions
- `supabase/functions/track-redirect/index.ts`
- `supabase/functions/conversion-webhook/index.ts`
- `supabase/functions/enforce-late-payments/index.ts`

### Frontend Pages
- `src/pages/W9Upload.tsx`
- `src/pages/BusinessLeads.tsx`
- `src/pages/OfferVaultPage.tsx` (needs updates)

### Utilities
- `src/lib/affiliateLinkUtils.ts`

### Configuration
- `src/App.tsx` (routes added)


