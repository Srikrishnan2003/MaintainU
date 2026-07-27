import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.company',
  appName: 'MaintainU Company',
  webDir: 'public',
  server: {
    url: 'https://maintainu-app.vercel.app/onboarding?role=company',
    cleartext: false
  }
};

export default config;
