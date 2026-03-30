# RevenueCat Integration Guide for CharismaTracker

## ✅ Installation Complete

The RevenueCat SDK has been installed:
```bash
npm install --save react-native-purchases react-native-purchases-ui
```

## 🔑 Configuration

### 1. API Keys (Already Configured)
Your API keys are set in `.env`:
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=test_noCbSjkwHnhUyhgfZdZZcHWMDjg
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=test_noCbSjkwHnhUyhgfZdZZcHWMDjg
```

### 2. RevenueCat Dashboard Setup

#### Create Products in App Store Connect / Google Play Console:
1. **Monthly Subscription**
   - Product ID: `monthly` or `com.aiagentmaker.charismatracker.monthly`
   - Price: $2.99/month

2. **Yearly Subscription**
   - Product ID: `yearly` or `com.aiagentmaker.charismatracker.yearly`
   - Price: $28.99/year (20% savings)

#### Configure in RevenueCat Dashboard:
1. Go to https://app.revenuecat.com
2. Navigate to **Products** → Add your product IDs
3. Create an **Offering** (e.g., "default")
4. Add packages to the offering:
   - Monthly package → Link to monthly product
   - Yearly package → Link to yearly product
5. Create an **Entitlement** named `pro`
6. Attach both products to the `pro` entitlement

#### Set Up Paywall (Optional but Recommended):
1. Go to **Paywalls** in RevenueCat dashboard
2. Create a new paywall template
3. Customize colors, text, and layout
4. Link to your default offering

## 📱 Implementation

### Core Functions Available

#### 1. Initialize RevenueCat
```typescript
import { initializeRevenueCat, identifyRevenueCatUser } from '@/lib/revenuecat';

// Initialize on app start
await initializeRevenueCat();

// Identify user after login
const userId = session.user.id;
await identifyRevenueCatUser(userId);
```

#### 2. Check Subscription Status
```typescript
import { checkProSubscription, getSubscriptionStatus } from '@/lib/revenuecat';

// Simple check
const isPro = await checkProSubscription('pro');

// Detailed status
const status = await getSubscriptionStatus('pro');
console.log(status);
// {
//   isSubscribed: true,
//   status: 'Active',
//   willRenew: true,
//   expirationDate: '2025-01-04',
//   periodType: 'NORMAL',
//   store: 'APP_STORE'
// }
```

#### 3. Show Native Paywall (Recommended)
```typescript
import { showPaywall } from '@/lib/revenuecat';

const result = await showPaywall({
  onPurchaseCompleted: (customerInfo) => {
    console.log('Purchase successful!', customerInfo);
    // Update UI, navigate, etc.
  },
  onPurchaseError: (error) => {
    console.error('Purchase failed:', error);
  },
});
```

#### 4. Manual Purchase Flow
```typescript
import { getOfferings, purchasePackage } from '@/lib/revenuecat';

// Get available packages
const offering = await getOfferings();
const packages = offering?.availablePackages || [];

// Purchase a package
const yearlyPackage = packages.find(p => p.identifier.includes('yearly'));
if (yearlyPackage) {
  const result = await purchasePackage(yearlyPackage);
  if (result.success) {
    console.log('Subscribed!', result.customerInfo);
  }
}
```

#### 5. Customer Center (Manage Subscription)
```typescript
import { showCustomerCenter, isCustomerCenterAvailable } from '@/lib/revenuecat';

// Check if available (requires active subscription)
const available = await isCustomerCenterAvailable();

if (available) {
  await showCustomerCenter();
}
```

#### 6. Restore Purchases
```typescript
import { restorePurchases } from '@/lib/revenuecat';

const result = await restorePurchases();
if (result.success) {
  console.log('Purchases restored!', result.customerInfo);
}
```

#### 7. Get Detailed Entitlement Info
```typescript
import { getEntitlementInfo } from '@/lib/revenuecat';

const entitlement = await getEntitlementInfo('pro');
console.log(entitlement);
// {
//   identifier: 'pro',
//   isActive: true,
//   willRenew: true,
//   periodType: 'NORMAL',
//   expirationDate: '2025-01-04',
//   productIdentifier: 'yearly',
//   store: 'APP_STORE',
//   isSandbox: true
// }
```

## 🎨 UI Screens

### New Subscription Screen
A complete subscription screen has been created at:
`app/subscription-revenuecat.tsx`

Features:
- ✅ Shows current subscription status
- ✅ Displays available packages
- ✅ Native paywall integration
- ✅ Manual purchase flow
- ✅ Customer center access
- ✅ Restore purchases
- ✅ Beautiful UI with theme support

### Usage
```typescript
// Navigate to subscription screen
router.push('/subscription-revenuecat');
```

## 🔄 Integration with Existing Code

### Update Subscription Utils
Your existing `utils/subscription-utils.ts` should be updated to use RevenueCat:

```typescript
import { checkProSubscription } from '@/lib/revenuecat';

