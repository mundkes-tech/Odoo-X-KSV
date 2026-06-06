import { 
  Search, Filter, Plus, Eye, Download, Mail, Clock, 
  CheckCircle2, XCircle, Receipt, Send, FileText, ChevronRight, X, Printer
} from 'lucide-react';

export default function InvoiceManagement({ 
  initialInvoices, 
  purchaseOrders, 
  onAddLog, 
  token, 
  API_BASE 
}) {
  const [invoices, setInvoices] = useState(initialInvoices || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Create Form State
  const [selectedPoId, setSelectedPoId] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Email Form State
  const [emailAddress, setEmailAddress] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Sync prop changes
  useEffect(() => {
    if (initialInvoices) {
      setInvoices(initialInvoices);
    }
  }, [initialInvoices]);

  // Fetch Invoices from backend
  const fetchInvoices = async () => {
    if (!token || !API_BASE) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/invoices?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const list = data.data.invoices || data.data;
        if (Array.isArray(list)) {
          setInvoices(list.map(i => ({
            id: i.id,
            invoice_number: i.invoice_number,
            subtotal: Number(i.subtotal),
            tax_amount: Number(i.tax_amount),
            total_amount: Number(i.total_amount),
            status: i.status === 'GENERATED' ? 'PENDING' : i.status,
            created_at: i.created_at,
            purchase_order: i.purchase_order || { po_number: i.po_number || 'PO' },
            vendor: i.vendor || { company_name: i.vendor_name || 'Vendor' }
          })));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch Invoices from backend", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [token]);

  // Create Invoice
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!selectedPoId) {
      setCreateError('Please select a valid Purchase Order.');
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ purchaseOrderId: selectedPoId })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate Invoice.');
      }

      const generatedNumber = data.data?.invoice_number || 'New Invoice';
      onAddLog('INVOICE_GENERATED', `Generated Tax Invoice ${generatedNumber} for Purchase Order ID: ${selectedPoId}`);
      alert(`Invoice ${generatedNumber} generated successfully with 18% GST calculation!`);
      setIsCreateModalOpen(false);
      setSelectedPoId('');
      fetchInvoices();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Update Invoice Status
  const handleUpdateStatus = async (invoiceId, status) => {
    if (!window.confirm(`Are you sure you want to update this Invoice status to ${status}?`)) return;
    try {
      // Map PENDING back to GENERATED on backend if needed
      const backendStatus = status === 'PENDING' ? 'GENERATED' : status;
      const response = await fetch(`${API_BASE}/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: backendStatus })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Status update failed.');
      }
      onAddLog('INVOICE_STATUS_UPDATED', `Updated Invoice status to ${status} for ID: ${invoiceId}`);
      alert(`Invoice status updated to ${status}!`);
      
      // Update local object
      if (selectedInvoice && selectedInvoice.id === invoiceId) {
        setSelectedInvoice(prev => ({ ...prev, status }));
      }
      fetchInvoices();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (invoiceId, filename) => {
    try {
      const res = await fetch(`${API_BASE}/invoices/${invoiceId}/pdf`, {
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
      onAddLog('INVOICE_PDF_DOWNLOADED', `Downloaded PDF for Invoice ${filename}`);
    } catch (err) {
      alert("Failed to download PDF: " + err.message);
    }
  };

  // Print Invoice
  const handlePrintInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    const vendorName = invoice.vendor?.company_name || 'Vendor';
    const poNum = invoice.purchase_order?.po_number || 'PO';
    const subtotal = Number(invoice.subtotal || 0);
    const taxAmount = Number(invoice.tax_amount || 0);
    const totalAmount = Number(invoice.total_amount || 0);
    const cgst = Number((subtotal * 0.09).toFixed(2));
    const sgst = Number((subtotal * 0.09).toFixed(2));
    
    printWindow.document.write(`
      <html>
      <head>
        <title>Invoice - \${invoice.invoice_number}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
          .header-table { width: 100%; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .company-logo { font-size: 24px; font-weight: bold; color: #1e3a8a; }
          .doc-title { text-align: right; font-size: 24px; font-weight: bold; text-transform: uppercase; color: #555; }
          .info-table { width: 100%; margin-bottom: 30px; }
          .info-cell { width: 50%; vertical-align: top; font-size: 14px; line-height: 1.6; }
          .info-label { font-weight: bold; color: #666; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th { border-bottom: 2px solid #ddd; text-align: left; padding: 10px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #555; }
          .items-table td { border-bottom: 1px solid #eee; padding: 10px; font-size: 14px; }
          .totals-table { width: 300px; float: right; border-collapse: collapse; margin-bottom: 30px; }
          .totals-table td { padding: 8px 10px; font-size: 14px; }
          .totals-table tr.grand-total { border-top: 2px solid #333; font-weight: bold; font-size: 16px; color: #1e3a8a; }
          .footer { clear: both; text-align: center; font-size: 12px; color: #999; border-top: 1px dashed #ccc; padding-top: 20px; margin-top: 50px; }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="company-logo">VendorBridge ERP</td>
            <td class="doc-title">Tax Invoice</td>
          </tr>
        </table>
        
        <table class="info-table">
          <tr>
            <td class="info-cell">
              <div class="info-label">Billing From (Vendor)</div>
              <strong>\${vendorName}</strong><br/>
              GSTIN: \${invoice.vendor?.gst_number || '-'}<br/>
              Address: \${invoice.vendor?.address || '-'}<br/>
              Phone: \${invoice.vendor?.phone || '-'}<br/>
              Email: \${invoice.vendor?.email || '-'}
            </td>
            <td class="info-cell" style="padding-left: 50px;">
              <div class="info-label">Invoice Details</div>
              <strong>Invoice No:</strong> \${invoice.invoice_number}<br/>
              <strong>Date:</strong> \${new Date(invoice.created_at).toLocaleDateString('en-IN')}<br/>
              <strong>Purchase Order:</strong> \${poNum}<br/>
              <strong>Payment Status:</strong> \${invoice.status}<br/>
              <strong>Tax Code:</strong> CGST/SGST 18%
            </td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Subtotal</th>
              <th style="text-align: right;">GST Rate</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supply of Goods/Services under \${poNum} - \${invoice.purchase_order?.rfq?.title || 'Procurement Requirement'}</td>
              <td style="text-align: right;">₹\${new Intl.NumberFormat('en-IN').format(subtotal)}</td>
              <td style="text-align: right;">18.00%</td>
              <td style="text-align: right;">₹\${new Intl.NumberFormat('en-IN').format(totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">₹\${new Intl.NumberFormat('en-IN').format(subtotal)}</td>
          </tr>
          <tr>
            <td>CGST (9%):</td>
            <td style="text-align: right;">₹\${new Intl.NumberFormat('en-IN').format(cgst)}</td>
          </tr>
          <tr>
            <td>SGST (9%):</td>
            <td style="text-align: right;">₹\${new Intl.NumberFormat('en-IN').format(sgst)}</td>
          </tr>
          <tr class="grand-total">
            <td>Grand Total:</td>
            <td style="text-align: right;">₹\${new Intl.NumberFormat('en-IN').format(totalAmount)}</td>
          </tr>
        </table>

        <div class="footer">
          Thank you for your business.<br/>
          Generated by VendorBridge ERP System on \${new Date().toLocaleDateString('en-IN')}
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    onAddLog('INVOICE_PRINTED', `Triggered print layout for Invoice \${invoice.invoice_number}`);
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
      const response = await fetch(`${API_BASE}/emails/send-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          email: emailAddress
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch email.');
      }

      alert(`Invoice ${selectedInvoice.invoice_number} successfully emailed to ${emailAddress}`);
      onAddLog('INVOICE_EMAILED', `Sent Invoice ${selectedInvoice.invoice_number} to ${emailAddress}`);
      setIsEmailModalOpen(false);
      setEmailAddress('');
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailLoading(false);
    }
  };

  // Filter & Sort Invoices
  const filteredInvoices = invoices.filter((i) => {
    const vendorName = i.vendor?.company_name || '';
    const invNum = i.invoice_number || '';
    const poNum = i.purchase_order?.po_number || '';
    
    const matchesSearch = vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          poNum.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'ALL' || i.status === activeTab;
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
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
      case 'SENT': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'PAID': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'CANCELLED': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Helper values for selected invoice tax breakdown (9% CGST + 9% SGST)
  const cgstAmount = selectedInvoice ? Number((selectedInvoice.subtotal * 0.09).toFixed(2)) : 0;
  const sgstAmount = selectedInvoice ? Number((selectedInvoice.subtotal * 0.09).toFixed(2)) : 0;

  return (
    <div className="space-y-6 select-none font-sans text-base">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Tax Invoices Ledger</h2>
          <p className="text-slate-500 text-base mt-1.5 leading-normal">
            Audit vendor invoices, check CGST/SGST details, download print sheets, and authorize financial payments.
          </p>
        </div>
        <button
          onClick={() => {
            setCreateError('');
            setSelectedPoId('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer w-max self-start sm:self-auto"
        >
          <Plus className="w-5.5 h-5.5" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0.5">
        {[
          { id: 'ALL', name: 'All Invoices' },
          { id: 'PENDING', name: 'Pending Review' },
          { id: 'SENT', name: 'Emailed' },
          { id: 'PAID', name: 'Paid' },
          { id: 'CANCELLED', name: 'Cancelled' }
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
            placeholder="Search Invoices by Vendor, Number, or PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-355 rounded-xl text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
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

      {/* Invoices List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-sm font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4.5">Invoice Number</th>
                <th className="px-6 py-4.5">Vendor Name</th>
                <th className="px-6 py-4.5">Purchase Order Ref</th>
                <th className="px-6 py-4.5">GST Rate</th>
                <th className="px-6 py-4.5">Total Amount (Incl. GST)</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-base">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing tax ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-14 text-slate-400 font-semibold">
                    No Invoices found in ledger.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const vendorName = inv.vendor?.company_name || 'Vendor';
                  const poNum = inv.purchase_order?.po_number || 'PO';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 font-mono font-bold text-slate-700">
                        {inv.invoice_number}
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-900">{vendorName}</td>
                      <td className="px-6 py-5 font-bold text-slate-500 font-mono">{poNum}</td>
                      <td className="px-6 py-5 font-bold text-slate-500">18.00% (GST)</td>
                      <td className="px-6 py-5 font-extrabold text-slate-900">
                        ₹{new Intl.NumberFormat('en-IN').format(inv.total_amount)}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getStatusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDetailsModalOpen(true);
                            }}
                            title="View Invoice Details"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Eye className="w-5.5 h-5.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)}
                            title="Download PDF"
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Download className="w-5.5 h-5.5" />
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(inv)}
                            title="Print Invoice"
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Printer className="w-5.5 h-5.5" />
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

      {/* --- CREATE INVOICE MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Establish Tax Invoice Schema</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-655 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="p-5 space-y-4">
              {createError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <p className="text-xs text-slate-450 leading-relaxed font-medium">
                Choose a completed Purchase Order to generate an Invoice. Tax logic will automatically compute <strong>CGST (9%)</strong> + <strong>SGST (9%)</strong> breakdowns.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Purchase Order *</label>
                <select
                  value={selectedPoId}
                  onChange={(e) => setSelectedPoId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Choose Purchase Order --</option>
                  {purchaseOrders
                    // Allow creating invoice for ACCEPTED or COMPLETED POs that don't have invoices yet
                    .filter(po => po.status === 'ACCEPTED' || po.status === 'COMPLETED' || po.status === 'SENT')
                    .map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.vendor?.company_name} (₹{new Intl.NumberFormat('en-IN').format(po.total_amount)})
                      </option>
                    ))}
                </select>
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
                  <span>Establish Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INVOICE DETAILS MODAL --- */}
      {isDetailsModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Tax Invoice Specifications</h3>
                <span className="text-xs text-slate-400 font-bold block mt-0.5">Inv Number: {selectedInvoice.invoice_number}</span>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[520px] overflow-y-auto">
              
              {/* Basic Meta */}
              <div className="grid grid-cols-2 gap-4 text-base">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Invoice Status</span>
                  <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider block mt-1 w-max ${getStatusBadge(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Due Date (Local)</span>
                  <span className="font-extrabold text-slate-800 block mt-1">
                    {new Date(selectedInvoice.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Billing Vendor</span>
                  <span className="font-extrabold text-slate-950 block mt-1">{selectedInvoice.vendor?.company_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Purchase Order Ref</span>
                  <span className="font-mono font-bold text-slate-700 block mt-1">
                    {selectedInvoice.purchase_order?.po_number}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Tax Code Type</span>
                  <span className="font-extrabold text-slate-800 block mt-1">CGST / SGST Inter-State</span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
                <span className="text-slate-450 font-bold block uppercase text-[10px] tracking-wide border-b border-slate-200 pb-1.5">Billing Calculation</span>
                
                <div className="flex justify-between items-center text-sm font-semibold text-slate-600">
                  <span>Subtotal Amount</span>
                  <span>₹{new Intl.NumberFormat('en-IN').format(selectedInvoice.subtotal)}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-slate-500 font-medium pl-2">
                  <span>CGST (9.00%)</span>
                  <span>₹{new Intl.NumberFormat('en-IN').format(cgstAmount)}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 font-medium pl-2 border-b border-slate-200 pb-2.5">
                  <span>SGST (9.00%)</span>
                  <span>₹{new Intl.NumberFormat('en-IN').format(sgstAmount)}</span>
                </div>

                <div className="flex justify-between items-center text-base font-extrabold text-slate-900 pt-1">
                  <span>Grand Total (INR)</span>
                  <span className="text-indigo-650">₹{new Intl.NumberFormat('en-IN').format(selectedInvoice.total_amount)}</span>
                </div>
              </div>

              {/* Status Update Options */}
              <div className="border-t border-slate-100 pt-4.5 space-y-3">
                <span className="text-slate-455 font-bold block uppercase text-[10px] tracking-wide">Authorize Payment Stage</span>
                <div className="flex gap-2">
                  {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedInvoice.id, 'PAID')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Authorize & Mark as Paid
                    </button>
                  )}
                  {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedInvoice.id, 'CANCELLED')}
                      className="py-2 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Cancel Invoice
                    </button>
                  )}
                </div>
              </div>

              {/* Dispatch Options */}
              <div className="border-t border-slate-100 pt-4.5 flex gap-2">
                <button
                  onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-slate-200 text-slate-705 hover:bg-slate-50 font-bold rounded-xl transition-all cursor-pointer text-sm"
                >
                  <Download className="w-4.5 h-4.5 text-slate-450" />
                  <span>Download PDF Spec</span>
                </button>
                <button
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-slate-200 text-indigo-700 hover:bg-indigo-50/50 font-bold rounded-xl transition-all cursor-pointer text-sm"
                >
                  <Printer className="w-4.5 h-4.5" />
                  <span>Print Invoice</span>
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
                  <span>Email Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EMAIL MODAL --- */}
      {isEmailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm">Email Document: {selectedInvoice.invoice_number}</h4>
              <button onClick={() => setIsEmailModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-655 rounded-lg hover:bg-slate-100 cursor-pointer">
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
                  placeholder="accounts@vendor.com"
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
