# CharApp — Full Functionality Summary

## Platform & Tech Stack
- **Framework**: React Native + Expo (SDK 54)
- **Navigation**: Expo Router with tab-based layout
- **Backend**: Supabase (auth, database, real-time subscriptions)
- **AI**: Google Gemini API for AI chat
- **Monetization**: RevenueCat + Stripe for subscriptions
- **Analytics**: Vexo Analytics
- **Platforms**: iOS, Android, Web

---

## 1. Home Screen (`app/(tabs)/index.tsx`)
- Displays **charisma entries** (journal-style logs)
- Shows **shared social links** (YouTube, TikTok, Instagram, Reels, etc.)
- **Paste Link Modal** for manually adding social media links
- Subscription status banner (Pro/Trial/Free)
- Quick navigation to add entries, AI chat, etc.

## 2. Charisma Entry System (`app/add-entry.tsx`)
- Log personal charisma experiences categorized by type:
  - **Authority**, **Visionary**, **Warmth**, **Focus/Presence**, **Magnetism**, **First Impression**, **Boldness**, **Humility**, **Tough**, **Celebrity**, **Inspirational**, **Servant Leadership**, and more
- Select **emotion emojis** to tag the mood/feeling
- Add **free-text notes** to entries
- Entries include date, time, charisma type, sub-charisma, and emoji tags
- View/edit individual entries via `app/entry/[id].tsx`

## 3. AI Chat (`app/ai-chat.tsx`)
- Powered by **Google Gemini AI**
- AI coach for improving social skills and charisma
- Text-to-speech with speaker toggle
- Random greeting messages
- Subscription paywall with QR code payment options
- Free trial period (30-day local trial for non-signed-up users)

## 4. Messaging System (`app/(tabs)/messages.tsx`, `app/chat/[id].tsx`)
- **Real-time 1:1 messaging** via Supabase real-time subscriptions
- Message features:
  - **Text messages** with AES-256 end-to-end encryption
  - **Attachments**: images, videos, audio, documents, location, contacts
  - **Charisma entry sharing** as message attachments
  - **Message forwarding** with full forward chain tracking
  - **Read receipts** and unread counts
  - **Message reactions** (emoji)
  - **Online status** and last seen
- Self-messages storage for notes to self
- Contact integration via `expo-contacts`
- New message composition (`app/new-message.tsx`)
- Rate limiting: 30 messages per minute

## 5. Social Link Management (`utils/link-storage.ts`, `lib/link-*-service.ts`)
- Save and organize links from social platforms:
  - **YouTube**, **Instagram**, **TikTok**, **Facebook Reels**, generic web
- Auto-detect platform from URL
- Platform-specific colors and emojis
- **Deep link handling** — receive shared links from other apps via OS share sheet
- **Link analytics** and **link search** services
- Thumbnail support

## 6. Search (`app/(tabs)/search.tsx`)
- **Unified search** across both charisma entries and social links
- Search by:
  - Charisma type names
  - Sub-charisma categories
  - Emotion names
  - Notes content
  - Link URLs, labels, and platform names
- Results grouped by **Social Links** and **Charisma Entries**
- Highlighted matching text
- Debounced search (300ms)

## 7. User Profile & Settings
- **Profile screen** (`app/(tabs)/profile.tsx`): view stats, version info
- **Edit profile** (`app/edit-profile.tsx`): name, username, email, phone, avatar, DOB, gender, location, bio, interests, occupation, website, social links
- **Profile settings** (`app/profile-settings.tsx`): extended profile management
- **Settings** (`app/settings.tsx`):
  - **General**: theme (light/dark/auto), language
  - **Privacy**: profile visibility (public/friends/private), toggle email/phone/location/birthdate visibility
  - **Notifications**: email, push, daily reminders, weekly reports
- **Data export**: export all user data as shareable text
- **Sign out** functionality

## 8. Authentication (`app/auth-sign-in.tsx`, `utils/auth-utils.ts`)
- **Supabase Auth** with email/password
- Sign up, sign in, password reset
- **Rate limiting**:
  - Login: 5 attempts per 15 minutes
  - Signup: 3 attempts per hour
  - Password reset: 3 attempts per hour
- Password change (`app/change-password.tsx`)
- User registration and profile sync with Supabase

## 9. Onboarding Flow
- **Step 1** — Password setup (`app/onboarding-password.tsx`)
- **Step 2** — Charisma type selection (`app/onboarding-charisma.tsx`): pick your dominant charisma categories
- **Step 3** — Emotion selection (`app/onboarding-emotions.tsx`): choose preferred emotion emojis
- Pro charisma types gated behind subscription

## 10. Subscription & Monetization
- **RevenueCat** integration (`lib/revenuecat.ts`, `app/subscription-revenuecat.tsx`)
- **Stripe** payment sheet (`app/subscription.tsx`)
- QR code payment channels
- Free mode: signed-up users get free access; non-signed-up users get 30-day local trial
- Pro features gate certain charisma categories

## 11. Security
- **Encrypted storage** via `react-native-encrypted-storage` with AsyncStorage fallback
- **AES-256 message encryption** (`utils/encryption.ts`)
- **Input sanitization** to prevent XSS/injection (`utils/input-sanitizer.ts`)
- **Rate limiting** on auth and messaging (`utils/rate-limiter.ts`)
- **Environment variables** for all API keys (Supabase, Gemini, Stripe, RevenueCat, Vexo, SMTP)
- **Supabase Row-Level Security (RLS)** for data isolation
- Custom secure storage adapter for Supabase auth tokens

## 12. Analytics & Stats
- **User stats**: total entries, streaks, top charisma type, top emotion, weekly/monthly averages
- **Vexo Analytics** for event tracking (auth events, errors, etc.)
- **Link analytics** service

## 13. Other Features
- **Haptic feedback** via `expo-haptics`
- **Media picker** service for camera/gallery access
- **Media upload** and **sharing** services
- **Deep linking** (`charismachat://` scheme + universal links via `charismachat.app`)
- **Light/Dark/Auto theme** support
- **Demo data** generation for testing
- **Custom logging** utility

---

## Architecture Overview

| Layer | Key Files |
|-------|-----------|
| **Screens** | `app/(tabs)/index.tsx`, `messages.tsx`, `search.tsx`, `profile.tsx` |
| **Features** | `add-entry.tsx`, `ai-chat.tsx`, `chat/[id].tsx`, `new-message.tsx` |
| **Auth** | `auth-sign-in.tsx`, `onboarding-*.tsx`, `change-password.tsx` |
| **Utils** | `auth-utils.ts`, `message-utils.ts`, `profile-utils.ts`, `search-utils.ts`, `subscription-utils.ts`, `link-storage.ts` |
| **Security** | `encryption.ts`, `input-sanitizer.ts`, `rate-limiter.ts`, `secure-storage.ts`, `security.ts` |
| **Services** | `lib/supabase*.ts`, `lib/gemini.ts`, `lib/revenuecat.ts`, `lib/link-*-service.ts`, `lib/media-*-service.ts` |
