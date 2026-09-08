import React from 'react';
import { 
  Folder, 
  Star, 
  Server, 
  Settings, 
  DownloadCloud, 
  Plus, 
  Activity,
  CheckCircle2,
  XCircle,
  Hash
} from 'lucide-react';
import { RdpConnection, PingResult } from '../types/rdp';

interface SidebarProps {
  connections: RdpConnection[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  pingResults: Record<string, PingResult>;
  onOpenSettings: () => void;
  onOpenExportImport: () => void;
  onAddGroup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  connections,
  selectedGroup,
  onSelectGroup,
  pingResults,
  onOpenSettings,
  onOpenExportImport,
  onAddGroup,
}) => {
  // Extrair grupos únicos
  const groups = Array.from(new Set(connections.map((c) => c.group || 'Geral'))).sort();
  
  // Contadores
  const totalCount = connections.length;
  const favoriteCount = connections.filter((c) => c.isFavorite).length;

  let onlineCount = 0;
  let offlineCount = 0;
  connections.forEach((c) => {
    const key = `${c.host}:${c.port || 3389}`;
    if (pingResults[key]?.online) onlineCount++;
    else if (pingResults[key]?.online === false) offlineCount++;
  });

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col justify-between select-none shrink-0">
      {/* Top Section */}
      <div className="p-3 overflow-y-auto">
        {/* Status Quick Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Online</span>
              <span className="text-sm font-bold text-emerald-400">{onlineCount}</span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Offline</span>
              <span className="text-sm font-bold text-rose-400">{offlineCount}</span>
            </div>
            <XCircle className="w-4 h-4 text-rose-500/70" />
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="space-y-1 mb-5">
          <button
            onClick={() => onSelectGroup('ALL')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedGroup === 'ALL'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4" />
              <span>Todas as Conexões</span>
            </div>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              selectedGroup === 'ALL' ? 'bg-blue-500/50 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => onSelectGroup('FAVORITES')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              selectedGroup === 'FAVORITES'
                ? 'bg-amber-600/80 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Favoritos</span>
            </div>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              selectedGroup === 'FAVORITES' ? 'bg-amber-500/50 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {favoriteCount}
            </span>
          </button>
        </div>

        {/* Groups / Folders */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Grupos
            </span>
            <button
              onClick={onAddGroup}
              title="Adicionar Novo Grupo"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {groups.map((group) => {
              const count = connections.filter((c) => (c.group || 'Geral') === group).length;
              const isSelected = selectedGroup === group;

              return (
                <button
                  key={group}
                  onClick={() => onSelectGroup(group)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-blue-400 font-semibold border-l-2 border-blue-500'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span className="truncate">{group}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{count}</span>
                </button>
              );
            })}

            {groups.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-500 italic">
                Nenhum grupo cadastrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-1">
        <button
          onClick={onOpenExportImport}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
        >
          <DownloadCloud className="w-4 h-4 text-slate-400" />
          <span>Backup & Exportar</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4 text-slate-400" />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
};
