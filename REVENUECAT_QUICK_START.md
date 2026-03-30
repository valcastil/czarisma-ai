# RevenueCat Quick Start - CharismaTracker

## 🚀 Quick Implementation

### 1. Initialize in Your App Layout

Add to `app/_layout.tsx`:

```typescript
import { useEffect } from 'react';
import { initializeRevenueCat, identifyRevenueCatUser } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat on app start
    initializeRevenueCat();
    
    // Listen for auth changes and identify user
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await identifyRevenueCatUser(session.user.id);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // ... rest of your layout
}
```

### 2. Check Subscription Status Anywhere

```typescript
import { checkProSubscription } from '@/lib/revenuecat';

// In any component
const MyComponent = () => {
  const [isPro, setIsPro] = useState(false);
  
  useEffect(() => {
    checkProStatus();
  }, []);
  
  const checkProStatus = async () => {
    const isProUser = await checkProSubscription('pro');
    setIsPro(isProUser);
  };
  
  return (
    <View>
      {isPro ? (
        <Text>Welcome, Pro Member! 🌟</Text>
      ) : (
        <Button title="Upgrade to Pro" onPress={showUpgrade} />
      )}
    </View>
  );
};
```

### 3. Show Subscription Screen

**Option A: Use Native Paywall (Recommended)**
```typescript
import { showPaywall } from '@/lib/revenuecat';

const handleUpgrade = async () => {
  const result = await showPaywall({
    onPurchaseCompleted: (customerInfo) => {
      Alert.alert('Welcome to Pro!', 'You now have access to all features');
      // Refresh your app state
      checkProStatus();
    },
  });
};
```

**Option B: Use Custom Screen**
```typescript
import { useRouter } from 'expo-router';

const handleUpgrade = () => {
  router.push('/subscription-revenuecat');
};
```

### 4. Add "Manage Subscription" Button

```typescript
import { showCustomerCenter, isCustomerCenterAvailable } from '@/lib/revenuecat';

const ManageSubscriptionButton = () => {
  const [canShow, setCanShow] = useState(false);
  
  useEffect(() => {
    checkAvailability();
  }, []);
  
  const checkAvailability = async () => {
    const available = await isCustomerCenterAvailable();
    setCanShow(available);
  };
  
  const handleManage = async () => {
    await showCustomerCenter();
  };
  
  if (!canShow) return null;
  
  return (
    <TouchableOpacity onPress={handleManage}>
      <Text>Manage Subscription</Text>
    </TouchableOpacity>
  );
};
```

### 5. Gate Premium Features

```typescript
import { checkProSubscription } from '@/lib/revenuecat';

const PremiumFeature = () => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAccess();
  }, []);
  
  const checkAccess = async () => {
    const isPro = await checkProSubscription('pro');
    setHasAccess(isPro);
    setLoading(false);
  };
  
  if (loading) return <ActivityIndicator />;
  
  if (!hasAccess) {
    return (
      <View>
        <Text>This is a Pro feature</Text>
        <Button title="Upgrade" onPress={() => showPaywall()} />
      </View>
    );
  }
  
  return <PremiumContent />;
};
```

## 🎯 Common Use Cases

### Update Existing Subscription Check

Replace your current subscription check in `utils/subscription-utils.ts`:

```typescript
import { checkProSubscription } from '@/lib/revenuecat';

export const checkProStatus = async (): Promise<boolean> => {
  try {
    // Use RevenueCat as source of truth
    const isPro = await checkProSubscription('pro');
    
    // Update Supabase if needed
    if (isPro) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: session.user.id,
            status: 'active',
            updated_at: new Date().toISOString(),
          });
      }
    }
    
    return isPro;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
};
```

### Show Paywall When Trial Expires

```typescript
import { canAccessFeatures } from '@/utils/subscription-utils';
import { showPaywall } from '@/lib/revenuecat';

const checkAccessAndShowPaywall = async () => {
  const hasAccess = await canAccessFeatures();
  
  if (!hasAccess) {
    // Trial expired, show paywall
    await showPaywall({
      onPurchaseCompleted: () => {
        router.replace('/(tabs)');
      },
    });
  }
};
```

