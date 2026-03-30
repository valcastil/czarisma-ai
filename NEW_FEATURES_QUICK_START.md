# New Features Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Add API Keys to `.env`

```bash
# Copy .env.example to .env if you haven't already
cp .env.example .env
```

Then add your keys:

```env
# Google Gemini AI
EXPO_PUBLIC_GEMINI_API_KEY=your-key-here

# Vexo Analytics  
EXPO_PUBLIC_VEXO_API_KEY=your-key-here

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your-ios-key-here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your-android-key-here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the App

```bash
npx expo start
```

That's it! All services will initialize automatically.

---

## 🎯 Quick Integration Examples

### Add AI Insights to Entry Screen

```typescript
// app/entry/[id].tsx
import { generateCharismaInsights } from '@/lib/gemini';
import { useState, useEffect } from 'react';

export default function EntryDetails() {
  const [insights, setInsights] = useState('');

  useEffect(() => {
    const loadInsights = async () => {
      const result = await generateCharismaInsights(
        entry.major_charisma,
        entry.emotion_emojis,
        entry.notes
      );
      setInsights(result);
    };
    loadInsights();
  }, [entry]);

  return (
    <View>
      {/* Your existing UI */}
      <Text style={styles.insightsTitle}>AI Insights</Text>
      <Text style={styles.insights}>{insights}</Text>
    </View>
  );
}
```

### Add Analytics to Any Screen

```typescript
// Any screen file
import { trackScreenView } from '@/lib/vexo-analytics';
import { useEffect } from 'react';

export default function MyScreen() {
  useEffect(() => {
    trackScreenView('MyScreen');
  }, []);

  // Rest of your component
}
```

### Add RevenueCat Subscription

```typescript
// app/subscription.tsx
import { getOfferings, purchasePackage } from '@/lib/revenuecat';
import { useState, useEffect } from 'react';

export default function Subscription() {
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    const offerings = await getOfferings();
    if (offerings) {
      setPackages(offerings.availablePackages);
    }
  };

  const handlePurchase = async (pkg) => {
    const result = await purchasePackage(pkg);
    if (result.success) {
      Alert.alert('Success', 'Subscription activated!');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <View>
      {packages.map(pkg => (
        <TouchableOpacity 
          key={pkg.identifier}
          onPress={() => handlePurchase(pkg)}
        >
          <Text>{pkg.product.title}</Text>
          <Text>{pkg.product.priceString}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## 🔑 Where to Get API Keys

### Google Gemini AI
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Get API Key"
3. Copy the key

### Vexo Analytics
1. Sign up at [Vexo](https://vexo.co/)
2. Create a project
3. Copy your API key from dashboard

### RevenueCat
1. Sign up at [RevenueCat](https://app.revenuecat.com/)
2. Create a project
3. Go to Settings → API Keys
4. Copy iOS and Android keys separately

---

## 📊 Available AI Functions

```typescript
// Generate insights for charisma entries
generateCharismaInsights(charismaType, emotions, notes)

// Get personalized tips
generateCharismaTips(topCharisma, preferredEmotions)

// Analyze message sentiment
analyzeMessage(messageText)

// Generate journal prompts
generateJournalPrompts(recentCharismaTypes)
```

---

## 📈 Available Analytics Functions

```typescript
// Track events
trackScreenView(screenName, params)
trackCharismaEntry(charismaType, emotions)
trackAuth(action, method)
trackSubscription(action, plan)
trackMessage(recipientId, hasAI)
trackSearch(query, resultsCount)
trackProfileUpdate(fields)
trackAIUsage(feature, success)
trackError(errorType, errorMessage, context)

// User identification
identifyUser(userId, traits)
setUserProperties(properties)
```

---

## 💳 Available RevenueCat Functions

```typescript
// Get subscription plans
getOfferings()

// Purchase
purchasePackage(package)

// Restore
restorePurchases()

// Check status
checkProSubscription(entitlementId)
getSubscriptionExpiration(entitlementId)
getCustomerInfo()

// User management
identifyRevenueCatUser(userId)
logoutRevenueCatUser()
setRevenueCatAttributes(attributes)
```

---

## ⚡ Pro Tips

1. **AI Insights**: Call `generateCharismaInsights()` when viewing entry details
2. **Analytics**: Add `trackScreenView()` to every screen's `useEffect`
3. **Subscriptions**: Test with sandbox/test mode first
4. **Error Handling**: Always wrap API calls in try-catch blocks
5. **Loading States**: Show loading indicators while AI generates responses

---

## 🐛 Common Issues

**"AI insights not working"**
- Check if API key is set
- Verify internet connection
- Check console for errors

**"Analytics not showing"**
- Current version logs to console (dev mode)
- Check console logs to verify tracking

**"RevenueCat purchase fails"**
- Ensure products are configured in RevenueCat dashboard
- Use test/sandbox mode for development
- Check API keys match your platform

---

## 📱 Testing Checklist

- [ ] App starts without errors
- [ ] Console shows "All services initialized"
- [ ] AI insights generate successfully
- [ ] Analytics events log to console
- [ ] RevenueCat offerings load
- [ ] Can view subscription packages

---

## 🎨 UI Integration Ideas

### 1. AI Insights Card
```typescript
<View style={styles.insightsCard}>
  <Text style={styles.title}>💡 AI Insights</Text>
  <Text style={styles.content}>{aiInsights}</Text>
</View>
```

### 2. Personalized Tips Section
```typescript
<View style={styles.tipsSection}>
  <Text style={styles.header}>Your Personalized Tips</Text>
  {tips.map((tip, index) => (
    <Text key={index} style={styles.tip}>
      {index + 1}. {tip}
    </Text>
  ))}
</View>
```

### 3. Subscription Plans Grid
```typescript
<View style={styles.plansGrid}>
  {packages.map(pkg => (
    <TouchableOpacity 
      key={pkg.identifier}
      style={styles.planCard}
      onPress={() => handlePurchase(pkg)}
    >
      <Text style={styles.planTitle}>{pkg.product.title}</Text>
      <Text style={styles.planPrice}>{getPackagePrice(pkg)}</Text>
      <Text style={styles.planDuration}>{getPackageDuration(pkg)}</Text>
    </TouchableOpacity>
  ))}
</View>
```

---

## 🔗 Useful Links

- [Full Migration Guide](./TECH_STACK_MIGRATION_GUIDE.md)
- [Google Gemini Docs](https://ai.google.dev/docs)
- [RevenueCat Docs](https://docs.revenuecat.com/)
- [Vexo Docs](https://docs.vexo.co/)

---

## 💬 Need Help?

1. Check the [Full Migration Guide](./TECH_STACK_MIGRATION_GUIDE.md)
2. Review console logs for errors
3. Verify all API keys are correct
4. Check official documentation for each service

Happy coding! 🚀
