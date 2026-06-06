import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Eye, Clock, ArrowUpDown,
  X, AlertCircle, Calendar, Package, Loader2,
  Send, Download, ChevronRight
} from 'lucide-react';

export default function VendorRfqList({
  rfqs,
  token,
  API_BASE,
  onNavigateTab,
  onSelectRfqForQuotation
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const statusFilters = [
    { id: 'all', label: 'All RFQs' },
    { id: 'OPEN', label: 'Open' },
    { id: 'PUBLISHED', label: 'Published' },
    { id: 'CLOSED', label: 'Closed' }
  ];

  const filtered = rfqs.filter(r => {
    if (filterStatus !== 'all') {
      const s = r.status?.toUpperCase();
      if (filterStatus === 'OPEN' && !['OPEN', 'PUBLISHED', 'ACTIVE'].includes(s)) return false;
      if (filterStatus === 'PUBLISHED' && s !== 'PUBLISHED') return false;
      if (filterStatus === 'CLOSED' && !['CLOSED', 'CANCELLED', 'VENDOR_SELECTED', 'APPROVED'].includes(s)) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (r.title || '').toLowerCase().includes(q) ||
             (r.description || '').toLowerCase().includes(q) ||
             (r.id || '').toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'created_at' || sortField === 'deadline') {
      aVal = new Date(a[sortField] || 0).getTime();
      bVal = new Date(b[sortField] || 0).getTime();
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

  const openDetail = async (rfq) => {
    setSelectedRfq(rfq);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const res = await fetch(`${API_BASE}/rfqs/${rfq.id}`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setDetailData(data.data);
      } else {
        setDetailData(rfq);
      }
    } catch {
      setDetailData(rfq);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (['OPEN', 'PUBLISHED', 'ACTIVE'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['CLOSED', 'CANCELLED'].includes(s)) return 'bg-slate-50 text-slate-700 border-slate-200';
    if (s === 'VENDOR_SELECTED' || s === 'APPROVED') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const isRfqOpen = (rfq) => {
    const s = (rfq.status || '').toUpperCase();
    if (!['OPEN', 'PUBLISHED', 'ACTIVE'].includes(s)) return false;
    if (rfq.deadline && new Date(rfq.deadline).getTime() <= Date.now()) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">RFQ Invitations</h2>
        <p className="text-slate-500 text-base mt-1.5">View procurement requests assigned to you and submit quotations.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {statusFilters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={`px-4 py-2.5 rounded-xl text-base font-bold transition cursor-pointer ${
              filterStatus === f.id
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
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
          placeholder="Search RFQs by title, description, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-base font-bold">No RFQ invitations found.</span>
            <span className="text-sm mt-1">You'll see RFQs here when procurement officers invite you.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    { key: 'id', label: 'RFQ ID' },
                    { key: 'title', label: 'RFQ Title' },
                    { key: 'category', label: 'Category' },
                    { key: 'deadline', label: 'Deadline' },
                    { key: 'status', label: 'Status' },
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
                {sorted.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 text-base font-mono font-bold text-slate-700">{(r.id || '').substring(0, 8)}...</td>
                    <td className="px-5 py-4 text-base font-bold text-slate-800">{r.title || 'Untitled'}</td>
                    <td className="px-5 py-4 text-base text-slate-600 font-medium">{r.category || '-'}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-medium">
                      {r.deadline ? new Date(r.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No deadline'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openDetail(r)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 transition cursor-pointer"
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
      {selectedRfq && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRfq(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">RFQ Details</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{(selectedRfq.id || '').substring(0, 12)}...</p>
              </div>
              <button onClick={() => setSelectedRfq(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : detailData ? (
              <div className="p-6 space-y-6">
                {/* Status */}
                <span className={`px-3 py-1.5 rounded-xl border text-sm font-bold uppercase tracking-wider ${getStatusBadge(detailData.status || selectedRfq.status)}`}>
                  {detailData.status || selectedRfq.status}
                </span>

                {/* RFQ Information */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> RFQ Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Title</span>
                      <span className="text-slate-700 font-bold">{detailData.title || selectedRfq.title || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Category</span>
                      <span className="text-slate-700 font-bold">{detailData.category || selectedRfq.category || '-'}</span>
                    </div>
                  </div>
                  {(detailData.description || selectedRfq.description) && (
                    <div className="text-sm">
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Description</span>
                      <p className="text-slate-700 leading-relaxed">{detailData.description || selectedRfq.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Quantity</span>
                      <span className="text-slate-700 font-bold">{detailData.quantity || selectedRfq.quantity || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Deadline</span>
                      <span className="text-slate-700 font-bold">
                        {(detailData.deadline || selectedRfq.deadline)
                          ? new Date(detailData.deadline || selectedRfq.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'No deadline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Procurement Requirements */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-500" /> Procurement Requirements
                  </h4>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Delivery Expectations</span>
                      <span className="text-slate-700">{detailData.delivery_expectations || 'As per standard terms'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Quality Requirements</span>
                      <span className="text-slate-700">{detailData.quality_requirements || 'As per industry standards'}</span>
                    </div>
                    {detailData.special_instructions && (
                      <div>
                        <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Special Instructions</span>
                        <span className="text-slate-700">{detailData.special_instructions}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-500" /> Timeline
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-slate-500 font-medium">Created:</span>
                      <span className="text-slate-700 font-bold">
                        {detailData.created_at ? new Date(detailData.created_at).toLocaleString('en-IN') : '-'}
                      </span>
                    </div>
                    {(detailData.deadline || selectedRfq.deadline) && (
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-500 font-medium">Deadline:</span>
                        <span className="text-slate-700 font-bold">
                          {new Date(detailData.deadline || selectedRfq.deadline).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Quotation Button */}
                {isRfqOpen(detailData || selectedRfq) && (
                  <button
                    onClick={() => {
                      onSelectRfqForQuotation?.(detailData || selectedRfq);
                      setSelectedRfq(null);
                      onNavigateTab('vendor-quotations');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold hover:bg-indigo-700 transition cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                    Submit Quotation
                  </button>
                )}
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
