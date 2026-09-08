import { contextBridge, ipcRenderer } from 'electron';
import { RdpConnection, AppSettings, PingResult } from '../src/types/rdp';

export interface RdpApi {
  getConnections: () => Promise<RdpConnection[]>;
  saveConnection: (conn: RdpConnection) => Promise<RdpConnection>;
  deleteConnection: (id: string) => Promise<boolean>;
  connectRdp: (id: string) => Promise<{ success: boolean; error?: string }>;
  checkPing: (host: string, port?: number) => Promise<PingResult>;
  revealPassword: (id: string) => Promise<string>;
  exportBackup: (masterPassword: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  importBackup: (payload: string, masterPassword: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  // Controles de janela
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
}

const api: RdpApi = {
  getConnections: () => ipcRenderer.invoke('rdp:getConnections'),
  saveConnection: (conn: RdpConnection) => ipcRenderer.invoke('rdp:saveConnection', conn),
  deleteConnection: (id: string) => ipcRenderer.invoke('rdp:deleteConnection', id),
  connectRdp: (id: string) => ipcRenderer.invoke('rdp:connectRdp', id),
  checkPing: (host: string, port?: number) => ipcRenderer.invoke('rdp:checkPing', host, port),
  revealPassword: (id: string) => ipcRenderer.invoke('rdp:revealPassword', id),
  exportBackup: (masterPassword: string) => ipcRenderer.invoke('rdp:exportBackup', masterPassword),
  importBackup: (payload: string, masterPassword: string) => ipcRenderer.invoke('rdp:importBackup', payload, masterPassword),
  getSettings: () => ipcRenderer.invoke('rdp:getSettings'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('rdp:saveSettings', settings),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
};

contextBridge.exposeInMainWorld('rdpApi', api);
