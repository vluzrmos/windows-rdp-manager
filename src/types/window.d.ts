import { RdpApi } from '../../electron/preload';

declare global {
  interface Window {
    rdpApi: RdpApi;
  }
}
