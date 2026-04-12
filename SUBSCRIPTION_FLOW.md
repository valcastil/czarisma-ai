# Subscription Flow Implementation

## Overview
New subscription model: **7-day trial → Sign up → 3-month free → PRO subscription**

## Flow

### 1. Non-Signed-Up Users (7-Day Trial)
- First app open starts 7-day local trial
- Can use all features for 7 days
- **Days 5-6**: Warning popup shows "Trial expires in X days"
- **Day 7+**: Persistent popup forces sign up
- After 7 days without signing up: Redirected to sign-in screen

### 2. After Sign Up (3-Month Free Trial)
- User signs up via `/auth-sign-in`
- `createTrialIfNeeded()` is called automatically
- Creates 90-day (3-month) trial in:
  - Supabase subscriptions table (status: 'trialing')
  - Local SecureStorage (`@signed_up_trial_start`)
- User gets free access to all features for 3 months
- Subscription screen shows: "X days left in your free trial"

### 3. After 3 Months (PRO Subscription Required)
- When signed-up trial expires:
  - `needsProSubscription()` returns true
  - `checkTrialExpirationAndRedirect()` redirects to `/subscription`
  - Subscription screen shows: "Your 3-Month Free Trial Ended"
- User must subscribe to:
  - **PRO Monthly**: $2.99/month
  - **PRO Yearly**: $28.70/year (20% savings)

## Key Files Modified

### 1. `utils/subscription-utils.ts`
- Changed `TRIAL_DURATION_DAYS` from 30 to 7 (`LOCAL_TRIAL_DAYS = 7`)
- Added `SIGNED_UP_TRIAL_DAYS = 90` (3 months)
- Added `SIGNED_UP_TRIAL_START_KEY` for local tracking
- New functions:
  - `getSignedUpTrialStatus()` - Get 3-month trial status
  - `needsProSubscription()` - Check if PRO subscription needed
  - `shouldShowTrialExpiredPopup()` - Show 7-day trial popup
  - `shouldShowProSubscriptionPopup()` - Show PRO popup after 3 months
- Updated:
  - `hasAccess()` - Now checks both 7-day and 3-month trials
  - `createTrialIfNeeded()` - Sets local 3-month trial start
  - `checkTrialExpirationAndRedirect()` - Handles both redirects

### 2. `components/trial-expired-modal.tsx` (NEW)
- Persistent modal shown after 7-day trial expires
- Shows benefits of signing up
- "Sign Up Free →" button redirects to auth
- Cannot be dismissed (forces action)

### 3. `app/_layout.tsx`
- Added `TrialExpiredModal` import
- Added state for modal visibility and days remaining
- On app start:
  - Checks if 7-day trial expired → shows modal
  - Shows warning when 2 days remaining
  - Checks if 3-month trial expired → redirects to subscription

### 4. `app/subscription.tsx`
- Added imports for `getSignedUpTrialStatus` and `needsProSubscription`
- Added state for trial status and PRO requirement
- Dynamic messaging:
  - Before sign up: "Start Free Trial" / "30 days free"
  - After 3-month expiry: "Subscribe to PRO" / "Continue with $X/month"
- Added trial banner showing days remaining in 3-month trial

### 5. `supabase/migrations/20241207_create_messaging_tables.sql`
- Updated RLS policy for messages to allow both sender and receiver to update (for reactions)

### 6. `supabase/migrations/20241212_fix_message_reactions_policy.sql` (NEW)
- SQL to fix existing databases with old restrictive policy

## Testing the Flow

### Test 1: 7-Day Trial
1. Fresh install app
2. Use for 7 days without signing up
3. Day 5-6: Should see warning popup
4. Day 7: Should see persistent trial expired modal
5. Must sign up to continue

### Test 2: 3-Month Free Trial
1. Sign up on day 7
2. Should see "3 months free" message
3. Use app for 90 days
4. Subscription screen should show countdown
5. Day 90: Redirected to subscription screen

### Test 3: PRO Subscription
1. After 3-month trial ends
2. Redirected to `/subscription`
3. Shows "Your 3-Month Free Trial Ended"
4. Must choose PRO Monthly or PRO Yearly
5. Payment processed via Stripe

## Database Tables

### subscriptions
- `user_id` (uuid)
- `status` ('trialing', 'active', 'canceled', 'expired')
- `plan_type` ('monthly', 'yearly')
- `current_period_start` (timestamp)
- `current_period_end` (timestamp)
- `will_renew` (boolean)

### Local Storage Keys
- `@local_trial_start` - 7-day trial start timestamp
- `@signed_up_trial_start` - 3-month trial start timestamp
- `@pro_status` - PRO subscription status

## API Functions

### Client-Side
```typescript
// Check access
const hasAccess = await hasAccess();

// Get trial status
const localTrial = await getLocalTrialStatus(); // 7-day
const signedUpTrial = await getSignedUpTrialStatus(); // 3-month

// Check if PRO needed
const needsPro = await needsProSubscription();

// Show popups
const showTrialPopup = await shouldShowTrialExpiredPopup();
const showProPopup = await shouldShowProSubscriptionPopup();

// Create trial after sign up
await createTrialIfNeeded(userId);
```

## Notes
- AI chat subscription remains separate (existing code)
- All new functions are exported from `subscription-utils.ts`
- Existing FREE_MODE logic updated to support new flow
