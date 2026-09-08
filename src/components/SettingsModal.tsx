import React, { useState } from 'react';
import { X, Settings, Check, Shield } from 'lucide-react';
import { AppSettings } from '../types/rdp';

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
  const [minimizeToTray, setMinimizeToTray] = useState(settings.minimizeToTrayOnConnect);
  const [confirmDelete, setConfirmDelete] = useState(settings.confirmBeforeDelete);
  const [defaultGroup, setDefaultGroup] = useState(settings.defaultGroup || 'Geral');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    await onSaveSettings({
      autoCheckPing,
      minimizeToTrayOnConnect: minimizeToTray,
      confirmBeforeDelete: confirmDelete,
      defaultGroup: defaultGroup.trim() || 'Geral',
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6">
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
          <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
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

          <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={minimizeToTray}
              onChange={(e) => setMinimizeToTray(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-0 w-4 h-4"
            />
            <div>
              <span className="text-xs font-semibold text-white block">
                Minimizar ao Conectar
              </span>
              <span className="text-[11px] text-slate-400">
                Minimiza o gerenciador automaticamente quando o mstsc.exe for iniciado
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-lg cursor-pointer">
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
