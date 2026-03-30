# Phase 2: Metadata Extraction - Setup Guide

## ✅ **What Was Implemented**

### **1. LinkParserService**
Complete metadata extraction service with support for:
- **YouTube** - oEmbed API (no key required)
- **TikTok** - oEmbed API (no key required)
- **Instagram** - Basic extraction (full requires Facebook token)
- **Twitter/X** - Basic extraction
- **Generic URLs** - Open Graph metadata via proxy

**File:** `lib/link-parser-service.ts`

### **2. Updated LinkStorageService**
- Integrated metadata extraction
- URL normalization (removes tracking params)
- Automatic metadata saving to database

**File:** `lib/link-storage-service.ts` (updated)

---

## 🎯 **Features**

### **Metadata Extraction**

| Platform | Title | Author | Thumbnail | Duration | API Used |
|----------|-------|--------|-----------|----------|----------|
| YouTube | ✅ | ✅ | ✅ | ❌ | oEmbed |
| TikTok | ✅ | ✅ | ✅ | ❌ | oEmbed |
| Instagram | ⚠️ | ❌ | ❌ | ❌ | Basic |
| Twitter/X | ⚠️ | ❌ | ❌ | ❌ | Basic |
| Generic | ✅ | ❌ | ✅ | ❌ | Open Graph |

**Legend:**
- ✅ Full support
- ⚠️ Basic support (can be enhanced)
- ❌ Not available

---

## 🚀 **How It Works**

### **1. URL Normalization**
```typescript
// Before: https://youtube.com/watch?v=abc123&utm_source=share
// After:  https://youtube.com/watch?v=abc123
```

Removes tracking parameters:
- `utm_source`, `utm_medium`, `utm_campaign`
- `fbclid`, `gclid`

### **2. Platform Detection**
```typescript
youtube.com → 'youtube'
tiktok.com → 'tiktok'
instagram.com → 'instagram'
example.com → 'web'
```

### **3. Metadata Extraction**

**YouTube Example:**
```json
{
  "url": "https://youtube.com/watch?v=abc123",
  "domain": "youtube.com",
  "platform": "youtube",
  "title": "Amazing Video Title",
  "author": "Channel Name",
  "thumbnailUrl": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
  "width": 480,
  "height": 360
}
```

**Generic URL Example:**
```json
{
  "url": "https://example.com/article",
  "domain": "example.com",
  "platform": "web",
  "title": "Article Title",
  "description": "Article description from Open Graph",
  "thumbnailUrl": "https://example.com/image.jpg"
}
```

---

## 📊 **API Details**

### **YouTube oEmbed**
- **Endpoint:** `https://www.youtube.com/oembed`
- **Auth:** None required
- **Rate Limit:** Generous (no official limit)
- **Returns:** Title, author, thumbnail

**Example:**
```
https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=abc123&format=json
```

### **TikTok oEmbed**
- **Endpoint:** `https://www.tiktok.com/oembed`
- **Auth:** None required
- **Rate Limit:** Unknown
- **Returns:** Title, author, thumbnail

**Example:**
```
https://www.tiktok.com/oembed?url=https://www.tiktok.com/@user/video/123
```

### **Open Graph (Generic)**
- **Proxy:** `https://api.allorigins.win/get`
- **Auth:** None required
- **Rate Limit:** 240 requests/hour (free tier)
- **Returns:** Title, description, image

**Note:** For production, consider:
- Your own backend proxy
- Paid services: linkpreview.net, microlink.io
- Caching to reduce API calls

---

## 🧪 **Testing**

### **Test 1: YouTube Link**

**Input:**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Expected Output:**
```json
{
  "platform": "youtube",
  "title": "Rick Astley - Never Gonna Give You Up",
  "author": "Rick Astley",
  "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
}
```

### **Test 2: TikTok Link**

**Input:**
```
https://www.tiktok.com/@username/video/1234567890
```

**Expected Output:**
```json
{
  "platform": "tiktok",
  "title": "Video title from TikTok",
  "author": "@username",
  "thumbnailUrl": "https://..."
}
```

### **Test 3: Generic URL**

**Input:**
```
https://github.com/facebook/react
```

**Expected Output:**
```json
{
  "platform": "web",
  "title": "facebook/react: The library for web and native user interfaces",
  "description": "The library for web and native user interfaces...",
  "thumbnailUrl": "https://opengraph.githubassets.com/..."
}
```

---

## 🔧 **Manual Testing**

### **Test Metadata Extraction:**

```typescript
import { LinkParserService } from '@/lib/link-parser-service';

// Test YouTube
const youtubeMetadata = await LinkParserService.extractMetadata(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
);
console.log('YouTube:', youtubeMetadata);

// Test TikTok
const tiktokMetadata = await LinkParserService.extractMetadata(
  'https://www.tiktok.com/@username/video/123'
);
console.log('TikTok:', tiktokMetadata);

// Test Generic
const genericMetadata = await LinkParserService.extractMetadata(
  'https://github.com/facebook/react'
);
console.log('Generic:', genericMetadata);
```

### **Test Link Saving:**

```typescript
import { LinkStorageService } from '@/lib/link-storage-service';

// Save a YouTube link
const savedLink = await LinkStorageService.saveSharedLink(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
);

console.log('Saved link:', savedLink);
// Should include: title, author, thumbnailUrl
```

