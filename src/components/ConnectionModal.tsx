import React, { useState } from 'react';
import { 
  X, 
  Monitor, 
  HardDrive, 
  Settings2, 
  Shield, 
  Check, 
  Eye, 
  EyeOff, 
  Activity, 
  Star 
} from 'lucide-react';
import { RdpConnection, PingResult } from '../types/rdp';

interface ConnectionModalProps {
  initialData?: RdpConnection | null;
  existingGroups: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: RdpConnection) => Promise<void>;
  onTestPing: (host: string, port?: number) => Promise<PingResult>;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  initialData,
  existingGroups,
  isOpen,
  onClose,
  onSave,
  onTestPing,
}) => {
  const isEditing = !!initialData;
  const [activeTab, setActiveTab] = useState<'general' | 'display' | 'resources' | 'experience'>('general');

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [group, setGroup] = useState(initialData?.group || 'Geral');
  const [customGroup, setCustomGroup] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [host, setHost] = useState(initialData?.host || '');
  const [port, setPort] = useState<number>(initialData?.port || 3389);
  const [username, setUsername] = useState(initialData?.username || '');
  const [domain, setDomain] = useState(initialData?.domain || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '');
  const [isFavorite, setIsFavorite] = useState(initialData?.isFavorite || false);

  // Display State
  const [screenMode, setScreenMode] = useState(initialData?.display?.screenMode || 'fullscreen');
  const [customResolution, setCustomResolution] = useState(
    initialData?.display?.width ? `${initialData.display.width}x${initialData.display.height}` : '1920x1080'
  );
  const [smartSizing, setSmartSizing] = useState(initialData?.display?.smartSizing ?? true);
  const [useMultimon, setUseMultimon] = useState(initialData?.display?.useMultimon ?? false);
  const [colorDepth, setColorDepth] = useState<15 | 16 | 24 | 32>(initialData?.display?.colorDepth || 32);

  // Local Resources State
  const [redirectClipboard, setRedirectClipboard] = useState(initialData?.resources?.redirectClipboard ?? true);
  const [redirectDrives, setRedirectDrives] = useState(initialData?.resources?.redirectDrives ?? false);
  const [redirectPrinters, setRedirectPrinters] = useState(initialData?.resources?.redirectPrinters ?? false);
  const [audioMode, setAudioMode] = useState<0 | 1 | 2>(initialData?.resources?.audioMode ?? 0);
  const [audioCapture, setAudioCapture] = useState(initialData?.resources?.audioCapture ?? false);

  // Experience State
  const [connectionType, setConnectionType] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(
    initialData?.experience?.connectionType ?? 7
  );
  const [adminConsole, setAdminConsole] = useState(initialData?.experience?.adminConsole ?? false);

  // Gateway
  const [enableGateway, setEnableGateway] = useState(initialData?.gateway?.enabled ?? false);
  const [gatewayHostname, setGatewayHostname] = useState(initialData?.gateway?.hostname || '');
  const [gatewayUsername, setGatewayUsername] = useState(initialData?.gateway?.username || '');

  // Ping test in modal
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    if (!host) return;
    setPingTesting(true);
    setPingResult(null);
    try {
      const res = await onTestPing(host, port);
      setPingResult(res);
    } finally {
      setPingTesting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !host.trim()) return;

    let width: number | undefined;
    let height: number | undefined;
    if (screenMode === 'custom') {
      const parts = customResolution.split('x').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        width = parts[0];
        height = parts[1];
      }
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const finalGroup = isNewGroup ? customGroup.trim() || 'Geral' : group;

    const updatedConn: RdpConnection = {
      id: initialData?.id || crypto.randomUUID(),
      name: name.trim(),
      group: finalGroup,
      host: host.trim(),
      port: Number(port) || 3389,
      username: username.trim(),
      domain: domain.trim() || undefined,
      password: password !== '' ? password : undefined,
      encryptedPassword: password === '' ? initialData?.encryptedPassword : undefined,
      notes: notes.trim() || undefined,
      tags,
      isFavorite,
      createdAt: initialData?.createdAt || Date.now(),
      updatedAt: Date.now(),
      display: {
        screenMode,
        width,
        height,
        smartSizing,
        useMultimon,
        colorDepth,
      },
      resources: {
        redirectClipboard,
        redirectDrives,
        redirectPrinters,
        audioMode,
        audioCapture,
      },
      experience: {
        connectionType,
        enableWallpaper: true,
        enableFontSmoothing: true,
        enableDesktopComposition: true,
        enableTheme: true,
        adminConsole,
      },
      gateway: enableGateway
        ? {
            enabled: true,
            hostname: gatewayHostname.trim(),
            username: gatewayUsername.trim() || undefined,
            usageMethod: 1,
          }
        : undefined,
    };

    await onSave(updatedConn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEditing ? 'Editar Perfil RDP' : 'Nova Conexão RDP'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Configure os parâmetros de sessão para o cliente nativo do Windows
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-1.5 rounded-lg transition-colors ${
                isFavorite ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-white'
              }`}
              title={isFavorite ? 'Favoritado' : 'Marcar como favorito'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Geral & Credenciais
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'display'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Exibição & Tela
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Recursos Locais
          </button>
          <button
            onClick={() => setActiveTab('experience')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'experience'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Rede & Avançado
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: GERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome da Conexão *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Servidor de Aplicações"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Grupo / Categoria
                  </label>
                  {!isNewGroup ? (
                    <div className="flex gap-2">
                      <select
                        value={group}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setIsNewGroup(true);
                          } else {
                            setGroup(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        {Array.from(new Set(['Geral', 'Produção', 'Homologação', 'Infra', ...existingGroups])).map(
                          (g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          )
                        )}
                        <option value="__NEW__">+ Criar Novo Grupo...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do novo grupo"
                        value={customGroup}
                        onChange={(e) => setCustomGroup(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewGroup(false)}
                        className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Host and Port */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Host / Endereço IP *
                  </label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="ex: 192.168.1.100 ou rdp.empresa.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Porta
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Ping Quick Checker inside Modal */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">Checar disponibilidade do Host:</span>
                  {pingResult && (
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        pingResult.online
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {pingResult.online
                        ? `Porta 3389 Aberta (${pingResult.latencyMs}ms)`
                        : pingResult.error || 'Porta inacessível'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={pingTesting || !host}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-xs font-medium text-slate-200 rounded transition-colors"
                >
                  {pingTesting ? 'Testando...' : 'Testar Porta'}
                </button>
              </div>

              {/* Credentials Section */}
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">Credenciais de Autenticação</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Protegido por DPAPI do Windows</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Usuário</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Administrador ou user"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Domínio (Opcional)</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="Ex: WORKGROUP ou MEUDOMINIO"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Senha
                    {isEditing && initialData?.hasPassword && !password && (
                      <span className="ml-2 text-[10px] text-emerald-400">(Senha já salva e segura)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        isEditing && initialData?.hasPassword
                          ? 'Deixe em branco para manter a senha atual'
                          : 'Digite a senha do usuário'
                      }
                      className="w-full pr-10 px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags & Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tags (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="ex: sql, producao, windows2022"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais, finalidade da máquina, contatos..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: EXIBIÇÃO */}
          {activeTab === 'display' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Modo de Tela</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScreenMode('fullscreen')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      screenMode === 'fullscreen'
                        ? 'bg-blue-600/10 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Monitor className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block">Tela Cheia (Fullscreen)</span>
                      <span className="text-[11px] text-slate-400">
                        Ocupa todo o monitor com barra de conexão no topo
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScreenMode('custom')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      screenMode === 'custom'
                        ? 'bg-blue-600/10 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Monitor className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block">Resolução Específica</span>
                      <span className="text-[11px] text-slate-400">
                        Abre em janela com resolução predefinida
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {screenMode === 'custom' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Resolução da Janela</label>
                  <select
                    value={customResolution}
                    onChange={(e) => setCustomResolution(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="1920x1080">1920 x 1080 (Full HD)</option>
                    <option value="1600x900">1600 x 900</option>
                    <option value="1366x768">1366 x 768</option>
                    <option value="1280x720">1280 x 720 (HD)</option>
                    <option value="2560x1440">2560 x 1440 (2K QHD)</option>
                    <option value="3840x2160">3840 x 2160 (4K UHD)</option>
                  </select>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smartSizing}
                    onChange={(e) => setSmartSizing(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Smart Sizing</span>
                    <span className="text-[11px] text-slate-400">
                      Redimensiona dinamicamente a área remota ao mudar o tamanho da janela
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMultimon}
                    onChange={(e) => setUseMultimon(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Múltiplos Monitores</span>
                    <span className="text-[11px] text-slate-400">
                      Estende a sessão de área de trabalho por todos os seus monitores físicos
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Profundidade de Cor
                </label>
                <select
                  value={colorDepth}
                  onChange={(e) => setColorDepth(Number(e.target.value) as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={32}>Cor mais alta (32 bits) - Recomendado</option>
                  <option value={24}>Cor verdadeira (24 bits)</option>
                  <option value={16}>Cor de alta qualidade (16 bits) - Mais rápido</option>
                  <option value={15}>Cor de 15 bits</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: RECURSOS LOCAIS */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redirectClipboard}
                    onChange={(e) => setRedirectClipboard(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Área de Transferência (Clipboard)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Permite copiar e colar textos e arquivos entre o computador local e o remoto
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redirectDrives}
                    onChange={(e) => setRedirectDrives(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Unidades de Disco Locais
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Disponibiliza seus discos (C:, D:) dentro do Windows Explorer remoto
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={redirectPrinters}
                    onChange={(e) => setRedirectPrinters(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Impressoras</span>
                    <span className="text-[11px] text-slate-400">
                      Redireciona impressoras locais para imprimir do remoto
                    </span>
                  </div>
                </label>
              </div>

              {/* Audio Settings */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                <label className="block text-xs font-semibold text-white">Reprodução de Áudio Remoto</label>
                <select
                  value={audioMode}
                  onChange={(e) => setAudioMode(Number(e.target.value) as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={0}>Reproduzir neste computador (Local)</option>
                  <option value={1}>Deixar no computador remoto</option>
                  <option value={2}>Não reproduzir som</option>
                </select>

                <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioCapture}
                    onChange={(e) => setAudioCapture(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Gravar a partir deste computador (Redirecionar Microfone)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: REDE E AVANÇADO */}
          {activeTab === 'experience' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Otimização de Velocidade / Experiência
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(Number(e.target.value) as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={7}>Detectar qualidade de conexão automaticamente (Recomendado)</option>
                  <option value={6}>LAN (10 Mbps ou mais - Alta fidelidade e animações)</option>
                  <option value={5}>Banda larga WAN (Alta velocidade)</option>
                  <option value={2}>Banda larga baixa velocidade (Otimizado para conexões lentas)</option>
                </select>
              </div>

              {/* Admin console mode */}
              <label className="flex items-center gap-3 p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminConsole}
                  onChange={(e) => setAdminConsole(e.target.checked)}
                  className="rounded border-amber-700 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-semibold text-amber-300 block">
                    Conectar à Sessão de Console / Administrador (/admin)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Útil para servidores Windows onde você precisa conectar na sessão zero (console físico)
                  </span>
                </div>
              </label>

              {/* RD Gateway */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableGateway}
                    onChange={(e) => setEnableGateway(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
                  />
                  <span>Utilizar Gateway de Área de Trabalho Remota (RD Gateway)</span>
                </label>

                {enableGateway && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nome do Servidor Gateway</label>
                      <input
                        type="text"
                        value={gatewayHostname}
                        onChange={(e) => setGatewayHostname(e.target.value)}
                        placeholder="gateway.empresa.com"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Usuário do Gateway (opcional)</label>
                      <input
                        type="text"
                        value={gatewayUsername}
                        onChange={(e) => setGatewayUsername(e.target.value)}
                        placeholder="Deixe vazio para usar o mesmo usuário RDP"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Alterações' : 'Criar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
