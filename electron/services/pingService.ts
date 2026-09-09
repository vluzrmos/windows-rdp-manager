import net from 'net';
import { DEFAULT_RDP_PORT } from '../../src/types/rdp';

export interface PingResult {
  host: string;
  port: number;
  online: boolean;
  latencyMs?: number;
  error?: string;
}

export class PingService {
  /**
   * Testa a conectividade TCP com o host na porta RDP informada (padrão DEFAULT_RDP_PORT).
   * Valida com precisão se o serviço Remote Desktop está ouvindo.
   */
  static async checkPort(host: string, port = DEFAULT_RDP_PORT, timeoutMs = 2000): Promise<PingResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      const finish = (online: boolean, error?: string) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        const latencyMs = Date.now() - startTime;
        resolve({
          host,
          port,
          online,
          latencyMs: online ? latencyMs : undefined,
          error,
        });
      };

      socket.setTimeout(timeoutMs);

      socket.once('connect', () => {
        finish(true);
      });

      socket.once('timeout', () => {
        finish(false, 'Timeout na conexão');
      });

      socket.once('error', (err) => {
        finish(false, err.message || 'Falha de conexão');
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        finish(false, err.message || 'Erro ao iniciar conexão');
      }
    });
  }
}
