import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'PitStop',
  webDir: 'dist',
  server:{
    androidScheme:'https',
    // DEV ONLY: express api runs over plain http://. remove both flags when the api is served over HTTPS
    cleartext:true,
  },
  android:{
    // DEV ONLY: let https://localhost(webview) call http://<host>:4000(REST + ws://)
    allowMixedContent:true
  }
};

export default config;
