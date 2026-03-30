# Storage Security Setup Guide

## ⚠️ Important: Use Supabase Dashboard UI

The SQL migration approach requires superuser permissions. Instead, follow these steps to configure storage security through the Supabase Dashboard UI.

---

## 📋 Step-by-Step Setup

### **Step 1: Access Storage Settings**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click on the **message-attachments** bucket
5. Click on **Configuration** tab

---

### **Step 2: Configure Bucket Settings**

#### **A. Make Bucket Private**
- Toggle **Public bucket** to **OFF**
- This ensures files are not publicly accessible

#### **B. Set File Size Limit**
- Set **File size limit** to: `52428800` (50MB in bytes)
- Or use the UI slider to set 50MB

#### **C. Configure Allowed MIME Types**
Add these MIME types (one per line):
```
image/jpeg
image/png
image/gif
image/webp
video/mp4
video/quicktime
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
application/vnd.ms-powerpoint
application/vnd.openxmlformats-officedocument.presentationml.presentation
text/plain
application/zip
```

Click **Save** to apply changes.

---

### **Step 3: Create RLS Policies**

1. In the **message-attachments** bucket, click on **Policies** tab
2. Click **New Policy**
3. Create each policy below:

---

#### **Policy 1: Upload to Own Folder**

**Settings:**
- **Policy name:** `Users can upload to own folder`
- **Allowed operation:** `INSERT`
- **Target roles:** `authenticated`
- **Policy definition (WITH CHECK):**
```sql
bucket_id = 'message-attachments' AND
(storage.foldername(name))[1] = auth.uid()::text
```

Click **Review** → **Save policy**

---

#### **Policy 2: View Own Files**

**Settings:**
- **Policy name:** `Users can view own files`
- **Allowed operation:** `SELECT`
- **Target roles:** `authenticated`
- **Policy definition (USING):**
```sql
bucket_id = 'message-attachments' AND
(storage.foldername(name))[1] = auth.uid()::text
```

Click **Review** → **Save policy**

---

#### **Policy 3: View Conversation Files**

**Settings:**
- **Policy name:** `Users can view conversation files`
- **Allowed operation:** `SELECT`
- **Target roles:** `authenticated`
- **Policy definition (USING):**
```sql
bucket_id = 'message-attachments' AND
EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.attachment_url LIKE '%' || name
  AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
)
```

Click **Review** → **Save policy**

---

#### **Policy 4: Delete Own Files**

**Settings:**
- **Policy name:** `Users can delete own files`
- **Allowed operation:** `DELETE`
- **Target roles:** `authenticated`
- **Policy definition (USING):**
```sql
bucket_id = 'message-attachments' AND
(storage.foldername(name))[1] = auth.uid()::text
```

Click **Review** → **Save policy**

---

### **Step 4: Verify Setup**

After creating all policies, verify:

1. **Bucket Configuration:**
   - ✅ Public bucket: OFF
   - ✅ File size limit: 50MB
   - ✅ Allowed MIME types: Configured

2. **Policies Created:**
   - ✅ Users can upload to own folder (INSERT)
   - ✅ Users can view own files (SELECT)
   - ✅ Users can view conversation files (SELECT)
   - ✅ Users can delete own files (DELETE)

---

## 🧪 Testing

Test the security setup:

### **Test 1: Upload File**
```typescript
// Should succeed - user uploading to their own folder
const { data, error } = await supabase.storage
  .from('message-attachments')
  .upload(`${userId}/test.jpg`, file)
```

### **Test 2: Upload to Another User's Folder**
```typescript
// Should fail - user trying to upload to another user's folder
const { data, error } = await supabase.storage
  .from('message-attachments')
  .upload(`another-user-id/test.jpg`, file)
// Expected: Error - RLS policy violation
```

### **Test 3: View Own File**
```typescript
// Should succeed - user viewing their own file
const { data } = await supabase.storage
  .from('message-attachments')
  .download(`${userId}/test.jpg`)
```

### **Test 4: View Conversation File**
```typescript
// Should succeed - user viewing file from their conversation
const { data } = await supabase.storage
  .from('message-attachments')
  .download(`other-user-id/message-attachment.jpg`)
// (if this file is attached to a message between the users)
```

---

## ✅ Completion Checklist

- [ ] Bucket is set to private
- [ ] File size limit is 50MB
- [ ] Allowed MIME types are configured
- [ ] All 4 RLS policies are created
- [ ] Tested upload to own folder (should work)
- [ ] Tested upload to another user's folder (should fail)
- [ ] Tested viewing own files (should work)
- [ ] Tested viewing conversation files (should work)

---

## 🔒 Security Benefits

After completing this setup:

✅ **Files are private** - Not publicly accessible  
✅ **User isolation** - Users can only upload to their own folders  
✅ **Conversation access** - Users can view files from their messages  
✅ **File type restrictions** - Only safe MIME types allowed  
✅ **Size limits** - Maximum 50MB per file  
✅ **Delete protection** - Users can only delete their own files  

---

## 🆘 Troubleshooting

### **Issue: Policies not working**
- Ensure bucket name is exactly `message-attachments`
- Check that RLS is enabled on the bucket
- Verify policy syntax is correct

### **Issue: Can't upload files**
- Check user is authenticated
- Verify file path starts with `userId/`
- Ensure file size is under 50MB
- Check MIME type is in allowed list

### **Issue: Can't view files**
- Ensure user has permission (own file or conversation file)
- Check attachment_url in messages table matches file path
- Verify user is sender or receiver of the message

---

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → Storage → Policies
2. Review error messages in browser console
3. Test with Supabase Storage API directly
4. Check RLS policy logs in Supabase Dashboard

---

**Last Updated:** December 29, 2025  
**Status:** Ready for implementation
