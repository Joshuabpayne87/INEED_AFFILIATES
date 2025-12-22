# Brownfield Enhancement PRD: Critical Fixes & Infrastructure
**Version:** 1.0
**Status:** Approved (YOLO)
**Date:** 2025-12-19

## 1. Intro Project Analysis and Context

### Existing Project Overview
The project is a B2B SaaS platform ("ineedaffiliates.com") connecting businesses with affiliate partners. It is built with React, Vite, TailwindCSS, and Supabase. The current state allows for user authentication, profile management, and viewing offers/partners, but several critical features (CRM, Offer Vault, Checkout) are broken due to missing database tables and backend logic.

### Enhancement Scope Definition
*   **Enhancement Type:** Bug Fix and Stability Improvements
*   **Description:** This enhancement focuses on resolving critical "Priority 1" and "Priority 2" issues identified in the current documentation. This includes creating missing database tables, fixing broken SQL queries, implementing the missing Stripe checkout backend, and correcting data mapping errors in onboarding.
*   **Impact Assessment:** Moderate Impact (Requires database schema changes and specific backend/frontend logic fixes).

### Goals and Background Context
*   **Goals:**
    *   Make the "Offer Vault" and "CRM" features fully functional.
    *   Enable actual Stripe checkout flows.
    *   Ensure connection requests work reliably.
    *   Fix data persistence issues in the onboarding flow.
*   **Background:** The application has a complete UI for many features, but the backend implementation lagged behind. Specifically, the `offer_vault`, `crm_cards`, `favorites`, and `notifications` tables were never created, causing the UI to crash or fail silently. Additionally, the Stripe integration points to a non-existent Edge Function.

## 2. Requirements

### Functional Requirements
*   **FR1 - Database Schema:** The Supabase database must include `offer_vault`, `notifications`, `favorites`, `crm_cards`, and `messages` tables with appropriate RLS policies.
*   **FR2 - CRM Functionality:** Users must be able to move cards between stages in the CRM Kanban board; these changes must persist to the `crm_cards` table.
*   **FR3 - Offer Vault:** Users must be able to save offers to their personal vault; saved offers must be retrievable from the `offer_vault` table.
*   **FR4 - Checkout:** The "Subscribe" action must trigger a valid Stripe Checkout session via a new Supabase Edge Function (`stripe-checkout`).
*   **FR5 - Connection Logic:** The `connectionUtils.ts` file must use a valid Supabase query syntax (replacing the broken `.or()` subquery) to filter connections correctly.
*   **FR6 - Onboarding:** The "Company Name" field in the onboarding wizard must correctly map to the `business_name` column in the `businesses` table.

### Non-Functional Requirements
*   **NFR1 - Security:** All new tables must have RLS (Row Level Security) enabled, ensuring users can only access their own data (or public business data where appropriate).
*   **NFR2 - Performance:** The Stripe Edge Function must respond within standard timeout limits (<2s).

### Compatibility Requirements
*   **CR1:** Must match existing Supabase client initialization in `src/lib/supabase.ts`.
*   **CR2:** UI components for CRM and Vault must remain visually identical; only the data fetching logic should change if necessary.

## 3. Technical Constraints and Integration Requirements

### Existing Technology Stack
*   **Frontend:** React 18, TypeScript, Vite, TailwindCSS
*   **Backend:** Supabase (Postgres, Auth, Edge Functions)
*   **Payments:** Stripe

### Integration Approach
*   **Database:** execute SQL migrations to add missing tables.
*   **API/Backend:** Add a new Deno-based Edge Function for Stripe.
*   **Code:** Modify `connectionUtils.ts`, `Onboarding.tsx`, and `business.ts` types to align with the schema.

### Risk Assessment
*   **Data Loss:** Minimal risk (tables are new).
*   **Regression:** Changing `connectionUtils` might affect other parts of the app if not tested against the "My Connections" view.

## 4. Epic and Story Structure

**Epic Structure Decision:** Single Epic ("Critical Infrastructure Repair") as all tasks are related to bringing the base platform to a functional state.

## 5. Epic 1: Critical Infrastructure Repair

**Epic Goal:** Resolve all "Priority 1" and "Priority 2" issues to make the application functionally complete according to its UI.

### Story 1.1: Create Missing Database Schema
**As a** System Admin,
**I want** to apply the missing database migrations,
**so that** the application has the necessary tables to store CRM, Vault, and Notification data.

*   **Acceptance Criteria:**
    1.  `offer_vault`, `notifications`, `favorites`, `crm_cards`, and `messages` tables exist in Supabase.
    2.  RLS policies are applied (Users can CRUD their own rows).
    3.  Foreign keys link correctly to `users` and `businesses`.
*   **Integration Verification:**
    *   IV1: Manually insert a row into `offer_vault` via SQL editor and verify no error.

### Story 1.2: Fix Connection Query and Onboarding Data
**As a** User,
**I want** my signup data to save correctly and my connections to load without error,
**so that** I can use the platform's core networking features.

*   **Acceptance Criteria:**
    1.  `connectionUtils.ts` no longer throws an error when fetching connections with filters.
    2.  Completing the onboarding wizard saves the "Company Name" into the `business_name` column.
    3.  Profile completion logic in `business.ts` allows profiles to be "Complete" without optional fields.
*   **Integration Verification:**
    *   IV1: detailed smoke test of the Onboarding -> Profile flow.
    *   IV2: Verify "My Connections" page loads successfully.

### Story 1.3: Implement Stripe Checkout Edge Function
**As a** Subscriber,
**I want** to be redirected to a valid Stripe payment page,
**so that** I can upgrade my membership.

*   **Acceptance Criteria:**
    1.  `supabase/functions/stripe-checkout/index.ts` exists and handles POST requests.
    2.  It uses the `stripe` npm package to create a session.
    3.  It returns a session URL to the frontend.
*   **Integration Verification:**
    *   IV1: Clicking "Subscribe" on the Pricing page opens a Stripe hosted checkout page.
