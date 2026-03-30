import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Conditional imports for Expo Go compatibility
let Purchases: any;
let RevenueCatUI: any;
let PurchasesOffering: any;
let PurchasesPackage: any;
let CustomerInfo: any;
let LOG_LEVEL: any;
let PURCHASES_ERROR_CODE: any;

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    const PurchasesModule = require('react-native-purchases');
    Purchases = PurchasesModule.default;
    PurchasesOffering = PurchasesModule.PurchasesOffering;
    PurchasesPackage = PurchasesModule.PurchasesPackage;
    CustomerInfo = PurchasesModule.CustomerInfo;
    LOG_LEVEL = PurchasesModule.LOG_LEVEL;
    PURCHASES_ERROR_CODE = PurchasesModule.PURCHASES_ERROR_CODE;
    
    const UIModule = require('react-native-purchases-ui');
    RevenueCatUI = UIModule.default;
  } catch (e) {
    console.log('RevenueCat native modules not available (Expo Go)');
  }
}

export type { PurchasesOffering, PurchasesPackage, CustomerInfo };

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

let revenueCatInitialized = false;

/**
 * Initialize RevenueCat SDK with modern configuration
 */
export const initializeRevenueCat = async (userId?: string) => {
  if (revenueCatInitialized) return true;

  if (isExpoGo || !Purchases) {
    console.log('RevenueCat not available in Expo Go. Use a development build for full functionality.');
    revenueCatInitialized = true;
    return false;
  }

  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn('RevenueCat API key not found. Subscription features will be limited.');
    return false;
  }

  try {
    // Configure SDK with modern options
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    
    // Initialize with API key and optional user ID
    await Purchases.configure({ 
      apiKey,
      appUserID: userId,
    });
    
    // Set up listener for customer info updates
    Purchases.addCustomerInfoUpdateListener((info: any) => {
      console.log('Customer info updated:', info);
    });
    
    revenueCatInitialized = true;
    console.log('RevenueCat initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    return false;
  }
};

/**
 * Identify user in RevenueCat
 */
export const identifyRevenueCatUser = async (userId: string) => {
  if (isExpoGo || !Purchases) return;
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    await Purchases.logIn(userId);
    console.log('User identified in RevenueCat:', userId);
  } catch (error) {
    console.error('Error identifying user in RevenueCat:', error);
  }
};

/**
 * Get available offerings (subscription plans)
 */
export const getOfferings = async (): Promise<any | null> => {
  if (isExpoGo || !Purchases) return null;
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null) {
      return offerings.current;
    }
    return null;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
};

/**
 * Purchase a package with comprehensive error handling
 */
export const purchasePackage = async (
  packageToPurchase: any
): Promise<{ success: boolean; customerInfo?: any; error?: string; userCancelled?: boolean }> => {
  if (isExpoGo || !Purchases) {
    return { success: false, error: 'RevenueCat not available in Expo Go' };
  }
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    console.log('Purchase successful:', customerInfo);
    return { success: true, customerInfo };
  } catch (error: any) {
    // Handle user cancellation
    if (error.userCancelled) {
      console.log('User cancelled the purchase');
      return { success: false, error: 'User cancelled the purchase', userCancelled: true };
    }
    
    // Handle specific error codes
    switch (error.code) {
      case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
        return { success: false, error: 'Purchase was cancelled', userCancelled: true };
      case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
        return { success: false, error: 'There was a problem with the store. Please try again.' };
      case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
        return { success: false, error: 'Purchase not allowed. Please check your device settings.' };
      case PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR:
        return { success: false, error: 'Invalid purchase. Please try again.' };
      case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
        return { success: false, error: 'This product is not available for purchase.' };
      case PURCHASES_ERROR_CODE.NETWORK_ERROR:
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      default:
        console.error('Error purchasing package:', error);
        return { success: false, error: error.message || 'Purchase failed. Please try again.' };
    }
  }
};

/**
 * Restore purchases
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  customerInfo?: any;
  error?: string;
}> => {
  if (isExpoGo || !Purchases) {
    return { success: false, error: 'RevenueCat not available in Expo Go' };
  }
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return { success: true, customerInfo };
  } catch (error: any) {
    console.error('Error restoring purchases:', error);
    return { success: false, error: error.message || 'Restore failed' };
  }
};

/**
 * Get customer info (subscription status)
 */
