import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { RdpConnection, LaunchMode, DEFAULT_RDP_PORT } from '../../src/types/rdp';

import os from 'os';

type HostMode = 'connect' | 'cred-write' | 'cred-delete' | 'focus';

interface EmbeddedSession {
  child: ChildProcess;
  hwnd?: string; // Handle da janela informado pelo RdpHost (evento "window")
}

export class RdpService {
  // Contagem de sessões mstsc ativas por alvo TERMSRV/* (remove a credencial quando a última fecha)
  private static credentialRefs = new Map<string, number>();

  // Sessões do cliente embutido abertas, por id de conexão
  private static embeddedSessions = new Map<string, EmbeddedSession>();

  /**
   * Caminho do RdpHost.exe (host do controle ActiveX do Remote Desktop).
   * Empacotado: resources/RdpHost.exe. Desenvolvimento: dist-native/RdpHost.exe.
   */
  static getHostPath(): string {
    if (app?.isPackaged) {
      return path.join(process.resourcesPath, 'RdpHost.exe');
    }
    const base = app?.getAppPath ? app.getAppPath() : process.cwd();
    return path.join(base, 'dist-native', 'RdpHost.exe');
  }

  /**
   * Inicia o RdpHost.exe enviando o payload via stdin (nunca pela linha de comando).
   */
  private static spawnHost(mode: HostMode, payload: Record<string, unknown>, detached = false) {
    const hostPath = this.getHostPath();
    if (!fs.existsSync(hostPath)) {
      throw new Error(`Componente RdpHost.exe não encontrado em ${hostPath}`);
    }

    const child = spawn(hostPath, [mode], {
      detached,
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: false,
    });
    child.stdin.end(JSON.stringify(payload), 'utf8');
    return child;
  }

