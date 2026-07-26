import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.field',
  appName: 'MaintainU Field',
  webDir: 'public',
  server: {
    url: 'https://REPLACE_WITH_VERCEL_URL/onboarding?role=technician',
    cleartext: false
  }
};

export default config;
