import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.technician',
  appName: 'MaintainU Technician',
  webDir: 'public',
  appendUserAgent: 'MaintainU-Mobile-App',
  server: {
    url: 'https://maintainu-app.vercel.app/onboarding?role=technician',
    cleartext: true,
    allowNavigation: ['maintainu-app.vercel.app', '*.vercel.app', '*']
  },
  android: {
    appendUserAgent: 'MaintainU-Mobile-App'
  }
};

export default config;
