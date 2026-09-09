import React, { useState } from 'react';
import { X, Download, Upload, ShieldCheck, Check, AlertCircle, FileText } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (masterPassword: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  onImport: (payload: string, masterPassword: string) => Promise<{ success: boolean; count?: number; error?: string }>;
  onRefreshList: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  onImport,
  onRefreshList,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  
  // Export State
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
  const [exportedData, setExportedData] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import State
  const [importPayload, setImportPayload] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (exportPassword.length < 4) {
      setExportError('A senha mestra deve ter no mínimo 4 caracteres.');
      return;
    }
    if (exportPassword !== exportPasswordConfirm) {
      setExportError('As senhas digitadas não coincidem.');
      return;
    }

    setExportLoading(true);
    setExportError(null);

    try {
      const res = await onExport(exportPassword);
      if (res.success && res.data) {
        setExportedData(res.data);
      } else {
        setExportError(res.error || 'Erro ao gerar exportação');
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadFile = () => {
    if (!exportedData) return;
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rdp_backup_${new Date().toISOString().slice(0, 10)}.rdpbackup`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPayload.trim()) {
      setImportError('Insira o arquivo ou conteúdo do backup.');
      return;
    }
    if (!importPassword) {
      setImportError('Informe a senha mestra utilizada na exportação.');
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportSuccessMessage(null);

    try {
      const res = await onImport(importPayload.trim(), importPassword);
      if (res.success) {
        setImportSuccessMessage(`${res.count} perfis de conexão foram importados e salvos com sucesso!`);
        onRefreshList();
      } else {
        setImportError(res.error || 'Falha ao importar conexões');
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setImportPayload(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header (Fixo) */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Backup e Migração de Conexões</h2>
              <p className="text-[11px] text-slate-400">
                Exportação criptografada ponta a ponta com AES-256-GCM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs (Fixo) */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs shrink-0">
          <button
            onClick={() => setTab('export')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              tab === 'export'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Perfis</span>
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              tab === 'import'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Backup</span>
          </button>
        </div>

        {/* Content (Rolagem Interna Automática) */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {tab === 'export' ? (
            <div className="space-y-4">
              {!exportedData ? (
                <form onSubmit={handleExport} className="space-y-4">
                  <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-xs text-blue-300">
                    Defina uma senha mestra para proteger o arquivo exportado. As senhas de conexão serão criptografadas com AES-256-GCM e só poderão ser restauradas com esta mesma senha.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Senha Mestra do Backup
                    </label>
                    <input
                      type="password"
                      required
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                      placeholder="Crie uma senha forte"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Confirmar Senha Mestra
                    </label>
                    <input
                      type="password"
                      required
                      value={exportPasswordConfirm}
                      onChange={(e) => setExportPasswordConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {exportError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{exportError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={exportLoading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>{exportLoading ? 'Criptografando...' : 'Gerar Arquivo Criptografado'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Backup gerado e criptografado com sucesso!</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadFile}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Arquivo (.rdpbackup)</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportedData);
                        setCopiedExport(true);
                        setTimeout(() => setCopiedExport(false), 2000);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      {copiedExport ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setExportedData(null);
                      setExportPassword('');
                      setExportPasswordConfirm('');
                    }}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-200 underline pt-2"
                  >
                    Fazer outra exportação
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Arquivo de Backup (.rdpbackup ou .json)
                </label>
                <input
                  type="file"
                  accept=".rdpbackup,.json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ou Cole o Conteúdo do Backup Aqui
                </label>
                <textarea
                  rows={4}
                  value={importPayload}
                  onChange={(e) => setImportPayload(e.target.value)}
                  placeholder='{"salt": "...", "data": "..."}'
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha Mestra Usada na Exportação
                </label>
                <input
                  type="password"
                  required
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  placeholder="Digite a senha do backup"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={importLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>{importLoading ? 'Descriptografando...' : 'Restaurar e Importar Perfis'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer (Fixo) */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
