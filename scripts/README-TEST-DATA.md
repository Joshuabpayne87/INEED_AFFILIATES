# Creating Test Data for Affiliate Tracking

## Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `scripts/create-test-data.sql`
4. Copy and paste the entire SQL script
5. Click **Run**

This will create:
- 2 test user accounts
- 2 business profiles
- 2 offers with multiple price options

## Option 2: Create Users Manually First

If the SQL script has issues creating users, you can create them manually:

1. Go to Supabase Dashboard > **Authentication** > **Users**
2. Click **Add User** and create:
   - Email: `test-business1@ineedaffiliates.com`
   - Password: `Test123!@#`
   - Email confirmed: Yes
3. Repeat for:
   - Email: `test-business2@ineedaffiliates.com`
   - Password: `Test123!@#`
   - Email confirmed: Yes

Then run the SQL script (it will handle the rest).

## Test Accounts Created

### Account 1
- **Email**: test-business1@ineedaffiliates.com
- **Password**: Test123!@#
- **Business**: Premium Coaching Co.
- **Offer**: Premium Business Coaching Program
  - $2,997 one-time
  - $997/month

### Account 2
- **Email**: test-business2@ineedaffiliates.com
- **Password**: Test123!@#
- **Business**: SaaS Solutions Inc.
- **Offer**: Business Automation Suite
  - $97/month
  - $970/year

## Testing Affiliate Tracking

1. Log in with one of the test accounts
2. Go to **Settings** > **Offers** tab
3. You should see the created offers
4. Add offers to your vault from the marketplace
5. Test affiliate link generation and tracking

## Notes

- The offers are set to `is_active: true` so they'll appear in the marketplace
- Commission rates are set (30% and 25% respectively)
- Price options are configured for each offer
- All businesses are set to `is_live: true` and `is_profile_published: true`


