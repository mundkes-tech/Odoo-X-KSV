import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, Edit2, ShieldAlert, X, Check, XCircle, FileText, Send, Calendar, Users, Trash2 } from 'lucide-react';

export default function RfqManagement({ rfqs: initialRfqs, vendors, onAddLog, token, API_BASE, onRfqUpdate, onNavigateTab }) {
  const [rfqs, setRfqs] = useState(initialRfqs);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  const [selectedRfq, setSelectedRfq] = useState(null);
  const [assignedVendors, setAssignedVendors] = useState([]);
  const [vendorsSearch, setVendorsSearch] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: 1,
    deadline: '',
    attachment_url: '',
    status: 'PUBLISHED' // or DRAFT
  });

  const [formErrors, setFormErrors] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync prop changes
  useEffect(() => {
    setRfqs(initialRfqs);
  }, [initialRfqs]);

  // Fetch RFQs list from backend
  const fetchRfqs = async () => {
    if (!token || !API_BASE) return;
    try {
      const response = await fetch(`${API_BASE}/rfqs?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.rfqs) {
        setRfqs(data.rfqs);
        if (onRfqUpdate) onRfqUpdate(data.rfqs);
      }
    } catch (err) {
      console.warn("Failed to reload RFQs", err);
    }
  };

  // Create RFQ
  const handleCreateRfqSubmit = async (e, forceStatus = null) => {
    e.preventDefault();
    setFormErrors('');

    if (!formData.title || !formData.description || !formData.deadline || formData.quantity <= 0) {
      setFormErrors('All mandatory fields must be filled.');
      return;
    }

    const rfqStatus = forceStatus || formData.status;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/rfqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          quantity: Number(formData.quantity),
          deadline: new Date(formData.deadline).toISOString(),
          attachment_url: formData.attachment_url || null,
          status: rfqStatus
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create RFQ.');
      }

      onAddLog('RFQ_CREATED', `Procurement Officer created RFQ "${formData.title}" (${rfqStatus})`);
      setIsCreateModalOpen(false);
      fetchRfqs();
    } catch (err) {
      setFormErrors(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close RFQ
  const handleCloseRfq = async (rfqId) => {
    if (!window.confirm("Are you sure you want to CLOSE this RFQ? This will prevent further bids.")) return;
    try {
      const response = await fetch(`${API_BASE}/rfqs/${rfqId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'CLOSED' })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onAddLog('RFQ_CLOSED', `Procurement Officer closed RFQ ID: ${rfqId}`);
        fetchRfqs();
        if (isDetailsModalOpen) setIsDetailsModalOpen(false);
      }
    } catch (err) {
      console.warn("Failed to close RFQ", err);
    }
  };

  // Fetch Assigned Vendors for specific RFQ
  const fetchRfqVendors = async (rfqId) => {
    if (!token || !API_BASE) return;
    try {
      const response = await fetch(`${API_BASE}/rfqs/${rfqId}/vendors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.vendors) {
        setAssignedVendors(data.vendors);
      } else {
        setAssignedVendors([]);
      }
    } catch (err) {
      setAssignedVendors([]);
    }
  };

  const handleOpenDetails = (rfq) => {
    setSelectedRfq(rfq);
    fetchRfqVendors(rfq.id);
    setIsDetailsModalOpen(true);
  };

  const handleOpenAssign = (rfq) => {
    setSelectedRfq(rfq);
    fetchRfqVendors(rfq.id);
    setVendorsSearch('');
    setIsAssignModalOpen(true);
  };

  // Assign vendor
  const handleAssignVendor = async (vendorId) => {
    try {
      const response = await fetch(`${API_BASE}/rfqs/${selectedRfq.id}/assign-vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vendorIds: [vendorId] })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Assignment failed.');
      }
      onAddLog('RFQ_VENDORS_ASSIGNED', `Assigned vendor to RFQ "${selectedRfq.title}"`);
      fetchRfqVendors(selectedRfq.id);
    } catch (err) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  // Filters & Sorting
  const filteredRfqs = rfqs.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'ALL' || r.status === activeTab;

    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'qty_desc') return b.quantity - a.quantity;
    return 0;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PUBLISHED': return 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse';
      case 'VENDOR_SELECTED': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'APPROVED': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'CLOSED': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 select-none font-sans text-sm md:text-base">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">RFQ & Tender Workspace</h2>
          <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
            Create technical requirement specifications, assign vendor bidders, and track tender closing operations.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              title: '',
              description: '',
              quantity: 1,
              deadline: '',
              attachment_url: '',
              status: 'PUBLISHED'
            });
            setFormErrors('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer w-max self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Create RFQ</span>
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex gap-2 border-b border-slate-200 pb-0.5">
        {[
          { id: 'ALL', name: 'All RFQs' },
          { id: 'DRAFT', name: 'Drafts' },
          { id: 'PUBLISHED', name: 'Active' },
          { id: 'CLOSED', name: 'Closed' }
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

      {/* Control Pane */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search RFQs by title, ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        {/* Sorting option */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="qty_desc">Highest Quantity</option>
          </select>
        </div>
      </div>

      {/* List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4.5">RFQ ID</th>
                <th className="px-6 py-4.5">RFQ Title</th>
                <th className="px-6 py-4.5">Quantity</th>
                <th className="px-6 py-4.5">Deadline</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredRfqs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-14 text-slate-400 font-semibold text-sm">
                    No RFQs found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRfqs.map((rfq) => (
                  <tr key={rfq.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-mono font-bold text-slate-500">
                      {rfq.id.substring(0, 8).toUpperCase()}...
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-900">{rfq.title}</td>
                    <td className="px-6 py-5 font-semibold text-slate-700">{rfq.quantity} units</td>
                    <td className="px-6 py-5 text-slate-400 font-bold">
                      {new Date(rfq.deadline).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getStatusBadge(rfq.status)}`}>
                        {rfq.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(rfq)}
                          title="View Details"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {rfq.status === 'DRAFT' || rfq.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => handleOpenAssign(rfq)}
                            title="Assign Vendors"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Users className="w-5 h-5" />
                          </button>
                        ) : null}
                        {rfq.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => handleCloseRfq(rfq.id)}
                            title="Close RFQ"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE RFQ MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Create Request for Quotation</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateRfqSubmit(e)} className="p-5 space-y-4">
              {formErrors && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formErrors}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">RFQ Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  placeholder="e.g. Industrial Steel Supply"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white h-24 resize-none"
                  placeholder="Describe material specifications or service scopes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submission Deadline *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 focus:outline-none focus:border-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attachment Link (Optional)</label>
                <input
                  type="text"
                  value={formData.attachment_url}
                  onChange={(e) => setFormData({ ...formData, attachment_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  placeholder="https://example.com/specifications.pdf"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={(e) => handleCreateRfqSubmit(e, 'DRAFT')}
                  disabled={loading}
                  className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl cursor-pointer"
                >
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <span>Publish RFQ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RFQ DETAILS MODAL --- */}
      {isDetailsModalOpen && selectedRfq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">RFQ Details Specs</h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Tender Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">RFQ ID</span>
                    <span className="font-mono font-bold text-slate-800 block mt-1">{selectedRfq.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Tender Status</span>
                    <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider block mt-1 w-max ${getStatusBadge(selectedRfq.status)}`}>
                      {selectedRfq.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">RFQ Title</span>
                    <span className="font-extrabold text-slate-900 block mt-1">{selectedRfq.title}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Specifications</span>
                    <p className="font-medium text-slate-700 mt-1 leading-relaxed">{selectedRfq.description}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Required Quantity</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedRfq.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Submission Deadline</span>
                    <span className="font-extrabold text-slate-800 block mt-1">
                      {new Date(selectedRfq.deadline).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {selectedRfq.attachment_url && (
                    <div className="col-span-2">
                      <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Technical Drawings URL</span>
                      <a href={selectedRfq.attachment_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-bold truncate block mt-1">
                        {selectedRfq.attachment_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Invited Vendors */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Assigned Vendor Bidders</h4>
                {assignedVendors.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic">No vendors assigned to this RFQ yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {assignedVendors.map((v) => (
                      <div key={v.id} className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3 text-sm">
                        <div>
                          <span className="font-extrabold text-slate-800 block">{v.company_name}</span>
                          <span className="text-[11px] text-slate-400 font-bold block mt-0.5">{v.category} • GST: {v.gst_number}</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                          Invited
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex gap-2 text-sm">
                {selectedRfq.status === 'PUBLISHED' && (
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      handleOpenAssign(selectedRfq);
                    }}
                    className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Manage Assigned Vendors
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    onNavigateTab('quotations');
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  View Received Quotations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGN VENDORS MODAL --- */}
      {isAssignModalOpen && selectedRfq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Assign Vendor Bidders</h3>
                <span className="text-xs text-slate-400 font-semibold block mt-0.5">Tender: {selectedRfq.title}</span>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search active vendor database..."
                  value={vendorsSearch}
                  onChange={(e) => setVendorsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-350 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Available Registry Bidders</span>
                
                {vendors
                  .filter(v => v.status === 'ACTIVE' && v.company_name.toLowerCase().includes(vendorsSearch.toLowerCase()))
                  .map(v => {
                    const isAlreadyAssigned = assignedVendors.some(av => av.id === v.id);
                    return (
                      <div key={v.id} className="flex justify-between items-center bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs">
                        <div>
                          <span className="font-extrabold text-slate-800 block">{v.company_name}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{v.category} • GST: {v.gst_number}</span>
                        </div>
                        {isAlreadyAssigned ? (
                          <span className="flex items-center gap-1 font-bold text-emerald-600">
                            <Check className="w-4.5 h-4.5" />
                            <span>Assigned</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAssignVendor(v.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Assign Bidder
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
