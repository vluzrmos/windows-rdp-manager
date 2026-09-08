import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import util from 'util';
import { RdpConnection } from '../../src/types/rdp';

import os from 'os';

const execAsync = util.promisify(exec);

export class RdpService {
  private static getTempDir(): string {
    const base = app?.getPath ? app.getPath('temp') : (process.env.TEMP || os.tmpdir());
    return path.join(base, 'rdp-manager');
  }

  private static ensureTempDir() {
    const dir = this.getTempDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Constrói o conteúdo padrão de um arquivo .rdp do Windows
   */
  static buildRdpContent(conn: RdpConnection): string {
    const lines: string[] = [];

    // Endereço e Porta
    const fullAddress = conn.port && conn.port !== 3389 ? `${conn.host}:${conn.port}` : conn.host;
    lines.push(`full address:s:${fullAddress}`);

    // Usuário
    if (conn.username) {
      const fullUsername = conn.domain ? `${conn.domain}\\${conn.username}` : conn.username;
      lines.push(`username:s:${fullUsername}`);
    }

    // Configurações de Exibição
    const display = conn.display || { screenMode: 'fullscreen', smartSizing: true, useMultimon: false };
    if (display.screenMode === 'fullscreen') {
      lines.push('screen mode id:i:2');
    } else {
      lines.push('screen mode id:i:1');
      if (display.width) lines.push(`desktopwidth:i:${display.width}`);
      if (display.height) lines.push(`desktopheight:i:${display.height}`);
    }

    lines.push(`smart sizing:i:${display.smartSizing ? 1 : 0}`);
    lines.push(`use multimon:i:${display.useMultimon ? 1 : 0}`);
    lines.push(`session bpp:i:${display.colorDepth || 32}`);

    // Recursos Locais
    const res = conn.resources || {
      redirectClipboard: true,
      redirectPrinters: false,
      redirectDrives: false,
      audioMode: 0,
      audioCapture: false,
    };
    lines.push(`redirectclipboard:i:${res.redirectClipboard ? 1 : 0}`);
    lines.push(`redirectprinters:i:${res.redirectPrinters ? 1 : 0}`);
    lines.push(`redirectdrives:i:${res.redirectDrives ? 1 : 0}`);
    if (res.redirectDrives && res.drivesToRedirect && res.drivesToRedirect.length > 0) {
      lines.push(`drivestoredirect:s:${res.drivesToRedirect.join(';')}`);
    }
    lines.push(`audiomode:i:${res.audioMode ?? 0}`);
    lines.push(`audiocapturemode:i:${res.audioCapture ? 1 : 0}`);

    // Experiência de Rede
    const exp = conn.experience || {
      connectionType: 7,
      enableWallpaper: true,
      enableFontSmoothing: true,
      enableDesktopComposition: true,
      enableTheme: true,
      adminConsole: false,
    };
    lines.push(`connection type:i:${exp.connectionType ?? 7}`);
    lines.push(`disable wallpaper:i:${exp.enableWallpaper ? 0 : 1}`);
    lines.push(`allow font smoothing:i:${exp.enableFontSmoothing ? 1 : 0}`);
    lines.push(`allow desktop composition:i:${exp.enableDesktopComposition ? 1 : 0}`);
    lines.push(`disable themes:i:${exp.enableTheme ? 0 : 1}`);
    lines.push('bitmapcachepersistenable:i:1');

    if (exp.adminConsole) {
      lines.push('administrative session:i:1');
    }

    // RD Gateway
    if (conn.gateway && conn.gateway.enabled && conn.gateway.hostname) {
      lines.push(`gatewayhostname:s:${conn.gateway.hostname}`);
      lines.push(`gatewayusagemethod:i:${conn.gateway.usageMethod ?? 1}`);
      lines.push('gatewayprofileusagemethod:i:1');
      lines.push('gatewaycredentialsourcetype:i:4');
      if (conn.gateway.username) {
        lines.push(`gatewayusername:s:${conn.gateway.username}`);
      }
    }

    // Outros ajustes de compatibilidade
    lines.push('prompt for credentials:i:0');
    lines.push('negotiate security layer:i:1');

    return lines.join('\r\n') + '\r\n';
  }

  /**
   * Salva as credenciais no Windows Credential Manager usando cmdkey
   */
  private static async setWindowsCredentials(conn: RdpConnection, decryptedPassword?: string): Promise<void> {
    if (!conn.username || !decryptedPassword) {
      return;
    }

    const fullUsername = conn.domain ? `${conn.domain}\\${conn.username}` : conn.username;
    
    // Alvos para o Credential Manager (com e sem porta)
    const targets = [`TERMSRV/${conn.host}`];
    if (conn.port && conn.port !== 3389) {
      targets.push(`TERMSRV/${conn.host}:${conn.port}`);
    }

    for (const target of targets) {
      try {
        // Escapar aspas para evitar quebras no comando cmdkey
        const safeUser = fullUsername.replace(/"/g, '""');
        const safePass = decryptedPassword.replace(/"/g, '""');
        
        await execAsync(`cmdkey /generic:"${target}" /user:"${safeUser}" /pass:"${safePass}"`);
      } catch (err) {
        console.warn(`Aviso ao registrar credencial para ${target}:`, err);
      }
    }
  }

  /**
   * Lança a sessão RDP abrindo o cliente nativo mstsc.exe do Windows
   */
  static async launchRdp(conn: RdpConnection, decryptedPassword?: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureTempDir();

      // 1. Injetar credencial no Windows Credential Manager se houver senha
      if (decryptedPassword) {
        await this.setWindowsCredentials(conn, decryptedPassword);
      }

      // 2. Gerar arquivo .rdp temporário
      const rdpContent = this.buildRdpContent(conn);
      // Sanitizar nome do arquivo
      const safeFileName = `${conn.id}_${conn.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.rdp`;
      const rdpFilePath = path.join(this.getTempDir(), safeFileName);
      fs.writeFileSync(rdpFilePath, rdpContent, 'utf-8');

      // 3. Montar argumentos do mstsc.exe
      const args = [rdpFilePath];
      if (conn.experience?.adminConsole) {
        args.push('/admin');
      }

      // 4. Executar mstsc desanexado do processo do Electron
      const child = spawn('mstsc.exe', args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });

      child.unref();

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao abrir mstsc:', err);
      return { success: false, error: err.message || 'Falha ao executar mstsc.exe' };
    }
  }
}
