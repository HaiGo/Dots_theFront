/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Brand colors - New theme
const brandColor = '#C1FF72'; // Main lime green color for buttons and elements
const brandColorDark = '#a8e05f'; // Darker shade for hover/pressed states
const textColor = '#000000'; // Black text
const backgroundColor = '#ffffff'; // White background

const tintColorLight = brandColor;
const tintColorDark = brandColor;

export const Colors = {
  light: {
    text: textColor,
    background: backgroundColor,
    tint: tintColorLight,
    icon: '#666666',
    tabIconDefault: '#666666',
    tabIconSelected: tintColorLight,
    brand: brandColor,
    brandDark: brandColorDark,
  },
  dark: {
    text: textColor,
    background: backgroundColor,
    tint: tintColorDark,
    icon: '#666666',
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
    brand: brandColor,
    brandDark: brandColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
