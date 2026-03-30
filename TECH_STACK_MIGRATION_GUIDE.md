# Tech Stack Migration Guide - Phases 1-3

This document outlines the new technologies integrated into the Charisma Tracker app and how to use them.

## 📋 Overview

We've successfully integrated the following new technologies:

1. **Google Gemini AI** - AI-powered insights and suggestions
2. **Vexo Analytics** - Advanced analytics tracking
3. **RevenueCat** - Subscription management (alongside Stripe)
4. **EAS Hosting** - Expo Application Services hosting

---

## 🤖 Google Gemini AI Integration

### Setup

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to your `.env` file:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key-here
   ```

### Features

The Gemini AI integration provides:

- **Charisma Insights**: AI-generated insights based on charisma entries
- **Personalized Tips**: Custom tips based on user's charisma patterns
- **Message Analysis**: Sentiment analysis and communication suggestions
- **Journal Prompts**: AI-generated reflection prompts

### Usage Examples

```typescript
import { 
  generateCharismaInsights,
  generateCharismaTips,
  analyzeMessage,
  generateJournalPrompts 
} from '@/lib/gemini';

// Generate insights for a charisma entry
const insights = await generateCharismaInsights(
  'Confidence',
  ['Happy', 'Excited'],
  'Had a great presentation today'
);

// Get personalized tips
const tips = await generateCharismaTips(
  'Confidence',
  ['Happy', 'Motivated']
);

// Analyze a message
const analysis = await analyzeMessage('Hey, how are you doing?');
console.log(analysis.sentiment); // 'positive'
console.log(analysis.suggestions); // Array of suggestions

// Generate journal prompts
const prompts = await generateJournalPrompts([
  'Confidence',
  'Empathy',
  'Humor'
]);
```

### Integration Points

You can integrate Gemini AI in:

- **Entry Details Screen** (`app/entry/[id].tsx`) - Show AI insights
- **Profile Screen** (`app/(tabs)/profile.tsx`) - Display personalized tips
- **Messages** (`app/chat/[id].tsx`) - Analyze messages before sending
- **Home Screen** (`app/(tabs)/index.tsx`) - Show journal prompts

---

## 📊 Vexo Analytics Integration

### Setup

1. Get your API key from [Vexo](https://vexo.co/)
2. Add to your `.env` file:
   ```
   EXPO_PUBLIC_VEXO_API_KEY=your-vexo-api-key-here
   ```

### Features

Track user behavior and app usage with:

- Screen views
- Charisma entries
- User authentication events
- Subscription events
- Messages sent
- Search queries
- Profile updates
- AI feature usage
- Error tracking

### Usage Examples

```typescript
import {
  trackScreenView,
  trackCharismaEntry,
  trackAuth,
  trackSubscription,
  trackMessage,
  trackSearch,
  trackProfileUpdate,
  trackAIUsage,
  trackError,
  identifyUser,
  setUserProperties
} from '@/lib/vexo-analytics';

// Track screen view
trackScreenView('HomeScreen', { timestamp: Date.now() });

// Track charisma entry
trackCharismaEntry('Confidence', ['Happy', 'Excited']);

// Track authentication
trackAuth('sign_in', 'google');

// Track subscription
trackSubscription('started', 'pro');

// Track message
trackMessage('user-123', true); // true = AI-assisted

// Track search
trackSearch('john doe', 5);

// Track profile update
trackProfileUpdate(['name', 'bio', 'avatar']);

// Track AI usage
trackAIUsage('charisma_insights', true);

// Track errors
trackError('api_error', 'Failed to fetch data', 'HomeScreen');

// Identify user
identifyUser('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'pro'
});

// Set user properties
setUserProperties({
  subscription_status: 'active',
  charisma_entries_count: 42
});
```

### Note

The current implementation logs events to the console in development mode. Once you have the correct Vexo API documentation, update the `trackEvent` function in `lib/vexo-analytics.ts` to make actual API calls.

---

## 💳 RevenueCat Integration

### Setup

1. Create an account at [RevenueCat](https://app.revenuecat.com/)
2. Create a project and get API keys for iOS and Android
3. Add to your `.env` file:
   ```
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=your-revenuecat-ios-key-here
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your-revenuecat-android-key-here
   ```

### Features

RevenueCat provides:

- Cross-platform subscription management
- Purchase restoration
- Subscription status tracking
- Entitlement management
- Revenue analytics

### Usage Examples

```typescript
import {
  initializeRevenueCat,
  identifyRevenueCatUser,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  checkProSubscription,
  getSubscriptionExpiration,
  logoutRevenueCatUser,
  setRevenueCatAttributes,
  getPackagePrice,
  getPackageDuration
} from '@/lib/revenuecat';

// Initialize (already done in _layout.tsx)
await initializeRevenueCat();

// Identify user
await identifyRevenueCatUser('user-123');

// Get available subscription plans
const offerings = await getOfferings();
if (offerings) {
  const packages = offerings.availablePackages;
  packages.forEach(pkg => {
    console.log(pkg.identifier);
    console.log(getPackagePrice(pkg));
    console.log(getPackageDuration(pkg));
  });
}

// Purchase a package
const result = await purchasePackage(selectedPackage);
if (result.success) {
  console.log('Purchase successful!');
  console.log(result.customerInfo);
} else {
  console.log('Purchase failed:', result.error);
}

// Restore purchases
const restoreResult = await restorePurchases();
if (restoreResult.success) {
  console.log('Purchases restored!');
}

// Check subscription status
const isPro = await checkProSubscription('pro');
console.log('User is Pro:', isPro);

// Get expiration date
const expirationDate = await getSubscriptionExpiration('pro');
console.log('Subscription expires:', expirationDate);

