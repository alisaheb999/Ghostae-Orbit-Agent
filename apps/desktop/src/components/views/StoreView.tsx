import React, { useState } from 'react';
import { useHubStore, ProductItem } from '../../stores/useHubStore';

export const StoreView: React.FC = () => {
  const { products, openProductDetail, installExtensionToCEP } = useHubStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Extensions' },
    { id: 'ae', label: 'After Effects' },
    { id: 'pr', label: 'Premiere Pro' },
  ];

  const filteredProducts = products.filter((product) => {
    if (selectedCategory === 'ae') return product.targetHost === 'AE' || product.targetHost === 'BOTH';
    if (selectedCategory === 'pr') return product.targetHost === 'PPRO' || product.targetHost === 'BOTH';
    return true;
  });

  const handleProductClick = (product: ProductItem) => {
    openProductDetail(product);
  };

  const renderProductCard = (product: ProductItem) => {
    return (
      <div
        key={product.id}
        onClick={() => handleProductClick(product)}
        className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer hover:border-[#0d7eff]/50 hover:-translate-y-1 active:scale-[0.99]"
      >
        {/* Clean Aspect Ratio Thumbnail with Fallback */}
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#0c1222]">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = './icon.png';
                (e.target as HTMLImageElement).className = 'w-14 h-14 object-contain grayscale opacity-35 mx-auto my-auto';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1324] via-[#101b33] to-[#0a1020] p-6 select-none">
              <img 
                src="./icon.png" 
                alt="Ghostae" 
                className="w-12 h-12 grayscale opacity-35 group-hover:opacity-60 transition-opacity object-contain mb-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://ghostae.com/favicon.svg';
                }}
              />
              <span className="text-xs font-semibold text-slate-400/80 truncate max-w-[85%]">{product.name}</span>
            </div>
          )}

          {/* Status Badges */}
          {product.hasUpdate ? (
            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-lg bg-amber-500 text-white font-bold text-[10px] shadow-sm uppercase tracking-wide">
              Update Available
            </span>
          ) : product.isInstalled ? (
            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] shadow-sm uppercase tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span>Installed</span>
            </span>
          ) : null}

          {/* Host App Micro Badge */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white/90 font-bold text-[10px] border border-white/10">
              {product.targetHost === 'BOTH' || product.targetApp === 'dual' ? 'AE & Premiere Pro' : product.targetHost === 'PPRO' ? 'Premiere Pro' : 'After Effects'}
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between bg-white">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#0d7eff] transition-colors truncate">
                {product.name}
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold shrink-0">
                v{product.version}
              </span>
            </div>

            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {product.shortDesc || product.description || 'Adobe Creative Cloud Extension'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Official Extension</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!product.isInstalled) {
                    installExtensionToCEP(product.id);
                  } else {
                    handleProductClick(product);
                  }
                }}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  product.isInstalled
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-[#0d7eff] hover:bg-[#026be5] text-white'
                }`}
              >
                <span>{product.isInstalled ? 'Installed' : 'Install'}</span>
                {!product.isInstalled && (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto view-enter pb-12">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 space-y-7">
        
        {/* Large 3D Ghostae Brand Banner */}
        <section className="relative group">
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-blue-500/25 via-cyan-400/35 to-indigo-500/25 blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-300 animate-pulse pointer-events-none"></div>

          <div className="relative w-full aspect-[3.5/1] min-h-[180px] sm:min-h-[220px] md:min-h-[240px] rounded-3xl overflow-hidden shadow-xl border border-blue-300/40 sm:border-white/60 bg-[#e8f1fa] select-none flex items-start justify-end p-5 sm:p-6">
            
            <img 
              src="./banner.png" 
              alt="Ghostae Creative Suite" 
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-700 group-hover:scale-[1.01]"
              onError={(e) => {
                (e.target as HTMLElement).parentElement!.classList.add('bg-gradient-to-r', 'from-[#0a0f1d]', 'via-[#0f172a]', 'to-[#070b14]');
              }}
            />

            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"></div>

            {/* Top-Right Glass Badge */}
            <div className="relative z-10">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md border border-white/80 px-4 py-2 rounded-2xl shadow-md text-xs font-bold text-gray-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>1-Click CEP Installer</span>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-200/80 pb-4">
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-mono font-bold text-gray-500">
            {filteredProducts.length} Extensions Available
          </div>
        </div>

        {/* Extensions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(renderProductCard)}
        </div>

      </div>
    </div>
  );
};
