import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, CheckCircle2, XCircle, FileText, Send, User, ChevronRight } from 'lucide-react';

export default function ApprovalRequest({ quotations, onAddLog, token, API_BASE }) {
  const [approvals, setApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Submit states
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch approvals list from backend
  const fetchApprovals = async () => {
    if (!token || !API_BASE) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/approvals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.data && data.data.approvals) {
        setApprovals(data.data.approvals);
      }
    } catch (err) {
      console.warn("Failed to fetch approvals list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // Submit selected quotation for manager approval
  const handleSubmitApproval = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedQuoteId) {
      setSubmitError('Please select a quotation to submit.');
      return;
    }

    setSubmitLoading(true);
    try {
      const response = await fetch(`${API_BASE}/approvals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quotationId: selectedQuoteId })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed.');
      }

      onAddLog('APPROVAL_REQUESTED', `Submitted quotation request ID: ${selectedQuoteId} for Manager review.`);
      alert("Approval request submitted successfully!");
      setIsSubmitOpen(false);
      fetchApprovals();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const filteredApprovals = approvals.filter(a => activeTab === 'ALL' || a.status === activeTab);

  return (
    <div className="space-y-6 select-none font-sans text-sm md:text-base">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Procurement Approvals Panel</h2>
          <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
            Submit selected winning quotations for managerial budget approval and track review decisions.
          </p>
        </div>
        <button
          onClick={() => {
            setSubmitError('');
            setSelectedQuoteId('');
            setIsSubmitOpen(true);
          }}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer w-max self-start sm:self-auto"
        >
          <Send className="w-5 h-5" />
          <span>Request Approval</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0.5">
        {[
          { id: 'ALL', name: 'All Requests' },
          { id: 'PENDING', name: 'Pending Review' },
          { id: 'APPROVED', name: 'Approved' },
          { id: 'REJECTED', name: 'Rejected Bids' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4.5 py-3 border-b-2 font-extrabold text-sm transition-all cursor-pointer ${
              activeTab === t.id 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Approvals Timeline list */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-semibold italic">No approval requests registered.</div>
        ) : (
          <div className="relative border-l border-slate-200 pl-7 ml-3 space-y-6">
            {filteredApprovals.map((app) => (
              <div key={app.id} className="relative group">
                {/* Node icon */}
                <div className={`absolute -left-[40px] top-0 p-1.5 rounded-full border bg-white shadow-sm transition-all ${
                  app.status === 'PENDING' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                  app.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                  'bg-rose-50 border-rose-100 text-rose-600'
                }`}>
                  {app.status === 'PENDING' ? <Clock className="w-4.5 h-4.5" /> :
                   app.status === 'APPROVED' ? <CheckCircle2 className="w-4.5 h-4.5" /> :
                   <XCircle className="w-4.5 h-4.5" />}
                </div>

                <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-2xl p-4.5 transition-colors">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                      Request ID: {app.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <h4 className="text-slate-900 text-base font-extrabold">{app.rfq_title}</h4>
                  <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <div>
                      <span>Selected Vendor</span>
                      <span className="block font-extrabold text-slate-800 text-sm mt-1">{app.vendor_name}</span>
                    </div>
                    <div>
                      <span>Quotation Value</span>
                      <span className="block font-extrabold text-indigo-600 text-sm mt-1">₹{new Intl.NumberFormat('en-IN').format(app.price)}</span>
                    </div>
                    {app.manager_name && (
                      <div>
                        <span>Reviewed By</span>
                        <span className="block font-extrabold text-slate-800 text-sm mt-1 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-450" />
                          {app.manager_name}
                        </span>
                      </div>
                    )}
                  </div>

                  {app.remarks && (
                    <div className="mt-3.5 p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Manager Evaluation Comments:</span>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{app.remarks}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-1.5 text-xs">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-extrabold uppercase ${getStatusStyle(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- REQUEST APPROVAL MODAL --- */}
      {isSubmitOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Submit Quotation for Approval</h3>
              <button onClick={() => setIsSubmitOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApproval} className="p-5 space-y-4">
              {submitError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Choose a quotation that you have marked as winner (status <strong>SELECTED</strong>) to submit to managers.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Quotation Winner Selection</label>
                <select
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Choose a quotation --</option>
                  {quotations.filter(q => q.status === 'SELECTED').map(q => (
                    <option key={q.id} value={q.id}>
                      {q.vendor?.company_name || q.vendor_name} - ₹{new Intl.NumberFormat('en-IN').format(q.price)} (Tender: {q.rfq?.title || q.rfq_title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <span>Submit to Manager</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
