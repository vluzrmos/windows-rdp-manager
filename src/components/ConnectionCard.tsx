import React, { useState } from 'react';
import { 
  Play, 
  Star, 
  MoreVertical, 
  Copy, 
  Edit, 
  Trash2, 
  Eye, 
  Check, 
  Monitor, 
  Folder, 
  HardDrive, 
  Volume2, 
  Shield, 
  Clock,
  Sparkles
} from 'lucide-react';
import { RdpConnection, PingResult } from '../types/rdp';

interface ConnectionCardProps {
  connection: RdpConnection;
  pingResult?: PingResult;
  onConnect: (id: string) => void;
  onEdit: (connection: RdpConnection) => void;
  onDuplicate: (connection: RdpConnection) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (connection: RdpConnection) => void;
  onViewPassword: (connection: RdpConnection) => void;
  disablePingStatus?: boolean;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  pingResult,
  onConnect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleFavorite,
  onViewPassword,
  disablePingStatus,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConnecting(true);
    try {
      await onConnect(connection.id);
    } finally {
      setTimeout(() => setIsConnecting(false), 800);
    }
  };

  const handleCopyHost = (e: React.MouseEvent) => {
    e.stopPropagation();
    const address = connection.port && connection.port !== 3389 
      ? `${connection.host}:${connection.port}` 
      : connection.host;
    navigator.clipboard.writeText(address);
    setCopiedHost(true);
    setTimeout(() => setCopiedHost(false), 1500);
    setShowMenu(false);
  };

  return (
    <div
      onDoubleClick={() => onConnect(connection.id)}
      className="group relative bg-[#131b2e]/90 hover:bg-[#18223a] border border-slate-800/80 hover:border-blue-500/50 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-lg hover:shadow-blue-500/5 flex flex-col justify-between cursor-pointer select-none"
    >
      {/* Top Row: Group, Ping Status & Favorite */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50 truncate">
              {connection.group || 'Geral'}
            </span>

            {/* Ping Indicator */}
            {pingResult && !disablePingStatus && (
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  pingResult.online
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                }`}
                title={pingResult.online ? `Online (${pingResult.latencyMs}ms)` : pingResult.error || 'Offline'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    pingResult.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span>{pingResult.online ? `${pingResult.latencyMs}ms` : 'Offline'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(connection);
              }}
              className={`p-1 rounded transition-colors ${
                connection.isFavorite
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100'
              }`}
              title={connection.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star className={`w-4 h-4 ${connection.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Context Menu Dropdown */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 top-6 w-44 bg-slate-900 border border-slate-700/80 rounded-lg shadow-xl py-1 z-50 text-xs text-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit(connection);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 hover:text-white text-left"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-400" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={handleCopyHost}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 hover:text-white text-left"
                    >
                      {copiedHost ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedHost ? 'Copiado!' : 'Copiar Endereço'}</span>
                    </button>
                    {connection.hasPassword && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onViewPassword(connection);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 hover:text-white text-left"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver Senha</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDuplicate(connection);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 hover:text-white text-left"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duplicar</span>
                    </button>
                    <div className="my-1 border-t border-slate-800" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onDelete(connection.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-900/50 hover:text-rose-300 text-rose-400 text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Name & Host Info */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
            {connection.name}
          </h3>
          <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
            <span>{connection.host}</span>
            {connection.port && connection.port !== 3389 && (
              <span className="text-slate-500">:{connection.port}</span>
            )}
          </p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {connection.domain ? `${connection.domain}\\` : ''}
            <span className="text-slate-400">{connection.username || 'Sem usuário definido'}</span>
          </p>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center gap-1 mb-4">
          {connection.display?.useMultimon && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 flex items-center gap-1" title="Múltiplos Monitores">
              <Monitor className="w-3 h-3 text-blue-400" />
              <span>Multi-mon</span>
            </span>
          )}
          {connection.resources?.redirectDrives && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 flex items-center gap-1" title="Unidades de Disco Compartilhadas">
              <HardDrive className="w-3 h-3 text-cyan-400" />
              <span>Drives</span>
            </span>
          )}
          {connection.experience?.adminConsole && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1" title="Sessão de Console/Admin">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Admin</span>
            </span>
          )}
        </div>
      </div>

      {/* Bottom Connect Button */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
          {connection.lastConnectedAt ? (
            <>
              <Clock className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="truncate">
                {new Date(connection.lastConnectedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          ) : (
            <span>Nunca conectado</span>
          )}
        </div>

        <button
          onClick={handleConnectClick}
          disabled={isConnecting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-600/20 transition-all group-hover:scale-[1.02] shrink-0"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isConnecting ? 'Iniciando...' : 'Conectar'}</span>
        </button>
      </div>
    </div>
  );
};
