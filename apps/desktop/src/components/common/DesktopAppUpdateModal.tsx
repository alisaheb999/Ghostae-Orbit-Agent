import React, { useState, useEffect } from 'react';
import { useHubStore } from '../../stores/useHubStore';
import { GhostaeApiService } from '../../services/GhostaeApiService';

export const DesktopAppUpdateModal: React.FC = () => {
  const { showToast } = useHubStore();
  const [isOpen, setIsOpen] = useState(false);

  // Current desktop client version
  const currentAppVersion = "1.0.0";
  const [newAppVersion, setNewAppVersion] = useState("");
  const [updateNotes, setUpdateNotes] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string>("");

  const checkForUpdates = async (isManual = false) => {
    if (isManual) {
      showToast("আপডেটের জন্য Ghostae সার্ভার চেক করা হচ্ছে...");
    }
    try {
      const res = await GhostaeApiService.checkAppUpdate(currentAppVersion);
      if (res.updateAvailable && res.latestVersion) {
        setNewAppVersion(res.latestVersion);
        setUpdateNotes(res.notes || 'নতুন পারফরম্যান্স ও স্ট্যাবিলিটি আপডেট উপলব্ধ।');
        if (res.downloadUrl) setDownloadUrl(res.downloadUrl);
        setIsOpen(true);
      } else if (isManual) {
        showToast(`আপনার অ্যাপটি আপ-টু-ডেট রয়েছে (v${currentAppVersion})।`);
      }
    } catch (e) {
      if (isManual) {
        showToast("সার্ভার আপডেট চেক সম্পন্ন করা যায়নি।");
      }
    }
  };

  useEffect(() => {
    checkForUpdates(false);
  }, []);

  const handleDownloadInstaller = () => {
    const targetUrl = downloadUrl || 'https://ghostae.com';
    showToast("অফিশিয়াল ইনস্টলার ডাউনলোডের জন্য লিঙ্কটি ব্রাউজারে ওপেন করা হয়েছে...");

    if (typeof window !== 'undefined') {
      const desktop = window.ghostaeDesktop;
      if (desktop && typeof desktop.openExternal === 'function') {
        desktop.openExternal(targetUrl);
      } else {
        window.open(targetUrl, '_blank');
      }
    }
    setIsOpen(false);
  };

  // Expose opener to window for manual testing or automated check
  (window as any).__openAppUpdateModal = () => checkForUpdates(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 md:p-8 animate-in zoom-in-95 text-gray-800 font-sans">
        
        {/* Header with App Logo & Pulse */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 leading-tight">Software Update Available</h3>
              <p className="text-[11px] text-gray-400">Directly from Ghostae Cloud Server</p>
            </div>
          </div>

          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Version Compare Banner */}
        <div className="p-4 rounded-2xl bg-[#fafbfe] border border-gray-200 flex items-center justify-between mb-5">
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Installed</div>
            <div className="font-mono text-xs font-bold text-gray-600">{currentAppVersion}</div>
          </div>

          <div className="text-gray-400 font-bold">➔</div>

          <div>
            <div className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">New Version</div>
            <div className="font-mono text-xs font-bold text-emerald-600">{newAppVersion}</div>
          </div>
        </div>

        {/* Changelog from Server */}
        <div className="space-y-2 mb-6">
          <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
            Release Changelog
          </div>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-600 leading-relaxed whitespace-pre-line">
            {updateNotes}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition"
          >
            Later
          </button>
          <button
            onClick={handleDownloadInstaller}
            className="px-6 py-2.5 rounded-xl bg-[#0d7eff] hover:bg-[#026be5] text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
            </svg>
            <span>Download Latest Installer</span>
          </button>
        </div>

      </div>
    </div>
  );
};
