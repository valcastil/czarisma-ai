# Supabase Dashboard Configuration - REQUIRED

## ⚠️ CRITICAL: This Must Be Done Before Testing

The "Safari cannot open the page because the address is invalid" error occurs because Supabase doesn't recognize your app's redirect URLs.

## Step-by-Step Instructions

### 1. Open Supabase Dashboard

Go to: https://supabase.com/dashboard/project/gdgbuvgmzaqeajwxhldr

### 2. Navigate to URL Configuration

Click: **Authentication** (left sidebar) → **URL Configuration**

### 3. Update Site URL

**Current value:** `http://127.0.0.1:3000`

**Change to:** `charismatracker://`

### 4. Add Redirect URLs

In the **Redirect URLs** section, add ALL of these URLs (one per line):

```
charismatracker://auth/callback
charismatracker://*
exp://192.168.1.213:8081/--/auth/callback
exp://192.168.1.213:8081
exp://localhost:8081/--/auth/callback
exp://localhost:8081
http://localhost:8081
```

> **Note:** Replace `192.168.1.213` with YOUR actual IP address from the Expo terminal output

### 5. How to Find Your Expo URL

When you run `npm start`, look for output like:

```
› Metro waiting on exp://192.168.1.213:8081
```

Use that IP address in the redirect URLs above.

### 6. Save Changes

Click **Save** at the bottom of the page.

## Why This Is Needed

When you sign in with Google:
1. Google redirects to Supabase
2. Supabase redirects to your app using the redirect URL
3. If the URL isn't in the allowed list, you get "invalid address" error

## Verification

After saving, you should see in Supabase Dashboard:

**Site URL:**
```
charismatracker://
```

**Redirect URLs:**
```
charismatracker://auth/callback
charismatracker://*
exp://192.168.1.213:8081/--/auth/callback
exp://192.168.1.213:8081
exp://localhost:8081/--/auth/callback
exp://localhost:8081
http://localhost:8081
```

## Testing

1. **Restart your app** after saving Supabase settings
2. Click "Continue with Google"
3. Sign in with Google
4. Should redirect back to your app successfully

## Common Issues

### Still getting "invalid address"?
- ✅ Double-check all URLs are added to Supabase Dashboard
- ✅ Make sure you clicked **Save**
- ✅ Restart the Expo app
- ✅ Clear browser cache

### Different IP address?
- Your IP might change if you reconnect to WiFi
- Check `npm start` output for current IP
- Update the redirect URLs in Supabase Dashboard

### Using a different device?
- Make sure your phone and computer are on the same WiFi network
- Use the IP address shown in Expo terminal

## For Production Builds

When you build a standalone app (not Expo Go), only these URLs are needed:

```
charismatracker://auth/callback
charismatracker://*
```

The `exp://` URLs are only for development with Expo Go.

## Screenshot Guide

1. **Authentication → URL Configuration**
   - You should see "Site URL" field at the top
   - Below that is "Redirect URLs" text area

2. **Site URL Field**
   - Clear existing value
   - Type: `charismatracker://`

3. **Redirect URLs Field**
   - One URL per line
   - Paste all the URLs listed above
   - Make sure there are no extra spaces

4. **Save Button**
   - Scroll to bottom
   - Click green "Save" button
   - Wait for success message

## Next Steps

After configuring Supabase Dashboard:

1. ✅ Restart your Expo app
2. ✅ Test Google Sign-In
3. ✅ Should work without "invalid address" error

If you still have issues, check the logs for the exact redirect URL being used and make sure it's in the Supabase Dashboard list.
