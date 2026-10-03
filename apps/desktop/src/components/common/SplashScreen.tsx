import React, { useEffect, useState } from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const SplashScreen: React.FC = () => {
  const { isCatalogLoading } = useHubStore();
  const [statusText, setStatusText] = useState('Initializing workstation environment...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  useEffect(() => {
    // Stage 1: Quick status message progression
    const timer1 = setTimeout(() => {
      setStatusText('Connecting to Ghostae Cloud...');
    }, 150);

    const timer2 = setTimeout(() => {
      setStatusText('Loading Workspace...');
    }, 350);

    // Fast display time of 400ms max for instant startup experience
    const minDisplayTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(minDisplayTimer);
    };
  }, []);

  // When catalog loading finishes, trigger immediate smooth fade out
  useEffect(() => {
    if (!isCatalogLoading) {
      setIsFadingOut(true);
    }
  }, [isCatalogLoading]);

  // Completely unmount after short fade-out transition (300ms)
  useEffect(() => {
    if (isFadingOut) {
      const unmountTimer = setTimeout(() => {
        setIsUnmounted(true);
      }, 300);
      return () => clearTimeout(unmountTimer);
    }
  }, [isFadingOut]);

  if (isUnmounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070b14] select-none transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient background glow elements */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>

      {/* Main Centered Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        
        {/* Floating Brand Logo with Glow Aura */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-60 group-hover:opacity-90 animate-pulse-glow transition duration-1000"></div>
          
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#0d172e] via-[#091024] to-[#040711] border border-blue-500/30 p-1 flex items-center justify-center shadow-2xl overflow-hidden">
            <img 
              src="https://qzpvqycykdqxlwfcawli.supabase.co/storage/v1/object/public/uploads/images/1785787113997-7rmrxs.webp"
              alt="Ghostae Logo"
              className="w-16 h-16 rounded-2xl object-cover shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://ghostae.com/favicon.svg';
              }}
            />
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-2xl font-black tracking-tight text-white mb-1.5 flex items-center gap-2">
          <span>Ghostae</span>
          <span className="text-xs uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Suite
          </span>
        </h1>

        <p className="text-xs font-medium text-gray-400 mb-8 max-w-xs leading-relaxed">
          Official Desktop Hub for Adobe CEP Extensions
        </p>

        {/* Microsoft Fluent-Style Indeterminate Linear Progress Bar */}
        <div className="w-56 h-1 bg-white/10 rounded-full overflow-hidden relative mb-4 shadow-inner">
          <div className="animate-fluent-progress"></div>
        </div>

        {/* Status Text with Smooth Transition */}
        <p className="text-[11px] font-mono text-gray-400 tracking-wide transition-all duration-300">
          {statusText}
        </p>
      </div>

      {/* Modern Minimalist Footer */}
      <div className="absolute bottom-6 flex items-center gap-2 text-[10px] font-mono text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
        <span>Version 1.0.0 • Connected to ghostae.com</span>
      </div>
    </div>
  );
};
