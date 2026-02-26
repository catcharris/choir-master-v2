import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'kr.co.choirmaster.tuner',
  appName: 'Choir Tuner',
  webDir: 'out',
  includePlugins: ['@capacitor/motion'], // Only include NPM plugins here if needed
  plugins: {
    WatchBridge: {
      // Explicitly declaring local plugin
    }
  }
};

export default config;
