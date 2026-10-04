import React, { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { StoreView } from './components/views/StoreView';
import { LibraryView } from './components/views/LibraryView';
import { UpdatesView } from './components/views/UpdatesView';
import { ProductDetailView } from './components/views/ProductDetailView';
import { CustomCepModal } from './components/common/CustomCepModal';
import { DesktopAppUpdateModal } from './components/common/DesktopAppUpdateModal';
import { SplashScreen } from './components/common/SplashScreen';
import { useHubStore } from './stores/useHubStore';

export function App() {
  const { 
    currentTab, 
    selectedProductDetail, 
    toastMessage, 
    initCloudSync
  } = useHubStore();

  // Initialize Cloud Sync with production Ghostae Server on startup & periodic interval
  useEffect(() => {
    initCloudSync();

    // Silent background sync every 10 minutes to keep extensions and updates fresh
    const interval = setInterval(() => {
      initCloudSync(false);
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [initCloudSync]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#f4f6fa] font-sans text-gray-800 antialiased select-none">
      
      {/* Startup Branded Splash Screen */}
      <SplashScreen />
      
      {/* Bottom-Center Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-950/95 backdrop-blur-md text-white text-xs px-5 py-3 rounded-full shadow-2xl border border-white/15 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-250 select-none max-w-md pointer-events-none">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="font-medium tracking-wide truncate">{toastMessage}</span>
        </div>
      )}

      {/* Full-Width Desktop Navbar */}
      <Navbar />

      {/* Main Desktop Body (Sidebar + Content Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        {/* Dynamic View Canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fc] overflow-hidden">
          {selectedProductDetail ? (
            <ProductDetailView />
          ) : (
            <>
              {currentTab === 'store' && <StoreView />}
              {currentTab === 'library' && <LibraryView />}
              {currentTab === 'updates' && <UpdatesView />}
            </>
          )}
        </div>
      </div>

      {/* Custom CEP Folder Modal */}
      <CustomCepModal />

      {/* Desktop App Self-Update Modal */}
      <DesktopAppUpdateModal />
    </div>
  );
}

export default App;
