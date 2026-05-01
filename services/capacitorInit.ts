import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Initialize Capacitor plugins when running as a native app.
 * Call this once at app startup.
 */
export async function initCapacitor(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;


  try {
    // Dark status bar to match app theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#111827' });
  } catch (e) {
    console.warn('[Capacitor] StatusBar error:', e);
  }

  try {
    // Hide splash screen after app is ready
    await SplashScreen.hide();
  } catch (e) {
    console.warn('[Capacitor] SplashScreen error:', e);
  }
}

/**
 * Check if the app is running as a native mobile app (Capacitor)
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform: 'ios', 'android', or 'web'
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}
