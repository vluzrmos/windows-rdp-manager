import React from 'react';
import { 
  Play, 
  Star, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Shield, 
  Clock 
} from 'lucide-react';
import { RdpConnection, PingResult, DEFAULT_RDP_PORT } from '../types/rdp';

interface ConnectionListViewProps {
  connections: RdpConnection[];
  pingResults: Record<string, PingResult>;
  onConnect: (id: string) => void;
  onEdit: (connection: RdpConnection) => void;
  onDuplicate: (connection: RdpConnection) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (connection: RdpConnection) => void;
  onViewPassword: (connection: RdpConnection) => void;
  disablePingStatus?: boolean;
}

export const ConnectionListView: React.FC<ConnectionListViewProps> = ({
  connections,
  pingResults,
  onConnect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onViewPassword,
  disablePingStatus,
}) => {
  return (
    <div className="bg-[#111827]/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
          <tr>
            <th className="py-3 px-3 w-10 text-center">Fav</th>
            {!disablePingStatus && <th className="py-3 px-3 w-20">Status</th>}
            <th className="py-3 px-4">Nome</th>
            <th className="py-3 px-4">Host / IP</th>
            <th className="py-3 px-3">Grupo</th>
            <th className="py-3 px-4">Usuário</th>
            <th className="py-3 px-3">Último Acesso</th>
            <th className="py-3 px-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {connections.map((conn) => {
            const key = `${conn.host}:${conn.port || DEFAULT_RDP_PORT}`;
            const ping = pingResults[key];

            return (
              <tr
                key={conn.id}
                onDoubleClick={() => onConnect(conn.id)}
                className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
              >
                {/* Favorite */}
                <td className="py-2.5 px-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(conn);
                    }}
                    className="text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        conn.isFavorite ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    />
                  </button>
                </td>

                {/* Status Ping */}
                {!disablePingStatus && (
                  <td className="py-2.5 px-3">
                    {ping ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          ping.online
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ping.online ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                        />
                        <span>{ping.online ? `${ping.latencyMs}ms` : 'Off'}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
                  </td>
                )}

                {/* Name */}
                <td className="py-2.5 px-4 font-semibold text-white group-hover:text-blue-400 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-xs">{conn.name}</span>
                    {conn.experience?.adminConsole && (
                      <span className="px-1 rounded bg-amber-950/80 text-amber-400 border border-amber-800/50 text-[9px] font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                </td>

                {/* Host & Port */}
                <td className="py-2.5 px-4 font-mono text-slate-300">
                  {conn.host}
                  {conn.port && conn.port !== DEFAULT_RDP_PORT && (
                    <span className="text-slate-500">:{conn.port}</span>
                  )}
                </td>

                {/* Group */}
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                    {conn.group || 'Geral'}
                  </span>
                </td>

                {/* Username */}
                <td className="py-2.5 px-4 text-slate-400">
                  {conn.domain ? `${conn.domain}\\` : ''}
                  {conn.username || <span className="text-slate-600 italic">vazio</span>}
                </td>

                {/* Last Connected */}
                <td className="py-2.5 px-3 text-[11px] text-slate-500">
                  {conn.lastConnectedAt
                    ? new Date(conn.lastConnectedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnect(conn.id);
                      }}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm transition-all"
                      title="Conectar com mstsc.exe"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Conectar</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(conn);
                      }}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {conn.hasPassword && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewPassword(conn);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                        title="Ver Senha"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conn.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
