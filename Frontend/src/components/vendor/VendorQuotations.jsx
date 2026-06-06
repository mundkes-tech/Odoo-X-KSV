import React, { useState, useEffect } from 'react';
import {
  Send, Layers, Edit3, Eye, Search, ArrowUpDown,
  X, Loader2, AlertCircle, Save, FileText, Clock,
  CheckCircle2, XCircle, DollarSign, Truck
} from 'lucide-react';

export default function VendorQuotations({
  initialQuotations,
  rfqs,
  selectedRfq,
  token,
  API_BASE,
  onAddLog,
  onRefreshData
}) {
  const [quotations, setQuotations] = useState(initialQuotations || []);
  const [activeView, setActiveView] = useState(selectedRfq ? 'submit' : 'list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('submitted_at');
  const [sortDir, setSortDir] = useState('desc');
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form state
  const [formRfqId, setFormRfqId] = useState(selectedRfq?.id || '');
  const [formPrice, setFormPrice] = useState('');
  const [formDeliveryDays, setFormDeliveryDays] = useState('');
  const [formComments, setFormComments] = useState('');
  const [formStatus, setFormStatus] = useState('SUBMITTED');

  useEffect(() => {
    setQuotations(initialQuotations || []);
  }, [initialQuotations]);

  useEffect(() => {
    if (selectedRfq) {
      setFormRfqId(selectedRfq.id);
      setActiveView('submit');
    }
  }, [selectedRfq]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Get open RFQs for the form dropdown
  const openRfqs = rfqs.filter(r => ['OPEN', 'PUBLISHED', 'ACTIVE'].includes((r.status || '').toUpperCase()));
  const submittedRfqIds = quotations.map(q => q.rfq_id);
  const availableRfqs = openRfqs.filter(r => !submittedRfqIds.includes(r.id));

  // Submit quotation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRfqId || !formPrice || !formDeliveryDays) {
      alert('Please fill in all required fields.');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rfq_id: formRfqId,
          price: Number(formPrice),
          delivery_days: Number(formDeliveryDays),
          comments: formComments || null,
          status: formStatus
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuotations(prev => [data.data, ...prev]);
        onAddLog?.('QUOTATION_SUBMITTED', `Vendor submitted quotation for RFQ ${formRfqId.substring(0, 8)}`);
        onRefreshData?.();
        setFormRfqId('');
        setFormPrice('');
        setFormDeliveryDays('');
        setFormComments('');
        setFormStatus('SUBMITTED');
        setActiveView('list');
        alert('Quotation submitted successfully!');
      } else {
        alert(data.message || 'Failed to submit quotation.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update quotation
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingQuotation) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotations/${editingQuotation.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          price: Number(formPrice),
          delivery_days: Number(formDeliveryDays),
          comments: formComments || null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuotations(prev => prev.map(q => q.id === editingQuotation.id ? data.data : q));
        onAddLog?.('QUOTATION_UPDATED', `Vendor updated quotation ${editingQuotation.id.substring(0, 8)}`);
        onRefreshData?.();
        setEditingQuotation(null);
        setActiveView('list');
        alert('Quotation updated successfully!');
      } else {
        alert(data.message || 'Failed to update quotation.');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const startEdit = (q) => {
    setEditingQuotation(q);
    setFormPrice(String(q.price));
    setFormDeliveryDays(String(q.delivery_days));
    setFormComments(q.comments || '');
    setActiveView('edit');
  };

  const cancelEdit = () => {
    setEditingQuotation(null);
    setFormPrice('');
    setFormDeliveryDays('');
    setFormComments('');
    setActiveView('list');
  };

  // Sort & Filter
  const filtered = quotations.filter(q => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (q.rfq_id || '').toLowerCase().includes(s) ||
           (q.status || '').toLowerCase().includes(s) ||
           String(q.price).includes(s);
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    if (sortField === 'price' || sortField === 'delivery_days') {
      aVal = Number(a[sortField]) || 0;
      bVal = Number(b[sortField]) || 0;
    } else {
      aVal = new Date(a[sortField] || 0).getTime();
      bVal = new Date(b[sortField] || 0).getTime();
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
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SELECTED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DRAFT': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'WITHDRAWN': return 'bg-gray-50 text-gray-600 border-gray-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const canEdit = (q) => {
    return ['DRAFT', 'SUBMITTED'].includes(q.status);
  };

  const tabs = [
    { id: 'list', label: 'My Quotations', count: quotations.length },
    { id: 'submit', label: 'Submit New' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Quotation Management</h2>
        <p className="text-slate-500 text-base mt-1.5">Submit new quotations and manage your existing submissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveView(tab.id); if (tab.id !== 'edit') cancelEdit(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-bold transition cursor-pointer ${
              activeView === tab.id || (tab.id === 'submit' && activeView === 'edit')
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">{tab.count}</span>
            )}
          </button>
        ))}
        {activeView === 'edit' && (
          <span className="flex items-center px-4 py-2.5 rounded-xl text-base font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Edit3 className="w-4 h-4 mr-2" /> Editing Quotation
          </span>
        )}
      </div>

      {/* SUBMIT / EDIT FORM */}
      {(activeView === 'submit' || activeView === 'edit') && (
        <form onSubmit={activeView === 'edit' ? handleUpdate : handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="text-lg font-extrabold text-slate-900">
            {activeView === 'edit' ? 'Edit Quotation' : 'Submit New Quotation'}
          </h3>

          {/* RFQ Selection (only for new submissions) */}
          {activeView === 'submit' && (
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">Select RFQ *</label>
              <select
                value={formRfqId}
                onChange={(e) => setFormRfqId(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition cursor-pointer"
              >
                <option value="">Choose an RFQ...</option>
                {availableRfqs.map(r => (
                  <option key={r.id} value={r.id}>{r.title || r.id.substring(0, 8)} — {r.category || 'General'}</option>
                ))}
              </select>
              {availableRfqs.length === 0 && (
                <p className="text-sm text-amber-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> No open RFQs available or you've already submitted quotations for all.
                </p>
              )}
            </div>
          )}

          {activeView === 'edit' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
              Editing quotation for RFQ: <span className="font-bold font-mono">{editingQuotation?.rfq_id?.substring(0, 12)}...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">Price (₹) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  min="1"
                  step="0.01"
                  required
                  placeholder="Enter price"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">Delivery Time (days) *</label>
              <div className="relative">
                <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={formDeliveryDays}
                  onChange={(e) => setFormDeliveryDays(e.target.value)}
                  min="1"
                  required
                  placeholder="Delivery days"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-700 mb-2">Notes / Comments</label>
            <textarea
              value={formComments}
              onChange={(e) => setFormComments(e.target.value)}
              rows={3}
              placeholder="Any additional notes, warranty details, or special terms..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none"
            />
          </div>

          {activeView === 'submit' && (
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">Submission Type</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormStatus('SUBMITTED')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
                    formStatus === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Send className="w-4 h-4" /> Submit Now
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus('DRAFT')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition cursor-pointer ${
                    formStatus === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitLoading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 text-white rounded-xl text-base font-bold hover:bg-indigo-700 transition cursor-pointer disabled:opacity-60"
            >
              {submitLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (activeView === 'edit' ? <Edit3 className="w-5 h-5" /> : <Send className="w-5 h-5" />)}
              {activeView === 'edit' ? 'Update Quotation' : (formStatus === 'DRAFT' ? 'Save Draft' : 'Submit Quotation')}
            </button>
            {activeView === 'edit' && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-5 py-3.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-base font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* QUOTATION LIST */}
      {activeView === 'list' && (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotations by RFQ ID, status, or price..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Layers className="w-12 h-12 mb-3 opacity-30" />
                <span className="text-base font-bold">No quotations submitted yet.</span>
                <span className="text-sm mt-1">Submit your first quotation by selecting an open RFQ.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[
                        { key: 'rfq_id', label: 'RFQ ID' },
                        { key: 'price', label: 'Price (₹)' },
                        { key: 'delivery_days', label: 'Delivery' },
                        { key: 'status', label: 'Status' },
                        { key: 'submitted_at', label: 'Submitted' },
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
                    {sorted.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-4 text-base font-mono font-bold text-slate-700">{(q.rfq_id || '').substring(0, 8)}...</td>
                        <td className="px-5 py-4 text-base font-extrabold text-slate-900">₹{Number(q.price || 0).toLocaleString('en-IN')}</td>
                        <td className="px-5 py-4 text-base text-slate-600 font-medium">{q.delivery_days} days</td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider ${getStatusBadge(q.status)}`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500 font-medium">
                          {q.submitted_at ? new Date(q.submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-5 py-4">
                          {canEdit(q) && (
                            <button
                              onClick={() => startEdit(q)}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100 transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
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
        </>
      )}
    </div>
  );
}
