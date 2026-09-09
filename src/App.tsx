import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ConnectionCard } from './components/ConnectionCard';
import { ConnectionListView } from './components/ConnectionListView';
import { ConnectionModal } from './components/ConnectionModal';
import { PasswordRevealModal } from './components/PasswordRevealModal';
import { ExportImportModal } from './components/ExportImportModal';
import { SettingsModal } from './components/SettingsModal';
import { RdpConnection, AppSettings, PingResult, DEFAULT_RDP_PORT } from './types/rdp';
import { Plus, Server, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [connections, setConnections] = useState<RdpConnection[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoCheckPing: false,
    pingIntervalMinutes: 5,
    disablePingStatus: false,
    minimizeToTrayOnConnect: false,
    minimizeToTray: true,
    closeToTray: true,
    startWithWindows: false,
    confirmBeforeDelete: true,
    defaultGroup: 'Geral',
    defaultLaunchMode: 'direct',
    masterPasswordEnabled: false,
  });

  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Ping tracking
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [isCheckingPing, setIsCheckingPing] = useState(false);

  // Modals state
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<RdpConnection | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetConnection, setPasswordTargetConnection] = useState<RdpConnection | null>(null);

  const [isExportImportOpen, setIsExportImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar dados iniciais
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      if (window.rdpApi) {
        const [conns, sett] = await Promise.all([
          window.rdpApi.getConnections(),
          window.rdpApi.getSettings(),
        ]);
        setConnections(conns);
        setSettings(sett);

        if (sett.autoCheckPing && !sett.disablePingStatus && conns.length > 0) {
          triggerBatchPing(conns);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Escutar eventos da bandeja (abrir configurações, focar conexões, atualizar dados)
  useEffect(() => {
    if (!window.rdpApi?.onNavigate) return;
    const unsubNavigate = window.rdpApi.onNavigate((target) => {
      if (target === 'settings') {
        setIsSettingsOpen(true);
      } else if (target === 'connections') {
        setIsSettingsOpen(false);
        setIsConnectionModalOpen(false);
        setSelectedGroup('ALL');
        setSelectedTag(null);
      }
    });

    const unsubRefresh = window.rdpApi.onRefreshData?.(() => {
      loadInitialData();
    });

    return () => {
      unsubNavigate();
      unsubRefresh?.();
    };
  }, [loadInitialData]);

  // Checagem de Ping em lote
  const triggerBatchPing = async (itemsToCheck = connections) => {
    if (!window.rdpApi || itemsToCheck.length === 0 || settings.disablePingStatus) return;
    setIsCheckingPing(true);

    const uniqueTargets = new Map<string, { host: string; port: number }>();
    itemsToCheck.forEach((c) => {
      const port = c.port || DEFAULT_RDP_PORT;
      uniqueTargets.set(`${c.host}:${port}`, { host: c.host, port });
    });

    for (const [key, target] of uniqueTargets.entries()) {
      try {
        const res = await window.rdpApi.checkPing(target.host, target.port);
        setPingResults((prev) => ({ ...prev, [key]: res }));
      } catch (err) {
        setPingResults((prev) => ({
          ...prev,
          [key]: { host: target.host, port: target.port, online: false, error: 'Falha' },
        }));
      }
    }

    setIsCheckingPing(false);
  };

  // Intervalo de verificação automática periódica de status
  useEffect(() => {
    if (!settings.autoCheckPing || settings.disablePingStatus || connections.length === 0) {
      return;
    }
    const intervalMs = Math.max(1, settings.pingIntervalMinutes || 5) * 60 * 1000;
    const timer = setInterval(() => {
      triggerBatchPing();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [settings.autoCheckPing, settings.disablePingStatus, settings.pingIntervalMinutes, connections]);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
        input?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingConnection(null);
        setIsConnectionModalOpen(true);
      } else if (e.key === 'F5') {
        e.preventDefault();
        triggerBatchPing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connections]);

  // Lista de tags únicas
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    connections.forEach((c) => c.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [connections]);

  // Lista de grupos existentes
  const existingGroups = useMemo(() => {
    return Array.from(new Set(connections.map((c) => c.group || 'Geral'))).sort();
  }, [connections]);

  // Filtragem de conexões
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      // Filtro de Grupo
      if (selectedGroup === 'FAVORITES') {
        if (!conn.isFavorite) return false;
      } else if (selectedGroup !== 'ALL') {
        if ((conn.group || 'Geral') !== selectedGroup) return false;
      }

      // Filtro de Tag
      if (selectedTag && !conn.tags?.includes(selectedTag)) {
        return false;
      }

      // Filtro de Busca
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = conn.name.toLowerCase().includes(q);
        const matchHost = conn.host.toLowerCase().includes(q);
        const matchUser = conn.username?.toLowerCase().includes(q);
        const matchGroup = conn.group?.toLowerCase().includes(q);
        const matchNotes = conn.notes?.toLowerCase().includes(q);
        const matchTags = conn.tags?.some((t) => t.toLowerCase().includes(q));
        return matchName || matchHost || matchUser || matchGroup || matchNotes || matchTags;
      }

      return true;
    });
  }, [connections, selectedGroup, selectedTag, searchQuery]);

  // Ações de Conexão
  const handleConnect = async (id: string) => {
    if (!window.rdpApi) return;
    showToast('Iniciando cliente RDP do Windows...', 'info');
    const result = await window.rdpApi.connectRdp(id);
    if (!result.success) {
      showToast(`Erro ao iniciar RDP: ${result.error}`, 'error');
    } else {
      showToast('Sessão iniciada com mstsc.exe!', 'success');
      // Atualizar data de último acesso na memória local
      setConnections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, lastConnectedAt: Date.now() } : c))
      );
    }
  };

  const handleSaveConnection = async (conn: RdpConnection) => {
    if (!window.rdpApi) return;
    const saved = await window.rdpApi.saveConnection(conn);
    setConnections((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    showToast('Perfil salvo com sucesso!', 'success');
  };

  const handleDeleteConnection = async (id: string) => {
    if (settings.confirmBeforeDelete) {
      setConnectionToDelete(id);
    } else {
      await executeDelete(id);
    }
  };

  const executeDelete = async (id: string) => {
    if (!window.rdpApi) return;
    const success = await window.rdpApi.deleteConnection(id);
    if (success) {
      setConnections((prev) => prev.filter((c) => c.id !== id));
      showToast('Conexão excluída.', 'info');
    }
    setConnectionToDelete(null);
  };

  const handleToggleFavorite = async (conn: RdpConnection) => {
    const updated = { ...conn, isFavorite: !conn.isFavorite };
    await handleSaveConnection(updated);
  };

  const handleDuplicate = (conn: RdpConnection) => {
    const duplicated: RdpConnection = {
      ...conn,
      id: '', // sem ID: indica que é um NOVO perfil a ser criado
      name: `${conn.name} (Cópia)`,
      createdAt: 0,
      updatedAt: 0,
      lastConnectedAt: undefined,
    };
    setEditingConnection(duplicated);
    setIsConnectionModalOpen(true);
  };

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    if (!window.rdpApi) return;
    const saved = await window.rdpApi.saveSettings(newSettings);
    setSettings(saved);
    showToast('Configurações salvas!', 'success');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 select-none">
      {/* Custom TitleBar */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          connections={connections}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          pingResults={pingResults}
          disablePingStatus={settings.disablePingStatus}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenExportImport={() => setIsExportImportOpen(true)}
          onAddGroup={() => {
            setEditingConnection(null);
            setIsConnectionModalOpen(true);
          }}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0e1424]">
          {/* Header */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNewConnection={() => {
              setEditingConnection(null);
              setIsConnectionModalOpen(true);
            }}
            onRefreshPing={() => triggerBatchPing()}
            isCheckingPing={isCheckingPing}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            availableTags={availableTags}
            disablePingStatus={settings.disablePingStatus}
          />

          {/* Connection List / Grid Container */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Carregando conexões seguras...
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                  <Server className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">
                  Nenhuma conexão encontrada
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {searchQuery || selectedTag || selectedGroup !== 'ALL'
                    ? 'Nenhum resultado corresponde aos filtros selecionados.'
                    : 'Você ainda não possui perfis RDP cadastrados. Crie seu primeiro servidor para conectar em 1 clique.'}
                </p>
                <button
                  onClick={() => {
                    setEditingConnection(null);
                    setIsConnectionModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Conexão</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredConnections.map((conn) => (
                  <ConnectionCard
                    key={conn.id}
                    connection={conn}
                    pingResult={pingResults[`${conn.host}:${conn.port || DEFAULT_RDP_PORT}`]}
                    disablePingStatus={settings.disablePingStatus}
                    onConnect={handleConnect}
                    onEdit={(c) => {
                      setEditingConnection(c);
                      setIsConnectionModalOpen(true);
                    }}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDeleteConnection}
                    onToggleFavorite={handleToggleFavorite}
                    onViewPassword={(c) => {
                      setPasswordTargetConnection(c);
                      setIsPasswordModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <ConnectionListView
                connections={filteredConnections}
                pingResults={pingResults}
                disablePingStatus={settings.disablePingStatus}
                onConnect={handleConnect}
                onEdit={(c) => {
                  setEditingConnection(c);
                  setIsConnectionModalOpen(true);
                }}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteConnection}
                onToggleFavorite={handleToggleFavorite}
                onViewPassword={(c) => {
                  setPasswordTargetConnection(c);
                  setIsPasswordModalOpen(true);
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Connection Modal (Create / Edit / Duplicate) */}
      <ConnectionModal
        key={editingConnection ? (editingConnection.id || 'duplicate-' + editingConnection.name) : 'new-connection'}
        isOpen={isConnectionModalOpen}
        initialData={editingConnection}
        existingGroups={existingGroups}
        onClose={() => {
          setIsConnectionModalOpen(false);
          setEditingConnection(null);
        }}
        onSave={handleSaveConnection}
        onTestPing={(host, port) => window.rdpApi.checkPing(host, port)}
      />

      {/* Password Reveal Modal */}
      <PasswordRevealModal
        isOpen={isPasswordModalOpen}
        connection={passwordTargetConnection}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordTargetConnection(null);
        }}
        onFetchPassword={(id) => window.rdpApi.revealPassword(id)}
      />

      {/* Export / Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onExport={(pwd) => window.rdpApi.exportBackup(pwd)}
        onImport={(payload, pwd) => window.rdpApi.importBackup(payload, pwd)}
        onRefreshList={loadInitialData}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Confirm Delete Dialog */}
      {connectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-400">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-5">
              Tem certeza que deseja remover este perfil de conexão e suas credenciais salvas?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConnectionToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDelete(connectionToDelete)}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-300'
              : 'bg-slate-900 border-slate-700 text-slate-200'
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
