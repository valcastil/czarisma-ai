# Supabase Connection Fixes

## Issues Found & Fixed

### 1. ❌ **detectSessionInUrl was disabled**
**Problem:** OAuth flows couldn't detect sessions from callback URLs

**Fix:** Changed `detectSessionInUrl: false` to `detectSessionInUrl: true` in `lib/supabase.ts`

```typescript
// Before
detectSessionInUrl: false,

// After
detectSessionInUrl: true,
```

### 2. ❌ **Missing auth callback route**
**Problem:** No route to handle OAuth redirects after Google Sign-In

**Fix:** Created `app/auth/callback.tsx` to handle OAuth callbacks

### 3. ✅ **Improved Google Sign-In handler**
**Enhancement:** Added comprehensive logging and better error handling in `app/auth-sign-in.tsx`

## What Was Fixed

### File: `lib/supabase.ts`
- ✅ Enabled `detectSessionInUrl: true` for OAuth support

### File: `app/auth/callback.tsx` (NEW)
- ✅ Created OAuth callback handler
- ✅ Extracts session after redirect
- ✅ Navigates to subscription page on success
- ✅ Shows loading indicator during processing

### File: `app/auth-sign-in.tsx`
- ✅ Enhanced logging for debugging
- ✅ Better error messages
- ✅ Improved token extraction from callback URL
- ✅ Added session validation

## Testing the Fix

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Navigate to Sign In screen**

3. **Click "Continue with Google"**

4. **Complete OAuth in browser**

5. **App should redirect back and establish session**

## Expected Flow

```
User clicks "Continue with Google"
    ↓
App opens browser with Google OAuth
    ↓
User signs in with Google
    ↓
Google redirects to: charismatracker://auth/callback?access_token=...
    ↓
app/auth/callback.tsx handles the redirect
    ↓
Session is established in Supabase
    ↓
User is redirected to /subscription
```

## Debugging

If issues persist, check the logs for:

```typescript
// Starting OAuth
'Starting Google Sign-In with redirect:'

// Opening browser
'Opening OAuth URL:'

// Browser result
'WebBrowser result:'

// Token extraction
'Tokens extracted:'

// Session establishment
'Session established:'
```

## Common Issues & Solutions

### Issue: "redirect_uri_mismatch"
**Solution:** Verify redirect URI in Google Cloud Console matches:
- `https://gdgbuvgmzaqeajwxhldr.supabase.co/auth/v1/callback`

### Issue: "No tokens received"
**Solution:** 
- Check that Google OAuth is enabled in Supabase Dashboard
- Verify Client ID and Secret are correct
- Ensure you're using Web Application credentials (not Android/iOS)

### Issue: App doesn't redirect back
**Solution:**
- Verify `scheme: "charismatracker"` in app.json (already configured ✓)
- Check that `app/auth/callback.tsx` exists (now created ✓)
- Ensure `detectSessionInUrl: true` in supabase.ts (now fixed ✓)

### Issue: "Invalid client"
**Solution:**
- Double-check Client ID and Secret in Supabase Dashboard
- Make sure credentials are from Web Application type
- Verify environment variables are loaded

## Configuration Checklist

Before testing, ensure:

- ✅ `detectSessionInUrl: true` in `lib/supabase.ts`
- ✅ `app/auth/callback.tsx` exists
- ✅ `scheme: "charismatracker"` in `app.json`
- ⚠️ Google OAuth credentials configured in Supabase Dashboard
- ⚠️ Environment variables set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- ⚠️ SHA-1 fingerprint added to Google Cloud Console (for Android)

## Next Steps

1. **Configure Google Cloud Console** (see GOOGLE_SIGNIN_SETUP.md)
2. **Add credentials to Supabase Dashboard**
3. **Set environment variables**
4. **Test the flow**

## Files Modified

- ✅ `lib/supabase.ts` - Fixed detectSessionInUrl
- ✅ `app/auth/callback.tsx` - Created callback handler
- ✅ `app/auth-sign-in.tsx` - Improved error handling

All code fixes are complete! You just need to configure Google Cloud Console and Supabase Dashboard.
