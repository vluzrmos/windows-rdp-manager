import React, { useEffect, useState } from 'react';
import { X, KeyRound, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { RdpConnection } from '../types/rdp';

interface PasswordRevealModalProps {
  connection: RdpConnection | null;
  isOpen: boolean;
  onClose: () => void;
  onFetchPassword: (id: string) => Promise<string>;
}

export const PasswordRevealModal: React.FC<PasswordRevealModalProps> = ({
  connection,
  isOpen,
  onClose,
  onFetchPassword,
}) => {
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPlain, setShowPlain] = useState(false);

  useEffect(() => {
    if (isOpen && connection) {
      setLoading(true);
      setCopied(false);
      setShowPlain(false);
      onFetchPassword(connection.id)
        .then((pwd) => {
          setPassword(pwd);
        })
        .finally(() => setLoading(false));
    } else {
      setPassword('');
    }
  }, [isOpen, connection]);

  if (!isOpen || !connection) return null;

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Credencial de Acesso</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                {connection.name} ({connection.host})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Usuário</span>
            <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200">
              {connection.domain ? `${connection.domain}\\` : ''}
              {connection.username || 'Sem usuário'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400">Senha Descriptografada</span>
              <button
                type="button"
                onClick={() => setShowPlain(!showPlain)}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                {showPlain ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showPlain ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                readOnly
                type={showPlain ? 'text' : 'password'}
                value={loading ? 'Carregando...' : password || '(Sem senha salva)'}
                className="w-full pl-3 pr-20 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 select-text"
              />
              <button
                onClick={handleCopy}
                disabled={loading || !password}
                className="absolute right-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
