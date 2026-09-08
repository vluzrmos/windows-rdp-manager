import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { StorageService } from './storageService';
import { RdpService } from './rdpService';

export class TrayService {
  private static tray: Tray | null = null;
  private static mainWindow: BrowserWindow | null = null;
  private static onQuitCallback: (() => void) | null = null;

  static init(mainWindow: BrowserWindow, onQuit: () => void) {
    this.mainWindow = mainWindow;
    this.onQuitCallback = onQuit;

    const iconPath = this.getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(icon);
    this.tray.setToolTip('Windows RDP Manager');

    // Clique com botão esquerdo: restaura ou exibe a janela principal
    this.tray.on('click', () => {
      this.showMainWindow();
    });

    // Clique com botão direito: menu de contexto dinâmico com recentes
    this.tray.on('right-click', () => {
      const menu = this.buildContextMenu();
      this.tray?.popUpContextMenu(menu);
    });

    this.updateMenu();
  }

  static getTrayIconPath(): string {
    const candidates = [
      path.join(app.getAppPath(), 'public', 'tray-icon.png'),
      path.join(app.getAppPath(), 'dist', 'tray-icon.png'),
      path.join(app.getAppPath(), 'build', 'icon.ico'),
      path.join(__dirname, '../../public/tray-icon.png'),
      path.join(__dirname, '../../build/icon.ico'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  static showMainWindow() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show();
    }
    this.mainWindow.focus();
  }

  static updateMenu() {
    if (!this.tray) return;
    const menu = this.buildContextMenu();
    this.tray.setContextMenu(menu);
  }

  private static buildContextMenu(): Menu {
    const connections = StorageService.getConnections();

    // Obter até 5 conexões usadas recentemente (ordenadas por lastConnectedAt decrescente)
    const recentConnections = connections
      .slice()
      .sort((a, b) => (b.lastConnectedAt || 0) - (a.lastConnectedAt || 0))
      .slice(0, 5);

    const template: Electron.MenuItemConstructorOptions[] = [];

    // Seção de conexões recentes
    if (recentConnections.length > 0) {
      recentConnections.forEach((conn) => {
        const title = conn.name ? `${conn.name} (${conn.host})` : conn.host;
        template.push({
          label: title,
          click: async () => {
            const decryptedPassword = StorageService.getDecryptedPassword(conn.id);
            const settings = StorageService.getSettings();
            const mode =
              conn.launchMode && conn.launchMode !== 'default'
                ? conn.launchMode
                : settings.defaultLaunchMode || 'direct';

            const res = await RdpService.launchRdp(conn, decryptedPassword, mode);
            if (res.success) {
              StorageService.updateLastConnected(conn.id);
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('data:refresh');
              }
              if (settings.minimizeToTrayOnConnect && this.mainWindow) {
                if (settings.minimizeToTray) {
                  this.mainWindow.hide();
                } else {
                  this.mainWindow.minimize();
                }
              }
              this.updateMenu();
            }
          },
        });
      });
    } else {
      template.push({
        label: 'Nenhuma conexão cadastrada',
        enabled: false,
      });
    }

    template.push({ type: 'separator' });

    template.push({
      label: 'Conexões',
      click: () => {
        this.showMainWindow();
        this.mainWindow?.webContents.send('navigate:connections');
      },
    });

    template.push({
      label: 'Configurações',
      click: () => {
        this.showMainWindow();
        this.mainWindow?.webContents.send('navigate:settings');
      },
    });

    template.push({ type: 'separator' });

    template.push({
      label: 'Sair',
      click: () => {
        if (this.onQuitCallback) {
          this.onQuitCallback();
        } else {
          app.quit();
        }
      },
    });

    return Menu.buildFromTemplate(template);
  }

  static destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
