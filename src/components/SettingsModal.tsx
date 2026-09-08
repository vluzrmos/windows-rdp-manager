import React, { useState, useEffect } from 'react';
import { X, Settings, Check, Shield, Terminal, FileText } from 'lucide-react';
import { AppSettings, LaunchMode } from '../types/rdp';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [autoCheckPing, setAutoCheckPing] = useState(settings.autoCheckPing);
  const [minimizeToTrayOnConnect, setMinimizeToTrayOnConnect] = useState(settings.minimizeToTrayOnConnect);
  const [minimizeToTray, setMinimizeToTray] = useState(settings.minimizeToTray || false);
  const [closeToTray, setCloseToTray] = useState(settings.closeToTray || false);
  const [startWithWindows, setStartWithWindows] = useState(settings.startWithWindows || false);
  const [confirmDelete, setConfirmDelete] = useState(settings.confirmBeforeDelete);
  const [defaultGroup, setDefaultGroup] = useState(settings.defaultGroup || 'Geral');
  const [defaultLaunchMode, setDefaultLaunchMode] = useState<LaunchMode>(
    settings.defaultLaunchMode || 'direct'
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAutoCheckPing(settings.autoCheckPing);
      setMinimizeToTrayOnConnect(settings.minimizeToTrayOnConnect);
      setMinimizeToTray(settings.minimizeToTray || false);
      setCloseToTray(settings.closeToTray || false);
      setStartWithWindows(settings.startWithWindows || false);
      setConfirmDelete(settings.confirmBeforeDelete);
      setDefaultGroup(settings.defaultGroup || 'Geral');
      setDefaultLaunchMode(settings.defaultLaunchMode || 'direct');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await onSaveSettings({
      autoCheckPing,
      minimizeToTrayOnConnect,
      minimizeToTray,
      closeToTray: minimizeToTray ? closeToTray : false,
      startWithWindows,
      confirmBeforeDelete: confirmDelete,
      defaultGroup: defaultGroup.trim() || 'Geral',
      defaultLaunchMode,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Configurações Gerais</h3>
              <p className="text-[11px] text-slate-400">Ajuste o comportamento do RDP Manager</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Modo de Inicialização Padrão */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Modo de Inicialização Padrão do RDP
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              <div
                onClick={() => setDefaultLaunchMode('direct')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  defaultLaunchMode === 'direct'
                    ? 'bg-blue-600/10 border-blue-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${defaultLaunchMode === 'direct' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">
                        Linha de Comando Direta (mstsc.exe /v)
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Abre a conexão passando os parâmetros diretamente ao executável nativo. <strong>Não exibe</strong> o aviso de segurança de &quot;Fornecedor desconhecido&quot; e autentica de imediato com usuário e senha do Credential Manager.
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setDefaultLaunchMode('rdp_file')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  defaultLaunchMode === 'rdp_file'
                    ? 'bg-blue-600/10 border-blue-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg ${defaultLaunchMode === 'rdp_file' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-white block">
                      Perfis de Arquivo RDP (.rdp)
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Gera um arquivo de configuração temporário em disco. Suporta todos os recursos avançados de redirecionamento (impressoras, unidades de disco específicas), mas o Windows pode exibir o alerta de segurança para arquivos não assinados digitalmente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opções de Janela e Bandeja */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-semibold text-slate-300">Comportamento e Bandeja do Sistema</h4>
            
            <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => {
                  const val = e.target.checked;
                  setMinimizeToTray(val);
                  if (!val) setCloseToTray(false);
                }}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Minimizar para a bandeja
                </span>
                <span className="text-[11px] text-slate-400">
                  Oculta a janela na área de notificação do Windows ao clicar em minimizar
                </span>
              </div>
            </label>

            {/* Manter aberto na bandeja ao fechar (ativo somente se minimizar estiver ativo) */}
            <label
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                minimizeToTray
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer ml-4'
                  : 'bg-slate-900/30 border-slate-800/50 opacity-40 cursor-not-allowed ml-4'
              }`}
            >
              <input
                type="checkbox"
                disabled={!minimizeToTray}
                checked={minimizeToTray && closeToTray}
                onChange={(e) => setCloseToTray(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4 disabled:opacity-50"
              />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Manter aberto na bandeja ao fechar
                </span>
                <span className="text-[11px] text-slate-400">
                  {minimizeToTray
                    ? 'Ao clicar no X da janela, mantém o aplicativo em execução em segundo plano'
                    : 'Requer "Minimizar para a bandeja" ativo'}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={startWithWindows}
                onChange={(e) => setStartWithWindows(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Iniciar com o Windows
                </span>
                <span className="text-[11px] text-slate-400">
                  Abre o Windows RDP Manager automaticamente ao ligar o computador
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={minimizeToTrayOnConnect}
                onChange={(e) => setMinimizeToTrayOnConnect(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Minimizar ao conectar RDP
                </span>
                <span className="text-[11px] text-slate-400">
                  Minimiza o gerenciador automaticamente quando o mstsc.exe for iniciado
                </span>
              </div>
            </label>
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-semibold text-slate-300">Geral</h4>
            
            <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={autoCheckPing}
                onChange={(e) => setAutoCheckPing(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Verificação automática de status
                </span>
                <span className="text-[11px] text-slate-400">
                  Checa a porta RDP 3389 de todas as conexões ao abrir o aplicativo
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Confirmar antes de excluir
                </span>
                <span className="text-[11px] text-slate-400">
                  Exibe um diálogo de aviso ao clicar no botão de exclusão
                </span>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Grupo Padrão para Novos Perfis
            </label>
            <input
              type="text"
              value={defaultGroup}
              onChange={(e) => setDefaultGroup(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-[11px] text-slate-300 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-300 block">Segurança de Credenciais</span>
              <span>
                Todas as senhas são armazenadas localmente utilizando a Windows Data Protection API (DPAPI).
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{saved ? 'Salvo!' : 'Salvar Configurações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