// Set user attributes
await setRevenueCatAttributes({
  'user_type': 'premium',
  'signup_date': '2024-01-01'
});

// Logout
await logoutRevenueCatUser();
```

### Integration with Existing Subscription System

RevenueCat is integrated **alongside** Stripe, not as a replacement. This allows you to:

1. Test RevenueCat without breaking existing Stripe functionality
2. Gradually migrate users to RevenueCat
3. Use both systems simultaneously if needed

To fully migrate to RevenueCat:

1. Update `utils/subscription-utils.ts` to use RevenueCat functions
2. Update `app/subscription.tsx` to show RevenueCat offerings
3. Update subscription checks throughout the app

---

## 🚀 EAS Hosting

### Setup

EAS Hosting is configured for web deployments. To deploy:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to EAS:
   ```bash
   eas login
   ```

3. Build for web:
   ```bash
   eas build --platform web
   ```

4. Deploy to EAS Hosting:
   ```bash
   eas submit --platform web
   ```

### Configuration

The app is already configured for EAS in:
- `app.json` - EAS project ID and configuration
- `eas.json` - Build profiles and settings

---

## 📦 Package Updates

The following packages have been added:

```json
{
  "@google/generative-ai": "latest",
  "react-native-purchases": "latest",
  "vexo-analytics": "latest"
}
```

To install:
```bash
npm install
```

---

## 🔧 Configuration Files

### Updated Files

1. **`.env.example`** - Added new environment variables
2. **`app/_layout.tsx`** - Initialize new services on app start
3. **`lib/gemini.ts`** - Google Gemini AI integration
4. **`lib/vexo-analytics.ts`** - Vexo Analytics wrapper
5. **`lib/revenuecat.ts`** - RevenueCat SDK wrapper

---

## 🎯 Next Steps

### Immediate Actions

1. **Add API Keys**: Update your `.env` file with actual API keys
2. **Test Services**: Run the app and verify all services initialize correctly
3. **Integrate Features**: Add AI insights and analytics to your screens

### Recommended Integrations

#### 1. Add AI Insights to Entry Details

```typescript
// In app/entry/[id].tsx
import { generateCharismaInsights } from '@/lib/gemini';
import { trackScreenView } from '@/lib/vexo-analytics';

useEffect(() => {
  trackScreenView('EntryDetails', { entryId: id });
  
  // Generate AI insights
  const getInsights = async () => {
    const insights = await generateCharismaInsights(
      entry.major_charisma,
      entry.emotion_emojis,
      entry.notes
    );
    setAiInsights(insights);
  };
  
  getInsights();
}, [entry]);
```

#### 2. Add Analytics to All Screens

```typescript
// In any screen
import { trackScreenView } from '@/lib/vexo-analytics';

useEffect(() => {
  trackScreenView('ScreenName');
}, []);
```

#### 3. Replace Stripe with RevenueCat in Subscription Screen

```typescript
// In app/subscription.tsx
import { getOfferings, purchasePackage } from '@/lib/revenuecat';

const loadOfferings = async () => {
  const offerings = await getOfferings();
  if (offerings) {
    setPackages(offerings.availablePackages);
  }
};

const handlePurchase = async (pkg) => {
  const result = await purchasePackage(pkg);
  if (result.success) {
    // Handle success
  }
};
```

---

## 🐛 Troubleshooting

### Gemini AI Not Working

- Verify API key is correct
- Check internet connection
- Review console logs for errors
- Ensure API key has proper permissions

### Vexo Analytics Not Tracking

- Current implementation logs to console in dev mode
- Update `lib/vexo-analytics.ts` with correct API once documentation is available
- Verify API key is set

### RevenueCat Errors

- Ensure you've created products in RevenueCat dashboard
- Verify API keys match your platform (iOS/Android)
- Check that entitlement IDs match your configuration
- Review RevenueCat dashboard for purchase logs

### Build Errors

- Run `npm install` to ensure all dependencies are installed
- Clear cache: `npx expo start -c`
- Rebuild: `eas build --platform android --clear-cache`

---

## 📚 Additional Resources

- [Google Gemini AI Documentation](https://ai.google.dev/docs)
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [Vexo Analytics Documentation](https://docs.vexo.co/)
- [EAS Documentation](https://docs.expo.dev/eas/)

---

## ✅ Checklist

- [ ] Added all API keys to `.env` file
- [ ] Tested app initialization
- [ ] Verified Gemini AI responses
- [ ] Confirmed analytics tracking (console logs)
- [ ] Tested RevenueCat offerings
- [ ] Integrated AI insights into at least one screen
- [ ] Added analytics tracking to main screens
- [ ] Tested subscription flow with RevenueCat
- [ ] Deployed to EAS (optional)

---

## 🔄 Migration Status

### ✅ Completed (Phases 1-3)

- [x] Google Gemini AI integration
- [x] Vexo Analytics integration
- [x] RevenueCat SDK integration
- [x] EAS Hosting configuration
- [x] Environment variables setup
- [x] Service initialization
- [x] Documentation

### ⏳ Pending (Phase 4 - Not Included)

- [ ] Better Auth migration
- [ ] Prisma + PostgreSQL backend
- [ ] Backend server deployment
- [ ] User data migration

---

## 💡 Tips

1. **Start Small**: Integrate one feature at a time
2. **Test Thoroughly**: Test each integration before moving to the next
3. **Monitor Logs**: Watch console logs for initialization and errors
4. **Use Dev Mode**: Test in development before production
5. **Keep Stripe**: Don't remove Stripe until RevenueCat is fully tested

---

For questions or issues, refer to the official documentation of each service or create an issue in your repository.
