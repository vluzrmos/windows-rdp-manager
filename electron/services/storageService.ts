import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RdpConnection, AppSettings, ExportData } from '../../src/types/rdp';
import { CryptoService } from './cryptoService';

export class StorageService {
  private static getUserDataDir(): string {
    const base = app?.getPath ? app.getPath('userData') : path.join(process.env.APPDATA || '.', 'windows-rdp-manager');
    if (!fs.existsSync(base)) {
      fs.mkdirSync(base, { recursive: true });
    }
    return base;
  }

  private static getConnectionsFile(): string {
    return path.join(this.getUserDataDir(), 'connections.json');
  }

  private static getSettingsFile(): string {
    return path.join(this.getUserDataDir(), 'settings.json');
  }

  private static defaultSettings: AppSettings = {
    autoCheckPing: false,
    pingIntervalMinutes: 5,
    disablePingStatus: false,
    minimizeToTrayOnConnect: false,
    minimizeToTray: true,
    closeToTray: true,
    startWithWindows: false,
    confirmBeforeDelete: true,
    defaultGroup: 'Geral',
    defaultLaunchMode: 'embedded',
    masterPasswordEnabled: false,
  };

  /**
   * Obtém todas as conexões cadastradas.
   * As senhas retornadas para a interface não contêm a senha plana, apenas a flag hasPassword.
   */
  static getConnections(): RdpConnection[] {
    try {
      if (!fs.existsSync(this.getConnectionsFile())) {
        return [];
      }
      const data = fs.readFileSync(this.getConnectionsFile(), 'utf-8');
      const rawConnections: RdpConnection[] = JSON.parse(data);

      return rawConnections.map((c) => ({
        ...c,
        hasPassword: !!c.encryptedPassword,
        password: undefined, // não envia a senha descriptografada para a listagem comum
      }));
    } catch (err) {
      console.error('Erro ao ler conexões:', err);
      return [];
    }
  }

  /**
   * Salva ou atualiza uma conexão
   */
  static saveConnection(connection: RdpConnection): RdpConnection {
    const connections = this.getRawConnections();
    const existingIndex = connections.findIndex((c) => c.id === connection.id);

    const now = Date.now();
    let encryptedPassword = connection.encryptedPassword;

    // Se uma nova senha em texto puro foi fornecida, criptografa com DPAPI
    if (connection.password !== undefined && connection.password !== '') {
      encryptedPassword = CryptoService.encrypt(connection.password);
    } else if (connection.password === '') {
      encryptedPassword = undefined;
    }

    const updatedConn: RdpConnection = {
      ...connection,
      encryptedPassword,
      password: undefined,
      hasPassword: !!encryptedPassword,
      updatedAt: now,
      createdAt: connection.createdAt || now,
    };

    if (existingIndex >= 0) {
      connections[existingIndex] = updatedConn;
    } else {
      connections.push(updatedConn);
    }

    fs.writeFileSync(this.getConnectionsFile(), JSON.stringify(connections, null, 2), 'utf-8');
    return updatedConn;
  }

  /**
   * Remove uma conexão pelo ID
   */
  static deleteConnection(id: string): boolean {
    let connections = this.getRawConnections();
    const initialLen = connections.length;
    connections = connections.filter((c) => c.id !== id);
    if (connections.length !== initialLen) {
      fs.writeFileSync(this.getConnectionsFile(), JSON.stringify(connections, null, 2), 'utf-8');
      return true;
    }
    return false;
  }