export const getCustomerInfo = async (): Promise<any | null> => {
  if (isExpoGo || !Purchases) return null;
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error fetching customer info:', error);
    return null;
  }
};

/**
 * Check if user has active Pro subscription (entitlement-based)
 * This is the recommended way to check subscription status
 */
export const checkProSubscription = async (entitlementId: string = 'pro'): Promise<boolean> => {
  if (isExpoGo || !Purchases) return false;
  
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    const entitlement = customerInfo.entitlements.active[entitlementId];
    const isActive = entitlement !== undefined;
    
    console.log(`Pro subscription status (${entitlementId}):`, isActive);
    return isActive;
  } catch (error) {
    console.error('Error checking Pro subscription:', error);
    return false;
  }
};

/**
 * Get detailed entitlement information
 */
export const getEntitlementInfo = async (entitlementId: string = 'pro') => {
  if (isExpoGo || !Purchases) return null;
  
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return null;

    const entitlement = customerInfo.entitlements.active[entitlementId];
    if (!entitlement) return null;

    return {
      identifier: entitlement.identifier,
      isActive: entitlement.isActive,
      willRenew: entitlement.willRenew,
      periodType: entitlement.periodType,
      latestPurchaseDate: entitlement.latestPurchaseDate,
      originalPurchaseDate: entitlement.originalPurchaseDate,
      expirationDate: entitlement.expirationDate,
      store: entitlement.store,
      productIdentifier: entitlement.productIdentifier,
      isSandbox: entitlement.isSandbox,
      unsubscribeDetectedAt: entitlement.unsubscribeDetectedAt,
      billingIssueDetectedAt: entitlement.billingIssueDetectedAt,
    };
  } catch (error) {
    console.error('Error getting entitlement info:', error);
    return null;
  }
};

/**
 * Get subscription expiration date
 */
export const getSubscriptionExpiration = async (
  entitlementId: string = 'pro'
): Promise<Date | null> => {
  if (isExpoGo || !Purchases) return null;
  
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return null;

    const entitlement = customerInfo.entitlements.active[entitlementId];
    if (!entitlement) return null;

    return entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
  } catch (error) {
    console.error('Error getting subscription expiration:', error);
    return null;
  }
};

/**
 * Log out user from RevenueCat
 */
export const logoutRevenueCatUser = async () => {
  if (isExpoGo || !Purchases || !revenueCatInitialized) return;

  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Error logging out from RevenueCat:', error);
  }
};

/**
 * Set user attributes for RevenueCat
 */
export const setRevenueCatAttributes = async (attributes: Record<string, string | null>) => {
  if (isExpoGo || !Purchases) return;
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    await Purchases.setAttributes(attributes);
  } catch (error) {
    console.error('Error setting RevenueCat attributes:', error);
  }
};

/**
 * Get formatted price for a package
 */
export const getPackagePrice = (pkg: any): string => {
  return pkg?.product?.priceString || '';
};

/**
 * Get package duration description
 */
export const getPackageDuration = (pkg: any): string => {
  const identifier = pkg.identifier.toLowerCase();
  
  if (identifier.includes('annual') || identifier.includes('yearly')) {
    return 'per year';
  } else if (identifier.includes('monthly')) {
    return 'per month';
  } else if (identifier.includes('weekly')) {
    return 'per week';
  } else if (identifier.includes('lifetime')) {
    return 'one-time';
  }
  
  return '';
};

/**
 * Present RevenueCat Paywall UI
 * This shows the native paywall configured in RevenueCat dashboard
 */
export const showPaywall = async (options?: {
  offering?: any;
  onPurchaseCompleted?: (customerInfo: any) => void;
  onPurchaseError?: (error: any) => void;
  onRestoreCompleted?: (customerInfo: any) => void;
}): Promise<{ success: boolean; error?: string }> => {
  if (isExpoGo || !Purchases || !RevenueCatUI) {
    return { success: false, error: 'RevenueCat Paywall not available in Expo Go' };
  }
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    const paywallResult = await RevenueCatUI.presentPaywall({
      offering: options?.offering,
    });

    console.log('Paywall result:', paywallResult);

    // Check if purchase was made
    if (paywallResult === 'PURCHASED' || paywallResult === 'RESTORED') {
      const customerInfo = await getCustomerInfo();
      if (customerInfo && options?.onPurchaseCompleted) {
        options.onPurchaseCompleted(customerInfo);
      }
      return { success: true };
    }

    return { success: false, error: 'User cancelled or closed paywall' };
  } catch (error: any) {
    console.error('Error presenting paywall:', error);
    if (options?.onPurchaseError) {
      options.onPurchaseError(error);
    }
    return { success: false, error: error.message || 'Failed to show paywall' };
  }
};

