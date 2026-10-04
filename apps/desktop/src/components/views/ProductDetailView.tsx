import React from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const ProductDetailView: React.FC = () => {
  const { 
    selectedProductDetail, 
    closeProductDetail, 
    installExtensionToCEP,
    uninstallExtensionFromCEP,
    launchInHost,
    showToast
  } = useHubStore();

  if (!selectedProductDetail) return null;
  const product = selectedProductDetail;

  const isInstalling = Boolean(product.isInstalling);
  const isInstalled = Boolean(product.isInstalled);
  const progress = isInstalling ? (product.installProgress || 0) : (isInstalled ? 100 : 0);

  const isPremiere = product.targetHost === 'PPRO' || product.category?.toLowerCase().includes('premiere');
  const isAE = product.targetHost === 'AE' || product.category?.toLowerCase().includes('after');
  const isDual = product.targetHost === 'BOTH' || product.targetApp === 'dual' || (isPremiere && isAE);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 view-enter select-none pb-16">
      {/* Sticky Header with Back Button and Live Status */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button 
            type="button" 
            onClick={closeProductDetail}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:text-slate-900 transition-all shadow-xs focus:outline-none cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Store</span>
          </button>

          {/* Minimal Live Status Badge */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${
            isInstalling 
              ? 'bg-blue-50/80 border-blue-200 text-blue-700' 
              : isInstalled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : product.hasUpdate 
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <span className="relative flex h-2 w-2">
              {isInstalling && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isInstalling 
                  ? 'bg-blue-600' 
                  : isInstalled 
                    ? 'bg-emerald-600' 
                    : product.hasUpdate 
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
              }`}></span>
            </span>
            <span>
              {isInstalling 
                ? 'Installing extension' 
                : isInstalled 
                  ? 'Installed' 
                  : product.hasUpdate 
                    ? 'Update available'
                    : 'Ready to install'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col gap-6 justify-center">
        
        {/* Card 1: Extension Details (Clean White Card) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            
            {/* Left: Product Identity */}
            <div className="flex items-start sm:items-center gap-6">
              {/* Dark App Icon for High Contrast */}
              <div className="relative shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-black p-3 shadow-md flex items-center justify-center">
                <svg className="w-9 h-9 text-white drop-shadow-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>

              {/* Title, Host Badge & Subtitle */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
                    {product.name}
                  </h1>
                  
                  {/* Clean Adobe Host Badges */}
                  {(isPremiere || isDual) && (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#00005b] border border-[#333399]/40 shadow-2xs" title="Adobe Premiere Pro">
                      <span className="text-[11px] font-black text-[#9999ff] tracking-tighter select-none">Pr</span>
                    </div>
                  )}
                  {(isAE || isDual) && (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#00005b] border border-[#333399]/40 shadow-2xs" title="Adobe After Effects">
                      <span className="text-[11px] font-black text-[#9999ff] tracking-tighter select-none">Ae</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                  {product.shortDesc || product.description || 'After Effects ও Premiere Pro-এর জন্য আল্টিমেট টেক্সট ও ক্যাপশন ইঞ্জিন।'}
                </p>

                {/* Version metadata */}
                <div className="pt-1 flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    v{product.latestVersion || product.version} Stable Release
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Primary Action Button */}
            <div className="flex items-center sm:self-center">
              {isInstalling ? (
                <button 
                  type="button" 
                  disabled
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-600/20 cursor-wait"
                >
                  <svg className="animate-spin -ml-0.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Installing...</span>
                </button>
              ) : isInstalled ? (
                <button 
                  type="button" 
                  onClick={() => launchInHost(product)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-black hover:bg-slate-800 text-white text-sm font-semibold shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>Open in {isPremiere ? 'Premiere' : 'After Effects'}</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => installExtensionToCEP(product.id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all focus:outline-none cursor-pointer active:scale-95"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>Install</span>
                </button>
              )}
            </div>

          </div>
        </section>

        {/* Card 2: Installation Progress & Metrics (Unified White & Blue Theme) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-6">
          
          {/* Progress Bar & Stage Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  isInstalling 
                    ? 'bg-blue-600 animate-pulse' 
                    : isInstalled 
                      ? 'bg-emerald-500' 
                      : 'bg-slate-300'
                }`}></div>
                <span className="text-sm font-semibold text-slate-900">
                  {isInstalling 
                    ? (product.installStatusText || `Downloading & Installing ${product.name}...`)
                    : isInstalled 
                      ? 'Installation Completed Successfully'
                      : `Ready to Install ${product.name}`}
                </span>
              </div>
              <span className="text-base font-bold font-mono text-blue-600">
                {progress}%
              </span>
            </div>

            {/* Clean Progress Bar Track */}
            <div className="relative w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
              <div 
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  isInstalled ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="text-xs text-slate-500 pt-0.5">
              <span>
                {isInstalling 
                  ? (progress < 90 ? 'Streaming package chunks from Ghostae CDN' : 'Writing binaries to Adobe CEP directory')
                  : isInstalled 
                    ? `Extension is ready to launch in Adobe ${isPremiere ? 'Premiere Pro' : 'After Effects'}`
                    : '1-Click direct deployment into Adobe CEP extension folder'}
              </span>
            </div>
          </div>

          {/* Telemetry Grid: 3 Clean Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            
            {/* Transfer Speed */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase block mb-1">
                Transfer Speed
              </span>
              <span className="text-sm font-mono font-semibold text-slate-900">
                {isInstalling ? (product.downloadSpeed || 'Calculating...') : isInstalled ? 'Complete' : '0 MB/s'}
              </span>
            </div>

            {/* Downloaded */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase block mb-1">
                Transferred
              </span>
              <span className="text-sm font-mono font-semibold text-slate-900">
                {isInstalling 
                  ? (product.downloadedMB && product.totalMB ? `${product.downloadedMB} / ${product.totalMB}` : 'Calculating...')
                  : isInstalled ? 'Verified (CEP)' : '-- / --'}
              </span>
            </div>

            {/* Time Remaining */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase block mb-1">
                Time Left
              </span>
              <span className="text-sm font-mono font-semibold text-slate-900">
                {isInstalling ? (product.downloadEta || 'Calculating...') : isInstalled ? '0 sec' : '--'}
              </span>
            </div>

          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-400 font-mono">
              Target: %APPDATA%\Adobe\CEP\extensions\{product.cepFolderName}
            </div>

            <div className="flex items-center gap-2">
              {isInstalled ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => installExtensionToCEP(product.id)}
                    disabled={isInstalling}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    Reinstall
                  </button>
                  <button 
                    type="button" 
                    onClick={() => uninstallExtensionFromCEP(product.id)}
                    disabled={isInstalling}
                    className="px-3.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer active:scale-95"
                  >
                    Uninstall
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={() => installExtensionToCEP(product.id)}
                  disabled={isInstalling}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer active:scale-95"
                >
                  Install Now
                </button>
              )}
            </div>
          </div>

        </section>

      </main>
    </div>
  );
};