export const checkProStatus = async (): Promise<boolean> => {
  try {
    // Check with RevenueCat (recommended)
    const isPro = await checkProSubscription('pro');
    
    // Cache the result
    await saveProStatus(isPro);
    
    return isPro;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
};
```

### Initialize on App Start
In your `_layout.tsx` or main app file:

```typescript
import { initializeRevenueCat } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

useEffect(() => {
  const initApp = async () => {
    // Initialize RevenueCat
    await initializeRevenueCat();
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await identifyRevenueCatUser(session.user.id);
      }
    });
  };
  
  initApp();
}, []);
```

## 🧪 Testing

### Test Mode
Your API keys are in test mode, which means:
- ✅ No real charges
- ✅ Faster subscription renewals (minutes instead of months)
- ✅ Can test purchase flows safely

### Testing Checklist
- [ ] Initialize RevenueCat successfully
- [ ] Load offerings and packages
- [ ] Show native paywall
- [ ] Complete a test purchase
- [ ] Verify entitlement is active
- [ ] Test restore purchases
- [ ] Show customer center
- [ ] Test subscription expiration
- [ ] Test cancellation flow

### Sandbox Testing
1. **iOS**: Use a sandbox Apple ID
2. **Android**: Use a test account in Google Play Console
3. Purchases will show as "Sandbox" in RevenueCat dashboard

## 📊 Best Practices

### 1. Always Use Entitlements
```typescript
// ✅ Good - Check entitlement
const isPro = await checkProSubscription('pro');

// ❌ Bad - Check product directly
const hasPurchased = customerInfo.activeSubscriptions.includes('monthly');
```

### 2. Handle Errors Gracefully
```typescript
const result = await purchasePackage(package);
if (!result.success && !result.userCancelled) {
  Alert.alert('Error', result.error);
}
```

### 3. Sync on App Launch
```typescript
import { syncPurchases } from '@/lib/revenuecat';

// Sync when app becomes active
useEffect(() => {
  const subscription = AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      await syncPurchases();
    }
  });
  
  return () => subscription.remove();
}, []);
```

### 4. Cache Subscription Status
```typescript
// Check frequently but cache results
const cachedStatus = await AsyncStorage.getItem('@subscription_status');
if (cachedStatus && Date.now() - cachedStatus.timestamp < 3600000) {
  return cachedStatus.isPro;
}

// Fetch fresh status
const isPro = await checkProSubscription('pro');
await AsyncStorage.setItem('@subscription_status', {
  isPro,
  timestamp: Date.now(),
});
```

## 🚀 Production Checklist

Before going live:
- [ ] Replace test API keys with production keys
- [ ] Set up products in App Store Connect / Google Play Console
- [ ] Configure offerings in RevenueCat dashboard
- [ ] Test with real sandbox accounts
- [ ] Set up webhook notifications (optional)
- [ ] Configure refund policies
- [ ] Add subscription terms to your app
- [ ] Test restore purchases flow
- [ ] Verify analytics are working

## 📚 Additional Resources

- [RevenueCat Docs](https://www.revenuecat.com/docs)
- [React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Paywalls](https://www.revenuecat.com/docs/tools/paywalls)
- [Customer Center](https://www.revenuecat.com/docs/tools/customer-center)
- [Dashboard](https://app.revenuecat.com)

## 🆘 Troubleshooting

### "No offerings found"
- Check that offerings are configured in RevenueCat dashboard
- Verify API keys are correct
- Ensure products are created in App Store Connect / Play Console

### "Purchase failed"
- Check that product IDs match exactly
- Verify sandbox account is set up correctly
- Check RevenueCat dashboard for error logs

### "Entitlement not active after purchase"
- Verify entitlement is attached to the product
- Check that product ID is correct
- Sync purchases manually: `await syncPurchases()`

## 📞 Support

- RevenueCat Support: https://www.revenuecat.com/support
- Community: https://community.revenuecat.com
- Status: https://status.revenuecat.com
