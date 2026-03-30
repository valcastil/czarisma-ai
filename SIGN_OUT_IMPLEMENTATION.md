# Sign Out Implementation Guide

## Overview

A comprehensive sign out system has been implemented following security best practices. When a user signs out, the app performs complete cleanup while preserving app-level preferences.

---

## 📁 Files Created/Modified

### New Files
- **`utils/auth-utils.ts`** - Authentication utilities including sign out logic

### Modified Files
- **`app/settings.tsx`** - Added sign out button and handler

---

## 🔧 Implementation Details

### Core Sign Out Function

Located in `utils/auth-utils.ts`:

```typescript
export const handleSignOut = async (): Promise<{ success: boolean; error?: any }>
```

### What It Does

1. **Tracks Analytics** - Logs sign out event to Vexo Analytics
2. **Supabase Sign Out** - Signs out from Supabase authentication
3. **RevenueCat Logout** - Logs out from RevenueCat subscription service
4. **Clears Local Storage** - Removes all user-specific data
5. **Navigation** - Redirects to sign-in screen
6. **Error Handling** - Gracefully handles failures

---

## 🗑️ Data Cleared on Sign Out

### User-Specific Data (Cleared)
- `@user_profile` - User profile information
- `@charisma_entries` - All charisma entries
- `@pro_status` - Subscription status
- `@trial_start_date` - Trial start date
- `@pro_email` - Pro user email
- `@user_preferences` - User preferences
- `@cached_messages` - Cached messages
- `@cached_conversations` - Cached conversations
- `@auth_token` - Authentication token
- `@refresh_token` - Refresh token
- `@user_settings` - User settings
- `@last_sync_time` - Last sync timestamp

### App-Level Settings (Preserved)
- `@theme_preference` - Theme selection (light/dark/auto)
- `@language_preference` - Language selection
- `@onboarding_completed` - Onboarding status
- `@tutorial_completed` - Tutorial completion
- `@app_version` - App version info

---

## 🎯 User Experience

### Sign Out Flow

1. **User taps "Sign Out"** in Settings
2. **Confirmation dialog** appears
   - Title: "Sign Out"
   - Message: "Are you sure you want to sign out? Your data will be saved and available when you sign back in."
   - Options: "Cancel" or "Sign Out"
3. **Loading indicator** shows during sign out
4. **Automatic redirect** to sign-in screen
5. **Error handling** if sign out fails

### UI Elements

```typescript
// Sign Out Button in Settings
<TouchableOpacity
  style={[styles.settingItem, styles.signOutButton]}
  onPress={handleSignOutPress}
  disabled={isSigningOut}>
  <View style={styles.settingInfo}>
    <Text style={[styles.settingLabel, { color: '#FF4444' }]}>
      Sign Out
    </Text>
    <Text style={[styles.settingValue, { color: '#FF6666' }]}>
      Sign out of your account
    </Text>
  </View>
  {isSigningOut ? (
    <ActivityIndicator size="small" color="#FF4444" />
  ) : (
    <IconSymbol size={20} name="arrow.right.square" color="#FF4444" />
  )}
</TouchableOpacity>
```

---

## 🔒 Security Features

### 1. Complete Token Cleanup
All authentication tokens are removed from local storage to prevent unauthorized access.

### 2. Service Logout
Signs out from all integrated services:
- Supabase (authentication)
- RevenueCat (subscriptions)

### 3. Forced Navigation
Even if cleanup fails, user is redirected to sign-in screen for security.

### 4. Analytics Tracking
Sign out events are tracked for security monitoring and analytics.

### 5. Error Logging
All errors are logged for debugging and security auditing.

---

## 📊 Additional Utility Functions

### Check Authentication Status
```typescript
const isAuthenticated = await isUserAuthenticated();
```

### Get Current User ID
```typescript
const userId = await getCurrentUserId();
```

### Clear User Cache
```typescript
await clearUserCache();
```

### Clear Only User Data (Keep App Preferences)
```typescript
await clearUserDataOnly();
```

### Get All Storage Keys (Debugging)
```typescript
const keys = await getAllStorageKeys();
console.log('Storage keys:', keys);
```

---

## 🧪 Testing Checklist

### Before Sign Out
- [ ] User is signed in
- [ ] User has profile data
- [ ] User has charisma entries
- [ ] User has messages
- [ ] Theme preference is set

### After Sign Out
- [ ] User is redirected to sign-in screen
- [ ] Cannot access protected screens
- [ ] Profile data is cleared
- [ ] Entries are cleared
- [ ] Messages are cleared
- [ ] Theme preference is preserved
- [ ] Can sign in again successfully
- [ ] Previous data is restored after sign-in (from Supabase)

