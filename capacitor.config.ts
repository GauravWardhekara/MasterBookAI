import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.masterbook.app',
  appName: 'MasterBookAI',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0b0b14',
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