  /**
   * Descriptografa a senha de uma conexão específica (para revelar ou conectar)
   */
  static getDecryptedPassword(id: string): string {
    const connections = this.getRawConnections();
    const conn = connections.find((c) => c.id === id);
    if (!conn || !conn.encryptedPassword) {
      return '';
    }
    const password = CryptoService.decrypt(conn.encryptedPassword);

    // Migra senhas gravadas com o antigo fallback para DPAPI
    if (password && conn.encryptedPassword.startsWith('fallback:')) {
      try {
        conn.encryptedPassword = CryptoService.encrypt(password);
        fs.writeFileSync(this.getConnectionsFile(), JSON.stringify(connections, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Não foi possível migrar a senha para DPAPI:', err);
      }
    }
    return password;
  }

  /**
   * Atualiza a data do último acesso da conexão
   */
  static updateLastConnected(id: string): void {
    const connections = this.getRawConnections();
    const conn = connections.find((c) => c.id === id);
    if (conn) {
      conn.lastConnectedAt = Date.now();
      fs.writeFileSync(this.getConnectionsFile(), JSON.stringify(connections, null, 2), 'utf-8');
    }
  }

  /**
   * Exporta os perfis protegidos com uma senha mestra escolhida pelo usuário
   */
  static exportConnections(masterPassword: string): string {
    const connections = this.getRawConnections();
    // Descriptografa localmente para colocar no payload cifrado por master password
    const plainConnections = connections.map((c) => ({
      ...c,
      password: c.encryptedPassword ? CryptoService.decrypt(c.encryptedPassword) : undefined,
      encryptedPassword: undefined,
    }));

    const exportPayload: ExportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      connections: plainConnections,
    };

    return CryptoService.exportWithPassword(exportPayload, masterPassword);
  }

  /**
   * Importa conexões de um backup protegido por senha mestra e salva com DPAPI local
   */
  static importConnections(payload: string, masterPassword: string): number {
    const data = CryptoService.importWithPassword<ExportData>(payload, masterPassword);
    if (!data.connections || !Array.isArray(data.connections)) {
      throw new Error('Formato de arquivo de backup inválido.');
    }

    const currentConnections = this.getRawConnections();
    let importedCount = 0;

    for (const item of data.connections) {
      // O backup pode vir de terceiros: exige host válido e um id seguro para nomes de arquivo
      if (!item || typeof item.host !== 'string' || !item.host.trim() || /[\x00-\x1f\x7f]/.test(item.host)) {
        continue;
      }
      const id = typeof item.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(item.id) ? item.id : crypto.randomUUID();
      const encryptedPassword = typeof item.password === 'string' && item.password ? CryptoService.encrypt(item.password) : undefined;
      const cleanItem: RdpConnection = {
        ...item,
        id,
        encryptedPassword,
        password: undefined,
        hasPassword: !!encryptedPassword,
        updatedAt: Date.now(),
      };

      const existingIndex = currentConnections.findIndex((c) => c.id === cleanItem.id);
      if (existingIndex >= 0) {
        currentConnections[existingIndex] = cleanItem;
      } else {
        currentConnections.push(cleanItem);
      }
      importedCount++;
    }

    fs.writeFileSync(this.getConnectionsFile(), JSON.stringify(currentConnections, null, 2), 'utf-8');
    return importedCount;
  }

  static getSettings(): AppSettings {
    try {
      if (!fs.existsSync(this.getSettingsFile())) {
        return this.defaultSettings;
      }
      const saved: Partial<AppSettings> = JSON.parse(fs.readFileSync(this.getSettingsFile(), 'utf-8'));
      // Migração: o cliente embutido passou a ser o modo padrão (versão 2)
      if ((saved.launchModeVersion ?? 1) < 2) {
        saved.defaultLaunchMode = 'embedded';
      }
      return { ...this.defaultSettings, ...saved, launchModeVersion: 2 };
    } catch {
      return this.defaultSettings;
    }
  }

  static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    fs.writeFileSync(this.getSettingsFile(), JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  private static getRawConnections(): RdpConnection[] {
    try {
      if (!fs.existsSync(this.getConnectionsFile())) {
        return [];
      }
      return JSON.parse(fs.readFileSync(this.getConnectionsFile(), 'utf-8'));
    } catch {
      return [];
    }
  }
}
