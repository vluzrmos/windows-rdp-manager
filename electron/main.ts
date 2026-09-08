import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { StorageService } from './services/storageService';
import { RdpService } from './services/rdpService';
import { PingService } from './services/pingService';
import { RdpConnection, AppSettings } from '../src/types/rdp';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Custom modern titlebar
    title: 'Windows RDP Manager',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window management IPC
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// RDP Data & Connection IPC
ipcMain.handle('rdp:getConnections', async () => {
  return StorageService.getConnections();
});

ipcMain.handle('rdp:saveConnection', async (_event, conn: RdpConnection) => {
  return StorageService.saveConnection(conn);
});

ipcMain.handle('rdp:deleteConnection', async (_event, id: string) => {
  return StorageService.deleteConnection(id);
});

ipcMain.handle('rdp:revealPassword', async (_event, id: string) => {
  return StorageService.getDecryptedPassword(id);
});

ipcMain.handle('rdp:checkPing', async (_event, host: string, port?: number) => {
  return PingService.checkPort(host, port || 3389);
});

ipcMain.handle('rdp:connectRdp', async (_event, id: string) => {
  const connections = StorageService.getConnections();
  const conn = connections.find((c) => c.id === id);
  if (!conn) {
    return { success: false, error: 'Conexão não encontrada' };
  }

  const decryptedPassword = StorageService.getDecryptedPassword(id);
  const result = await RdpService.launchRdp(conn, decryptedPassword);

  if (result.success) {
    StorageService.updateLastConnected(id);
    const settings = StorageService.getSettings();
    if (settings.minimizeToTrayOnConnect && mainWindow) {
      mainWindow.minimize();
    }
  }

  return result;
});

ipcMain.handle('rdp:exportBackup', async (_event, masterPassword: string) => {
  try {
    const data = StorageService.exportConnections(masterPassword);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao exportar conexões' };
  }
});

ipcMain.handle('rdp:importBackup', async (_event, payload: string, masterPassword: string) => {
  try {
    const count = StorageService.importConnections(payload, masterPassword);
    return { success: true, count };
  } catch (err: any) {
    return { success: false, error: err.message || 'Senha incorreta ou backup inválido' };
  }
});

ipcMain.handle('rdp:getSettings', async () => {
  return StorageService.getSettings();
});

ipcMain.handle('rdp:saveSettings', async (_event, settings: Partial<AppSettings>) => {
  return StorageService.saveSettings(settings);
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
