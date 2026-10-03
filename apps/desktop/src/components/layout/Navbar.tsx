import React, { useState } from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const Navbar: React.FC = () => {
  const { currentUser, openAuthModal, logout, initCloudSync, isCatalogLoading } = useHubStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
          GHOSTAE
        </h1>
        
        <button
          onClick={() => initCloudSync(true)}
          title="Sync Cloud Catalog & Licenses"
          disabled={isCatalogLoading}
          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 rounded-lg transition disabled:opacity-50 cursor-pointer ml-1"
        >
          <svg className={`w-3.5 h-3.5 ${isCatalogLoading ? 'animate-spin text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Center Draggable Spacer */}
      <div className="flex-1 h-full"></div>

      {/* Right User State - Non-Draggable */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2 shrink-0"
      >
        <div className="relative">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 px-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">
                  {currentUser.name ? currentUser.name.slice(0, 1).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">{currentUser.name}</span>
                <svg className="w-3 h-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-9 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 font-mono truncate">
                    {currentUser.email}
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition flex items-center gap-2 cursor-pointer mt-1"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-9c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H9v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#0d7eff] hover:bg-[#026be5] text-white text-xs font-bold rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
