import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.drako.jumptrack',
  appName: 'JumpTrack',
  webDir: 'dist',
  backgroundColor: '#0b0d12',
  plugins: {
    // Iconos claros en las barras del sistema (la app siempre es oscura).
    SystemBars: { style: 'DARK' },
    // Login nativo de Google; la sesión de Firebase la lleva el SDK web (src/lib/cloud.ts).
    LocalNotifications: { smallIcon: 'widget_flame', iconColor: '#d4f25c' },
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com'] },
  },
}

export default config
