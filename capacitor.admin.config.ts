import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maintainu.admin',
  appName: 'MaintainU Admin',
  webDir: 'public',
  server: {
    url: 'https://maintainu-app.vercel.app/onboarding?role=admin',
    cleartext: false
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    }
  }
};

export default config;
