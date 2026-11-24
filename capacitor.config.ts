import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.lorewalk.app',
  appName: 'Lorewalk',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Google sign-in only. The other providers stay out of the APK: the
    // Facebook SDK alone would add the AD_ID permission to the manifest.
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
}

export default config
