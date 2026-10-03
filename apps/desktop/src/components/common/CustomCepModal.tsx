import React, { useState } from 'react';
import { useHubStore } from '../../stores/useHubStore';

export const CustomCepModal: React.FC = () => {
  const { isCustomCepModalOpen, closeCustomCepModal, customCepPath, setCustomCepPath } = useHubStore();
  const [pathInput, setPathInput] = useState(customCepPath);

  if (!isCustomCepModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Custom CEP Folder Location</h3>
          <button 
            onClick={closeCustomCepModal}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          ডিফল্টভাবে এক্সটেনশনগুলো <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono">%APPDATA%\Adobe\CEP\extensions</code> ফোল্ডারে ইনস্টল হয়। আপনার সিস্টেমে কাস্টম ফোল্ডার লোকেশন প্রয়োজন হলে নিচে পাথ উল্লেখ করুন:
        </p>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">CEP Directory Path</label>
          <input 
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-800 outline-none focus:border-[#0d7eff] focus:bg-white"
            placeholder="C:\Users\Username\AppData\Roaming\Adobe\CEP\extensions"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            onClick={() => {
              setPathInput('%APPDATA%\\Adobe\\CEP\\extensions');
            }}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 font-semibold"
          >
            Reset Default
          </button>

          <button
            onClick={closeCustomCepModal}
            className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={() => setCustomCepPath(pathInput)}
            className="px-4 py-1.5 rounded-xl bg-[#0d7eff] hover:bg-[#026be5] text-white text-xs font-bold transition shadow-xs"
          >
            Save Path
          </button>
        </div>
      </div>
    </div>
  );
};
