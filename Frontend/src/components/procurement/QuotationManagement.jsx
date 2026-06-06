import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle2, XCircle, ArrowUpDown, Shield, AlertCircle, FileText, BarChart3, Download } from 'lucide-react';

export default function QuotationManagement({ initialQuotations, rfqs, onAddLog, token, API_BASE, onNavigateTab }) {
  const [quotations, setQuotations] = useState(initialQuotations);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('price_asc');

  // Modals
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [compareRfqId, setCompareRfqId] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (initialQuotations) {
      setQuotations(initialQuotations);
    }
  }, [initialQuotations]);

  // Fetch all quotations from backend
  const fetchQuotations = async () => {
    if (!token || !API_BASE) return;
    try {
      const response = await fetch(`${API_BASE}/quotations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        // Mapped quotations
        setQuotations(data.data);
      }
    } catch (err) {
      console.warn("Failed to reload quotations", err);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Fetch side-by-side comparison for a selected RFQ
  const handleLoadComparison = async (rfqId) => {
    if (!rfqId) {
      setComparisonData(null);
      return;
    }
    setCompareLoading(true);
    try {
      const response = await fetch(`${API_BASE}/rfqs/${rfqId}/comparison`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        setComparisonData(data.data);
      } else {
        setComparisonData(null);
      }
    } catch (err) {
      console.warn("Failed to load comparison data", err);
      setComparisonData(null);
    } finally {
      setCompareLoading(false);
    }
  };

  useEffect(() => {
    if (compareRfqId) {
      handleLoadComparison(compareRfqId);
    }
  }, [compareRfqId]);

  // Select winning vendor quotation
  const handleSelectWinner = async (quotationId) => {
    if (!window.confirm("Are you sure you want to award the contract to this vendor? Other bids will be automatically rejected.")) return;
    try {
      const response = await fetch(`${API_BASE}/rfqs/${compareRfqId}/select-vendor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quotationId })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Selection failed.');
      }

      onAddLog('VENDOR_SELECTED', `Awarded contract for RFQ: "${comparisonData?.rfq?.title}" to selected vendor.`);
      alert("Vendor selected successfully! The RFQ has been marked as VENDOR SELECTED.");
      
      // Reload comparisons and quotations
      handleLoadComparison(compareRfqId);
      fetchQuotations();
      
      // Navigate to approvals request
      setTimeout(() => {
        onNavigateTab('approvals');
      }, 500);
    } catch (err) {
      alert(`Selection failed: ${err.message}`);
    }
  };

  // Filters & Sorting
  const filteredQuotations = quotations.filter((q) => {
    // Access vendor and rfq detail mappings
    const vendorName = q.vendor?.company_name || q.vendor_name || '';
    const rfqTitle = q.rfq?.title || q.rfq_title || '';
    const matchesSearch = vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rfqTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'ALL' || q.status === activeTab;

    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'delivery_asc') return a.delivery_days - b.delivery_days;
    return 0;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'SELECTED': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Export comparison text file
  const handleExportComparison = () => {
    if (!comparisonData) return;
    let text = `====================================================\n`;
    text += `QUOTATION COMPARISON REPORT: ${comparisonData.rfq?.title}\n`;
    text += `====================================================\n\n`;
    text += `RFQ Description: ${comparisonData.rfq?.description}\n`;
    text += `Required Qty: ${comparisonData.rfq?.quantity} units\n`;
    text += `Tender Status: ${comparisonData.rfq?.status}\n\n`;
    
    text += `BIDS RECEIVED:\n`;
    comparisonData.quotations.forEach((q, i) => {
      text += `${i+1}. Vendor: ${q.vendor_name}\n`;
      text += `   Bid Price: ₹${q.price}\n`;
      text += `   Delivery: ${q.delivery_days} Days\n`;
      text += `   Remarks/Comments: ${q.comments || 'N/A'}\n`;
      text += `   Status: ${q.quotation_status}\n`;
      if (q.isLowestPrice) text += `   * HIGHLIGHT: Lowest Quoted Price *\n`;
      if (q.isFastestDelivery) text += `   * HIGHLIGHT: Fastest Delivery *\n`;
      text += `\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `quotation_comparison_${compareRfqId.substring(0,8)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none font-sans text-sm md:text-base">
      
      {/* Tab Select Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isComparing ? 'Side-by-Side Quotation Comparison' : 'Received Quotations Register'}
          </h2>
          <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
            {isComparing 
              ? 'Evaluate bidder proposals side-by-side with automatic highlight analytics for lowest price and fastest timeline.' 
              : 'Monitor submitted bids, audit delivery terms, check financial parameters, and trigger side-by-side matrices.'
            }
          </p>
        </div>
        <button
          onClick={() => {
            setIsComparing(!isComparing);
            setCompareRfqId('');
            setComparisonData(null);
          }}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer w-max self-start sm:self-auto"
        >
          <BarChart3 className="w-5 h-5" />
          <span>{isComparing ? 'Back to List' : 'Compare Quotations'}</span>
        </button>
      </div>

      {/* --- WORKSPACE 1: COMPARISON VIEW --- */}
      {isComparing ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">1. Select RFQ to Compare Bids</label>
            <select
              value={compareRfqId}
              onChange={(e) => setCompareRfqId(e.target.value)}
              className="w-full max-w-lg px-3.5 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">-- Choose an RFQ from the list --</option>
              {rfqs.filter(r => r.status === 'PUBLISHED' || r.status === 'VENDOR_SELECTED' || r.status === 'APPROVED').map(r => (
                <option key={r.id} value={r.id}>{r.title} (ID: {r.id.substring(0,8).toUpperCase()})</option>
              ))}
            </select>
          </div>

          {compareLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!compareLoading && comparisonData && (
            <div className="space-y-6">
              {/* Info grid */}
              <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">RFQ Requirement Title</span>
                  <h3 className="text-xl font-extrabold text-white">{comparisonData.rfq?.title}</h3>
                  <p className="text-slate-350 text-xs mt-1.5 leading-relaxed">{comparisonData.rfq?.description}</p>
                </div>
                <div className="space-y-3.5 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-850 pt-4 md:pt-0 md:pl-6 text-sm flex flex-col justify-center">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Required Quantity</span>
                    <span className="font-extrabold text-blue-400 block mt-0.5">{comparisonData.rfq?.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Tender Status</span>
                    <span className="font-extrabold text-white block mt-0.5 uppercase tracking-wide">{comparisonData.rfq?.status}</span>
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h4 className="text-sm font-extrabold text-slate-900">Bid Evaluation Comparison Matrix</h4>
                  <button
                    onClick={handleExportComparison}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-450" />
                    <span>Export Comparison</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4.5">Bidder Company</th>
                        <th className="px-6 py-4.5">Quoted Price</th>
                        <th className="px-6 py-4.5">Delivery Timeline</th>
                        <th className="px-6 py-4.5">Vendor Remarks</th>
                        <th className="px-6 py-4.5">Status</th>
                        <th className="px-6 py-4.5 text-right">Selection Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {comparisonData.quotations.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-14 text-slate-400 font-semibold">
                            No bids received from assigned vendors for this RFQ yet.
                          </td>
                        </tr>
                      ) : (
                        comparisonData.quotations.map((q) => (
                          <tr key={q.quotation_id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-5">
                              <span className="font-extrabold text-slate-900 block">{q.vendor_name}</span>
                              <div className="flex gap-2 mt-1.5">
                                {q.isLowestPrice && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold uppercase">
                                    Lowest Price
                                  </span>
                                )}
                                {q.isFastestDelivery && (
                                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-extrabold uppercase">
                                    Fastest Delivery
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-5 font-bold text-slate-900">
                              ₹{new Intl.NumberFormat('en-IN').format(q.price)}
                            </td>
                            <td className="px-6 py-5 font-bold text-slate-700">
                              {q.delivery_days} days
                            </td>
                            <td className="px-6 py-5 text-slate-500 font-semibold max-w-xs truncate">
                              {q.comments || 'N/A'}
                            </td>
                            <td className="px-6 py-5">
                              <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getStatusBadge(q.quotation_status)}`}>
                                {q.quotation_status}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              {comparisonData.rfq?.status === 'PUBLISHED' && q.quotation_status === 'SUBMITTED' ? (
                                <button
                                  onClick={() => handleSelectWinner(q.quotation_id)}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                                >
                                  Award Contract
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 font-bold uppercase">Disabled</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* --- WORKSPACE 2: LIST VIEW --- */
        <div className="space-y-6">
          {/* Tabs list */}
          <div className="flex gap-2 border-b border-slate-200 pb-0.5">
            {[
              { id: 'ALL', name: 'All Bids' },
              { id: 'SUBMITTED', name: 'Submitted' },
              { id: 'SELECTED', name: 'Selected' },
              { id: 'APPROVED', name: 'Approved' }
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

          {/* Search bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search bids by vendor or RFQ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="delivery_asc">Timeline: Fastest First</option>
              </select>
            </div>
          </div>

          {/* Quotations table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4.5">Bidder Vendor</th>
                    <th className="px-6 py-4.5">Related RFQ Title</th>
                    <th className="px-6 py-4.5">Bid Price</th>
                    <th className="px-6 py-4.5">Delivery Period</th>
                    <th className="px-6 py-4.5">Status</th>
                    <th className="px-6 py-4.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-14 text-slate-400 font-semibold text-sm">
                        No quotations registered.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q) => {
                      const vendorName = q.vendor?.company_name || q.vendor_name || 'Vendor';
                      const rfqTitle = q.rfq?.title || q.rfq_title || 'RFQ';
                      return (
                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5 font-bold text-slate-900">{vendorName}</td>
                          <td className="px-6 py-5 font-semibold text-slate-500">{rfqTitle}</td>
                          <td className="px-6 py-5 font-extrabold text-slate-900">
                            ₹{new Intl.NumberFormat('en-IN').format(q.price)}
                          </td>
                          <td className="px-6 py-5 font-bold text-slate-700">{q.delivery_days} days</td>
                          <td className="px-6 py-5">
                            <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getStatusBadge(q.status)}`}>
                              {q.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button
                              onClick={() => {
                                setSelectedQuotation(q);
                                setIsDetailsOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAILS DIALOG --- */}
      {isDetailsOpen && selectedQuotation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Quotation Details Specifications</h3>
              <button onClick={() => setIsDetailsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Bidder & RFQ specs</h4>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Vendor Name</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedQuotation.vendor?.company_name || selectedQuotation.vendor_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">RFQ Requirement</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedQuotation.rfq?.title || selectedQuotation.rfq_title}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Financial & Logistics details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Quoted Price</span>
                    <span className="font-extrabold text-indigo-600 text-lg block mt-1">₹{new Intl.NumberFormat('en-IN').format(selectedQuotation.price)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Lead Delivery Time</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedQuotation.delivery_days} calendar days</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Vendor Comments/Justification</span>
                    <p className="font-medium text-slate-600 mt-1.5 leading-relaxed bg-slate-50 border border-slate-150 rounded-xl p-3.5">
                      {selectedQuotation.comments || 'No comment remarks provided by the vendor.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