/**
 * Present RevenueCat Customer Center
 * This shows a native UI for managing subscriptions
 */
export const showCustomerCenter = async (): Promise<{ success: boolean; error?: string }> => {
  if (isExpoGo || !Purchases || !RevenueCatUI) {
    return { success: false, error: 'Customer Center not available in Expo Go' };
  }
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    await RevenueCatUI.presentCustomerCenter();
    return { success: true };
  } catch (error: any) {
    console.error('Error presenting customer center:', error);
    return { success: false, error: error.message || 'Failed to show customer center' };
  }
};

/**
 * Check if customer center is available
 * Customer center requires an active subscription
 */
export const isCustomerCenterAvailable = async (): Promise<boolean> => {
  if (isExpoGo || !Purchases) return false;
  
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    // Customer center is available if user has any active entitlements
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error('Error checking customer center availability:', error);
    return false;
  }
};

/**
 * Get all active subscriptions
 */
export const getActiveSubscriptions = async () => {
  if (isExpoGo || !Purchases) return [];
  
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return [];

    return Object.entries(customerInfo.entitlements.active).map(([key, entitlement]: [string, any]) => ({
      identifier: key,
      productIdentifier: entitlement.productIdentifier,
      willRenew: entitlement.willRenew,
      periodType: entitlement.periodType,
      expirationDate: entitlement.expirationDate,
      store: entitlement.store,
    }));
  } catch (error) {
    console.error('Error getting active subscriptions:', error);
    return [];
  }
};

/**
 * Sync purchases with RevenueCat
 * Call this after a successful purchase or when app becomes active
 */
export const syncPurchases = async (): Promise<any | null> => {
  if (isExpoGo || !Purchases) return null;
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    await Purchases.syncPurchases();
    console.log('Purchases synced successfully');
    const customerInfo = await getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error syncing purchases:', error);
    return null;
  }
};

/**
 * Check if user is eligible for introductory pricing
 */
export const checkIntroEligibility = async (productIdentifiers: string[]) => {
  if (isExpoGo || !Purchases) return {};
  
  if (!revenueCatInitialized) {
    await initializeRevenueCat();
  }

  try {
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIdentifiers);
    return eligibility;
  } catch (error) {
    console.error('Error checking intro eligibility:', error);
    return {};
  }
};

/**
 * Get subscription status summary for UI display
 */
export const getSubscriptionStatus = async (entitlementId: string = 'pro') => {
  if (isExpoGo || !Purchases) {
    return {
      isSubscribed: false,
      status: 'Not Available (Expo Go)',
      willRenew: false,
      expirationDate: null,
    };
  }
  
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) {
      return {
        isSubscribed: false,
        status: 'Not Subscribed',
        willRenew: false,
        expirationDate: null,
      };
    }

    const entitlement = customerInfo.entitlements.active[entitlementId];
    if (!entitlement) {
      return {
        isSubscribed: false,
        status: 'Not Subscribed',
        willRenew: false,
        expirationDate: null,
      };
    }

    return {
      isSubscribed: true,
      status: entitlement.willRenew ? 'Active' : 'Expires Soon',
      willRenew: entitlement.willRenew,
      expirationDate: entitlement.expirationDate,
      periodType: entitlement.periodType,
      store: entitlement.store,
      productIdentifier: entitlement.productIdentifier,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      isSubscribed: false,
      status: 'Error',
      willRenew: false,
      expirationDate: null,
    };
  }
};

/**
 * Get package by identifier (monthly, yearly, etc.)
 */
export const getPackageByIdentifier = async (identifier: string): Promise<any | null> => {
  try {
    const offering = await getOfferings();
    if (!offering) return null;

    // Check available packages
    const packages = offering.availablePackages;
    const foundPackage = packages.find((pkg: any) => 
      pkg.identifier.toLowerCase().includes(identifier.toLowerCase())
    );

    return foundPackage || null;
  } catch (error) {
    console.error('Error getting package by identifier:', error);
    return null;
  }
};

export { RevenueCatUI };
