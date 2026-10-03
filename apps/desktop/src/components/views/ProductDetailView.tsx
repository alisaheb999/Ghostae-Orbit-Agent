import React, { useState } from 'react';
import { useHubStore, TutorialItem } from '../../stores/useHubStore';

export const ProductDetailView: React.FC = () => {
  const { 
    selectedProductDetail, 
    closeProductDetail, 
    openCheckout, 
    installExtensionToCEP,
    uninstallExtensionFromCEP,
    launchInHost,
    showToast
  } = useHubStore();

  const [lightboxImageIdx, setLightboxImageIdx] = useState<number | null>(null);

  if (!selectedProductDetail) return null;
  const product = selectedProductDetail;

  const isInstalling = product.isInstalling || false;
  const progress = product.installProgress || 0;

  // Prepare screenshots list (use server screenshots or default product image)
  const screenshots = product.screenshots && product.screenshots.length > 0 
    ? product.screenshots 
    : (product.image ? [{ url: product.image, title: `${product.name} Workflow Preview` }] : []);

  // Prepare tutorials (supports cloud tutorials or smart defaults for the extension)
  const tutorials: TutorialItem[] = product.tutorials && product.tutorials.length > 0
    ? product.tutorials
    : [
        {
          id: 'tut-1',
          title: `Getting Started & Quick Setup Guide`,
          url: `https://ghostae.com/tutorials/${product.slug}/getting-started`,
          duration: '3:20 min',
          thumbnail: product.image || ''
        },
        {
          id: 'tut-2',
          title: `Full Workflow, Animation & Features Overview`,
          url: `https://ghostae.com/tutorials/${product.slug}/workflow`,
          duration: '5:45 min',
          thumbnail: product.image || ''
        },
        {
          id: 'tut-3',
          title: `Mastering Presets, Typography & Styles`,
          url: `https://ghostae.com/tutorials/${product.slug}/pro-tips`,
          duration: '4:10 min',
          thumbnail: product.image || ''
        }
      ];

  const handleOpenTutorial = (tut: TutorialItem) => {
    if (typeof window !== 'undefined') {
      const desktop = window.ghostaeDesktop;
      if (desktop && typeof desktop.openExternal === 'function') {
        desktop.openExternal(tut.url);
      } else {
        window.open(tut.url, '_blank');
      }
    }
    showToast(`টিউটোরিয়াল লিংক ব্রাউজারে ওপেন করা হয়েছে: ${tut.title}`);
  };

  const nextLightboxImage = () => {
    if (lightboxImageIdx === null || screenshots.length === 0) return;
    setLightboxImageIdx((lightboxImageIdx + 1) % screenshots.length);
  };

  const prevLightboxImage = () => {
    if (lightboxImageIdx === null || screenshots.length === 0) return;
    setLightboxImageIdx((lightboxImageIdx - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafbfe] view-enter select-none">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-8 space-y-8">
        
        {/* Top Navigation & Action Header */}
        <div className="flex items-center justify-between pb-5 border-b border-gray-200/80">
          <button 
            onClick={closeProductDetail}
            className="group flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>Back to Store</span>
          </button>

          {/* Action Buttons: Open in Adobe / Install / Buy Now */}
          <div className="flex items-center gap-3">
            {product.isInstalled ? (
              <div className="flex items-center gap-2.5">
                {product.hasUpdate && (
                  <button
                    onClick={() => installExtensionToCEP(product.id)}
                    disabled={isInstalling}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                    </svg>
                    <span>UPDATE TO v{product.latestVersion || product.version}</span>
                  </button>
                )}

                <button
                  onClick={() => launchInHost(product)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>OPEN IN ADOBE</span>
                </button>

                <button
                  onClick={() => uninstallExtensionFromCEP(product.id)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                  title="Uninstall Extension"
                >
                  Uninstall
                </button>
              </div>
            ) : isInstalling ? (
              <div className="flex items-center gap-3 bg-blue-50/90 border border-blue-200 px-4 py-2 rounded-xl shadow-xs">
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#0d7eff] animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">Downloading...</span>
                    <span className="text-xs font-mono font-bold text-[#0d7eff]">{progress}%</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
                    {product.installStatusText || 'Preparing CEP...'}
                  </span>
                </div>
              </div>
            ) : !product.isOwned && !product.isFree ? (
              <button
                onClick={() => openCheckout(product)}
                className="px-7 py-2.5 bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                <span>BUY NOW — {product.priceBDT} BDT</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {product.isOwned && !product.isFree && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>✓ PURCHASED</span>
                  </span>
                )}
                <button
                  onClick={() => installExtensionToCEP(product.id)}
                  className="px-8 py-2.5 bg-[#0d7eff] hover:bg-[#026be5] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>INSTALL</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Product Identity Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center gap-5">
            {product.image ? (
              <img 
                src={product.image} 
                alt={product.name}
                className="w-20 h-20 rounded-2xl object-cover shadow-2xs border border-gray-200/80 shrink-0" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = './icon.png';
                  (e.target as HTMLImageElement).className = 'w-20 h-20 rounded-2xl p-4 object-contain bg-slate-900 grayscale opacity-40 border border-slate-700 shrink-0';
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
                <img src="./icon.png" alt="Ghostae" className="w-10 h-10 grayscale opacity-40 object-contain" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{product.name}</h1>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0d7eff] font-mono text-xs font-bold border border-blue-100">
                  v{product.version}
                </span>
                {product.hasUpdate && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                    Update v{product.latestVersion}
                  </span>
                )}
                {product.isInstalled && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-100">
                    ✓ Installed
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {product.category} • Ghostae Creative Suite
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-black text-gray-900 font-mono">
              {product.isFree ? 'Free' : `${product.priceBDT} BDT`}
            </div>
            <div className="text-[11px] text-gray-400 font-medium">Lifetime License</div>
          </div>
        </div>

        {/* Animated Installation Banner */}
        {isInstalling && (
          <div className="bg-gradient-to-r from-blue-900/90 via-[#0d162b] to-slate-900 p-6 rounded-3xl border border-blue-500/30 shadow-lg text-white space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-[#38bdf8] flex items-center justify-center font-bold text-base border border-blue-500/30">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Installing {product.name} to Adobe</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {progress}%
                    </span>
                  </h3>
                  <p className="text-xs text-blue-200/80 font-mono mt-0.5">
                    {product.installStatusText || 'Connecting to Ghostae Cloud & deploying CEP...'}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="bg-gradient-to-r from-[#0d7eff] via-cyan-400 to-[#0d7eff] h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.max(5, progress)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Main Content Grid: Description/Release Notes (Left 65%) + Clean Specs (Right 35%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Description & Release Notes */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Overview
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {product.description || `${product.name} official extension for Adobe After Effects and Premiere Pro.`}
              </p>
            </div>

            {product.changelog && (
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Release Notes (v{product.latestVersion || product.version})
                </h3>
                <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed font-mono bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  {product.changelog}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Clean Specs (No hardcoded demo info) */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
              <h4 className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2">
                <svg className="w-4 h-4 text-[#0d7eff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Compatibility & Information</span>
              </h4>

              <div className="divide-y divide-gray-100 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Category</span>
                  <span className="font-bold text-gray-900">{product.category}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Adobe Compatibility</span>
                  <span className="font-bold text-[#0d7eff]">2023 → 2026+ (Latest)</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Platform</span>
                  <span className="font-bold text-gray-900">Windows 10/11 & macOS</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">License Type</span>
                  <span className="font-bold text-emerald-600">Lifetime Workstation License</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Microsoft Store Style Screenshots Section (3 Large per row with click to zoom) */}
        {screenshots.length > 0 && (
          <section className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Product Screenshots & Interface
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#0d7eff] font-bold">
                  {screenshots.length} Images
                </span>
              </div>
              <span className="text-xs text-gray-400">Click any image to zoom</span>
            </div>

            {/* 3 Columns Grid of Large Screenshots */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
              {screenshots.map((shot, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxImageIdx(idx)}
                  className="group relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-900 border border-gray-200 cursor-zoom-in shadow-2xs hover:shadow-xl transition-all duration-300 hover:border-[#0d7eff]/60 hover:-translate-y-1"
                >
                  <img
                    src={shot.url}
                    alt={shot.title || `Screenshot ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Subtle Hover Overlay with Zoom Icon */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 text-white">
                    <div className="self-end p-2 rounded-xl bg-white/20 backdrop-blur-md">
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-bold truncate drop-shadow-md">{shot.title || `Screenshot ${idx + 1}`}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Video Tutorials Section (16:9 YouTube Aspect Ratio Thumbnails) */}
        <section className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <h3 className="font-extrabold text-gray-900 text-sm tracking-tight">
                Tutorials & Video Guides
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {tutorials.length} Video Guides
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
            {tutorials.map((tut, idx) => (
              <div
                key={tut.id || idx}
                onClick={() => handleOpenTutorial(tut)}
                className="rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-[#0d7eff]/50 transition-all shadow-2xs hover:shadow-xl cursor-pointer group flex flex-col justify-between hover:-translate-y-1"
              >
                {/* 16:9 YouTube Standard Aspect Ratio Video Frame */}
                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                  {tut.thumbnail ? (
                    <img 
                      src={tut.thumbnail} 
                      alt={tut.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-95" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* YouTube Play Icon Button */}
                  <div className="absolute w-12 h-12 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 drop-shadow-md">
                    <svg className="w-5 h-5 fill-white ml-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>

                  {/* Duration Badge */}
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 text-white font-mono text-[10px] font-bold">
                    {tut.duration || 'Video Guide'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider block mb-1">
                      Lesson 0{idx + 1}
                    </span>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#0d7eff] transition-colors leading-snug line-clamp-2">
                      {tut.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-[#0d7eff] pt-2 border-t border-gray-100">
                    <span>Watch Tutorial</span>
                    <svg className="w-3.5 h-3.5 fill-current transition-transform group-hover:translate-x-1" viewBox="0 0 24 24">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Fullscreen Microsoft Store Style Lightbox Zoom Modal */}
      {lightboxImageIdx !== null && screenshots[lightboxImageIdx] && (
        <div 
          onClick={() => setLightboxImageIdx(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          {/* Previous Arrow */}
          {screenshots.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevLightboxImage();
              }}
              className="absolute left-6 w-12 h-12 rounded-full bg-white/15 hover:bg-white text-white hover:text-gray-900 flex items-center justify-center transition cursor-pointer z-10"
              title="Previous Screenshot"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
          )}

          {/* Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center justify-center"
          >
            <img 
              src={screenshots[lightboxImageIdx].url} 
              alt={screenshots[lightboxImageIdx].title || 'Screenshot'} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 flex items-center justify-between w-full px-2 text-white/90 text-xs">
              <span className="font-bold">{screenshots[lightboxImageIdx].title || `Screenshot ${lightboxImageIdx + 1}`}</span>
              <span className="font-mono text-white/60">{lightboxImageIdx + 1} / {screenshots.length}</span>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setLightboxImageIdx(null)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold text-sm shadow-xl hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Next Arrow */}
          {screenshots.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextLightboxImage();
              }}
              className="absolute right-6 w-12 h-12 rounded-full bg-white/15 hover:bg-white text-white hover:text-gray-900 flex items-center justify-center transition cursor-pointer z-10"
              title="Next Screenshot"
            >
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
          )}
        </div>
      )}

    </div>
  );
};
