import { app, JumpListCategory, JumpListItem } from 'electron';
import path from 'path';
import { StorageService } from './storageService';
import { RdpConnection, DEFAULT_RDP_PORT } from '../../src/types/rdp';

const CONNECT_ARG = '--connect=';
const NEW_CONNECTION_ARG = '--new-connection';
const MAX_RECENT = 5;

export class JumpListService {
  /** Extrai o id da conexão de um argv contendo `--connect=<id>` (vindo de um item da Jump List). */
  static getConnectionIdFromArgv(argv: string[]): string | null {
    const arg = argv.find((a) => a.startsWith(CONNECT_ARG));
    const id = arg?.slice(CONNECT_ARG.length).trim();
    return id || null;
  }

  /** Indica se o argv veio da tarefa "Nova conexão" da Jump List. */
  static isNewConnectionArgv(argv: string[]): boolean {
    return argv.includes(NEW_CONNECTION_ARG);
  }

  /** Recria a Jump List (botão direito no ícone da barra de tarefas) com Favoritos e Recentes. */
  static update() {
    if (process.platform !== 'win32') return;

    try {
      const connections = StorageService.getConnections();

      // Itens que o usuário removeu pelo "Remover desta lista" não podem ser reenviados, senão o Windows rejeita a lista
      const removedArgs = new Set(
        app.getJumpListSettings().removedItems.map((item) => item.args).filter(Boolean)
      );

      const toItem = (conn: RdpConnection): JumpListItem => ({
        type: 'task',
        title: conn.name || conn.host,
        description:
          conn.port && conn.port !== DEFAULT_RDP_PORT ? `${conn.host}:${conn.port}` : conn.host,
        program: process.execPath,
        args: this.buildArgs(`${CONNECT_ARG}${conn.id}`),
        iconPath: process.execPath,
        iconIndex: 0,
      });

      const favorites = connections
        .filter((c) => c.isFavorite)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const recents = connections
        .filter((c) => !c.isFavorite && c.lastConnectedAt)
        .sort((a, b) => (b.lastConnectedAt || 0) - (a.lastConnectedAt || 0))
        .slice(0, MAX_RECENT);

      const categories: JumpListCategory[] = [];
      for (const [name, list] of [
        ['Favoritos', favorites],
        ['Recentes', recents],
      ] as const) {
        const items = list.map(toItem).filter((item) => !removedArgs.has(item.args));
        if (items.length > 0) {
          categories.push({ type: 'custom', name, items });
        }
      }

      // Tarefas ficam fixas no fim da Jump List e o Windows não oferece "Remover desta lista" para elas
      categories.push({
        type: 'tasks',
        items: [
          {
            type: 'task',
            title: 'Nova conexão',
            description: 'Cadastrar uma nova conexão RDP',
            program: process.execPath,
            args: this.buildArgs(NEW_CONNECTION_ARG),
            iconPath: process.execPath,
            iconIndex: 0,
          },
        ],
      });

      const result = app.setJumpList(categories);
      if (result !== 'ok') {
        console.error('Falha ao atualizar a Jump List:', result);
      }
    } catch (err) {
      console.error('Erro ao atualizar a Jump List:', err);
    }
  }

  private static buildArgs(arg: string): string {
    // Em desenvolvimento o executável é o electron.exe, que precisa do caminho do app como primeiro argumento
    if (process.defaultApp && process.argv[1]) {
      return `"${path.resolve(process.argv[1])}" ${arg}`;
    }
    return arg;
  }
}
