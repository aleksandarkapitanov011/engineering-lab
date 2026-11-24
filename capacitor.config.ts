import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.engineeringlab.app',
  appName: 'Engineering Lab',
  webDir: 'dist',
  backgroundColor: '#131518',
  android: {
    allowMixedContent: false,
  },
};

export default config;