---

## 🔍 **Verification Checklist**

### **Metadata Extraction:**
- [ ] YouTube links extract title and thumbnail
- [ ] TikTok links extract title and author
- [ ] Generic URLs extract Open Graph data
- [ ] URL normalization removes tracking params
- [ ] Platform detection works correctly

### **Database Storage:**
- [ ] Metadata saved to `shared_links` table
- [ ] `title` column populated
- [ ] `description` column populated
- [ ] `thumbnail_url` column populated
- [ ] `author` column populated

### **Error Handling:**
- [ ] Invalid URLs handled gracefully
- [ ] API failures don't crash app
- [ ] Fallback to basic metadata on error
- [ ] Console logs show helpful debug info

---

## ⚠️ **Known Limitations**

### **Instagram:**
- Requires Facebook Graph API access token
- Currently only extracts basic info from URL
- Full implementation needs app registration

### **Twitter/X:**
- No public oEmbed API anymore
- Currently only extracts basic info
- Full implementation needs Twitter API v2

### **Rate Limits:**
- Open Graph proxy: 240 requests/hour (free)
- Consider caching for production
- Implement retry logic for failures

---

## 🚀 **Production Recommendations**

### **1. Backend Proxy**
Instead of client-side fetching, create a backend endpoint:

```typescript
// Backend endpoint (Supabase Edge Function)
export async function POST(req: Request) {
  const { url } = await req.json();
  const metadata = await extractMetadata(url);
  return Response.json(metadata);
}
```

**Benefits:**
- No CORS issues
- Better rate limit control
- Can cache results
- Hide API keys

### **2. Caching**
Cache metadata to reduce API calls:

```sql
-- Add to shared_links table
ALTER TABLE shared_links
ADD COLUMN metadata_cached_at TIMESTAMPTZ;

-- Only re-fetch if older than 7 days
```

### **3. Queue System**
For heavy traffic, use a queue:

```typescript
// Save link immediately with basic info
// Queue metadata extraction for background processing
```

### **4. Paid Services**
Consider paid services for production:
- **linkpreview.net** - $10/month for 10k requests
- **microlink.io** - $9/month for 50k requests
- **urlbox.io** - Screenshot + metadata

---

## 📈 **Performance**

### **Typical Response Times:**

| Platform | Time | Reliability |
|----------|------|-------------|
| YouTube | ~200ms | Excellent |
| TikTok | ~300ms | Good |
| Open Graph | ~1-2s | Variable |

### **Optimization Tips:**

1. **Parallel Processing:**
   ```typescript
   // Don't wait for metadata before saving
   saveSharedLink(url); // Save immediately
   extractMetadata(url).then(updateMetadata); // Update async
   ```

2. **Timeout Handling:**
   ```typescript
   const timeout = 5000; // 5 seconds
   const metadata = await Promise.race([
     extractMetadata(url),
     new Promise((_, reject) => 
       setTimeout(() => reject(new Error('Timeout')), timeout)
     )
   ]);
   ```

3. **Retry Logic:**
   ```typescript
   async function extractWithRetry(url: string, retries = 3) {
     for (let i = 0; i < retries; i++) {
       try {
         return await extractMetadata(url);
       } catch (error) {
         if (i === retries - 1) throw error;
         await sleep(1000 * (i + 1)); // Exponential backoff
       }
     }
   }
   ```

---

## 🎯 **Next Steps (Phase 3)**

After Phase 2 is tested:

1. **UI Components**
   - Create LinkQueue component
   - Create LinkPreviewCard component
   - Add to home screen

2. **Real-time Updates**
   - Subscribe to new links
   - Update UI automatically

3. **Link Actions**
   - View link details
   - Share to conversations
   - Delete/archive links

---

## 🐛 **Troubleshooting**

### **Issue: YouTube metadata not fetching**

**Check:**
1. Video ID extraction working?
2. oEmbed API responding?
3. Network connectivity?

**Debug:**
```typescript
const videoId = LinkParserService.extractYouTubeVideoId(url);
console.log('Video ID:', videoId);

const oEmbedUrl = `https://www.youtube.com/oembed?url=...`;
const response = await fetch(oEmbedUrl);
console.log('Response:', response.status, await response.text());
```

### **Issue: Open Graph not working**

**Possible causes:**
- CORS proxy down
- Rate limit exceeded
- Website blocks scraping

**Solutions:**
- Use different proxy
- Implement backend endpoint
- Add retry logic

### **Issue: Metadata incomplete**

**Check:**
- Website has Open Graph tags?
- API returned data?
- Parsing logic correct?

**Debug:**
```typescript
const metadata = await LinkParserService.extractMetadata(url);
console.log('Full metadata:', JSON.stringify(metadata, null, 2));
```

---

## ✅ **Success Criteria**

Phase 2 is complete when:

- ✅ YouTube links show title and thumbnail
- ✅ TikTok links show title and author
- ✅ Generic URLs show Open Graph data
- ✅ Metadata saved to database
- ✅ Error handling works correctly
- ✅ No console errors
- ✅ TypeScript compiles

---

**Phase 2 Status:** ✅ Implementation Complete  
**Next Phase:** Phase 3 - UI Components  
**Estimated Time:** 1 week
