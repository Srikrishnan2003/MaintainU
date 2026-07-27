import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.admin',
  appName: 'MaintainU Admin',
  webDir: 'public',
  appendUserAgent: 'MaintainU-Mobile-App',
  server: {
    url: 'https://maintainu-app.vercel.app/onboarding?role=admin',
    cleartext: true,
    allowNavigation: ['maintainu-app.vercel.app', '*.vercel.app', '*']
  },
  android: {
    appendUserAgent: 'MaintainU-Mobile-App',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  }
};

export default config;
