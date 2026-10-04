import React from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const Navbar: React.FC = () => {
  const { initCloudSync, isCatalogLoading } = useHubStore();

  return (
    <header 
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="h-11 bg-[#0d111c] border-b border-slate-800/80 px-4 pr-36 flex items-center justify-between select-none shrink-0 z-30"
    >
      {/* Brand & Sync Icon - Non-Draggable */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2.5"
      >
        <img 
          src="./icon.png" 
          alt="Ghostae Logo" 
          className="w-6 h-6 rounded-lg object-cover shadow-xs border border-slate-700/60"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://ghostae.com/favicon.svg';
          }}
        />
        <h1 className="text-xs font-black tracking-tight bg-gradient-to-r from-white via-blue-200 to-cyan-400 bg-clip-text text-transparent">
          GHOSTAE CREATIVE SUITE
        </h1>
        
        <button
          onClick={() => initCloudSync(true)}
          title="Sync Cloud Extensions"
          disabled={isCatalogLoading}
          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 rounded-lg transition disabled:opacity-50 cursor-pointer ml-1.5 flex items-center gap-1.5"
        >
          <svg className={`w-3.5 h-3.5 ${isCatalogLoading ? 'animate-spin text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[10px] font-mono text-slate-400">Sync</span>
        </button>
      </div>

      {/* Center Draggable Spacer */}
      <div className="flex-1 h-full"></div>

      {/* Right Indicator - Non-Draggable */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2 shrink-0 text-slate-400 text-xs font-medium"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[11px] text-slate-300 font-mono">Adobe CEP Installer</span>
      </div>
    </header>
  );
};
