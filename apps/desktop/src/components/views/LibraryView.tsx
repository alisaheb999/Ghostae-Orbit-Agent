import React, { useState, useEffect } from 'react';
import { useHubStore, LocalInstalledExtension } from '../../stores/useHubStore';

export const LibraryView: React.FC = () => {
  const { 
    products, 
    launchInHost, 
    openProductDetail, 
    currentUser, 
    openAuthModal,
    installedCepList,
    isScanningCep,
    scanLocalCEPExtensions,
    uninstallLocalCEP,
    openLocalCEPFolder
  } = useHubStore();

  const [activeCategory, setActiveCategory] = useState<'all' | 'ghostae' | 'third_party'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmExt, setDeleteConfirmExt] = useState<LocalInstalledExtension | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    scanLocalCEPExtensions();
  }, [scanLocalCEPExtensions]);

  // Filter based on 3 categories & search
  const ghostaeCount = installedCepList.filter(e => e.isOfficial).length;
  const thirdPartyCount = installedCepList.filter(e => !e.isOfficial).length;

  const filteredList = installedCepList.filter((ext) => {
    if (activeCategory === 'ghostae' && !ext.isOfficial) return false;
    if (activeCategory === 'third_party' && ext.isOfficial) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ext.displayName.toLowerCase().includes(q) ||
        ext.folderName.toLowerCase().includes(q) ||
        ext.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteConfirmExt) return;
    setIsDeleting(true);
    await uninstallLocalCEP(deleteConfirmExt.folderName);
    setIsDeleting(false);
    setDeleteConfirmExt(null);
  };

  // Micro Adobe Host Badges (Very compact & clean)
  const renderMicroHostIcon = (host: string, key: number) => {
    const h = host.toUpperCase();
    if (h.includes('AE') || h.includes('FX')) {
      return (
        <span key={key} title="After Effects" className="w-4.5 h-4.5 rounded-md bg-[#00005B] text-[#9999FF] font-black text-[8px] flex items-center justify-center font-mono border border-[#9999FF]/40 shadow-2xs select-none">
          Ae
        </span>
      );
    }
    if (h.includes('PR') || h.includes('PPRO')) {
      return (
        <span key={key} title="Premiere Pro" className="w-4.5 h-4.5 rounded-md bg-[#330033] text-[#EA77FF] font-black text-[8px] flex items-center justify-center font-mono border border-[#EA77FF]/40 shadow-2xs select-none">
          Pr
        </span>
      );
    }
    if (h.includes('PH') || h.includes('PS')) {
      return (
        <span key={key} title="Photoshop" className="w-4.5 h-4.5 rounded-md bg-[#001E36] text-[#31A8FF] font-black text-[8px] flex items-center justify-center font-mono border border-[#31A8FF]/40 shadow-2xs select-none">
          Ps
        </span>
      );
    }
    if (h.includes('ILST') || h.includes('AI')) {
      return (
        <span key={key} title="Illustrator" className="w-4.5 h-4.5 rounded-md bg-[#330000] text-[#FF9A00] font-black text-[8px] flex items-center justify-center font-mono border border-[#FF9A00]/40 shadow-2xs select-none">
          Ai
        </span>
      );
    }
    return (
      <span key={key} title={host} className="px-1 h-4.5 rounded-md bg-slate-800 text-slate-300 font-bold text-[8px] flex items-center justify-center font-mono select-none">
        {host.slice(0, 2)}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto view-enter">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 space-y-6">
        
        {/* Top Bar: Title + 3 Categories + Search & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
          
          {/* 3 Categories: All, Ghostae, Third-Party */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All ({installedCepList.length})
            </button>

            <button
              onClick={() => setActiveCategory('ghostae')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeCategory === 'ghostae'
                  ? 'bg-white text-[#0d7eff] shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0d7eff]"></span>
              <span>Ghostae ({ghostaeCount})</span>
            </button>

            <button
              onClick={() => setActiveCategory('third_party')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeCategory === 'third_party'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Third-Party ({thirdPartyCount})
            </button>
          </div>

          {/* Search & Header Icon Actions */}
          <div className="flex items-center gap-2">
            <div className="relative w-40 sm:w-52">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 pl-8 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#0d7eff] shadow-2xs transition"
              />
              <svg className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>

            <button
              onClick={() => scanLocalCEPExtensions()}
              disabled={isScanningCep}
              title="Rescan extensions"
              className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-60"
            >
              <svg className={`w-4 h-4 ${isScanningCep ? 'animate-spin text-[#0d7eff]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={() => openLocalCEPFolder()}
              title="Open CEP Folder"
              className="p-2 bg-[#0d7eff] hover:bg-[#026be5] text-white rounded-xl transition shadow-xs cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 2 Wide Horizontal Columns per Row (Spacious & Generous Shapes) */}
        {filteredList.length === 0 ? (
          <div className="p-20 text-center bg-white border border-gray-200/80 rounded-3xl space-y-2">
            <div className="text-3xl">📦</div>
            <h3 className="font-bold text-gray-800 text-sm">No Extensions Found</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredList.map((ext) => {
              const matchingProduct = products.find(p => 
                p.cepFolderName === ext.folderName || 
                p.slug === ext.folderName ||
                p.slug === ext.id
              );

              return (
                <div 
                  key={ext.folderName}
                  className="p-6 rounded-3xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]"
                >
                  {/* Card Content Row */}
                  <div className="flex items-start justify-between gap-4">
                    
                    {/* Left: Thumbnail / Icon + Name + Bottom Metadata Row */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {matchingProduct && matchingProduct.image ? (
                        <img 
                          src={matchingProduct.image} 
                          alt={ext.displayName} 
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-gray-100 shrink-0 shadow-2xs" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = './icon.png';
                            (e.target as HTMLImageElement).className = 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-3 object-contain bg-slate-900 grayscale opacity-40 border border-slate-800 shrink-0 shadow-2xs';
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <img src="./icon.png" alt="Ghostae" className="w-8 h-8 grayscale opacity-40 object-contain" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-2 flex-1">
                        {/* 1st Line: Clean Extension Name Only (NO version here) */}
                        <div>
                          <h3 
                            onClick={() => matchingProduct && openProductDetail(matchingProduct)}
                            className={`font-extrabold text-sm sm:text-base text-gray-900 tracking-tight truncate ${
                              matchingProduct ? 'hover:text-[#0d7eff] cursor-pointer' : ''
                            }`}
                            title={ext.displayName}
                          >
                            {ext.displayName}
                          </h3>
                        </div>

                        {/* 2nd / Bottom Line: Version + Adobe Host Badges */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200/60 shrink-0">
                            v{ext.version}
                          </span>

                          <div className="h-3 w-px bg-gray-200 shrink-0"></div>

                          {/* Micro Adobe Host Logos */}
                          <div className="flex items-center gap-1">
                            {ext.hosts && ext.hosts.length > 0 ? (
                              ext.hosts.map((h, i) => renderMicroHostIcon(h, i))
                            ) : (
                              renderMicroHostIcon('AE', 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Clean Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-1">
                      {matchingProduct && (
                        <button
                          onClick={() => launchInHost(matchingProduct)}
                          title="Launch in Adobe"
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                          <span>Launch</span>
                        </button>
                      )}

                      <button
                        onClick={() => openLocalCEPFolder(ext.fullPath)}
                        title="Open in Windows Explorer"
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition cursor-pointer active:scale-95"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                        </svg>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmExt(ext)}
                        title="Delete Extension"
                        className="p-2.5 bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 rounded-xl transition cursor-pointer active:scale-95"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Clean Delete Confirmation Modal */}
      {deleteConfirmExt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl mx-auto">
              🗑️
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-gray-900 text-sm">
                Remove Extension?
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {deleteConfirmExt.displayName}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmExt(null)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
