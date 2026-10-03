import React, { useState, useEffect } from 'react';
// In Lovable.dev, Supabase is typically imported from '@/integrations/supabase/client'
// If using custom setup, adjust import to your Supabase client
import { createClient } from '@supabase/supabase-js';

// Default Supabase Client for Lovable Sandbox
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qzpvqycykdqxlwfcawli.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GhostaeAdminHub() {
  const [activeTab, setActiveTab] = useState<'products' | 'updates' | 'desktop' | 'licenses' | 'transactions'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [desktopReleases, setDesktopReleases] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newUpdateProduct, setNewUpdateProduct] = useState({
    productId: '',
    version: 'v2.5.0',
    changelog: '',
    downloadUrl: ''
  });
  const [newDesktopRelease, setNewDesktopRelease] = useState({
    version: '1.1.0',
    downloadUrl: '',
    changelog: ''
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch all data from Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, licRes, updRes, deskRes, trxRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('licenses').select('*, products(name)').order('created_at', { ascending: false }),
        supabase.from('app_updates').select('*, products(name)').order('created_at', { ascending: false }),
        supabase.from('desktop_releases').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*, products(name)').order('created_at', { ascending: false })
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (licRes.data) setLicenses(licRes.data);
      if (updRes.data) setUpdates(updRes.data);
      if (deskRes.data) setDesktopReleases(deskRes.data);
      if (trxRes.data) setTransactions(trxRes.data);
    } catch (err) {
      console.error('[Ghostae Admin] Failed to fetch from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Update Product in Supabase
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const { error } = await supabase
      .from('products')
      .update({
        name: editingProduct.name,
        price_bdt: editingProduct.price_bdt,
        version: editingProduct.version,
        category: editingProduct.category,
        description: editingProduct.description,
        image_url: editingProduct.image_url
      })
      .eq('id', editingProduct.id);

    if (error) {
      showToast("Error updating product: " + error.message);
    } else {
      showToast("Product updated! Instantly live in Desktop App.");
      setEditingProduct(null);
      loadData();
    }
  };

  // 2. Publish Extension Update to Supabase
  const handlePublishExtensionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateProduct.productId) {
      showToast("Please select a product");
      return;
    }

    const { error } = await supabase
      .from('app_updates')
      .insert([{
        product_id: newUpdateProduct.productId,
        version_available: newUpdateProduct.version,
        changelog: newUpdateProduct.changelog,
        download_url: newUpdateProduct.downloadUrl
      }]);

    if (error) {
      showToast("Failed to publish: " + error.message);
    } else {
      showToast("Extension update published to Supabase!");
      setNewUpdateProduct({ productId: '', version: 'v2.5.0', changelog: '', downloadUrl: '' });
      loadData();
    }
  };

  // 3. Publish Desktop App Self-Update
  const handlePublishDesktopRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('desktop_releases')
      .insert([{
        version: newDesktopRelease.version,
        download_url: newDesktopRelease.downloadUrl,
        changelog: newDesktopRelease.changelog
      }]);

    if (error) {
      showToast("Error publishing desktop release: " + error.message);
    } else {
      showToast("Desktop app release published! Client apps will prompt auto-update.");
      setNewDesktopRelease({ version: '1.1.0', downloadUrl: '', changelog: '' });
      loadData();
    }
  };

  // 4. Approve Transaction & Issue License
  const handleApproveTransaction = async (trx: any) => {
    // 1. Generate license
    const newKey = `GHST-TXT-${Math.random().toString(36).substring(2, 6).toUpperCase()}-LIVE`;
    
    await supabase.from('licenses').insert([{
      user_id: trx.user_id || null,
      product_id: trx.product_id,
      license_key: newKey,
      tier: 'Lifetime License',
      validity_type: 'LIFETIME',
      max_devices: 1,
      is_enabled: true
    }]);

    // 2. Mark transaction approved
    await supabase.from('transactions').update({ status: 'approved' }).eq('id', trx.id);
    showToast(`Approved! Key: ${newKey} issued.`);
    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="max-w-7xl mx-auto mb-8 bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-black tracking-tight">Ghostae Hub Control Center</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30">
              SUPABASE LIVE
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Lovable.dev Web Backend Manager — Controls products, prices, self-updates & licenses for all Ghostae desktop clients.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2 self-start md:self-auto"
        >
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-wrap gap-2">
        {[
          { id: 'products', label: 'Products & Pricing', count: products.length },
          { id: 'updates', label: 'Extension Updates (CEP)', count: updates.length },
          { id: 'desktop', label: 'Desktop App Self-Updates', count: desktopReleases.length },
          { id: 'licenses', label: 'Licenses & HWID', count: licenses.length },
          { id: 'transactions', label: 'MFS Transactions', count: transactions.filter(t => t.status === 'pending').length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        
        {/* TAB 1: PRODUCTS & PRICING */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Products in Supabase Database</h3>
              <span className="text-xs text-slate-400">Edits reflect immediately in desktop client</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{p.name}</h4>
                        <span className="text-xs font-mono font-semibold text-blue-600">v{p.version}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-base font-black font-mono text-slate-900">{p.price_bdt} ৳</span>
                    <button
                      onClick={() => setEditingProduct(p)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                    >
                      Edit Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: EXTENSION UPDATES */}
        {activeTab === 'updates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Push Extension Update to CEP</h3>
              <form onSubmit={handlePublishExtensionUpdate} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Target Product</label>
                  <select
                    value={newUpdateProduct.productId}
                    onChange={(e) => setNewUpdateProduct({ ...newUpdateProduct, productId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  >
                    <option value="">Select Extension...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">Version String</label>
                  <input
                    type="text"
                    value={newUpdateProduct.version}
                    onChange={(e) => setNewUpdateProduct({ ...newUpdateProduct, version: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Changelog / Release Notes</label>
                  <textarea
                    rows={3}
                    value={newUpdateProduct.changelog}
                    onChange={(e) => setNewUpdateProduct({ ...newUpdateProduct, changelog: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Supabase Storage ZIP URL</label>
                  <input
                    type="text"
                    value={newUpdateProduct.downloadUrl}
                    onChange={(e) => setNewUpdateProduct({ ...newUpdateProduct, downloadUrl: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="https://...supabase.co/storage/v1/object/public/extensions/..."
                  />
                </div>

                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  Broadcast Update
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Active Extension Updates</h3>
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{u.products?.name || 'Extension'}</span>
                      <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{u.version_available}</span>
                    </div>
                    <p className="text-slate-600">{u.changelog}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DESKTOP APP SELF-UPDATE */}
        {activeTab === 'desktop' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Push Desktop Software Self-Update</h3>
              <p className="text-xs text-slate-500">Desktop client will prompt users to auto-update when they launch the app.</p>
              
              <form onSubmit={handlePublishDesktopRelease} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Desktop App Version</label>
                  <input
                    type="text"
                    value={newDesktopRelease.version}
                    onChange={(e) => setNewDesktopRelease({ ...newDesktopRelease, version: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                    placeholder="e.g. 1.1.0"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Installer Download URL</label>
                  <input
                    type="text"
                    value={newDesktopRelease.downloadUrl}
                    onChange={(e) => setNewDesktopRelease({ ...newDesktopRelease, downloadUrl: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="https://...supabase.co/storage/v1/object/public/desktop-releases/..."
                    required
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Changelog</label>
                  <textarea
                    rows={3}
                    value={newDesktopRelease.changelog}
                    onChange={(e) => setNewDesktopRelease({ ...newDesktopRelease, changelog: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Bug fixes, new UI improvements..."
                    required
                  />
                </div>

                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                  Release Desktop Update
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900">Desktop Releases Deployed</h3>
              <div className="space-y-3">
                {desktopReleases.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="text-slate-900">Version: {r.version}</span>
                      <span className="text-slate-400 text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600">{r.changelog}</p>
                    <div className="text-[10px] font-mono text-slate-400 truncate">{r.download_url}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LICENSES */}
        {activeTab === 'licenses' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs overflow-x-auto">
            <h3 className="font-bold text-sm text-slate-900 mb-4">Issued Licenses & HWID Workstations</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">License Key</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licenses.map((lic) => (
                  <tr key={lic.id}>
                    <td className="p-3 font-bold">{lic.products?.name || 'Ghostae Text'}</td>
                    <td className="p-3 font-mono font-bold text-blue-600 select-all">{lic.license_key}</td>
                    <td className="p-3">{lic.tier}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: MFS TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs overflow-x-auto">
            <h3 className="font-bold text-sm text-slate-900 mb-4">bKash / Nagad / Rocket Payment Submissions</h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b">
                <tr>
                  <th className="p-3">TrxID & Gateway</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {tx.trx_id} <span className="text-[10px] uppercase font-sans text-slate-400">({tx.gateway})</span>
                    </td>
                    <td className="p-3 font-mono font-bold">{tx.amount} ৳</td>
                    <td className="p-3">{tx.products?.name || 'Ghostae Text'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {tx.status === 'pending' && (
                        <button
                          onClick={() => handleApproveTransaction(tx)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
                        >
                          Approve & Issue
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900">Edit {editingProduct.name}</h3>
            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="font-bold block mb-1">Product Title</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Price (BDT)</label>
                <input
                  type="number"
                  value={editingProduct.price_bdt}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price_bdt: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Version</label>
                <input
                  type="text"
                  value={editingProduct.version}
                  onChange={(e) => setEditingProduct({ ...editingProduct, version: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Image URL</label>
                <input
                  type="text"
                  value={editingProduct.image_url}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
