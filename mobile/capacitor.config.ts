import type { CapacitorConfig } from '@capacitor/cli';

/**
 * PsiNMR iOS/Android shell. Like the desktop app, this is a thin native
 * wrapper: `server.url` points at the hosted mobile web view (`#/m`), so every
 * web deploy — and eventually the Pro backend/login — is live in the app with
 * no App Store / Play Store resubmission. The native layer only adds
 * capabilities the web can't (file open/share), which is also what keeps the
 * app above Apple's "minimum functionality" bar (guideline 4.2).
 */
const config: CapacitorConfig = {
  appId: 'com.psinmr.app',
  appName: 'PsiNMR',
  webDir: 'www',
  server: {
    url: 'https://psinmr.com/#/m',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
