# Link Sharing Feature - Deployment Checklist

## 🚀 **Pre-Deployment Checklist**

### **1. Database Setup**
- [ ] Run migration: `20241230_create_shared_links_table.sql`
- [ ] Verify table created: `shared_links`
- [ ] Verify RLS policies enabled
- [ ] Test RLS policies (users can only see own links)
- [ ] Create indexes verified
- [ ] Test database queries

### **2. Supabase Storage**
- [ ] Create bucket: `message-attachments`
- [ ] Set bucket to public
- [ ] Configure file size limit: 50MB
- [ ] Add allowed MIME types (see STORAGE_SETUP_GUIDE.md)
- [ ] Set up RLS policies via Dashboard
- [ ] Test file upload
- [ ] Test file access

### **3. Deep Linking**
- [ ] Verify `app.json` scheme: `charismaai`
- [ ] iOS associated domains configured
- [ ] Android intent filters configured
- [ ] Test share from YouTube
- [ ] Test share from TikTok
- [ ] Test share from Instagram
- [ ] Test share from browser
- [ ] Verify app appears in share sheet

### **4. Environment Variables**
- [ ] Supabase URL configured
- [ ] Supabase anon key configured
- [ ] All API keys secured (not hardcoded)
- [ ] Production environment variables set

### **5. Code Quality**
- [ ] All TypeScript errors resolved
- [ ] No console.errors in production
- [ ] All imports correct
- [ ] No unused imports
- [ ] Code formatted consistently
- [ ] Comments added where needed

---

## 🧪 **Testing Checklist**

### **Phase 1: Foundation**
- [ ] Share link from external app
- [ ] Link appears in database
- [ ] Deep linking works on iOS
- [ ] Deep linking works on Android
- [ ] RLS policies working

### **Phase 2: Metadata**
- [ ] YouTube metadata extracted
- [ ] TikTok metadata extracted
- [ ] Instagram basic info extracted
- [ ] Generic URLs get Open Graph data
- [ ] Thumbnails display correctly
- [ ] Titles display correctly

### **Phase 3: UI**
- [ ] LinkQueue displays on home screen
- [ ] Link cards show correctly
- [ ] Thumbnails load
- [ ] Platform badges correct colors
- [ ] Delete button works
- [ ] Detail modal opens
- [ ] All actions work (open, favorite, archive, delete)

### **Phase 4: Advanced**
- [ ] Real-time updates working
- [ ] New links appear automatically
- [ ] Share to conversation works
- [ ] Optimistic updates smooth
- [ ] No UI flicker
- [ ] Error handling works

### **Phase 5: Polish**
- [ ] Search functionality works
- [ ] Filter functionality works
- [ ] Analytics tracking works
- [ ] Error boundary catches errors
- [ ] Performance acceptable

---

## 📱 **Platform Testing**

### **iOS**
- [ ] Share from Safari
- [ ] Share from YouTube app
- [ ] Share from TikTok app
- [ ] Share from Instagram app
- [ ] Deep linking works
- [ ] UI displays correctly
- [ ] No crashes
- [ ] Performance good

### **Android**
- [ ] Share from Chrome
- [ ] Share from YouTube app
- [ ] Share from TikTok app
- [ ] Share from Instagram app
- [ ] Deep linking works
- [ ] UI displays correctly
- [ ] Icons show correctly
- [ ] No crashes
- [ ] Performance good

---

## 🔒 **Security Checklist**

### **Database Security**
- [ ] RLS enabled on `shared_links`
- [ ] Users can only access own links
- [ ] Proper foreign key constraints
- [ ] Input validation on all fields

### **Storage Security**
- [ ] RLS policies on storage bucket
- [ ] File size limits enforced
- [ ] MIME type restrictions
- [ ] User-scoped folders

### **API Security**
- [ ] No API keys in code
- [ ] Environment variables used
- [ ] Supabase anon key only (not service key)
- [ ] Rate limiting considered

### **Data Privacy**
- [ ] User data isolated
- [ ] No data leakage between users
- [ ] Proper authentication checks
- [ ] Secure data transmission

---

## ⚡ **Performance Checklist**

### **Load Times**
- [ ] Initial load < 2 seconds
- [ ] Link cards render quickly
- [ ] Images load progressively
- [ ] No blocking operations

### **Memory Usage**
- [ ] No memory leaks
- [ ] Images properly cached
- [ ] Subscriptions cleaned up
- [ ] Large lists virtualized

### **Network Usage**
- [ ] Minimal API calls
- [ ] Real-time subscriptions efficient
- [ ] Images optimized
- [ ] Metadata cached

---

## 📊 **Analytics Setup**

### **Events to Track**
- [ ] Link shared (from external app)
- [ ] Link viewed (detail modal opened)
- [ ] Link opened (browser launched)
- [ ] Link shared to conversation
- [ ] Link favorited
- [ ] Link archived
- [ ] Link deleted
- [ ] Search performed
- [ ] Filter applied

### **Metrics to Monitor**
- [ ] Daily active users
- [ ] Links shared per user
- [ ] Most popular platforms
- [ ] Conversion rate (shared → opened)
- [ ] Feature adoption rate

---

## 🚀 **Deployment Steps**

### **1. Build App**
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### **2. Test Build**
- [ ] Install on test device
- [ ] Run through all test scenarios
- [ ] Verify deep linking
- [ ] Check performance
- [ ] Test on slow network

### **3. Submit to Stores**
- [ ] Update version number
- [ ] Update changelog
- [ ] Prepare screenshots
- [ ] Write release notes
- [ ] Submit to App Store
- [ ] Submit to Play Store

### **4. Monitor Launch**
- [ ] Watch crash reports
- [ ] Monitor analytics
- [ ] Check error logs
- [ ] User feedback
- [ ] Performance metrics

---

## 🐛 **Post-Launch Monitoring**

### **First 24 Hours**
- [ ] Check crash rate
- [ ] Monitor error logs
- [ ] Watch user feedback
- [ ] Check analytics events
- [ ] Verify deep linking working

### **First Week**
- [ ] Review analytics
- [ ] Check feature adoption
- [ ] Monitor performance
- [ ] Collect user feedback
- [ ] Plan improvements

---

## 📝 **Rollback Plan**

### **If Issues Occur:**

1. **Minor Issues:**
   - Monitor and collect data
   - Plan hotfix
   - Test thoroughly
   - Deploy update

2. **Major Issues:**
   - Disable feature flag (if implemented)
   - Revert to previous version
   - Investigate issue
   - Fix and re-deploy

### **Rollback Steps:**
```bash
# Revert to previous build
eas build --platform all --profile production --no-wait

# Or disable feature
# Update feature flag in database/config
```

---

## ✅ **Final Checks**

Before going live:
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Team trained
- [ ] Support ready
- [ ] Monitoring in place

---

## 📞 **Support Preparation**

### **Common Issues & Solutions**

**Issue:** App doesn't appear in share sheet
- **Solution:** Rebuild app, check intent filters

**Issue:** Links not saving
- **Solution:** Check authentication, verify RLS policies

**Issue:** Metadata not loading
- **Solution:** Check network, verify API endpoints

**Issue:** Real-time not working
- **Solution:** Check Supabase realtime enabled, verify subscription

---

## 🎯 **Success Metrics**

### **Week 1 Goals:**
- 50% of users try link sharing
- Average 3 links shared per active user
- < 1% crash rate
- < 5% error rate

### **Month 1 Goals:**
- 75% of users try link sharing
- Average 10 links shared per active user
- 50% of shared links opened
- 25% of links shared to conversations

---

**Deployment Status:** Ready when all checkboxes complete ✅
