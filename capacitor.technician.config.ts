import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.technician',
  appName: 'MaintainU Technician',
  webDir: 'public',
  server: {
    url: 'https://maintainu-app.vercel.app/onboarding?role=technician',
    cleartext: false
  }
};

export default config;
