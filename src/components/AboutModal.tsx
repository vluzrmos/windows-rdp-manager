import React from 'react';
import { X, Info, User, Tag, Calendar, GitBranch, Scale } from 'lucide-react';
import appIcon from '../assets/icon.png';

const REPOSITORY_URL = 'https://github.com/vluzrmos/windows-rdp-manager';
const AUTHOR = 'Vagner Luz do Carmo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { version, buildNumber, buildDate } = __APP_INFO__;
  const versionLabel = buildNumber !== null ? `v${version} (build ${buildNumber})` : `v${version} (desenvolvimento)`;
  const dateLabel = buildDate
    ? new Date(buildDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  const rows = [
    { icon: User, label: 'Autor', value: AUTHOR },
    { icon: Tag, label: 'Versão', value: versionLabel },
    { icon: Calendar, label: 'Data do build', value: dateLabel },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Sobre</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
          <div className="flex items-center gap-3">
            <img src={appIcon} alt="" className="w-12 h-12 shrink-0" />
            <div>
              <h4 className="text-base font-bold text-white">Windows RDP Manager</h4>
              <p className="text-[11px] text-slate-400">Gerenciador de perfis e conexões RDP para Windows</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg divide-y divide-slate-800">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-400">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </span>
                <span className="text-slate-200 font-mono select-text">{value}</span>
              </div>
            ))}
            <div className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <GitBranch className="w-3.5 h-3.5" />
                GitHub
              </span>
              <a
                href={REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline truncate"
              >
                vluzrmos/windows-rdp-manager
              </a>
            </div>
            <div className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <Scale className="w-3.5 h-3.5" />
                Licença
              </span>
              <a
                href={`${REPOSITORY_URL}/blob/main/LICENSE.md`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                MIT
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
