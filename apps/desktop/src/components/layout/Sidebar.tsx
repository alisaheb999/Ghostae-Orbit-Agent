import React from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const Sidebar: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    products, 
    licenses, 
    updates,
    showToast,
    openCustomCepModal,
    currentUser,
    openAuthModal
  } = useHubStore();

  const installedCount = products.filter(p => p.isInstalled).length;
  const updatesCount = updates.length;
  const activeLicenseCount = licenses.filter(l => l.isEnabled).length;

  const navItems = [
    {
      id: 'store',
      label: 'Store & Extensions',
      locked: false,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
      )
    },
    {
      id: 'library',
      label: 'My Installed',
      locked: !currentUser,
      count: installedCount,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>
        </svg>
      )
    },
    {
      id: 'licenses',
      label: 'Active Licenses',
      locked: !currentUser,
      count: activeLicenseCount,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
        </svg>
      )
    },
    {
      id: 'updates',
      label: 'Software Updates',
      locked: !currentUser,
      badge: updatesCount > 0 ? updatesCount : null,
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 10h3l-4 4-4-4h3V7h2v5z"/>
        </svg>
      )
    }
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.locked) {
      showToast("এই সেকশনটি ব্যবহারের জন্য প্রথমে সাইন ইন করুন।");
      openAuthModal();
      return;
    }
    setCurrentTab(item.id as any);
  };

  return (
    <aside className="w-64 bg-[#fbfbfd] border-r border-gray-200/80 p-5 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-bold px-3 mb-2">
            Workspace
          </div>
          <div className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#0d7eff] text-white shadow-md shadow-blue-500/20' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : item.locked ? 'text-gray-300' : 'text-gray-400'}>
                      {item.icon}
                    </span>
                    <span className={`tracking-tight ${item.locked ? 'text-gray-500' : ''}`}>
                      {item.label}
                    </span>
                  </div>

                  {item.locked ? (
                    <span className="text-[10px] text-gray-400 bg-gray-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-gray-200/50">
                      🔒
                    </span>
                  ) : item.badge ? (
                    <span className="bg-[#f59e0b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  ) : item.count !== undefined ? (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom CEP Link Button */}
        <div className="pt-1 space-y-2">
          <button
            onClick={openCustomCepModal}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition shadow-2xs hover:border-[#0d7eff]/50 active:scale-98 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span>Custom CEP Link</span>
          </button>

          <button
            onClick={() => (window as any).__openAppUpdateModal?.()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-xs font-semibold transition shadow-2xs active:scale-98 border border-gray-200 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Check for Updates</span>
          </button>
        </div>
      </div>

      {/* Guest Sign In Callout (When logged out) OR WhatsApp Support */}
      <div className="space-y-3 pt-4 border-t border-gray-200/60">
        {!currentUser && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border border-blue-100 text-center space-y-2 shadow-2xs">
            <div className="text-xs font-bold text-gray-900 flex items-center justify-center gap-1.5">
              <span>Sign In Required</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              আপনার লাইসেন্স সিংক করতে সাইন ইন করুন।
            </p>
            <button
              onClick={openAuthModal}
              className="w-full py-2 bg-[#0d7eff] hover:bg-[#026be5] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            >
              সাইন ইন / লাইসেন্স কি
            </button>
          </div>
        )}

        {/* Vibrant WhatsApp Support Panel */}
        <a 
          href="https://chat.whatsapp.com/BdoH5Xpn4iFEGEbn4j5WLf"
          target="_blank"
          rel="noreferrer"
          className="relative overflow-hidden p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 cursor-pointer transition-all duration-300 block group border border-emerald-400/30 hover:scale-[1.02] active:scale-[0.99]"
        >
          {/* Subtle Ambient Light Shimmer */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-white/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/25 shadow-inner">
              <svg className="w-5 h-5 fill-white drop-shadow-xs" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.54 1.761.802 2.791.802 3.181 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.788-5.768-5.788zm3.385 8.197c-.143.403-.728.74-1.02.776-.279.034-.639.157-2.072-.441-1.724-.719-2.833-2.483-2.92-2.597-.086-.114-.698-.929-.698-1.772 0-.843.438-1.258.595-1.428.157-.171.343-.214.457-.214.114 0 .229.002.329.006.105.006.248-.04.386.292.143.343.486 1.186.529 1.271.043.086.071.186.014.3-.057.114-.086.186-.171.286-.086.1-.182.222-.26.299-.086.086-.176.179-.076.35.1.171.444.733.953 1.186.655.584 1.208.765 1.379.851.171.086.271.071.371-.043.1-.114.429-.5.543-.671.114-.171.229-.143.386-.086.157.057.994.469 1.166.555.171.086.286.129.329.2.043.071.043.414-.1.817z"/>
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5.147-1.332A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2a8.16 8.16 0 01-4.305-1.222l-.309-.184-3.05.798.814-2.973-.2-.319A8.17 8.17 0 013.8 12c0-4.521 3.679-8.2 8.2-8.2s8.2 3.679 8.2 8.2-3.679 8.2-8.2 8.2z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black tracking-tight flex items-center gap-1.5 text-white">
                <span>WhatsApp Support</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                </span>
              </div>
              <p className="text-[10.5px] text-emerald-100 font-mono font-bold mt-0.5 tracking-wide">+880 1345 407572</p>
            </div>
          </div>
        </a>
      </div>
    </aside>
  );
};
