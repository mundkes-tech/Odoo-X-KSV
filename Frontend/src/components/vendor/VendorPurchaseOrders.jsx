import React, { useState } from 'react';
import {
  FileSpreadsheet, Search, Eye, ArrowUpDown, Download,
  X, Loader2, AlertCircle, Clock, Package,
  DollarSign, Printer, User
} from 'lucide-react';

export default function VendorPurchaseOrders({
  purchaseOrders,
  token,
  API_BASE
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedPO, setSelectedPO] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const statusFilters = [
    { id: 'all', label: 'All Orders' },
    { id: 'PENDING', label: 'Active' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' }
  ];

  const filtered = purchaseOrders.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (p.po_number || '').toLowerCase().includes(q) ||
             (p.rfq?.title || '').toLowerCase().includes(q) ||
             (p.vendor?.company_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'total_amount') {
      aVal = Number(a.total_amount) || 0;
      bVal = Number(b.total_amount) || 0;
    } else if (sortField === 'created_at') {
      aVal = new Date(a.created_at || 0).getTime();
      bVal = new Date(b.created_at || 0).getTime();
    } else {
      aVal = (a[sortField] || '').toString().toLowerCase();
      bVal = (b[sortField] || '').toString().toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': case 'GENERATED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const openDetail = async (po) => {
    setSelectedPO(po);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`${API_BASE}/purchase-orders/${po.id}`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setDetailData(data.data);
      } else {
        setDetailData(po);
      }
    } catch {
      setDetailData(po);
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Purchase Orders</h2>
        <p className="text-slate-500 text-base mt-1.5">View purchase orders generated for your approved quotations.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {statusFilters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={`px-4 py-2.5 rounded-xl text-base font-bold transition cursor-pointer ${
              filterStatus === f.id
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by PO number, RFQ title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-base font-bold">No purchase orders found.</span>
            <span className="text-sm mt-1">Purchase orders will appear here after your quotations are approved.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    { key: 'po_number', label: 'PO Number' },
                    { key: 'rfq_title', label: 'RFQ Title' },
                    { key: 'total_amount', label: 'Amount' },
                    { key: 'status', label: 'Status' },
                    { key: 'created_at', label: 'Date' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-5 py-3.5 text-sm font-extrabold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 transition select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <ArrowUpDown className={`w-3.5 h-3.5 ${sortField === col.key ? 'text-blue-600' : 'text-slate-300'}`} />
                      </div>
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-sm font-extrabold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 text-base font-mono font-bold text-slate-700">{po.po_number || (po.id || '').substring(0, 8)}</td>
                    <td className="px-5 py-4 text-base font-bold text-slate-800">{po.rfq?.title || 'N/A'}</td>
                    <td className="px-5 py-4 text-base font-extrabold text-slate-900">₹{Number(po.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getStatusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-medium">
                      {po.created_at ? new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openDetail(po)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Slide-out */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedPO(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Purchase Order Details</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{selectedPO.po_number || (selectedPO.id || '').substring(0, 12)}</p>
              </div>
              <button onClick={() => setSelectedPO(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : detailData ? (
              <div className="p-6 space-y-6">
                <span className={`px-3 py-1.5 rounded-xl border text-sm font-bold uppercase tracking-wider ${getStatusBadge(detailData.status || selectedPO.status)}`}>
                  {detailData.status || selectedPO.status}
                </span>

                {/* PO Information */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Purchase Order Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">PO Number</span>
                      <span className="text-slate-700 font-bold">{detailData.po_number || selectedPO.po_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Issue Date</span>
                      <span className="text-slate-700 font-bold">
                        {detailData.created_at ? new Date(detailData.created_at).toLocaleDateString('en-IN') : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Status</span>
                      <span className="text-slate-700 font-bold">{detailData.status || selectedPO.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">RFQ</span>
                      <span className="text-slate-700 font-bold">{detailData.rfq?.title || selectedPO.rfq?.title || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Order Info */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-500" /> Order Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Total Amount</span>
                      <span className="text-slate-900 font-extrabold text-lg">₹{Number(detailData.total_amount || selectedPO.total_amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Quotation Price</span>
                      <span className="text-slate-700 font-bold">₹{Number(detailData.quotation?.price || selectedPO.quotation?.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-violet-500" /> Vendor Information
                  </h4>
                  <div className="text-sm">
                    <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Company</span>
                    <span className="text-slate-700 font-bold">{detailData.vendor?.company_name || selectedPO.vendor?.company_name || '-'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-base font-bold hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Printer className="w-5 h-5" />
                    Print PO
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
                <span className="text-base">Failed to load details.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
