# iOS Redirect Fix - Safari "Can't Connect to Server" Error

## Problem
After signing in with Google on iOS devices, Safari shows:
> "localhost - Safari can't open the page because it couldn't connect to the server"

## Root Cause
The redirect URLs were configured to use `localhost` which doesn't work on physical iOS devices.

## ✅ Fixes Applied

### 1. Updated Local Supabase Config (`supabase/config.toml`)
```toml
# Changed from localhost to app deep link
site_url = "charismatracker://"
additional_redirect_urls = ["charismatracker://auth/callback", "http://127.0.0.1:3000", "https://127.0.0.1:3000"]
```

### 2. Fixed Email Redirect in Sign-Up (`app/auth-sign-in.tsx`)
```typescript
// Changed from hardcoded localhost to dynamic deep link
const redirectUrl = Linking.createURL('auth/callback');
options: {
  emailRedirectTo: redirectUrl,
}
```

## 🔧 REQUIRED: Update Supabase Dashboard

You **MUST** update your Supabase Dashboard settings for this to work on iOS devices.

### Step-by-Step Instructions

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/gdgbuvgmzaqeajwxhldr

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click **URL Configuration**

3. **Update Site URL**
   - Change **Site URL** from `http://127.0.0.1:3000` to:
     ```
     charismatracker://
     ```

4. **Add Redirect URLs**
   - In **Redirect URLs** section, add these URLs (one per line):
     ```
     charismatracker://auth/callback
     charismatracker://*
     exp://127.0.0.1:8081
     exp://localhost:8081
     ```
   
   > **Note:** The `exp://` URLs are for Expo Go development. The `charismatracker://` URLs are for production builds.

5. **Save Changes**
   - Click **Save** at the bottom

### Alternative: Using Expo Go for Development

If you're testing with Expo Go, you may need to use:
```
exp://127.0.0.1:8081/--/auth/callback
```

To get your exact Expo Go URL, run:
```bash
npm start
```
And check the terminal output for the URL.

## 🔍 How It Works Now

### Before (Broken on iOS)
```
User signs in with Google
    ↓
Google redirects to: http://127.0.0.1:3000
    ↓
❌ Safari can't connect to localhost on iOS device
```

### After (Fixed)
```
User signs in with Google
    ↓
Google redirects to: charismatracker://auth/callback
    ↓
✅ iOS opens the app directly via deep link
    ↓
app/auth/callback.tsx handles the session
    ↓
User lands on /subscription page
```

## 📱 Testing on iOS

### For Development (Expo Go)
1. Start the app: `npm start`
2. Scan QR code with Expo Go
3. Test Google Sign-In
4. Should redirect back to Expo Go app

### For Production (Standalone Build)
1. Build the app: `eas build --platform ios`
2. Install on device
3. Test Google Sign-In
4. Should redirect back to your app

## 🔐 Google Cloud Console Configuration

Also update your Google Cloud Console OAuth settings:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your **iOS OAuth Client**
4. Add **URL scheme**: `charismatracker`
5. Add **Bundle ID**: `com.aiagentmaker.charismatracker`

## ⚠️ Important Notes

### Deep Link Scheme
Your app uses the scheme: `charismatracker://`
- This is configured in `app.json` as `"scheme": "charismatracker"`
- Don't change this without updating all references

### Expo Go vs Standalone
- **Expo Go**: Uses `exp://` scheme
- **Standalone Build**: Uses `charismatracker://` scheme
- Both need to be configured in Supabase Dashboard for testing

### iOS Universal Links (Optional)
For a better user experience, consider setting up Universal Links:
1. Add associated domains in `app.json`
2. Configure `.well-known/apple-app-site-association` file
3. Update Supabase redirect URLs to use HTTPS domain

## 🐛 Troubleshooting

### Still seeing localhost error?
1. ✅ Verify Supabase Dashboard settings are saved
2. ✅ Clear app cache and restart
3. ✅ Check that `scheme: "charismatracker"` is in app.json
4. ✅ Rebuild the app if using standalone build

### Redirect not working in Expo Go?
1. Use the exact Expo Go URL from terminal
2. Format: `exp://YOUR_IP:8081/--/auth/callback`
3. Add to Supabase redirect URLs

### Works on Android but not iOS?
1. Check iOS Bundle ID in Google Cloud Console
2. Verify URL scheme is registered in app.json
3. Ensure iOS OAuth client is created in Google Cloud

## 📋 Checklist

Before testing on iOS:

- ✅ Updated `supabase/config.toml` (done)
- ✅ Updated `app/auth-sign-in.tsx` (done)
- ⚠️ **Update Supabase Dashboard Site URL**
- ⚠️ **Add redirect URLs in Supabase Dashboard**
- ⚠️ Update Google Cloud Console iOS OAuth settings
- ✅ `scheme: "charismatracker"` in app.json (already configured)
- ✅ `app/auth/callback.tsx` exists (already created)

## 🎯 Summary

**Code changes are complete!** 

You just need to:
1. **Update Supabase Dashboard** with the new redirect URLs
2. **Update Google Cloud Console** iOS OAuth settings
3. **Test on iOS device**

The localhost error should be completely resolved after updating the Supabase Dashboard.
