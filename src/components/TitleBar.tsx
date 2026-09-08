import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X, ShieldCheck } from 'lucide-react';
import appIcon from '../assets/icon.png';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.rdpApi?.isMaximized) {
        const max = await window.rdpApi.isMaximized();
        setIsMaximized(max);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = () => window.rdpApi?.minimizeWindow();
  const handleMaximize = async () => {
    window.rdpApi?.maximizeWindow();
    if (window.rdpApi?.isMaximized) {
      const max = await window.rdpApi.isMaximized();
      setIsMaximized(max);
    }
  };
  const handleClose = () => window.rdpApi?.closeWindow();

  return (
    <header className="h-10 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-3 select-none titlebar-drag z-50">
      {/* Brand & Title */}
      <div className="flex items-center gap-2.5">
        <img
          src={appIcon}
          alt="Windows RDP Manager"
          className="w-5 h-5 rounded object-contain shadow-sm"
        />
        <span className="text-xs font-semibold text-slate-200 tracking-wide">
          Windows RDP Manager
        </span>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-[10px] text-blue-400 font-medium">
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          <span>DPAPI Protegido</span>
        </div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center titlebar-no-drag">
        <button
          onClick={handleMinimize}
          className="w-9 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Minimizar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-9 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-9 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