  private static runHost(mode: HostMode, payload: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = this.spawnHost(mode, payload);
      child.stdout.resume();
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`RdpHost ${mode} terminou com código ${code}`));
      });
    });
  }

  private static getCredentialTargets(conn: RdpConnection): string[] {
    const targets = [`TERMSRV/${conn.host}`];
    if (conn.port && conn.port !== DEFAULT_RDP_PORT) {
      targets.push(`TERMSRV/${conn.host}:${conn.port}`);
    }
    return targets;
  }

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
    const fullAddress = conn.port && conn.port !== DEFAULT_RDP_PORT ? `${conn.host}:${conn.port}` : conn.host;
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
   * Salva as credenciais no Windows Credential Manager via CredWriteW (RdpHost.exe cred-write).
   * A senha trafega apenas pelo stdin do processo — não aparece na linha de comando nem em logs
   * de auditoria — e é gravada com persistência de sessão de logon.
   */
  private static async setWindowsCredentials(conn: RdpConnection, decryptedPassword?: string): Promise<string[]> {
    if (!conn.username || !decryptedPassword) {
      return [];
    }

    const fullUsername = conn.domain ? `${conn.domain}\\${conn.username}` : conn.username;
    const targets = this.getCredentialTargets(conn);

    await this.runHost('cred-write', { targets, username: fullUsername, password: decryptedPassword });

    for (const target of targets) {
      this.credentialRefs.set(target, (this.credentialRefs.get(target) ?? 0) + 1);
    }
    return targets;
  }

  /**
   * Remove as credenciais gravadas quando a última sessão mstsc que as usa é encerrada.
   */
  private static releaseWindowsCredentials(targets: string[]) {
    const toDelete = targets.filter((target) => {
      const remaining = (this.credentialRefs.get(target) ?? 1) - 1;
      if (remaining <= 0) {
        this.credentialRefs.delete(target);
        return true;
      }
      this.credentialRefs.set(target, remaining);
      return false;
    });

    if (toDelete.length > 0) {
      this.runHost('cred-delete', { targets: toDelete }).catch((err) => {
        console.warn('Aviso ao remover credenciais temporárias:', err);
      });
    }
  }

  /**
   * Monta a configuração enviada ao RdpHost.exe (cliente embutido).
   */
  static buildEmbeddedConfig(conn: RdpConnection, decryptedPassword?: string): Record<string, unknown> {
    const display = conn.display || { screenMode: 'fullscreen', smartSizing: true, useMultimon: false };
    const res = conn.resources;
    const exp = conn.experience;
    const gw = conn.gateway;

    return {
      title: conn.name,
      host: conn.host,
      port: conn.port || DEFAULT_RDP_PORT,
      username: conn.username || '',
      domain: conn.domain || '',
      password: decryptedPassword || '',
      screenMode: display.screenMode,
      width: display.width,
      height: display.height,
      smartSizing: display.smartSizing,
      colorDepth: display.colorDepth || 32,
      redirectClipboard: res?.redirectClipboard ?? true,
      redirectPrinters: res?.redirectPrinters ?? false,
      redirectDrives: res?.redirectDrives ?? false,
      audioMode: res?.audioMode ?? 0,
      audioCapture: res?.audioCapture ?? false,
      connectionType: exp?.connectionType ?? 7,
      enableWallpaper: exp?.enableWallpaper ?? true,
      enableFontSmoothing: exp?.enableFontSmoothing ?? true,
      enableDesktopComposition: exp?.enableDesktopComposition ?? true,
      enableTheme: exp?.enableTheme ?? true,
      adminConsole: exp?.adminConsole ?? false,
      gatewayEnabled: !!(gw?.enabled && gw.hostname),
      gatewayHostname: gw?.hostname || '',
      gatewayUsername: gw?.username || '',
      gatewayUsageMethod: gw?.usageMethod ?? 1,
    };
  }

  /**
   * Abre a sessão no cliente embutido (RdpHost.exe + controle ActiveX mstscax).
   * A senha é entregue ao controle em memória via stdin, sem Credential Manager.
   */
  private static async launchEmbedded(conn: RdpConnection, decryptedPassword?: string): Promise<{ success: boolean; error?: string }> {
    // Sessão já aberta para esta conexão: apenas restaura/foca a janela existente
    const existing = this.embeddedSessions.get(conn.id);
    if (existing && existing.child.exitCode === null) {
      if (!existing.hwnd) {
        // Janela ainda sendo criada (cliques repetidos): não abre outra
        return { success: true };
      }
      try {
        await this.runHost('focus', { hwnd: existing.hwnd });
        return { success: true };
      } catch {
        // Janela não existe mais; segue abrindo uma nova sessão
        this.embeddedSessions.delete(conn.id);
      }
    }

    return new Promise((resolve) => {
      let child: ReturnType<typeof RdpService.spawnHost>;
      try {
        child = this.spawnHost('connect', this.buildEmbeddedConfig(conn, decryptedPassword), true);
      } catch (err: any) {
        resolve({ success: false, error: err.message });
        return;
      }

      const session: EmbeddedSession = { child };
      this.embeddedSessions.set(conn.id, session);

      let pending = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        pending += chunk;
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          console.log(`[RdpHost ${conn.host}] ${line.trim()}`);
          try {
            const msg = JSON.parse(line);
            if (msg.event === 'window' && typeof msg.detail === 'string') {
              session.hwnd = msg.detail;
            }
          } catch {
            // Linha que não é JSON: apenas registrada no log
          }
        }
      });
      child.once('exit', () => {
        if (this.embeddedSessions.get(conn.id) === session) {
          this.embeddedSessions.delete(conn.id);
        }
      });
      child.once('error', (err) => {
        this.embeddedSessions.delete(conn.id);
        resolve({ success: false, error: err.message });
      });
      child.once('spawn', () => {
        child.unref();
        resolve({ success: true });
      });
    });
  }

  /**
   * Lança a sessão RDP no cliente embutido (padrão) ou no mstsc.exe nativo do Windows,
   * por linha de comando (/v) ou perfil de arquivo .rdp.
   */
  static async launchRdp(
    conn: RdpConnection,
    decryptedPassword?: string,
    defaultLaunchMode: LaunchMode = 'embedded'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Determina o modo efetivo (a configuração do perfil sobrepõe o padrão global)
      let effectiveMode =
        conn.launchMode && conn.launchMode !== 'default'
          ? conn.launchMode
          : defaultLaunchMode;

      // O cliente embutido não suporta múltiplos monitores; usa o mstsc nesse caso
      if (effectiveMode === 'embedded' && conn.display?.useMultimon) {
        effectiveMode = 'direct';
      }

      if (effectiveMode === 'embedded') {
        return await this.launchEmbedded(conn, decryptedPassword);
      }

      // 1. Injetar credencial temporária no Windows Credential Manager se houver senha
      let credentialTargets: string[] = [];
      if (decryptedPassword) {
        try {
          credentialTargets = await this.setWindowsCredentials(conn, decryptedPassword);
        } catch (err) {
          console.warn('Aviso ao registrar credenciais:', err);
        }
      }

      const args: string[] = [];

      if (effectiveMode === 'direct') {
        // MODO 1: Linha de comando direta mstsc.exe /v:<host> (Sem avisos de segurança de arquivo desconhecido)
        const fullAddress = conn.port && conn.port !== DEFAULT_RDP_PORT ? `${conn.host}:${conn.port}` : conn.host;
        args.push(`/v:${fullAddress}`);

        if (conn.display?.screenMode === 'fullscreen') {
          args.push('/f');
        } else if (conn.display?.screenMode === 'custom') {
          if (conn.display.width) args.push(`/w:${conn.display.width}`);
          if (conn.display.height) args.push(`/h:${conn.display.height}`);
        }

        if (conn.display?.useMultimon) {
          args.push('/multimon');
        }

        if (conn.experience?.adminConsole) {
          args.push('/admin');
        }
      } else {
        // MODO 2: Arquivo de perfil .rdp (Suporte a redirecionamentos avançados específicos)
        this.ensureTempDir();
        const rdpContent = this.buildRdpContent(conn);
        const safeFileName = `${conn.id}_${conn.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.rdp`;
        const rdpFilePath = path.join(this.getTempDir(), safeFileName);
        fs.writeFileSync(rdpFilePath, rdpContent, 'utf-8');

        args.push(rdpFilePath);
        if (conn.experience?.adminConsole) {
          args.push('/admin');
        }
      }

      // Executar mstsc desanexado do processo do Electron
      const child = spawn('mstsc.exe', args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        cwd: process.env.USERPROFILE || 'C:\\Windows\\System32',
      });

      if (credentialTargets.length > 0) {
        child.once('exit', () => this.releaseWindowsCredentials(credentialTargets));
      }
      child.unref();

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao abrir mstsc:', err);
      return { success: false, error: err.message || 'Falha ao executar mstsc.exe' };
    }
  }
}
