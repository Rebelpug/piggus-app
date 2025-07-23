import { Platform, Linking, Alert } from 'react-native';
import { VERSION_CONFIG } from '@/config/version';

export class StoreUtils {
  /**
   * Open the appropriate app store for the current platform
   */
  static async openAppStore(): Promise<void> {
    try {
      let storeUrl: string;
      
      if (Platform.OS === 'ios') {
        storeUrl = VERSION_CONFIG.IOS_APP_STORE_URL;
      } else if (Platform.OS === 'android') {
        storeUrl = VERSION_CONFIG.ANDROID_PLAY_STORE_URL;
      } else {
        // Fallback for other platforms (web, etc.)
        storeUrl = VERSION_CONFIG.ANDROID_PLAY_STORE_URL;
      }

      const supported = await Linking.canOpenURL(storeUrl);
      
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        // Fallback: show alert with manual instructions
        StoreUtils.showManualUpdateInstructions();
      }
    } catch (error) {
      console.error('Failed to open app store:', error);
      StoreUtils.showManualUpdateInstructions();
    }
  }

  /**
   * Show manual update instructions if automatic store opening fails
   */
  private static showManualUpdateInstructions(): void {
    const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play Store';
    
    Alert.alert(
      'Update Required',
      `Please manually update the app from the ${storeName}. Search for "Piggus" to find the latest version.`,
      [{ text: 'OK', style: 'default' }]
    );
  }

  /**
   * Get the store URL for the current platform
   */
  static getStoreUrl(): string {
    return Platform.OS === 'ios' 
      ? VERSION_CONFIG.IOS_APP_STORE_URL 
      : VERSION_CONFIG.ANDROID_PLAY_STORE_URL;
  }

  /**
   * Check if the store URL can be opened
   */
  static async canOpenStore(): Promise<boolean> {
    try {
      const storeUrl = StoreUtils.getStoreUrl();
      return await Linking.canOpenURL(storeUrl);
    } catch {
      return false;
    }
  }
}