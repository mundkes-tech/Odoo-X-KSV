import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Plus, Eye, Download, Mail, Clock, 
  CheckCircle2, XCircle, FileSpreadsheet, Send, FileText, ChevronRight, X 
} from 'lucide-react';

export default function PoManagement({ 
  initialPurchaseOrders, 
  quotations, 
  onAddLog, 
  token, 
  API_BASE, 
  onNavigateTab 
}) {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const [selectedPo, setSelectedPo] = useState(null);
  
  // Create Form State
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Email Form State
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Sync prop changes
  useEffect(() => {
    if (initialPurchaseOrders) {
      setPurchaseOrders(initialPurchaseOrders);
    }
  }, [initialPurchaseOrders]);

  // Fetch POs from backend
  const fetchPurchaseOrders = async () => {
    if (!token || !API_BASE) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/purchase-orders?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const list = data.data?.purchaseOrders || data.purchase_orders || data.data || [];
        if (Array.isArray(list)) {
          setPurchaseOrders(list.map(p => ({
            id: p.id,
            po_number: p.po_number || `PO-${p.id.substring(0,5)}`,
            total_amount: Number(p.total_amount),
            status: p.status,
            created_at: p.created_at,
            vendor: p.vendor || { company_name: p.vendor_name || 'Vendor' },
            quotation: p.quotation || { price: Number(p.total_amount) },
            rfq: p.rfq || { title: p.rfq_title || 'RFQ Requirement' }
          })));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch Purchase Orders from backend", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [token]);

  // Create Purchase Order
  const handleCreatePoSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!selectedQuoteId) {
      setCreateError('Please select an approved quotation.');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`${API_BASE}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          quotationId: selectedQuoteId,
          special_instructions: specialInstructions 
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create Purchase Order.');
      }

      const generatedNumber = data.data?.po_number || 'New PO';
      onAddLog('PURCHASE_ORDER_GENERATED', `Generated Purchase Order ${generatedNumber} for Quotation ID: ${selectedQuoteId}`);
      alert(`Purchase Order ${generatedNumber} generated successfully!`);
      setIsCreateModalOpen(false);
      setSelectedQuoteId('');
      setSpecialInstructions('');
      fetchPurchaseOrders();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Update PO Status (e.g. mark Sent, Completed)
  const handleUpdateStatus = async (poId, status) => {
    if (!window.confirm(`Are you sure you want to transition this Purchase Order to ${status}?`)) return;
    try {
      const response = await fetch(`${API_BASE}/purchase-orders/${poId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Status update failed.');
      }
      onAddLog('PURCHASE_ORDER_STATUS_UPDATED', `Updated Purchase Order status to ${status} for ID: ${poId}`);
      alert(`Purchase Order updated to ${status}!`);
      
      // Update local object
      if (selectedPo && selectedPo.id === poId) {
        setSelectedPo(prev => ({ ...prev, status }));
      }
      fetchPurchaseOrders();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (poId, filename) => {
    try {
      const res = await fetch(`${API_BASE}/purchase-orders/${poId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to generate PDF on server.');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onAddLog('PO_PDF_DOWNLOADED', `Downloaded PDF for Purchase Order ${filename}`);
    } catch (err) {
      alert("Failed to download PDF: " + err.message);
    }
  };

  // Send Email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailError('');

    if (!emailAddress) {
      setEmailError('Please provide a valid recipient email.');
      return;
    }

    setEmailLoading(true);
    try {
      const response = await fetch(`${API_BASE}/emails/send-purchase-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          purchaseOrderId: selectedPo.id,
          email: emailAddress
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch email.');
      }

      alert(`Purchase Order ${selectedPo.po_number} successfully emailed to ${emailAddress}`);
      onAddLog('PO_EMAILED', `Sent Purchase Order ${selectedPo.po_number} to ${emailAddress}`);
      setIsEmailModalOpen(false);
      setEmailAddress('');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Filter & Sort POs
  const filteredPOs = purchaseOrders.filter((po) => {
    const vendorName = po.vendor?.company_name || '';
    const poNum = po.po_number || '';
    const rfqTitle = po.rfq?.title || '';
    
    const matchesSearch = vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          poNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rfqTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'ALL' || po.status === activeTab;
    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'amount_desc') return b.total_amount - a.total_amount;
    if (sortBy === 'amount_asc') return a.total_amount - b.total_amount;
    return 0;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CREATED': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'SENT': return 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
      case 'ACCEPTED': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 select-none font-sans text-base">
      
      {/* Welcome & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Purchase Order Desk</h2>
          <p className="text-slate-500 text-base mt-1.5 leading-normal">
            Generate official binding Purchase Orders from approved quotations, dispatch drafts to vendors, and manage fulfillment status.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError('');
            setSelectedQuoteId('');
            setSpecialInstructions('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer w-max self-start sm:self-auto"
        >
          <Plus className="w-5.5 h-5.5" />
          <span>Generate PO</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0.5">
        {[
          { id: 'ALL', name: 'All Orders' },
          { id: 'CREATED', name: 'Draft' },
          { id: 'SENT', name: 'Dispatched' },
          { id: 'ACCEPTED', name: 'Accepted' },
          { id: 'COMPLETED', name: 'Completed' },
          { id: 'REJECTED', name: 'Rejected' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3.5 border-b-2 font-extrabold text-base transition-all cursor-pointer ${
              activeTab === t.id 
                ? 'border-blue-600 text-blue-700 font-black' 
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5.5 h-5.5" />
          <input
            type="text"
            placeholder="Search POs by Vendor, Number, or RFQ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-350 rounded-xl text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-base font-bold text-slate-650 focus:outline-none cursor-pointer"
          >
            <option value="date_desc">Date: Newest First</option>
            <option value="date_asc">Date: Oldest First</option>
            <option value="amount_desc">Amount: High to Low</option>
            <option value="amount_asc">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* PO List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-sm font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4.5">PO Number</th>
                <th className="px-6 py-4.5">Recipient Vendor</th>
                <th className="px-6 py-4.5">Requirement Specs</th>
                <th className="px-6 py-4.5">Total Amount</th>
                <th className="px-6 py-4.5">Fulfillment Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-14 text-slate-400 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing purchase ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-14 text-slate-400 font-semibold">
                    No Purchase Orders found.
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => {
                  const vendorName = po.vendor?.company_name || 'Vendor';
                  const rfqTitle = po.rfq?.title || 'RFQ Specs';
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 font-mono font-bold text-slate-700">
                        {po.po_number}
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-900">{vendorName}</td>
                      <td className="px-6 py-5 font-semibold text-slate-500 truncate max-w-xs">{rfqTitle}</td>
                      <td className="px-6 py-5 font-extrabold text-slate-900">
                        ₹{new Intl.NumberFormat('en-IN').format(po.total_amount)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getStatusBadge(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedPo(po);
                              setIsDetailsModalOpen(true);
                            }}
                            title="View PO Details"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye className="w-5.5 h-5.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(po.id, po.po_number)}
                            title="Download PDF"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Download className="w-5.5 h-5.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- GENERATE PO MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Generate Official Purchase Order</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="p-5 space-y-4">
              {createError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Approved Quotation Award *</label>
                <select
                  value={selectedQuoteId}
                  onChange={(e) => setSelectedQuoteId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Select Quotation --</option>
                  {quotations.filter(q => q.status === 'APPROVED').map(q => (
                    <option key={q.id} value={q.id}>
                      {q.vendor?.company_name || q.vendor_name} - ₹{new Intl.NumberFormat('en-IN').format(q.price)} (Tender: {q.rfq?.title || q.rfq_title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Special Logistics Instructions</label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 focus:outline-none focus:border-slate-350 focus:bg-white h-24 resize-none"
                  placeholder="e.g. Delivery required by next Friday, gate entry terms, special packaging instructions..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3 border border-slate-200 text-slate-655 hover:bg-slate-50 font-bold rounded-xl cursor-pointer text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-base"
                >
                  {createLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <span>Generate PO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PO DETAILS MODAL --- */}
      {isDetailsModalOpen && selectedPo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Purchase Order specifications</h3>
                <span className="text-xs text-slate-400 font-bold block mt-0.5">PO Number: {selectedPo.po_number}</span>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-base">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Fulfillment Status</span>
                  <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider block mt-1 w-max ${getStatusBadge(selectedPo.status)}`}>
                    {selectedPo.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Creation Date</span>
                  <span className="font-extrabold text-slate-800 block mt-1">
                    {new Date(selectedPo.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Awarded Vendor Partner</span>
                  <span className="font-extrabold text-slate-950 block mt-1">{selectedPo.vendor?.company_name || 'Vendor'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Requirement Title</span>
                  <span className="font-extrabold text-slate-850 block mt-1">{selectedPo.rfq?.title || 'Specs'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Purchase Value</span>
                  <span className="font-extrabold text-indigo-600 text-lg block mt-1">
                    ₹{new Intl.NumberFormat('en-IN').format(selectedPo.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Expected Timeline</span>
                  <span className="font-extrabold text-slate-800 block mt-1">
                    {selectedPo.quotation?.delivery_days || 'N/A'} Delivery Days
                  </span>
                </div>
                {selectedPo.special_instructions && (
                  <div className="col-span-2 bg-slate-50 border border-slate-150 rounded-xl p-3.5">
                    <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wide">Logistics Terms</span>
                    <p className="font-medium text-slate-700 text-sm mt-1 leading-relaxed">{selectedPo.special_instructions}</p>
                  </div>
                )}
              </div>

              {/* Status Update Options */}
              <div className="border-t border-slate-100 pt-4.5 space-y-3">
                <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wide">Change Fulfillment Stage</span>
                <div className="flex gap-2">
                  {selectedPo.status === 'CREATED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPo.id, 'SENT')}
                      className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Dispatch to Vendor
                    </button>
                  )}
                  {selectedPo.status === 'ACCEPTED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPo.id, 'COMPLETED')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {selectedPo.status !== 'COMPLETED' && selectedPo.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPo.id, 'CANCELLED')}
                      className="py-2 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {/* Dispatch Options */}
              <div className="border-t border-slate-100 pt-4.5 flex gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedPo.id, selectedPo.po_number)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl transition-all cursor-pointer text-sm"
                >
                  <Download className="w-4.5 h-4.5 text-slate-450" />
                  <span>Download PDF Spec</span>
                </button>
                <button
                  onClick={() => {
                    setEmailError('');
                    setEmailAddress('');
                    setIsEmailModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer text-sm"
                >
                  <Mail className="w-4.5 h-4.5" />
                  <span>Email Vendor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EMAIL MODAL --- */}
      {isEmailModalOpen && selectedPo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm">Email Document: {selectedPo.po_number}</h4>
              <button onClick={() => setIsEmailModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-4 space-y-4">
              {emailError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-lg">
                  {emailError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-700 focus:outline-none"
                  placeholder="vendor@company.com"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {emailLoading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Send Mail</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
