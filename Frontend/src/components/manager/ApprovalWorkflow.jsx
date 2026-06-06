import React, { useState, useEffect } from 'react';
import {
  CheckSquare, CheckCircle2, XCircle, Search, Filter,
  ArrowUpDown, Eye, MessageSquare, Download, Clock,
  X, AlertCircle, FileText, User, DollarSign, Truck,
  ChevronDown, ArrowUpRight, Loader2
} from 'lucide-react';

export default function ApprovalWorkflow({
  initialApprovals,
  rfqs,
  vendors,
  token,
  API_BASE,
  onAddLog,
  onRefreshData
}) {
  const [approvals, setApprovals] = useState(initialApprovals || []);
  const [activeView, setActiveView] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    setApprovals(initialApprovals || []);
  }, [initialApprovals]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // --- Filtering ---
  const filterByView = (list) => {
    if (activeView === 'pending') return list.filter(a => a.status === 'PENDING');
    if (activeView === 'approved') return list.filter(a => a.status === 'APPROVED');
    if (activeView === 'rejected') return list.filter(a => a.status === 'REJECTED');
    return list;
  };

  const filtered = filterByView(approvals).filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.rfq_title || '').toLowerCase().includes(q) ||
      (a.vendor_name || '').toLowerCase().includes(q) ||
      (a.id || '').toLowerCase().includes(q)
    );
  });

  // --- Sorting ---
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'price') {
      aVal = Number(a.price) || 0;
      bVal = Number(b.price) || 0;
    } else if (sortField === 'created_at') {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    } else {
      aVal = (a[sortField] || '').toString().toLowerCase();
      bVal = (b[sortField] || '').toString().toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // --- Detail ---
  const openDetail = async (approval) => {
    setSelectedApproval(approval);
    setDetailLoading(true);
    setDetailData(null);
    setRemarks('');
    try {
      const res = await fetch(`${API_BASE}/approvals/${approval.id}`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setDetailData(data.data);
      } else {
        setDetailData({ approval, quotation: { price: approval.price, vendor_name: approval.vendor_name }, manager: null, timeline: { initiated_at: approval.created_at, reviewed_at: approval.approved_at, status: approval.status } });
      }
    } catch {
      setDetailData({ approval, quotation: { price: approval.price, vendor_name: approval.vendor_name }, manager: null, timeline: { initiated_at: approval.created_at, reviewed_at: approval.approved_at, status: approval.status } });
    } finally {
      setDetailLoading(false);
    }
  };

  // --- Approve / Reject ---
  const handleAction = async (action) => {
    if (!selectedApproval) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/approvals/${selectedApproval.id}/${action}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ remarks: remarks || (action === 'approve' ? 'Approved' : 'Rejected') })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
        setApprovals(prev => prev.map(a =>
          a.id === selectedApproval.id
            ? { ...a, status: newStatus, remarks: remarks || newStatus, approved_at: new Date().toISOString() }
            : a
        ));
        onAddLog?.(`APPROVAL_${newStatus}`, `Manager ${action}d approval for "${selectedApproval.rfq_title}". Remarks: ${remarks || newStatus}`);
        onRefreshData?.();
        setSelectedApproval(null);
      } else {
        alert(data.message || `Failed to ${action} approval.`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Export ---
  const handleExport = () => {
    const rows = sorted.map(a => ({
      'Request ID': a.id?.substring(0, 8),
      'RFQ Title': a.rfq_title || '-',
      'Vendor': a.vendor_name || '-',
      'Amount': a.price || 0,
      'Status': a.status,
      'Manager': a.manager_name || '-',
      'Date': a.created_at ? new Date(a.created_at).toLocaleDateString() : '-',
      'Remarks': a.remarks || '-'
    }));
    const csvHeader = Object.keys(rows[0] || {}).join(',');
    const csvBody = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvHeader + '\n' + csvBody], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `approval_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: approvals.filter(a => a.status === 'PENDING').length, color: 'amber' },
    { id: 'approved', label: 'Approved', count: approvals.filter(a => a.status === 'APPROVED').length, color: 'emerald' },
    { id: 'rejected', label: 'Rejected', count: approvals.filter(a => a.status === 'REJECTED').length, color: 'rose' },
    { id: 'all', label: 'All History', count: approvals.length, color: 'slate' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Approval Workflow</h2>
        <p className="text-slate-500 text-base mt-1.5">Review procurement requests and make approval decisions.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-bold transition duration-200 cursor-pointer ${
              activeView === tab.id
                ? `bg-${tab.color}-50 text-${tab.color}-700 border border-${tab.color}-200`
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeView === tab.id ? `bg-${tab.color}-100 text-${tab.color}-700` : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by RFQ title, vendor, or request ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          />
        </div>
        <button
          onClick={handleExport}
          disabled={sorted.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CheckSquare className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-base font-bold">No {activeView !== 'all' ? activeView : ''} approval requests found.</span>
            <span className="text-sm mt-1">Requests will appear here when procurement officers submit them.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    { key: 'id', label: 'Request ID' },
                    { key: 'rfq_title', label: 'RFQ Title' },
                    { key: 'vendor_name', label: 'Vendor' },
                    { key: 'price', label: 'Amount' },
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
                {sorted.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 text-base font-mono font-bold text-slate-700">{a.id?.substring(0, 8)}...</td>
                    <td className="px-5 py-4 text-base font-bold text-slate-800">{a.rfq_title || 'Untitled RFQ'}</td>
                    <td className="px-5 py-4 text-base text-slate-600 font-medium">{a.vendor_name || '-'}</td>
                    <td className="px-5 py-4 text-base font-extrabold text-slate-900">₹{Number(a.price || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getStatusBadge(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 font-medium">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => openDetail(a)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 transition cursor-pointer"
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

      {/* --- Detail Slide-out Panel --- */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedApproval(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Approval Details</h3>
                <p className="text-sm text-slate-500 mt-0.5 font-mono">{selectedApproval.id?.substring(0, 12)}...</p>
              </div>
              <button
                onClick={() => setSelectedApproval(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : detailData ? (
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-xl border text-sm font-bold uppercase tracking-wider ${getStatusBadge(detailData.approval?.status || selectedApproval.status)}`}>
                    {detailData.approval?.status || selectedApproval.status}
                  </span>
                  {selectedApproval.status === 'PENDING' && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm font-bold">
                      <AlertCircle className="w-4 h-4" /> Awaiting Decision
                    </span>
                  )}
                </div>

                {/* RFQ Information */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> RFQ Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">RFQ ID</span>
                      <span className="text-slate-700 font-bold font-mono">{(detailData.approval?.rfq_id || selectedApproval.rfq_id || '-').substring(0, 8)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Title</span>
                      <span className="text-slate-700 font-bold">{selectedApproval.rfq_title || 'Untitled'}</span>
                    </div>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-500" /> Vendor Information
                  </h4>
                  <div className="text-sm">
                    <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Vendor Name</span>
                    <span className="text-slate-700 font-bold">{detailData.quotation?.vendor_name || selectedApproval.vendor_name || '-'}</span>
                  </div>
                </div>

                {/* Quotation Information */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-500" /> Quotation Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Amount</span>
                      <span className="text-slate-900 font-extrabold text-lg">₹{Number(detailData.quotation?.price || selectedApproval.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-xs font-bold uppercase mb-0.5">Delivery Timeline</span>
                      <span className="text-slate-700 font-bold">{detailData.quotation?.delivery_days ? `${detailData.quotation.delivery_days} days` : 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-violet-500" /> Timeline
                  </h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-slate-500 font-medium">Initiated:</span>
                      <span className="text-slate-700 font-bold">{detailData.timeline?.initiated_at ? new Date(detailData.timeline.initiated_at).toLocaleString('en-IN') : '-'}</span>
                    </div>
                    {detailData.timeline?.reviewed_at && (
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${detailData.timeline.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-slate-500 font-medium">Reviewed:</span>
                        <span className="text-slate-700 font-bold">{new Date(detailData.timeline.reviewed_at).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Existing Remarks */}
                {(detailData.approval?.remarks || selectedApproval.remarks) && selectedApproval.status !== 'PENDING' && (
                  <div className="bg-slate-50 rounded-xl p-5 space-y-2">
                    <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-amber-500" /> Decision Remarks
                    </h4>
                    <p className="text-base text-slate-700 leading-relaxed">{detailData.approval?.remarks || selectedApproval.remarks}</p>
                    {detailData.manager && (
                      <p className="text-sm text-slate-400 mt-1">— {detailData.manager.full_name}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons (only for PENDING) */}
                {selectedApproval.status === 'PENDING' && (
                  <div className="border-t border-slate-200 pt-5 space-y-4">
                    <div>
                      <label className="block text-sm font-extrabold text-slate-700 mb-2">Decision Remarks</label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={3}
                        placeholder="Enter your decision remarks, internal notes, or recommendations..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction('approve')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 transition cursor-pointer disabled:opacity-60"
                      >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Approve Request
                      </button>
                      <button
                        onClick={() => handleAction('reject')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-600 text-white rounded-xl text-base font-bold hover:bg-rose-700 transition cursor-pointer disabled:opacity-60"
                      >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                        Reject Request
                      </button>
                    </div>
                  </div>
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