### Error Scenarios
- [ ] Network failure during sign out
- [ ] Supabase sign out fails
- [ ] RevenueCat logout fails
- [ ] Storage clear fails
- [ ] Navigation fails

---

## 🎨 UI Customization

### Button Styling

The sign out button uses a red color scheme to indicate a destructive action:

```typescript
const styles = StyleSheet.create({
  signOutButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
});
```

### Colors Used
- **Primary**: `#FF4444` (Red)
- **Secondary**: `#FF6666` (Light Red)
- **Background**: `rgba(255, 68, 68, 0.1)` (Transparent Red)
- **Border**: `rgba(255, 68, 68, 0.3)` (Semi-transparent Red)

---

## 🔄 Integration with Other Features

### Analytics Integration
```typescript
import { trackAuth } from '@/lib/vexo-analytics';

// Tracked automatically in handleSignOut
trackAuth('sign_out', 'manual');
```

### RevenueCat Integration
```typescript
import { logoutRevenueCatUser } from '@/lib/revenuecat';

// Called automatically in handleSignOut
await logoutRevenueCatUser();
```

### Supabase Integration
```typescript
import { supabase } from '@/lib/supabase';

// Called automatically in handleSignOut
await supabase.auth.signOut();
```

---

## 🐛 Troubleshooting

### Issue: Sign out button not visible
**Solution**: Make sure you're on the "General" tab in Settings

### Issue: Sign out fails silently
**Solution**: Check console logs for error messages

### Issue: User data persists after sign out
**Solution**: Verify AsyncStorage keys are being cleared correctly

### Issue: App crashes on sign out
**Solution**: Check for navigation errors in console

### Issue: RevenueCat errors on sign out
**Solution**: Ensure RevenueCat is initialized before sign out

---

## 📱 Where to Find Sign Out

### Primary Location
**Settings Screen** → General Tab → Account Section → Sign Out Button

### Navigation Path
1. Tap **Profile** tab (bottom navigation)
2. Tap **Settings** icon (top right)
3. Scroll to **Account** section
4. Tap **Sign Out**

---

## 🔐 Best Practices Implemented

1. ✅ **Confirmation Dialog** - Prevents accidental sign outs
2. ✅ **Loading Indicator** - Shows progress during sign out
3. ✅ **Complete Cleanup** - Removes all sensitive data
4. ✅ **Service Logout** - Signs out from all services
5. ✅ **Error Handling** - Gracefully handles failures
6. ✅ **Analytics Tracking** - Logs sign out events
7. ✅ **Security First** - Redirects even on failure
8. ✅ **User Feedback** - Shows alerts on errors
9. ✅ **Preserve Preferences** - Keeps app-level settings
10. ✅ **Async Operations** - Non-blocking UI

---

## 📝 Code Example

### Basic Usage

```typescript
import { handleSignOut } from '@/utils/auth-utils';

// Simple sign out
const result = await handleSignOut();

if (result.success) {
  console.log('Signed out successfully');
} else {
  console.error('Sign out failed:', result.error);
}
```

### With Confirmation

```typescript
import { Alert } from 'react-native';
import { handleSignOut } from '@/utils/auth-utils';

const confirmSignOut = () => {
  Alert.alert(
    'Sign Out',
    'Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await handleSignOut();
        }
      }
    ]
  );
};
```

### With Loading State

```typescript
import { useState } from 'react';
import { handleSignOut } from '@/utils/auth-utils';

const [isSigningOut, setIsSigningOut] = useState(false);

const signOut = async () => {
  setIsSigningOut(true);
  const result = await handleSignOut();
  
  if (!result.success) {
    Alert.alert('Error', 'Sign out failed');
    setIsSigningOut(false);
  }
  // If successful, user is redirected
};
```

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Offline Sign Out** - Handle sign out when offline
2. **Sync Before Sign Out** - Upload pending changes
3. **Sign Out All Devices** - Remote sign out option
4. **Sign Out History** - Track sign out events
5. **Biometric Confirmation** - Require biometric auth
6. **Scheduled Sign Out** - Auto sign out after inactivity
7. **Partial Sign Out** - Keep some data cached
8. **Sign Out Reasons** - Track why users sign out

---

## ✅ Summary

The sign out implementation provides:

- ✅ Complete security cleanup
- ✅ User-friendly confirmation
- ✅ Loading indicators
- ✅ Error handling
- ✅ Analytics tracking
- ✅ Service integration
- ✅ Preserved preferences
- ✅ Graceful failures

**Location**: Settings → General → Account → Sign Out

**Status**: ✅ Fully Implemented and Ready to Use

---

**Last Updated**: December 3, 2025  
**Version**: 1.0.1  
**Implementation**: Complete ✅
