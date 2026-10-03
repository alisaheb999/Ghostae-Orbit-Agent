import React, { useState } from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const LicensesView: React.FC = () => {
  const { licenses, toggleLicenseStatus, showToast, currentUser, openAuthModal } = useHubStore();
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleCopyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    showToast("Copied!");
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const activeCount = licenses.filter(l => l.isEnabled).length;

  // Locked Guest State
  if (!currentUser) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 view-enter">
        <div className="bg-white border border-gray-200/80 rounded-3xl p-8 sm:p-10 shadow-xs space-y-4 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0d7eff] flex items-center justify-center mx-auto text-2xl border border-blue-100">
            🔒
          </div>
          <h3 className="font-extrabold text-gray-900 text-base sm:text-lg">
            Sign In Required
          </h3>
          <button
            onClick={openAuthModal}
            className="w-full py-2.5 bg-[#0d7eff] hover:bg-[#026be5] text-white font-bold text-xs rounded-xl shadow-md transition active:scale-98 cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto view-enter">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Licenses</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#0d7eff] border border-blue-100">
              {activeCount} Active
            </span>
          </div>
        </div>

        {/* Minimal Clean Licenses Grid or Empty State */}
        {licenses.length === 0 ? (
          <div className="p-16 text-center bg-white border border-gray-100 rounded-3xl space-y-2">
            <div className="text-2xl">🔑</div>
            <h3 className="font-bold text-gray-800 text-xs">No Active Licenses</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {licenses.map((lic) => {
              const isCopied = copiedKeyId === lic.id;

              return (
                <div 
                  key={lic.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white ${
                    lic.isEnabled 
                      ? 'border-gray-200 shadow-2xs' 
                      : 'border-gray-200/60 opacity-70 bg-gray-50/40'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Thumbnail + Product Name + Toggle */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {lic.image ? (
                          <img 
                            src={lic.image} 
                            alt={lic.productName} 
                            className="w-9 h-9 rounded-xl object-cover border border-gray-100 shrink-0" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c1324] to-[#101b33] border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 font-mono font-bold text-xs select-none">
                            {lic.productName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <h3 className="font-bold text-xs text-gray-900 truncate">{lic.productName}</h3>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => toggleLicenseStatus(lic.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          lic.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        title={lic.isEnabled ? 'Active on PC (Click to Deactivate)' : 'Deactivated (Click to Activate)'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            lic.isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Metadata Box */}
                    <div className="bg-gray-50 rounded-xl p-2.5 space-y-1.5 border border-gray-100 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Validity</span>
                        <span className="font-semibold text-gray-700">{lic.validityDaysText}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">HWID Device</span>
                        <span className="font-semibold text-gray-700">{lic.devices}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status</span>
                        <span className={`font-bold ${lic.isEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {lic.isEnabled ? 'Active on PC' : 'Deactivated'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* License Key Box with Copy Action */}
                  <div className="pt-2.5 mt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-gray-500 truncate select-all">
                      {lic.key ? `${lic.key.slice(0, 10)}••••••••` : 'KEY-REGISTERED'}
                    </span>
                    <button
                      onClick={() => handleCopyKey(lic.key, lic.id)}
                      className="px-2 py-0.5 text-[10.5px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      {isCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
