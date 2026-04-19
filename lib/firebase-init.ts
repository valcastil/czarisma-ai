// This file initializes Firebase Auth for phone OTP sign-up.
// In Expo Go, metro.config.js swaps this for lib/firebase-init.stub.ts (a no-op).
import { initFirebaseAuth } from '@/utils/firebase-auth-utils';
import auth from '@react-native-firebase/auth';

initFirebaseAuth(auth);
console.log('Firebase Auth initialized successfully');
