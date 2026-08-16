/**
 * Platform utility functions
 */

import Constants from 'expo-constants';

/**
 * Check if app is running in Expo Go
 * Expo Go doesn't support custom native modules
 */
export const isExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};

/**
 * Check if native features are available
 * Returns false in Expo Go, true in development/production builds
 */
export const hasNativeFeatures = (): boolean => {
  return !isExpoGo();
};

/**
 * Get a user-friendly message about why a feature isn't available
 */
export const getNativeFeatureMessage = (): string => {
  return 'This feature requires a development build. Run: eas build --profile development --platform android';
};

