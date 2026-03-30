# Google Sign-In Setup Guide

## Overview
This guide will help you set up Google Sign-In for your Charisma Tracker app using Supabase OAuth.

## Prerequisites
- Supabase project: https://gdgbuvgmzaqeajwxhldr.supabase.co
- Google Cloud Console access
- Android SHA-1 certificate fingerprint (for Android app)

## Step 1: Get Your SHA-1 Certificate Fingerprint

### For Development (Debug):
```bash
cd android
.\gradlew signingReport
```

Copy the **SHA1** value from the debug variant output.

### For Production (Release):
```bash
keytool -list -v -keystore path\to\your\release.keystore -alias your-key-alias
```

## Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. Create OAuth 2.0 Credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**

5. Create **THREE** OAuth clients:

### A. Web Application (for Supabase)
   - Application type: **Web application**
   - Name: `Charisma Tracker - Supabase`
   - Authorized redirect URIs:
     - `https://gdgbuvgmzaqeajwxhldr.supabase.co/auth/v1/callback`
   - Save the **Client ID** and **Client Secret**

### B. Android Application
   - Application type: **Android**
   - Name: `Charisma Tracker - Android`
   - Package name: `com.aiagentmaker.charismatracker`
   - SHA-1 certificate fingerprint: *[paste your SHA-1 from Step 1]*

### C. iOS Application (if needed)
   - Application type: **iOS**
   - Name: `Charisma Tracker - iOS`
   - Bundle ID: `com.aiagentmaker.charismatracker`

## Step 3: Configure Supabase

### A. Enable Google Provider
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/gdgbuvgmzaqeajwxhldr)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. Enable it and configure:
   - **Client ID**: *[paste Web Application Client ID from Step 2A]*
   - **Client Secret**: *[paste Web Application Client Secret from Step 2A]*
   - Click **Save**

### B. Configure Redirect URLs (CRITICAL for iOS)
1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   charismatracker://
   ```
3. Add these **Redirect URLs** (one per line):
   ```
   charismatracker://auth/callback
   charismatracker://*
   exp://127.0.0.1:8081
   exp://localhost:8081
   ```
4. Click **Save**

> **Important:** Without these redirect URLs, iOS will show "Safari can't connect to server" error!

## Step 4: Set Environment Variables

1. Create a `.env` file in your project root (if not exists):
   ```bash
   cp .env.example .env
   ```

2. Add your Google credentials:
   ```env
   GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-web-client-secret
   ```

## Step 5: Update Supabase Local Config (Optional)

If running Supabase locally, update `supabase/config.toml`:
```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

This is already configured in your project! ✓

## Step 6: Test the Integration

1. Start your app:
   ```bash
   npm start
   ```

2. Navigate to the Sign In screen
3. Click **Continue with Google**
4. Complete the OAuth flow in the browser
5. You should be redirected back to the app and signed in

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Verify the redirect URI in Google Cloud Console matches exactly:
  `https://gdgbuvgmzaqeajwxhldr.supabase.co/auth/v1/callback`

### Error: "Invalid client"
- Double-check your Client ID and Client Secret in Supabase Dashboard
- Make sure you're using the **Web Application** credentials, not Android/iOS

### Error: "Access blocked: This app's request is invalid"
- Make sure you've enabled Google+ API in Google Cloud Console
- Add test users in OAuth consent screen if app is in testing mode

### Android: Sign-in works in browser but doesn't return to app
- Verify your SHA-1 fingerprint is correct
- Make sure package name matches: `com.aiagentmaker.charismatracker`
- Check that Android OAuth client is created in Google Cloud Console

### iOS: Sign-in issues
- Verify Bundle ID matches: `com.aiagentmaker.charismatracker`
- Check that iOS OAuth client is created in Google Cloud Console

## OAuth Consent Screen

If your app is in **Testing** mode:
1. Go to **OAuth consent screen** in Google Cloud Console
2. Add test users (email addresses that can sign in)
3. Or publish the app to make it available to all users

## Security Notes

- Never commit your `.env` file to git
- Keep your Client Secret secure
- Use different OAuth clients for development and production
- Regularly rotate your credentials

## Implementation Details

The Google Sign-In is implemented using:
- **Supabase Auth**: `supabase.auth.signInWithOAuth()`
- **expo-web-browser**: Opens OAuth flow in system browser
- **expo-linking**: Handles deep linking back to app

Code location: `app/auth-sign-in.tsx` (line 181-246)

## Support

For issues:
- Supabase Auth: https://supabase.com/docs/guides/auth
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- Expo Auth: https://docs.expo.dev/guides/authentication/
