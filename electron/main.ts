import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { StorageService } from './services/storageService';
import { RdpService } from './services/rdpService';
import { PingService } from './services/pingService';
import { TrayService } from './services/trayService';
import { RdpConnection, AppSettings, DEFAULT_RDP_PORT } from '../src/types/rdp';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

function getWindowIconPath(): string {
  const candidates = [
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'public', 'icon.png'),
    path.join(app.getAppPath(), 'dist', 'icon.png'),
    path.join(__dirname, '../../build/icon.ico'),
    path.join(__dirname, '../../public/icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function createWindow() {
  const iconPath = getWindowIconPath();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Custom modern titlebar
    title: 'Windows RDP Manager',
    icon: iconPath,
    backgroundColor: '#0f172a',
    show: false, // Prevents white flash before load
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow?.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  const startHidden = process.argv.includes('--hidden');

  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow?.show();
    }
  });

  // Evento nativo de fechamento da janela (Alt+F4 ou taskbar close)
  mainWindow.on('close', (event) => {
    const settings = StorageService.getSettings();
    if (settings.minimizeToTray && settings.closeToTray && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Evento nativo de minimização da janela
  mainWindow.on('minimize', () => {
    const settings = StorageService.getSettings();
    if (settings.minimizeToTray) {
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window management IPC
ipcMain.on('window:minimize', () => {
  const settings = StorageService.getSettings();
  if (settings.minimizeToTray) {
    mainWindow?.hide();
  } else {
    mainWindow?.minimize();
  }
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  const settings = StorageService.getSettings();
  if (settings.minimizeToTray && settings.closeToTray && !isQuitting) {
    mainWindow?.hide();
  } else {
    mainWindow?.close();
  }
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// RDP Data & Connection IPC
ipcMain.handle('rdp:getConnections', async () => {
  return StorageService.getConnections();
});

ipcMain.handle('rdp:saveConnection', async (_event, conn: RdpConnection) => {
  const saved = StorageService.saveConnection(conn);
  TrayService.updateMenu();
  return saved;
});

ipcMain.handle('rdp:deleteConnection', async (_event, id: string) => {
  const deleted = StorageService.deleteConnection(id);
  TrayService.updateMenu();
  return deleted;
});

ipcMain.handle('rdp:revealPassword', async (_event, id: string) => {
  return StorageService.getDecryptedPassword(id);
});

ipcMain.handle('rdp:checkPing', async (_event, host: string, port?: number) => {
  return PingService.checkPort(host, port || DEFAULT_RDP_PORT);
});

ipcMain.handle('rdp:connectRdp', async (_event, id: string) => {
  const connections = StorageService.getConnections();
  const conn = connections.find((c) => c.id === id);
  if (!conn) {
    return { success: false, error: 'Conexão não encontrada' };
  }

  const decryptedPassword = StorageService.getDecryptedPassword(id);
  const settings = StorageService.getSettings();
  const mode =
    conn.launchMode && conn.launchMode !== 'default'
      ? conn.launchMode
      : settings.defaultLaunchMode || 'direct';

  const result = await RdpService.launchRdp(conn, decryptedPassword, mode);

  if (result.success) {
    StorageService.updateLastConnected(id);
    TrayService.updateMenu();
    if (settings.minimizeToTrayOnConnect && mainWindow) {
      if (settings.minimizeToTray) {
        mainWindow.hide();
      } else {
        mainWindow.minimize();
      }
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
    TrayService.updateMenu();
    return { success: true, count };
  } catch (err: any) {
    return { success: false, error: err.message || 'Senha incorreta ou backup inválido' };
  }
});

ipcMain.handle('rdp:getSettings', async () => {
  return StorageService.getSettings();
});

ipcMain.handle('rdp:saveSettings', async (_event, settings: Partial<AppSettings>) => {
  const updated = StorageService.saveSettings(settings);

  // Sincronizar inicialização com o Windows se alterado
  if (typeof settings.startWithWindows === 'boolean') {
    try {
      app.setLoginItemSettings({
        openAtLogin: settings.startWithWindows,
        path: process.execPath,
        args: ['--hidden'],
      });
    } catch (err) {
      console.error('Erro ao configurar inicialização com o Windows:', err);
    }
  }

  TrayService.updateMenu();
  return updated;
});

// Garantir instância única do aplicativo (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Se o usuário tentar abrir uma nova instância, restaurar e focar na janela existente
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // App Lifecycle
  app.whenReady().then(() => {
    createWindow();

    if (mainWindow) {
      TrayService.init(mainWindow, () => {
        isQuitting = true;
        TrayService.destroy();
        app.quit();
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        if (mainWindow) {
          TrayService.init(mainWindow, () => {
            isQuitting = true;
            TrayService.destroy();
            app.quit();
          });
        }
      } else {
        TrayService.showMainWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    TrayService.destroy();
  });

  app.on('window-all-closed', () => {
    const settings = StorageService.getSettings();
    // Se closeToTray ou minimizeToTray estiver ativo, mantém rodando na bandeja
    if ((settings.minimizeToTray && settings.closeToTray) && !isQuitting) {
      return;
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
