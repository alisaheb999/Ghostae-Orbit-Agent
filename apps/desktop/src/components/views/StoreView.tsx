import React, { useState } from 'react';
import { useHubStore, ProductItem } from '../../stores/useHubStore';

export const StoreView: React.FC = () => {
  const { products, openProductDetail, openAuthModal, currentUser, isCatalogLoading } = useHubStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Products' },
    { id: 'official', label: 'Extensions' },
    { id: 'free', label: 'Free Resources' },
  ];

  const filteredProducts = products.filter((product) => {
    if (selectedCategory === 'official') return product.type === 'official' && !product.isFree;
    if (selectedCategory === 'free') return product.isFree || product.type === 'free_resource';
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
              Update
            </span>
          ) : product.isInstalled ? (
            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] shadow-sm uppercase tracking-wide">
              Installed
            </span>
          ) : product.isOwned ? (
            <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] shadow-sm border border-emerald-300">
              Owned
            </span>
          ) : null}
        </div>

        {/* Card Content */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between bg-white">
          <div>
            <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#0d7eff] transition-colors truncate">
              {product.name}
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold inline-block mt-1.5">
              v{product.version}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 font-mono">
              {product.isFree ? 'Free' : `${product.priceBDT} BDT`}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleProductClick(product);
              }}
              className="px-4 py-1.5 bg-gray-50 group-hover:bg-[#0d7eff] text-gray-700 group-hover:text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>{product.isOwned ? 'Install' : 'Details'}</span>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto view-enter">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 space-y-7">
        
        {/* Large 3D Ghostae Brand Banner with Subtle Animated Ambient Shimmer */}
        <section className="relative group">
          {/* Animated Ambient Glow Aura around Banner */}
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-blue-500/25 via-cyan-400/35 to-indigo-500/25 blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-300 animate-pulse pointer-events-none"></div>

          <div className="relative w-full aspect-[3.5/1] min-h-[190px] sm:min-h-[230px] md:min-h-[250px] rounded-3xl overflow-hidden shadow-xl border border-blue-300/40 sm:border-white/60 bg-[#e8f1fa] select-none flex items-start justify-end p-5 sm:p-6">
            
            {/* 3D Ghostae Custom Banner Image */}
            <img 
              src="./banner.png" 
              alt="Ghostae Creative Suite" 
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-700 group-hover:scale-[1.01]"
              onError={(e) => {
                // If banner.png is missing, fallback to gradient
                (e.target as HTMLElement).parentElement!.classList.add('bg-gradient-to-r', 'from-[#0a0f1d]', 'via-[#0f172a]', 'to-[#070b14]');
              }}
            />

            {/* Subtle Top Light Accent Line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none"></div>

            {/* Top-Right Glass Overlay: Status or Sign In Button */}
            <div className="relative z-10">
              {currentUser ? (
                <div className="flex items-center gap-2.5 bg-white/85 hover:bg-white backdrop-blur-md border border-white/80 px-4 py-2 rounded-2xl shadow-md shadow-slate-900/5 transition">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-gray-900 tracking-wide truncate max-w-[150px]">{currentUser.name}</span>
                </div>
              ) : (
                <button
                  onClick={openAuthModal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0d7eff] hover:bg-[#026be5] text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition active:scale-95 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Category Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200/80">
          <div className="flex items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#0d7eff] text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-gray-400 font-medium">
            {filteredProducts.length} Items
          </span>
        </div>

        {/* Product Cards Grid: Larger & More Spacious */}
        {isCatalogLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 animate-pulse">
                <div className="aspect-[16/10] bg-gray-200 rounded-2xl"></div>
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200/80 rounded-3xl space-y-2">
            <div className="text-3xl">📦</div>
            <h3 className="text-sm font-bold text-gray-700">No Extensions Available</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(renderProductCard)}
          </div>
        )}

      </div>
    </div>
  );
};
