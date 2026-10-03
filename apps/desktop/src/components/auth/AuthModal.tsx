import React, { useState } from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginWithEmail, loginWithLicenseKey } = useHubStore();
  const [activeTab, setActiveTab] = useState<'license' | 'email'>('license');
  
  const [licenseKey, setLicenseKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;
    setLoading(true);
    await loginWithLicenseKey(licenseKey);
    setLoading(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    await loginWithEmail(email, password);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl border border-gray-100 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-sm cursor-pointer"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div className="text-center pt-2 pb-5">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-2 shadow-sm overflow-hidden bg-[#0d1628] flex items-center justify-center border border-slate-700/60">
            <img 
              src="./icon.png"
              alt="Ghostae"
              className="w-10 h-10 rounded-xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ghostae.com/favicon.svg';
              }}
            />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            Sign In to Ghostae
          </h2>
        </div>

        {/* Tab Switcher (1. License Key, 2. Email & Password) */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('license')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'license'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            License Key
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Email & Password
          </button>
        </div>

        {/* Tab 1: License Key */}
        {activeTab === 'license' && (
          <form onSubmit={handleLicenseSubmit} className="space-y-4">
            <div>
              <input 
                type="text"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="GHOST-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#0d7eff] focus:bg-white text-gray-900 tracking-wider uppercase transition"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0d7eff] hover:bg-[#026be5] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>Verifying...</span>
                </span>
              ) : (
                <span>Activate License</span>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Email & Password */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#0d7eff] focus:bg-white text-gray-900 transition"
              />
            </div>

            <div>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#0d7eff] focus:bg-white text-gray-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 bg-[#0d7eff] hover:bg-[#026be5] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <span>Signing In...</span>
                </span>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
