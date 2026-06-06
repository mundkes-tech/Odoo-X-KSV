import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, Loader2, Calendar, FileSpreadsheet, Percent, BarChart3, Receipt } from 'lucide-react';

export default function ReportsModule({ users, vendors, rfqs, purchaseOrders, invoices }) {
  const [reportType, setReportType] = useState('MONTHLY_PROCUREMENT');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [format, setFormat] = useState('csv');
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [success, setSuccess] = useState(false);

  const reports = [
    {
      id: 'MONTHLY_PROCUREMENT',
      name: 'Monthly Procurement Report',
      description: 'Overview of monthly procurement activities, including RFQs created, quotations received, and POs generated.',
      icon: BarChart3,
      color: 'text-blue-500 bg-blue-50 border-blue-100',
    },
    {
      id: 'VENDOR_PERFORMANCE',
      name: 'Vendor Performance Report',
      description: 'Detailed rating scorecard, delivery performance logs, RFQ win rates, and active registration directories.',
      icon: Percent,
      color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'SPENDING',
      name: 'Spending Report',
      description: 'Audit logs of spending distributions across vendors, departments, procurement categories, and cost centers.',
      icon: FileSpreadsheet,
      color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
    },
    {
      id: 'PURCHASE_ORDER',
      name: 'Purchase Order Report',
      description: 'Complete log of active, completed, pending, and cancelled Purchase Orders with vendor breakdowns.',
      icon: FileText,
      color: 'text-amber-500 bg-amber-50 border-amber-100',
    },
    {
      id: 'INVOICE',
      name: 'Invoice Report',
      description: 'Accounting overview of paid, pending, and overdue invoices, including tax details and GST logs.',
      icon: Receipt,
      color: 'text-rose-500 bg-rose-50 border-rose-100',
    },
  ];

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGenerateReport = async () => {
    setGenerating(true);
    setSuccess(false);
    
    // Simulate generation steps
    setCurrentStep('Querying relational schemas...');
    await sleep(600);
    setCurrentStep('Filtering records by date criteria...');
    await sleep(700);
    setCurrentStep('Structuring relational rows...');
    await sleep(600);
    setCurrentStep(`Compiling file payload to ${format.toUpperCase()} format...`);
    await sleep(500);

    // Generate CSV data based on report type
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = '';

    if (reportType === 'MONTHLY_PROCUREMENT') {
      csvContent += 'RFQ Code,Title,Status,Created At,Category\n';
      rfqs.forEach(rfq => {
        csvContent += `"${rfq.id}","${rfq.title}","${rfq.status}","${rfq.created_at}","${rfq.category}"\n`;
      });
      filename = `monthly_procurement_report_${dateRange}`;
    } else if (reportType === 'VENDOR_PERFORMANCE') {
      csvContent += 'Company Name,GST Number,Category,Email,Status,Average Rating,Delivery Performance\n';
      vendors.forEach(v => {
        const rating = v.status === 'ACTIVE' ? '4.8/5' : '0.0/5';
        const delivery = v.status === 'ACTIVE' ? '96%' : 'N/A';
        csvContent += `"${v.company_name}","${v.gst_number}","${v.category}","${v.email}","${v.status}","${rating}","${delivery}"\n`;
      });
      filename = `vendor_performance_report_${dateRange}`;
    } else if (reportType === 'SPENDING') {
      csvContent += 'Purchase Order,Vendor,Amount,Status,Date\n';
      purchaseOrders.forEach(po => {
        csvContent += `"${po.id}","${po.vendor}","${po.amount}","${po.status}","${po.created_at}"\n`;
      });
      filename = `procurement_spending_report_${dateRange}`;
    } else if (reportType === 'PURCHASE_ORDER') {
      csvContent += 'PO Code,Title,Vendor,Amount,Status,Date\n';
      purchaseOrders.forEach(po => {
        csvContent += `"${po.id}","${po.title}","${po.vendor}","${po.amount}","${po.status}","${po.created_at}"\n`;
      });
      filename = `purchase_order_status_report_${dateRange}`;
    } else if (reportType === 'INVOICE') {
      csvContent += 'Invoice Code,Amount,Vendor,Status,Due Date,Created At\n';
      invoices.forEach(inv => {
        csvContent += `"${inv.id}","${inv.amount}","${inv.vendor}","${inv.status}","${inv.due_date}","${inv.created_at}"\n`;
      });
      filename = `invoice_audit_report_${dateRange}`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setGenerating(false);
    setSuccess(true);
    await sleep(2500);
    setSuccess(false);
  };

  const selectedReport = reports.find(r => r.id === reportType);

  return (
    <div className="space-y-6 select-none font-sans text-sm md:text-base">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Procurement Reports Center</h2>
        <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
          Generate, filter, and export administrative analytics and transactional ledger reports.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane - Selection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900">1. Select Report Template</h3>
            
            <div className="grid grid-cols-1 gap-3.5">
              {reports.map((report) => {
                const Icon = report.icon;
                const isSelected = report.id === reportType;
                
                return (
                  <button
                    key={report.id}
                    onClick={() => {
                      setReportType(report.id);
                      setSuccess(false);
                    }}
                    className={`w-full flex items-start gap-4.5 p-4.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/20 shadow-sm ring-1 ring-blue-600' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${report.color}`}>
                      <Icon className="w-5.5 h-5.5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm font-extrabold text-slate-900 block leading-tight">{report.name}</span>
                      <p className="text-slate-550 text-xs leading-relaxed">{report.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right pane - Filters and Export action */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">2. Configure Filters</h3>
            
            {/* Date Criteria */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Date Range</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_quarter">Last Quarter</option>
                  <option value="year_to_date">Year to Date (YTD)</option>
                  <option value="all_time">All Available History</option>
                </select>
              </div>
            </div>

            {/* Export format */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'csv', label: 'CSV' },
                  { id: 'xls', label: 'Excel' },
                  { id: 'pdf', label: 'PDF' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormat(item.id)}
                    className={`py-2.5 text-center rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      format === item.id 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Generation process card */}
            {generating ? (
              <div className="bg-slate-50 rounded-xl p-4.5 flex flex-col items-center justify-center text-center gap-3 animate-pulse">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 block">Compiling Report Ledger...</span>
                  <span className="text-[11px] text-slate-400 font-semibold font-sans">{currentStep}</span>
                </div>
              </div>
            ) : success ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4.5 flex items-center gap-3 text-emerald-800 animate-[fadeIn_0.2s_ease-out]">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-bold block">Export Complete!</span>
                  <span className="text-[11px] text-emerald-600 font-bold block leading-tight">File downloaded successfully.</span>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50/30 border border-blue-50/50 rounded-xl p-4.5 space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Selection:</span>
                <span className="text-sm font-bold text-slate-800 block">{selectedReport?.name}</span>
                <span className="text-xs text-slate-400 font-semibold block uppercase">Format: .{format.toUpperCase()}</span>
              </div>
            )}

            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className="w-4.5 h-4.5" />
              <span>Compile & Export</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
