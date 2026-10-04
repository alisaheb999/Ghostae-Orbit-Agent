import React, { useState } from 'react';
import { useHubStore, ScreenshotItem, FaqItem } from '../../stores/useHubStore';

export const ProductDetailView: React.FC = () => {
  const { 
    selectedProductDetail, 
    closeProductDetail, 
    installExtensionToCEP,
    uninstallExtensionFromCEP,
    launchInHost,
    showToast
  } = useHubStore();

  const [activeHostTab, setActiveHostTab] = useState<'ae' | 'pr'>('ae');
  const [lightboxImageIdx, setLightboxImageIdx] = useState<number | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [isShowcaseModalOpen, setIsShowcaseModalOpen] = useState(false);
  const [showcaseCategory, setShowcaseCategory] = useState<'all' | 'presets' | 'templates' | 'emojis'>('all');
  const [showcaseSearch, setShowcaseSearch] = useState('');

  if (!selectedProductDetail) return null;
  const product = selectedProductDetail;

  const isInstalling = product.isInstalling || false;
  const progress = product.installProgress || 0;

  // 1. Host-Specific Screenshots
  const aeScreenshots: ScreenshotItem[] = product.hostScreenshots?.ae && product.hostScreenshots.ae.length > 0
    ? product.hostScreenshots.ae
    : [
        { url: "https://i.postimg.cc/52ZfTR2W/ae1.png", title: "After Effects — Main Animation Browser" },
        { url: "https://i.postimg.cc/85z11v5k/ae2.png", title: "After Effects — Typography Presets" },
        { url: "https://i.postimg.cc/fRPV4kwh/ae3.png", title: "After Effects — Motion Titles" },
        { url: "https://i.postimg.cc/prgqjQG0/ae4.png", title: "After Effects — Kinetic Text Engine" },
        { url: "https://i.postimg.cc/J0vH8f7F/ae5.png", title: "After Effects — 3D Animated Emojis" },
        { url: "https://i.postimg.cc/c1nK2h88/ae6.png", title: "After Effects — Custom Easing Controller" },
        { url: "https://i.postimg.cc/y8m0Y76t/ae7.png", title: "After Effects — 1-Click Apply & Live Preview" }
      ];

  const prScreenshots: ScreenshotItem[] = product.hostScreenshots?.pr && product.hostScreenshots.pr.length > 0
    ? product.hostScreenshots.pr
    : [
        { url: "https://i.postimg.cc/0QvP2KSG/Screenshot-1.png", title: "Premiere Pro — Caption & Subtitle Generator" },
        { url: "https://i.postimg.cc/j2P7w5rX/Screenshot-2.png", title: "Premiere Pro — Social Media Titles" },
        { url: "https://i.postimg.cc/hGv5M6nZ/Screenshot-3.png", title: "Premiere Pro — Lower Thirds & Callouts" },
        { url: "https://i.postimg.cc/0jK0T8rC/Screenshot-4.png", title: "Premiere Pro — Fast Render Motion Packs" },
        { url: "https://i.postimg.cc/T3P8nJgQ/Screenshot-5.png", title: "Premiere Pro — Neon & Glitch Effects" },
        { url: "https://i.postimg.cc/8kv2X1hP/Screenshot-6.png", title: "Premiere Pro — Responsive MOGRT Controls" },
        { url: "https://i.postimg.cc/50tDkXG1/Screenshot-7.png", title: "Premiere Pro — 1-Click Timeline Insertion" }
      ];

  const currentGallery = activeHostTab === 'ae' ? aeScreenshots : prScreenshots;

  // 2. Showcase Items Definition
  const showcaseData = product.showcase || {
    presets_count: "110+",
    templates_count: "120+",
    emojis_count: "200+"
  };

  const sampleShowcaseCards = [
    {
      id: 'sc-1',
      title: 'Kinetic Typography Engine',
      category: 'presets' as const,
      tag: '110+ Presets',
      desc: 'স্মুথ স্লাইড, ইলাস্টিক বাউন্স ও কাইনেটিক মোশন ফিজিক্স।',
      gradient: 'from-blue-600/30 via-indigo-600/20 to-slate-900',
      accentColor: 'text-blue-400',
      icon: '⚡'
    },
    {
      id: 'sc-2',
      title: 'Auto Subtitle & Caption Styler',
      category: 'templates' as const,
      tag: '120+ Titles',
      desc: 'প্রিমিয়ার প্রো এবং আফটার ইফেক্টসে অটো সাবটাইটেল অ্যানিমেশন।',
      gradient: 'from-emerald-600/30 via-teal-600/20 to-slate-900',
      accentColor: 'text-emerald-400',
      icon: '📝'
    },
    {
      id: 'sc-3',
      title: 'Modern Social Media Lower Thirds',
      category: 'templates' as const,
      tag: 'Social Ready',
      desc: 'YouTube, Facebook, Reels ও Shorts-এর জন্য আল্ট্রা মডার্ন লোয়ার থার্ড।',
      gradient: 'from-purple-600/30 via-pink-600/20 to-slate-900',
      accentColor: 'text-purple-400',
      icon: '🎬'
    },
    {
      id: 'sc-4',
      title: 'Neon Glow & Cyberpunk Presets',
      category: 'presets' as const,
      tag: 'Vibrant FX',
      desc: 'ডাইনামিক ফ্লিকার, নিয়ন গ্লো এবং টেক গ্লিচ টেক্সট অ্যানিমেশন।',
      gradient: 'from-cyan-600/30 via-blue-600/20 to-slate-900',
      accentColor: 'text-cyan-400',
      icon: '✨'
    },
    {
      id: 'sc-5',
      title: '3D Animated Reactions & Emojis',
      category: 'emojis' as const,
      tag: '200+ 3D Emojis',
      desc: 'হাই-রেজুলেশন ৩ডি অ্যানিমেটেড ইমোজি কালেকশন।',
      gradient: 'from-amber-600/30 via-orange-600/20 to-slate-900',
      accentColor: 'text-amber-400',
      icon: '🔥'
    },
    {
      id: 'sc-6',
      title: 'Elastic Spring Bounce Lettering',
      category: 'presets' as const,
      tag: 'Smooth Physics',
      desc: 'প্রতিটি অক্ষরের জন্য ন্যাচারাল স্প্রিং বাউন্স ও ট্রানজিশন ইঞ্জিন।',
      gradient: 'from-rose-600/30 via-pink-600/20 to-slate-900',
      accentColor: 'text-rose-400',
      icon: '🎯'
    }
  ];

  const fullShowcaseLibrary = [
    ...sampleShowcaseCards,
    { id: 'sc-7', title: 'Minimal Corporate Titles', category: 'templates' as const, tag: 'Clean & Sharp', desc: 'ক্লিন কর্পোরেট ভিডিও টাইটেল ও লোয়ার থার্ড।', gradient: 'from-slate-700/40 to-slate-900', accentColor: 'text-slate-300', icon: '💼' },
    { id: 'sc-8', title: 'Glitch Text Distortion', category: 'presets' as const, tag: 'Cyberpunk', desc: 'অ্যালগরিদমিক সাইবারপাঙ্ক ও ভিএইচএস গ্লিচ টেক্সট।', gradient: 'from-fuchsia-600/30 to-slate-900', accentColor: 'text-fuchsia-400', icon: '👾' },
    { id: 'sc-9', title: 'Heart Pulse & Love Reactions', category: 'emojis' as const, tag: '3D Packs', desc: 'লাভ এবং হার্টবিট রিয়েকশন এনিমেশন।', gradient: 'from-red-600/30 to-slate-900', accentColor: 'text-red-400', icon: '💖' },
    { id: 'sc-10', title: 'Rocket Launch & Trending Badges', category: 'emojis' as const, tag: 'Viral Emojis', desc: 'রকেট স্পিড ও ভাইরাল সোশ্যাল ব্যাজ।', gradient: 'from-orange-600/30 to-slate-900', accentColor: 'text-orange-400', icon: '🚀' },
    { id: 'sc-11', title: 'Typewriter Sound Sync FX', category: 'presets' as const, tag: 'Classic Type', desc: 'স্মুথ কার্সার টাইপরাইটার অ্যানিমেশন।', gradient: 'from-sky-600/30 to-slate-900', accentColor: 'text-sky-400', icon: '⌨️' },
    { id: 'sc-12', title: 'Cinematic Movie Trailer Credits', category: 'templates' as const, tag: '4K Cinematic', desc: 'সিনেমাটিক ট্রেলার ও মুভি ক্রেডিটস টেমপ্লেট।', gradient: 'from-amber-700/30 to-slate-900', accentColor: 'text-amber-300', icon: '🎥' }
  ];

  const filteredShowcaseItems = fullShowcaseLibrary.filter(item => {
    const matchesCategory = showcaseCategory === 'all' || item.category === showcaseCategory;
    const matchesSearch = item.title.toLowerCase().includes(showcaseSearch.toLowerCase()) || item.desc.toLowerCase().includes(showcaseSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 3. Official FAQs
  const faqs: FaqItem[] = product.faq && product.faq.length > 0 ? product.faq : [
    {
      q: "এটা কি প্রিমিয়ার প্রো এবং আফটার ইফেক্টস দুইটাতেই কাজ করবে?",
      a: "হ্যাঁ, আফটার ইফেক্টস এবং প্রিমিয়ার প্রো দুটি সফটওয়্যারেই সম্পূর্ণ ফিচার কাজ করবে।"
    },
    {
      q: "কোন কোন ভার্সনে এটি সাপোর্ট করবে?",
      a: "Adobe Premiere Pro CC 2023 থেকে 2026+ এবং Adobe After Effects CC 2023 থেকে 2026+ যেকোনো ভার্সনে সরাসরি কাজ করে।"
    },
    {
      q: "ইন্সটল কীভাবে করতে হবে?",
      a: "অ্যাপের ভেতরে 'INSTALL' বাটনে ক্লিক করলেই এক ক্লিকে সরাসরি Adobe-এর অফিশিয়াল CEP ডিরেক্টরিতে ইন্সটল হয়ে যাবে। কোনো ম্যানুয়াল আনজিপ বা CMD স্ক্রিপ্ট চালাতে হবে না।"
    },
    {
      q: "ভবিষ্যতে কি কোনো নতুন আপডেট বা অ্যানিমেশন যুক্ত হবে?",
      a: "হ্যাঁ, আমরা নিয়মিত নতুন অ্যানিমেশন প্রিসেট এবং টেমপ্লেট যুক্ত করি। সমস্ত ভবিষ্যৎ আপডেট আপনি এই অ্যাপের ভেতর থেকেই ১-ক্লিকে ইনস্টল করতে পারবেন।"
    }
  ];

  const whatsappUrl = product.whatsappUrl || "https://chat.whatsapp.com/GhostaeVIP";

  const handleOpenExternal = (url: string, title?: string) => {
    if (typeof window !== 'undefined') {
      const desktop = window.ghostaeDesktop;
      if (desktop && typeof desktop.openExternal === 'function') {
        desktop.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    }
    if (title) showToast(`${title} ওপেন করা হয়েছে।`);
  };

  const nextLightboxImage = () => {
    if (lightboxImageIdx === null || currentGallery.length === 0) return;
    setLightboxImageIdx((lightboxImageIdx + 1) % currentGallery.length);
  };

  const prevLightboxImage = () => {
    if (lightboxImageIdx === null || currentGallery.length === 0) return;
    setLightboxImageIdx((lightboxImageIdx - 1 + currentGallery.length) % currentGallery.length);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafbfe] view-enter select-none pb-16">
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-8 space-y-10">
        
        {/* =========================================================
            1. TOP NAVIGATION & HERO ACTION BAR
        ========================================================= */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200/80">
          <button 
            onClick={closeProductDetail}
            className="group flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 transition shadow-2xs active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>Back to Store</span>
          </button>

          {/* Action Header Button */}
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
            ) : (
              <button
                onClick={() => installExtensionToCEP(product.id)}
                className="px-8 py-2.5 bg-[#0d7eff] hover:bg-[#026be5] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
                <span>INSTALL TO ADOBE</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================
            HERO CARD & IDENTITY OVERVIEW
        ========================================================= */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-white to-blue-50/40 p-7 sm:p-9 rounded-3xl border border-gray-200/90 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            
            {/* Identity & Host Badges */}
            <div className="flex items-start sm:items-center gap-6">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-22 h-22 rounded-2xl object-cover shadow-md border border-gray-200 shrink-0" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = './icon.png';
                  }}
                />
              ) : (
                <div className="w-22 h-22 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0d1b38] border border-blue-500/20 flex items-center justify-center shrink-0 shadow-md">
                  <img src="./icon.png" alt="Ghostae" className="w-12 h-12 object-contain" />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {product.name}
                  </h1>
                  
                  {/* Host Compatibility Badge */}
                  <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[11px] shadow-xs tracking-wide uppercase">
                    {product.targetHost === 'BOTH' || product.targetApp === 'dual' ? 'Dual Host (AE & Premiere Pro)' : product.targetHost === 'PPRO' ? 'Premiere Pro' : 'After Effects'}
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                    v{product.latestVersion || product.version}
                  </span>

                  {product.isInstalled && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Installed</span>
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 font-medium max-w-2xl leading-relaxed">
                  {product.shortDesc || product.tagline || 'After Effects ও Premiere Pro-এর জন্য আল্টিমেট টেক্সট ও ক্যাপশন ইঞ্জিন'}
                </p>

                <div className="flex items-center gap-3 pt-1 text-xs text-gray-500 font-medium">
                  <span>⚡ 1-Click Auto Installer</span>
                  <span>•</span>
                  <span>📁 Official Adobe CEP Directory</span>
                  <span>•</span>
                  <span>♾️ Free Lifetime Updates</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="shrink-0 w-full lg:w-auto">
              {!product.isInstalled ? (
                <button
                  onClick={() => installExtensionToCEP(product.id)}
                  disabled={isInstalling}
                  className="w-full lg:w-auto px-8 py-3 bg-[#0d7eff] hover:bg-[#026be5] text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>INSTALL NOW</span>
                </button>
              ) : (
                <button
                  onClick={() => launchInHost(product)}
                  className="w-full lg:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>LAUNCH IN ADOBE</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Animated Installation Progress Banner (when active) */}
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
                    <span>Installing {product.name} to Adobe CEP</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {progress}%
                    </span>
                  </h3>
                  <p className="text-xs text-blue-200/80 font-mono mt-0.5">
                    {product.installStatusText || 'Extracting extension to Adobe directory...'}
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

        {/* =========================================================
            2. "আপনি যা যা পাবেন" (WHAT YOU GET / SHOWCASE SECTION)
        ========================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0d7eff]"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d7eff]">
                  Feature Showcase
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                আপনি যা যা পাবেন (What You Get)
              </h2>
            </div>

            <button
              onClick={() => setIsShowcaseModalOpen(true)}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-[#0d7eff] hover:text-[#026be5] font-bold text-xs rounded-xl border border-blue-200/80 transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <span>সব দেখুন (View All)</span>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>

          {/* 3 Metric Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-[#0b1426] p-6 rounded-3xl border border-blue-500/30 text-white shadow-sm space-y-2 group hover:border-blue-400/50 transition">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/30">
                ⚡
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {showcaseData.presets_count}
              </div>
              <div className="font-extrabold text-sm text-blue-200">
                Premium Animations (Presets)
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                কাইনেটিক, বাউন্স, গ্লিচ ও মিনিমাল টেক্সট অ্যানিমেশন ইঞ্জিন।
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-900 via-slate-900 to-[#120e24] p-6 rounded-3xl border border-purple-500/30 text-white shadow-sm space-y-2 group hover:border-purple-400/50 transition">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-500/30">
                🎨
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {showcaseData.templates_count}
              </div>
              <div className="font-extrabold text-sm text-purple-200">
                Stylish Animations (Templates)
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                সোশ্যাল মিডিয়া লোয়ার থার্ড, মোশন টাইটেল ও সাবটাইটেল টেমপ্লেট।
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-900 via-slate-900 to-[#1c1408] p-6 rounded-3xl border border-amber-500/30 text-white shadow-sm space-y-2 group hover:border-amber-400/50 transition">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg border border-amber-500/30">
                ✨
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {showcaseData.emojis_count}
              </div>
              <div className="font-extrabold text-sm text-amber-200">
                Premium 3D Emojis
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                হাই-কোয়ালিটি ৩ডি অ্যানিমেটেড ইমোজি ও রিঅ্যাকশন কালেকশন।
              </p>
            </div>
          </div>

          {/* 2-Row x 3-Column Preview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sampleShowcaseCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setIsShowcaseModalOpen(true)}
                className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} p-6 rounded-3xl border border-white/10 hover:border-blue-400/50 transition-all duration-300 shadow-md group cursor-pointer hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{card.icon}</span>
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 font-bold ${card.accentColor} border border-white/10`}>
                    {card.tag}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors mb-2">
                  {card.title}
                </h3>

                <p className="text-xs text-gray-300/90 leading-relaxed mb-4">
                  {card.desc}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] font-bold text-blue-400 group-hover:text-white transition-colors">
                  <span>লাইভ প্রিভিউ দেখুন</span>
                  <svg className="w-3.5 h-3.5 fill-current transition-transform group-hover:translate-x-1" viewBox="0 0 24 24">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            3. SEGMENTED SCREENSHOTS GALLERY (AE vs PREMIERE PRO)
        ========================================================= */}
        <section className="bg-white p-7 sm:p-9 rounded-3xl border border-gray-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Official Interface Gallery
              </h3>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                প্যানেল ইন্টারফেস ও ওয়ার্কফ্লো স্ক্রিনশট
              </h2>
            </div>

            {/* Host Switcher Segmented Control */}
            <div className="inline-flex p-1 rounded-2xl bg-gray-100 border border-gray-200 shrink-0">
              <button
                onClick={() => setActiveHostTab('ae')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeHostTab === 'ae'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>After Effects ({aeScreenshots.length})</span>
              </button>

              <button
                onClick={() => setActiveHostTab('pr')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeHostTab === 'pr'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span>Premiere Pro ({prScreenshots.length})</span>
              </button>
            </div>
          </div>

          {/* Gallery Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 pt-2">
            {currentGallery.map((shot, idx) => (
              <div
                key={idx}
                onClick={() => setLightboxImageIdx(idx)}
                className="group relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-950 border border-gray-200 cursor-zoom-in shadow-2xs hover:shadow-xl transition-all duration-300 hover:border-[#0d7eff]/60 hover:-translate-y-1"
              >
                <img
                  src={shot.url}
                  alt={shot.title || `Screenshot ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.opacity = '0.5';
                  }}
                />
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 text-white">
                  <div className="self-end p-2 rounded-xl bg-white/20 backdrop-blur-md">
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold truncate drop-shadow-md">
                    {shot.title || `Preview ${idx + 1}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            4. INSTALLATION PROMISE SECTION
        ========================================================= */}
        <section className="bg-gradient-to-br from-[#0c1322] via-[#0f1b36] to-[#080d1a] p-8 sm:p-10 rounded-3xl border border-blue-500/30 text-white shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-xs border border-blue-500/30">
                <span>⚡ ১-ক্লিক ইনস্টলেশন ও আল্টিমেট ক্রিয়েটিভ প্রোডাকশন</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Adobe After Effects ও Premiere Pro এক্সটেনশন
              </h2>
              <p className="text-sm text-gray-300 max-w-2xl leading-relaxed">
                সরাসরি ইনস্টল বাটনে ক্লিক করলেই এক ক্লিকে অ্যাডোবির অফিশিয়াল ডিরেক্টরিতে এক্সটেনশন ডিপ্লয় হবে। সমস্ত ভবিষ্যৎ আপডেট এই অ্যাপ থেকে ১-ক্লিকেই ইনস্টল করা যাবে।
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center lg:items-end gap-3">
              {!product.isInstalled ? (
                <button
                  onClick={() => installExtensionToCEP(product.id)}
                  disabled={isInstalling}
                  className="px-8 py-3.5 bg-[#0d7eff] hover:bg-[#026be5] text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/30 transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>INSTALL EXTENSION NOW</span>
                </button>
              ) : (
                <button
                  onClick={() => launchInHost(product)}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <span>OPEN IN ADOBE</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            5. সাধারণ প্রশ্নাবলী (FAQ ACCORDION)
        ========================================================= */}
        <section className="bg-white p-7 sm:p-9 rounded-3xl border border-gray-200/90 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Frequently Asked Questions
            </h3>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              সাধারণ প্রশ্নাবলী (FAQ)
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 font-extrabold text-sm text-gray-900 hover:text-[#0d7eff] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 bg-blue-50 text-[#0d7eff]' : ''}`}>
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                      </svg>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed pl-1 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            6. WHATSAPP VIP COMMUNITY BANNER
        ========================================================= */}
        <section className="bg-gradient-to-r from-emerald-950 via-[#072418] to-slate-900 p-7 sm:p-9 rounded-3xl border border-emerald-500/30 text-white shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-3xl shadow-lg shrink-0">
                💬
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Join Ghostae VIP Editor Community on WhatsApp
                </h3>
                <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed max-w-xl">
                  নতুন অ্যানিমেশন আপডেট, টিউটোরিয়াল এবং তাৎক্ষণিক টেকনিক্যাল সাপোর্টের জন্য আমাদের অফিশিয়াল VIP কমিউনিটিতে যুক্ত হোন।
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenExternal(whatsappUrl, "Ghostae VIP WhatsApp Group")}
              className="px-7 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
            >
              <span>Join WhatsApp VIP Group</span>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </section>

      </div>

      {/* =========================================================
          FULLSCREEN LIGHTBOX MODAL
      ========================================================= */}
      {lightboxImageIdx !== null && currentGallery[lightboxImageIdx] && (
        <div 
          onClick={() => setLightboxImageIdx(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          {currentGallery.length > 1 && (
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

          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center justify-center"
          >
            <img 
              src={currentGallery[lightboxImageIdx].url} 
              alt={currentGallery[lightboxImageIdx].title || 'Screenshot'} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 flex items-center justify-between w-full px-2 text-white/90 text-xs">
              <span className="font-bold">{currentGallery[lightboxImageIdx].title || `Screenshot ${lightboxImageIdx + 1}`}</span>
              <span className="font-mono text-white/60">{lightboxImageIdx + 1} / {currentGallery.length}</span>
            </div>

            <button
              onClick={() => setLightboxImageIdx(null)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center font-bold text-sm shadow-xl hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {currentGallery.length > 1 && (
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

      {/* =========================================================
          "সব দেখুন" (VIEW ALL SHOWCASE MODAL)
      ========================================================= */}
      {isShowcaseModalOpen && (
        <div 
          onClick={() => setIsShowcaseModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="text-lg font-black text-white">
                  সম্পূর্ণ অ্যানিমেশন ও টেমপ্লেট লাইব্রেরি
                </h3>
                <p className="text-xs text-gray-400">
                  {showcaseData.presets_count} Presets • {showcaseData.templates_count} Templates • {showcaseData.emojis_count} 3D Emojis
                </p>
              </div>

              <button
                onClick={() => setIsShowcaseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="p-6 border-b border-white/10 bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-auto">
                <button
                  onClick={() => setShowcaseCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${showcaseCategory === 'all' ? 'bg-[#0d7eff] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  সব ({fullShowcaseLibrary.length})
                </button>
                <button
                  onClick={() => setShowcaseCategory('presets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${showcaseCategory === 'presets' ? 'bg-[#0d7eff] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  প্রিসেটস
                </button>
                <button
                  onClick={() => setShowcaseCategory('templates')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${showcaseCategory === 'templates' ? 'bg-[#0d7eff] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  টেমপ্লেটস
                </button>
                <button
                  onClick={() => setShowcaseCategory('emojis')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${showcaseCategory === 'emojis' ? 'bg-[#0d7eff] text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  ৩ডি ইমোজি
                </button>
              </div>

              <input
                type="text"
                value={showcaseSearch}
                onChange={(e) => setShowcaseSearch(e.target.value)}
                placeholder="অ্যানিমেশন খুঁজুন..."
                className="w-full sm:w-64 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-gray-500 focus:outline-hidden focus:border-blue-400"
              />
            </div>

            {/* Modal Cards Grid */}
            <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredShowcaseItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${item.gradient} border border-white/10 flex flex-col justify-between space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{item.icon}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 font-bold ${item.accentColor}`}>
                      {item.tag}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-xs text-white">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-gray-300 leading-snug mt-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-gray-400">
              <span>Ghostae Creative Suite Text Engine V2</span>
              <button
                onClick={() => setIsShowcaseModalOpen(false)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
