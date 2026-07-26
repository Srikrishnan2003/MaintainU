import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.portal',
  appName: 'MaintainU Portal',
  webDir: 'public',
  server: {
    url: 'https://REPLACE_WITH_VERCEL_URL/onboarding?role=company',
    cleartext: false
  }
};

export default config;