### Restore Purchases Button

```typescript
import { restorePurchases } from '@/lib/revenuecat';

const RestoreButton = () => {
  const [restoring, setRestoring] = useState(false);
  
  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);
    
    if (result.success) {
      Alert.alert('Success', 'Your purchases have been restored!');
    } else {
      Alert.alert('No Purchases', 'No previous purchases found');
    }
  };
  
  return (
    <TouchableOpacity onPress={handleRestore} disabled={restoring}>
      {restoring ? (
        <ActivityIndicator />
      ) : (
        <Text>Restore Purchases</Text>
      )}
    </TouchableOpacity>
  );
};
```

## 📱 Example: Complete Settings Integration

Add to your `app/settings.tsx`:

```typescript
import { 
  showCustomerCenter, 
  isCustomerCenterAvailable,
  getSubscriptionStatus 
} from '@/lib/revenuecat';

export default function SettingsScreen() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [canShowCenter, setCanShowCenter] = useState(false);
  
  useEffect(() => {
    loadSubscriptionInfo();
  }, []);
  
  const loadSubscriptionInfo = async () => {
    const status = await getSubscriptionStatus('pro');
    setSubscriptionInfo(status);
    
    const available = await isCustomerCenterAvailable();
    setCanShowCenter(available);
  };
  
  return (
    <ScrollView>
      {/* Subscription Status */}
      {subscriptionInfo?.isSubscribed && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Status</Text>
              <Text style={styles.settingValue}>
                {subscriptionInfo.status}
              </Text>
            </View>
          </View>
          
          {subscriptionInfo.expirationDate && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  {subscriptionInfo.willRenew ? 'Renews' : 'Expires'}
                </Text>
                <Text style={styles.settingValue}>
                  {new Date(subscriptionInfo.expirationDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          
          {canShowCenter && (
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => showCustomerCenter()}
            >
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                  Manage Subscription
                </Text>
                <Text style={styles.settingValue}>
                  Cancel, change plan, or update payment
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={20} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Other settings... */}
    </ScrollView>
  );
}
```

## ✅ Testing Checklist

1. **Initialize**
   ```bash
   # Run your app
   npx expo start
   # Check console for: "RevenueCat initialized successfully"
   ```

2. **Load Offerings**
   - Navigate to subscription screen
   - Verify packages are displayed
   - Check prices are correct

3. **Test Purchase**
   - Click "Subscribe Now" or show paywall
   - Complete test purchase
   - Verify success message

4. **Verify Entitlement**
   ```typescript
   const isPro = await checkProSubscription('pro');
   console.log('Is Pro:', isPro); // Should be true
   ```

5. **Test Restore**
   - Uninstall app
   - Reinstall and login
   - Click "Restore Purchases"
   - Verify subscription is restored

6. **Test Customer Center**
   - After subscribing, click "Manage Subscription"
   - Verify native UI appears
   - Test cancellation flow (in sandbox)

## 🐛 Common Issues

**Issue: "No offerings found"**
```typescript
// Solution: Check RevenueCat dashboard configuration
// 1. Verify products are created
// 2. Check offering is set as "current"
// 3. Ensure products are attached to offering
```

**Issue: "Purchase fails immediately"**
```typescript
// Solution: Check product IDs match exactly
const offering = await getOfferings();
console.log('Available packages:', offering?.availablePackages);
// Verify product IDs match your App Store Connect / Play Console
```

**Issue: "Entitlement not active after purchase"**
```typescript
// Solution: Sync and check again
import { syncPurchases } from '@/lib/revenuecat';

await syncPurchases();
const isPro = await checkProSubscription('pro');
```

## 🎉 You're Done!

Your app now has:
- ✅ RevenueCat SDK integrated
- ✅ Subscription checking
- ✅ Native paywall
- ✅ Customer center
- ✅ Restore purchases
- ✅ Entitlement-based access control

Next steps:
1. Test thoroughly in sandbox
2. Configure products in stores
3. Set up offerings in RevenueCat dashboard
4. Replace test API keys with production keys
5. Submit for review!
