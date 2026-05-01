import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akong.songo',
  appName: 'Akong',
  webDir: 'dist',
  server: {
    // In production, the app loads from the local dist/ bundle.
    // Uncomment the line below for live-reload during development:
    // url: 'http://YOUR_LOCAL_IP:3000',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#111827', // gray-900 to match app theme
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111827',
    },
  },
  android: {
    allowMixedContent: true, // For dev with HTTP socket server
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
