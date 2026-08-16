/**
 * Battery Optimization Utility
 * 
 * Helps ensure notifications work reliably even when app is force-closed
 * by requesting battery optimization exemption.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

class BatteryOptimizationService {
  /**
   * Check if battery optimization is available on this device
   */
  isAvailable(): boolean {
    // Only available on Android 6.0 (API 23) and above
    return Platform.OS === 'android' && Platform.Version >= 23;
  }

  /**
   * Request to disable battery optimization for this app
   * This helps ensure the app can receive notifications even when force-closed
   */
  async requestDisableBatteryOptimization(): Promise<void> {
    if (!this.isAvailable()) {
      console.log('Battery optimization not available on this device');
      return;
    }

    Alert.alert(
      'Enable Reliable Notifications',
      'To ensure you receive messages even when the app is closed, please disable battery optimization for Dots.\n\nThis will allow notifications to work reliably.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              // Try to open battery optimization settings
              await Linking.openSettings();
              
              console.log('');
              console.log('========================================');
              console.log('📱 BATTERY OPTIMIZATION SETTINGS');
              console.log('========================================');
              console.log('To disable battery optimization:');
              console.log('1. Find "Battery" or "Battery optimization"');
              console.log('2. Tap "All apps" or similar');
              console.log('3. Find "Dots" in the list');
              console.log('4. Select "Don\'t optimize" or "Unrestricted"');
              console.log('========================================');
              console.log('');
            } catch (error) {
              console.error('Failed to open settings:', error);
            }
          },
        },
      ]
    );
  }

  /**
   * Show instructions for manufacturer-specific battery settings
   * Some manufacturers (Xiaomi, Huawei, Oppo, etc.) have aggressive battery management
   */
  async showManufacturerInstructions(): Promise<void> {
    const manufacturer = this.getManufacturer();
    
    let instructions = '';
    
    switch (manufacturer.toLowerCase()) {
      case 'xiaomi':
      case 'redmi':
      case 'poco':
        instructions = `
Xiaomi/MIUI Instructions:
1. Go to Settings → Apps → Manage apps
2. Find "Dots"
3. Battery saver → No restrictions
4. Autostart → Enable
5. Lock app in recent apps (swipe down on app card)
        `;
        break;
        
      case 'huawei':
      case 'honor':
        instructions = `
Huawei/Honor Instructions:
1. Go to Settings → Battery → App launch
2. Find "Dots" and switch to "Manual"
3. Enable all three options:
   - Auto-launch
   - Secondary launch
   - Run in background
4. Lock app in recent apps menu
        `;
        break;
        
      case 'oppo':
      case 'realme':
        instructions = `
Oppo/Realme Instructions:
1. Go to Settings → Battery → Battery optimization
2. Find "Dots" → Don't optimize
3. Settings → Privacy → App Permissions
4. "Startup Manager" → Enable for Dots
5. Lock app in recent apps
        `;
        break;
        
      case 'oneplus':
        instructions = `
OnePlus Instructions:
1. Go to Settings → Battery → Battery optimization
2. Find "Dots" → Don't optimize
3. Long press Dots in recent apps
4. Tap "Lock" to prevent closure
        `;
        break;
        
      case 'samsung':
        instructions = `
Samsung Instructions:
1. Go to Settings → Apps → Dots
2. Battery → Optimize battery usage → Off
3. Settings → Device care → Battery
4. App power management → Apps that won't be put to sleep
5. Add "Dots" to the list
        `;
        break;
        
      case 'vivo':
        instructions = `
Vivo Instructions:
1. Go to Settings → Battery → Background power consumption management
2. Find "Dots" → Select "High background power consumption"
3. Settings → More settings → Applications
4. Auto-start → Enable for Dots
        `;
        break;
        
      default:
        instructions = `
General Android Instructions:
1. Go to Settings → Battery
2. Battery optimization or Battery usage
3. Find "Dots" in the app list
4. Select "Don't optimize" or "Unrestricted"
5. Try locking the app in recent apps menu
        `;
    }
    
    Alert.alert(
      'Device-Specific Instructions',
      instructions,
      [
        {
          text: 'Open Settings',
          onPress: async () => {
            await Linking.openSettings();
            // Mark as user took action
            await AsyncStorage.setItem('battery_optimization_dismissed', 'true');
          },
        },
        {
          text: 'Got It',
          onPress: async () => {
            // User read the instructions
            await AsyncStorage.setItem('battery_optimization_dismissed', 'true');
          },
        },
      ]
    );
  }

  /**
   * Reset the prompt state (for testing or if user wants to see it again)
   */
  async resetPromptState(): Promise<void> {
    await AsyncStorage.removeItem('battery_optimization_prompted');
    await AsyncStorage.removeItem('battery_optimization_dismissed');
    console.log('✅ Battery optimization prompt state reset');
  }

  /**
   * Get device manufacturer
   */
  private getManufacturer(): string {
    if (Platform.OS === 'android') {
      try {
        const { constants } = require('expo-device');
        return constants?.manufacturer || 'unknown';
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  }

  /**
   * Show a comprehensive guide for keeping notifications alive
   */
  async showNotificationReliabilityGuide(): Promise<void> {
    Alert.alert(
      'Enable Reliable Notifications',
      `To receive messages even when the app is closed:

✅ Disable Battery Optimization
✅ Enable Auto-start (if available)
✅ Lock app in recent apps menu

This takes just 30 seconds and ensures you never miss a message!`,
      [
        {
          text: 'Show Me How',
          onPress: () => this.showManufacturerInstructions(),
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            await Linking.openSettings();
            // Mark as user took action (don't show again)
            await AsyncStorage.setItem('battery_optimization_dismissed', 'true');
          },
        },
        {
          text: 'Later',
          style: 'cancel',
          onPress: async () => {
            // User dismissed - don't show again
            await AsyncStorage.setItem('battery_optimization_dismissed', 'true');
            console.log('ℹ️  User dismissed battery optimization prompt');
          },
        },
      ]
    );
  }
}

export const batteryOptimization = new BatteryOptimizationService();

