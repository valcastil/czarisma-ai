import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Alert } from 'react-native';

export class DeepLinkHandler {
  private static isInitialized = false;

  /**
   * Initialize deep link handling
   * Call this once when the app starts
   */
  static async initialize() {
    if (this.isInitialized) {
      console.log('DeepLinkHandler already initialized');
      return;
    }

    try {
      // Handle initial URL (app opened from link)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial URL detected:', initialUrl);
        await this.handleUrl(initialUrl);
      }

      // Handle URLs while app is running
      const subscription = Linking.addEventListener('url', ({ url }) => {
        console.log('Deep link received:', url);
        this.handleUrl(url);
      });

      this.isInitialized = true;
      console.log('DeepLinkHandler initialized successfully');

      return subscription;
    } catch (error) {
      console.error('Error initializing DeepLinkHandler:', error);
    }
  }

  /**
   * Handle incoming URL
   */
  static async handleUrl(url: string) {
    try {
      console.log('Processing URL:', url);

      // Parse the URL
      const parsed = Linking.parse(url);
      console.log('Parsed URL:', parsed);

      // Check if this is a share intent
      if (this.isShareIntent(url, parsed)) {
        const sharedUrl = this.extractSharedUrl(url, parsed);
        if (sharedUrl) {
          await this.handleSharedLink(sharedUrl);
        } else {
          console.warn('No URL found in share intent');
        }
        return;
      }

      // Handle other deep link paths
      if (parsed.path) {
        this.handleDeepLinkPath(parsed.path, parsed.queryParams || undefined);
      }
    } catch (error) {
      console.error('Error handling URL:', error);
      Alert.alert('Error', 'Failed to process shared link');
    }
  }

  /**
   * Check if URL is a share intent
   */
  private static isShareIntent(url: string, parsed: Linking.ParsedURL): boolean {
    // Check for share path
    if (parsed.path === 'share' || parsed.path?.includes('share')) {
      return true;
    }

    // Check for URL parameter (common in share intents)
    if (parsed.queryParams?.url || parsed.queryParams?.text) {
      return true;
    }

    // Check if URL contains common share patterns
    if (url.includes('intent://') || url.includes('android-app://')) {
      return true;
    }

    return false;
  }

  /**
   * Extract shared URL from various formats
   */
  private static extractSharedUrl(url: string, parsed: Linking.ParsedURL): string | null {
    // Try query params first
    if (parsed.queryParams?.url) {
      return parsed.queryParams.url as string;
    }

    if (parsed.queryParams?.text) {
      const text = parsed.queryParams.text as string;
      // Extract URL from text if it contains one
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
      return urlMatch ? urlMatch[1] : text;
    }

    // For Android intents, the URL might be in the original string
    if (url.includes('intent://')) {
      const intentMatch = url.match(/S\.android\.intent\.extra\.TEXT=([^&]+)/);
      if (intentMatch) {
        return decodeURIComponent(intentMatch[1]);
      }
    }

    return null;
  }

  /**
   * Handle shared link
   */
  private static async handleSharedLink(url: string) {
    try {
      console.log('=== Handling shared link ===');
      console.log('URL:', url);

      // Import dynamically to avoid circular dependencies
      const { LinkStorageService } = await import('./link-storage-service');

      // Save the link
      const savedLink = await LinkStorageService.saveSharedLink(url);
      console.log('Link saved successfully:', savedLink.id);

      // Navigate to home screen immediately
      router.push('/(tabs)');

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Link Saved!',
          'Your link has been saved and will appear on the home screen.',
          [{ text: 'OK' }]
        );
      }, 500);
    } catch (error) {
      console.error('Error handling shared link:', error);
      Alert.alert(
        'Error',
        'Failed to save the shared link. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Handle other deep link paths
   */
  private static handleDeepLinkPath(path: string, queryParams?: Linking.QueryParams) {
    console.log('Handling deep link path:', path, queryParams);

    // Handle different paths
    switch (path) {
      case 'chat':
        if (queryParams?.id) {
          router.push(`/chat/${queryParams.id}` as any);
        }
        break;

      case 'profile':
        if (queryParams?.id) {
          router.push(`/profile/${queryParams.id}` as any);
        }
        break;

      default:
        console.log('Unknown deep link path:', path);
        router.push('/');
    }
  }

  /**
   * Create a shareable link
   */
  static createShareLink(path: string, params?: Record<string, string>): string {
    const baseUrl = 'https://charismachat.app';
    const queryString = params
      ? '?' + Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
      : '';
    
    return `${baseUrl}${path}${queryString}`;
  }

  /**
   * Test deep linking (for development)
   */
  static async testDeepLink(url: string) {
    console.log('Testing deep link:', url);
    await this.handleUrl(url);
  }
}
