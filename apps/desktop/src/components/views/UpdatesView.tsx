import React from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const UpdatesView: React.FC = () => {
  const { updates, updateAllPending, installExtensionToCEP, products, currentUser, openAuthModal } = useHubStore();



  return (
    <div className="flex-1 overflow-y-auto bg-[#fafbfe] view-enter">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200/70">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Software Updates</h2>
            {updates.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {updates.length} Available
              </span>
            )}
          </div>

          {updates.length > 0 && (
            <button
              onClick={updateAllPending}
              className="text-xs font-bold bg-[#0d7eff] hover:bg-[#026be5] text-white px-3.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
              </svg>
              <span>Update All</span>
            </button>
          )}
        </div>

        {/* State: Empty or List */}
        {updates.length === 0 ? (
          <div className="p-16 text-center bg-white border border-gray-200/80 rounded-3xl space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold border border-emerald-100">
              ✓
            </div>
            <h3 className="font-bold text-gray-900 text-xs">All Extensions are Up to Date</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {updates.map((item) => {
              const product = products.find(p => p.id === item.productId);
              const isInstalling = product?.isInstalling || false;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 flex items-center justify-between gap-4 shadow-2xs hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200/80 shrink-0">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0c1324] to-[#101b33] flex items-center justify-center text-blue-400 font-bold font-mono text-xs select-none">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs text-gray-900 truncate">{item.name}</h3>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-mono">
                          {item.versionAvailable}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {item.notes || 'Performance improvements and bug fixes.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => installExtensionToCEP(item.productId)}
                    disabled={isInstalling}
                    className="px-4 py-2 bg-[#0d7eff] hover:bg-[#026be5] text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {isInstalling ? 'Updating...' : 'Update'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
