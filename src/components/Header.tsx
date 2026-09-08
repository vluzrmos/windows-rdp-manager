import React from 'react';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  SlidersHorizontal,
  X
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onNewConnection: () => void;
  onRefreshPing: () => void;
  isCheckingPing: boolean;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  availableTags: string[];
  disablePingStatus?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onNewConnection,
  onRefreshPing,
  isCheckingPing,
  selectedTag,
  onSelectTag,
  availableTags,
  disablePingStatus,
}) => {
  return (
    <div className="h-16 px-6 border-b border-slate-800/80 bg-[#0f172a]/50 backdrop-blur-sm flex items-center justify-between gap-4 select-none shrink-0">
      {/* Search Input */}
      <div className="flex-1 max-w-md relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, host, usuário ou grupo (Ctrl+K)..."
          className="w-full pl-9 pr-12 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto max-w-xs py-1">
          {selectedTag && (
            <button
              onClick={() => onSelectTag(null)}
              className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
            >
              <span>Todas tags</span>
              <X className="w-3 h-3" />
            </button>
          )}
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Refresh Ping */}
        {!disablePingStatus && (
          <button
            onClick={onRefreshPing}
            disabled={isCheckingPing}
            title="Verificar status de conectividade RDP"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingPing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => onViewModeChange('grid')}
            title="Visualização em Grade"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === 'grid'
                ? 'bg-slate-800 text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            title="Visualização em Lista"
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === 'list'
                ? 'bg-slate-800 text-blue-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* New Connection Button */}
        <button
          onClick={onNewConnection}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm shadow-blue-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Conexão</span>
        </button>
      </div>
    </div>
  );
};
