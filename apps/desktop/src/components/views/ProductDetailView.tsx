import React, { useState } from 'react';
import { useHubStore, FaqItem } from '../../stores/useHubStore';

export const ProductDetailView: React.FC = () => {
  const { 
    selectedProductDetail, 
    closeProductDetail, 
    installExtensionToCEP,
    uninstallExtensionFromCEP,
    launchInHost,
    showToast
  } = useHubStore();

  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  if (!selectedProductDetail) return null;
  const product = selectedProductDetail;

  const isInstalling = product.isInstalling || false;
  const progress = product.installProgress || 0;

  // Features list
  const defaultFeatures = [
    {
      title: '110+ Premium Motion Presets',
      desc: 'কাইনেটিক টাইপোগ্রাফি, ইলাস্টিক বাউন্স, নিয়ন গ্লো এবং টেক গ্লিচ টেক্সট অ্যানিমেশন ইঞ্জিন।',
      icon: '⚡',
      badge: 'Presets'
    },
    {
      title: '120+ Stylish Video Templates',
      desc: 'সোশ্যাল মিডিয়া লোয়ার থার্ড, মোশন টাইটেল এবং প্রিমিয়ার প্রো অটো সাবটাইটেল টেমপ্লেট।',
      icon: '🎬',
      badge: 'Templates'
    },
    {
      title: '200+ 3D Animated Emojis',
      desc: 'আল্ট্রা হাই-রেজুলেশন ৩ডি অ্যানিমেটেড ইমোজি ও সোশ্যাল রিঅ্যাকশন কালেকশন।',
      icon: '🔥',
      badge: '3D Packs'
    },
    {
      title: '1-Click Apply & Live Easing',
      desc: 'সরাসরি সিলেক্ট করে এক ক্লিকে টাইমলাইনে অ্যাপ্লাই এবং স্মুথ ইজিং কন্ট্রোলার।',
      icon: '🎯',
      badge: 'Workflow'
    },
    {
      title: 'Auto Subtitle & Caption Styler',
      desc: 'ইউটিউব, রিলস ও শর্টসের জন্য ট্রেন্ডিং সাবটাইটেল ও ক্যাপশন স্টাইলিং ইঞ্জিন।',
      icon: '📝',
      badge: 'Social Ready'
    },
    {
      title: 'Dual Host Integration (AE + PR)',
      desc: 'Adobe After Effects ও Premiere Pro CC 2023 থেকে 2026+ সব ভার্সনে সরাসরি কাজ করে।',
      icon: '💻',
      badge: 'Dual Host'
    }
  ];

  const featuresToDisplay = (product.features && product.features.length > 0)
    ? product.features.map((f, i) => ({
        title: f.title,
        desc: f.desc,
        icon: defaultFeatures[i % defaultFeatures.length].icon,
        badge: defaultFeatures[i % defaultFeatures.length].badge
      }))
    : defaultFeatures;

  // FAQs
  const faqs: FaqItem[] = product.faq && product.faq.length > 0 ? product.faq : [
    {
      q: "এটা কি প্রিমিয়ার প্রো এবং আফটার ইফেক্টস দুইটাতেই কাজ করবে?",
      a: "হ্যাঁ, আফটার ইফেক্টস এবং প্রিমিয়ার প্রো দুটি সফটওয়্যারেই সম্পূর্ণ এক্সটেনশন সরাসরি কাজ করে।"
    },
    {
      q: "কোন কোন ভার্সনে এটি সাপোর্ট করবে?",
      a: "Adobe Premiere Pro CC 2023 থেকে 2026+ এবং Adobe After Effects CC 2023 থেকে 2026+ যেকোনো ভার্সনে সাপোর্ট করে।"
    },
    {
      q: "ইন্সটল কীভাবে করতে হবে?",
      a: "অ্যাপের ভেতর 'INSTALL TO ADOBE' বাটনে ক্লিক করলেই এক ক্লিকে সরাসরি Adobe-এর অফিশিয়াল CEP ডিরেক্টরিতে ইন্সটল হয়ে যাবে। কোনো ম্যানুয়াল আনজিপ বা ফাইল সরানো লাগবে না।"
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafbfe] view-enter select-none pb-16">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
        
        {/* =========================================================
            1. TOP NAVIGATION
        ========================================================= */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
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
            ) : (
              <button
                onClick={() => installExtensionToCEP(product.id)}
                disabled={isInstalling}
                className="px-7 py-2.5 bg-[#0d7eff] hover:bg-[#026be5] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                </svg>
                <span>{isInstalling ? 'DOWNLOADING...' : 'INSTALL TO ADOBE'}</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================
            2. HERO CARD & OVERVIEW
        ========================================================= */}
        <div className="relative overflow-hidden bg-white p-7 sm:p-8 rounded-3xl border border-gray-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            
            <div className="flex items-start sm:items-center gap-5">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border border-gray-200 shrink-0" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = './icon.png';
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-900 to-[#0d1b38] border border-blue-500/20 flex items-center justify-center shrink-0 shadow-md">
                  <img src="./icon.png" alt="Ghostae" className="w-10 h-10 object-contain" />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    {product.name}
                  </h1>
                  
                  <span className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[10px] shadow-xs tracking-wide uppercase">
                    {product.targetHost === 'BOTH' || product.targetApp === 'dual' ? 'Dual Host (AE & PR)' : product.targetHost === 'PPRO' ? 'Premiere Pro' : 'After Effects'}
                  </span>

                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                    v{product.latestVersion || product.version}
                  </span>

                  {product.isInstalled && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Installed</span>
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 font-medium max-w-2xl leading-relaxed">
                  {product.shortDesc || product.tagline || 'After Effects ও Premiere Pro-এর জন্য আল্টিমেট টেক্সট ও ক্যাপশন ইঞ্জিন'}
                </p>

                <div className="flex items-center gap-3 pt-1 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1 text-blue-600 font-bold">⚡ 1-Click Auto Installer</span>
                  <span>•</span>
                  <span>📁 Adobe CEP Extensions</span>
                  <span>•</span>
                  <span>♾️ Free Lifetime Updates</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="shrink-0 w-full sm:w-auto">
              {!product.isInstalled ? (
                <button
                  onClick={() => installExtensionToCEP(product.id)}
                  disabled={isInstalling}
                  className="w-full sm:w-auto px-8 py-3 bg-[#0d7eff] hover:bg-[#026be5] disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                  <span>{isInstalling ? 'INSTALLING...' : 'INSTALL NOW'}</span>
                </button>
              ) : (
                <button
                  onClick={() => launchInHost(product)}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
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

        {/* =========================================================
            3. REAL-TIME IDM-STYLE STREAMING DOWNLOAD METER
        ========================================================= */}
        {isInstalling && (
          <div className="bg-gradient-to-br from-slate-900 via-[#0d1830] to-slate-950 p-6 sm:p-7 rounded-3xl border border-blue-500/40 shadow-xl text-white space-y-5 animate-in fade-in duration-300">
            {/* Header / Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-[#38bdf8] flex items-center justify-center font-bold border border-blue-500/40 shrink-0 shadow-inner">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Downloading & Installing {product.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/40 font-bold">
                      {progress}%
                    </span>
                  </h3>
                  <p className="text-xs text-blue-200/90 font-medium mt-0.5">
                    {product.installStatusText || 'Streaming package chunks from Ghostae CDN...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Smooth Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-800/90 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/80 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-[#0d7eff] via-cyan-400 to-[#0d7eff] h-full rounded-full transition-all duration-300 shadow-md" 
                  style={{ width: `${Math.max(2, progress)}%` }}
                ></div>
              </div>
            </div>

            {/* IDM-Style Stream Metrics HUD */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>⚡ Transfer Speed</span>
                </div>
                <div className="font-mono text-xs font-extrabold text-cyan-300">
                  {product.downloadSpeed || 'Calculating...'}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>📦 Transferred</span>
                </div>
                <div className="font-mono text-xs font-extrabold text-blue-300">
                  {product.downloadedMB || '0 MB'} {product.totalMB ? `/ ${product.totalMB}` : ''}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>⏱️ Time Left</span>
                </div>
                <div className="font-mono text-xs font-extrabold text-amber-300">
                  {product.downloadEta || 'Calculating...'}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span>📁 Destination</span>
                </div>
                <div className="font-mono text-xs font-extrabold text-emerald-300 truncate">
                  Adobe CEP
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            4. FEATURES GRID
        ========================================================= */}
        <section className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0d7eff]"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0d7eff]">
                Key Capabilities
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              ফিচারসমূহ ও সক্ষমতা
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuresToDisplay.map((feat, idx) => (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-md transition space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{feat.icon}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    {feat.badge}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-gray-900 group-hover:text-[#0d7eff] transition-colors">
                  {feat.title}
                </h3>

                <p className="text-xs text-gray-600 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================
            5. FAQ SECTION
        ========================================================= */}
        <section className="bg-white p-7 sm:p-8 rounded-3xl border border-gray-200/90 shadow-sm space-y-5">
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
                <div key={idx} className="py-3.5">
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
                    <div className="mt-2.5 text-xs sm:text-sm text-gray-600 leading-relaxed pl-1 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            6. WHATSAPP VIP COMMUNITY
        ========================================================= */}
        <section className="bg-gradient-to-r from-emerald-950 via-[#072418] to-slate-900 p-6 sm:p-7 rounded-3xl border border-emerald-500/30 text-white shadow-md">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
                💬
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Join Ghostae VIP Editor Community
                </h3>
                <p className="text-xs text-emerald-200/90 leading-relaxed max-w-xl">
                  নতুন অ্যানিমেশন আপডেট এবং তাৎক্ষণিক সাপোর্টের জন্য আমাদের অফিশিয়াল VIP হোয়াটসঅ্যাপ কমিউনিটিতে যুক্ত হোন।
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenExternal(whatsappUrl, "Ghostae VIP WhatsApp Group")}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition active:scale-95 cursor-pointer flex items-center gap-2 shrink-0"
            >
              <span>Join WhatsApp Group</span>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};
