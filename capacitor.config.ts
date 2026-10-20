import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.drako.jumptrack',
  appName: 'JumpTrack',
  webDir: 'dist',
  backgroundColor: '#0b0d12',
  plugins: {
    // Iconos claros en las barras del sistema (la app siempre es oscura).
    SystemBars: { style: 'DARK' },
  },
}

export default config
