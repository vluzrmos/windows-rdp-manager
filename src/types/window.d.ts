import { RdpApi } from '../../electron/preload';

declare global {
  // Injetado pelo Vite (vite.config.ts)
  const __APP_INFO__: { version: string; buildNumber: number | null; buildDate: string | null };

  interface Window {
    rdpApi: RdpApi;
  }
}
