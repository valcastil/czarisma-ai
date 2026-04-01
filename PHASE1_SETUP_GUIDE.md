# Phase 1: Link Sharing - Setup Guide

## ✅ **What Was Implemented**

### **1. Database Migration**
- Created `shared_links` table with all necessary columns
- Added RLS policies for security
- Created indexes for performance
- Added auto-update trigger for `updated_at`

**File:** `supabase/migrations/20241230_create_shared_links_table.sql`

### **2. Deep Linking Configuration**
- Updated app scheme to `charismaai`
- Added iOS associated domains
- Added Android intent filters for SEND action
- Configured for both platforms

**File:** `app.json` (updated)

### **3. Deep Link Handler Service**
- Captures shared URLs from external apps
- Parses and validates incoming links
- Handles share intents from Android
- Shows success/error alerts
- Navigates to home screen after save

**File:** `lib/deep-link-handler.ts`

### **4. Link Storage Service**
- Save shared links to database
- Retrieve links by status
- Update link status (read/archived/shared)
- Delete links
- Auto-detect platform from URL

**File:** `lib/link-storage-service.ts`

### **5. App Initialization**
- Integrated DeepLinkHandler into app startup
- Initializes alongside other services

**File:** `app/_layout.tsx` (updated)

---

## 🚀 **Setup Instructions**

### **Step 1: Run Database Migration**

Run the migration in Supabase Dashboard SQL Editor:

```bash
supabase/migrations/20241230_create_shared_links_table.sql
```

Or if using Supabase CLI:
```bash
supabase db push
```

**Verify:**
- Check that `shared_links` table exists
- Verify RLS policies are enabled
- Check indexes are created

---

### **Step 2: Rebuild the App**

The deep linking configuration requires a native rebuild:

**For Development:**
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

**For EAS Build:**
```bash
# iOS
eas build --platform ios --profile development

# Android
eas build --platform android --profile development
```

---

### **Step 3: Test Deep Linking**

#### **Test on Android:**

1. **Share a link from any app** (YouTube, Chrome, etc.)
2. Look for **"CharApp"** in the share sheet
3. Tap it
4. App should open and show success alert
5. Link should be saved to database

#### **Test on iOS:**

1. **Share a link from Safari or any app**
2. Tap the share button
3. Look for **"CharApp"** in the share sheet
4. Tap it
5. App should open and show success alert
6. Link should be saved to database

#### **Manual Test (Development):**

You can test deep linking manually in development:

```typescript
// In your app, call this from a button or console
import { DeepLinkHandler } from '@/lib/deep-link-handler';

DeepLinkHandler.testDeepLink('charismaai://share?url=https://youtube.com/watch?v=dQw4w9WgXcQ');
```

---

## 🔍 **Verification Checklist**

### **Database:**
- [ ] `shared_links` table created
- [ ] RLS policies enabled
- [ ] Can insert test record
- [ ] Can query own records
- [ ] Cannot query other users' records

### **Deep Linking:**
- [ ] App appears in Android share sheet
- [ ] App appears in iOS share sheet
- [ ] Links are captured correctly
- [ ] Success alert shows
- [ ] Links saved to database

### **App Integration:**
- [ ] DeepLinkHandler initializes on app start
- [ ] No errors in console
- [ ] TypeScript compiles without errors

---

## 📊 **Database Schema**

```sql
Table: shared_links
├── id (UUID, PK)
├── user_id (UUID, FK → profiles)
├── url (TEXT)
├── domain (TEXT)
├── platform (TEXT)
├── title (TEXT)
├── description (TEXT)
├── thumbnail_url (TEXT)
├── author (TEXT)
├── status (TEXT) - unread/read/archived/shared
├── is_favorite (BOOLEAN)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

---

## 🔗 **Deep Link URLs**

### **Custom Scheme:**
```
charismaai://share?url=https://example.com
```

### **Universal Links (iOS):**
```
https://charismaai.app/share?url=https://example.com
```

### **Android Intent:**
```
intent://share?url=https://example.com#Intent;scheme=charismaai;end
```

---

## 🐛 **Troubleshooting**

### **Issue: App doesn't appear in share sheet**

**Android:**
- Rebuild the app (intent filters require native rebuild)
- Check `app.json` has correct `intentFilters`
- Verify package name matches

**iOS:**
- Rebuild the app
- Check `associatedDomains` in `app.json`
- Verify bundle identifier matches

### **Issue: Links not saving to database**

**Check:**
1. User is authenticated
2. RLS policies are correct
3. Database migration ran successfully
4. Check console logs for errors

**Debug:**
```typescript
// Add to LinkStorageService.saveSharedLink
console.log('User:', user);
console.log('Saving:', { url, domain, platform });
```

### **Issue: TypeScript errors**

The following errors are expected after creating new files:
- `Cannot find module './link-storage-service'`
- TypeScript needs to recompile

**Fix:**
1. Restart TypeScript server in VS Code
2. Run `npx tsc --noEmit` to check
3. Rebuild the app

---

## 📝 **Testing Scenarios**

### **Test 1: Share YouTube Link**
1. Open YouTube app
2. Share a video
3. Select "CharApp"
4. Verify link saved with platform='youtube'

### **Test 2: Share TikTok Link**
1. Open TikTok app
2. Share a video
3. Select "CharApp"
4. Verify link saved with platform='tiktok'

### **Test 3: Share Instagram Link**
1. Open Instagram app
2. Share a post
3. Select "CharApp"
4. Verify link saved with platform='instagram'

### **Test 4: Share Generic Link**
1. Open browser
2. Share any URL
3. Select "CharApp"
4. Verify link saved with platform='web'

---

## 🔐 **Security Verification**

### **Test RLS Policies:**

```sql
-- As User A, insert a link
INSERT INTO shared_links (user_id, url, domain, platform)
VALUES ('user-a-id', 'https://example.com', 'example.com', 'web');

-- As User A, should see own link
SELECT * FROM shared_links WHERE user_id = 'user-a-id';
-- ✅ Should return 1 row

-- As User B, try to see User A's link
SELECT * FROM shared_links WHERE user_id = 'user-a-id';
-- ✅ Should return 0 rows (RLS blocks it)
```

---

## 📈 **Next Steps (Phase 2)**

After Phase 1 is complete and tested:

1. **Metadata Extraction**
   - Implement LinkParserService
   - Add YouTube oEmbed integration
   - Add TikTok oEmbed integration
   - Add Instagram oEmbed integration
   - Add Open Graph fallback

2. **UI Components**
   - Create LinkQueue component
   - Create LinkPreviewCard component
   - Integrate into home screen

---

## 🎯 **Success Criteria**

Phase 1 is complete when:

- ✅ Database migration runs successfully
- ✅ App appears in share sheet (iOS & Android)
- ✅ Links are captured and saved
- ✅ RLS policies work correctly
- ✅ No console errors
- ✅ TypeScript compiles without errors

---

## 📞 **Support**

If you encounter issues:

1. Check console logs for errors
2. Verify database migration ran
3. Rebuild the app (deep linking requires native rebuild)
4. Test with manual deep link first
5. Check RLS policies in Supabase Dashboard

---

**Phase 1 Status:** ✅ Implementation Complete  
**Next Phase:** Phase 2 - Metadata Extraction  
**Estimated Time:** 1 week
