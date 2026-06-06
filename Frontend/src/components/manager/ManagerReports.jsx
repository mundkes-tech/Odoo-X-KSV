import React, { useState } from 'react';
import {
  TrendingUp, BarChart3, PieChart, DollarSign,
  Download, Calendar, CheckCircle2, XCircle,
  Clock, FileText, AlertCircle
} from 'lucide-react';

export default function ManagerReports({
  approvals,
  rfqs,
  purchaseOrders,
  invoices
}) {
  const [activeReport, setActiveReport] = useState('approval-performance');

  const approved = approvals.filter(a => a.status === 'APPROVED');
  const rejected = approvals.filter(a => a.status === 'REJECTED');
  const pending = approvals.filter(a => a.status === 'PENDING');

  // Monthly data (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toLocaleString('en-IN', { month: 'short' });
    const year = d.getFullYear();
    const m = d.getMonth();
    const y = d.getFullYear();
    const mApproved = approved.filter(a => {
      const dt = new Date(a.approved_at || a.created_at);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
    const mRejected = rejected.filter(a => {
      const dt = new Date(a.approved_at || a.created_at);
      return dt.getMonth() === m && dt.getFullYear() === y;
    }).length;
    monthlyData.push({ month: `${month} ${year}`, approved: mApproved, rejected: mRejected, total: mApproved + mRejected });
  }

  // Cost breakdown
  const totalApprovedValue = approved.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const totalRejectedValue = rejected.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const totalPOValue = purchaseOrders.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
  const totalInvoiceValue = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  const approvalRate = approvals.length > 0
    ? ((approved.length / (approved.length + rejected.length || 1)) * 100).toFixed(1)
    : 0;

  const avgProcessingTime = approved.length > 0
    ? (approved.reduce((sum, a) => {
        const created = new Date(a.created_at).getTime();
        const reviewed = new Date(a.approved_at || a.created_at).getTime();
        return sum + (reviewed - created);
      }, 0) / approved.length / (1000 * 60 * 60)).toFixed(1)
    : 0;

  const handleExport = (reportName) => {
    let csvContent = '';

    if (reportName === 'approval-performance') {
      csvContent = 'Metric,Value\n';
      csvContent += `Total Requests,${approvals.length}\n`;
      csvContent += `Approved,${approved.length}\n`;
      csvContent += `Rejected,${rejected.length}\n`;
      csvContent += `Pending,${pending.length}\n`;
      csvContent += `Approval Rate,${approvalRate}%\n`;
      csvContent += `Avg Processing Time,${avgProcessingTime} hrs\n`;
    } else if (reportName === 'monthly-trends') {
      csvContent = 'Month,Approved,Rejected,Total\n';
      monthlyData.forEach(m => {
        csvContent += `${m.month},${m.approved},${m.rejected},${m.total}\n`;
      });
    } else if (reportName === 'cost-analysis') {
      csvContent = 'Category,Value (INR)\n';
      csvContent += `Approved Value,${totalApprovedValue}\n`;
      csvContent += `Rejected Value,${totalRejectedValue}\n`;
      csvContent += `Total PO Value,${totalPOValue}\n`;
      csvContent += `Total Invoice Value,${totalInvoiceValue}\n`;
    } else {
      csvContent = 'Category,Active,Completed,Total\n';
      csvContent += `RFQs,${rfqs.filter(r => ['PUBLISHED','ACTIVE','OPEN'].includes(r.status)).length},${rfqs.filter(r => ['CLOSED','APPROVED'].includes(r.status)).length},${rfqs.length}\n`;
      csvContent += `Purchase Orders,${purchaseOrders.filter(p => p.status === 'PENDING').length},${purchaseOrders.filter(p => p.status === 'COMPLETED').length},${purchaseOrders.length}\n`;
      csvContent += `Invoices,${invoices.filter(i => ['PENDING','SENT'].includes(i.status)).length},${invoices.filter(i => i.status === 'PAID').length},${invoices.length}\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const reports = [
    { id: 'approval-performance', name: 'Approval Performance', icon: BarChart3, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 'procurement-summary', name: 'Procurement Summary', icon: PieChart, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 'monthly-trends', name: 'Monthly Trends', icon: TrendingUp, color: 'text-violet-600 bg-violet-50 border-violet-100' },
    { id: 'cost-analysis', name: 'Cost Analysis', icon: DollarSign, color: 'text-amber-600 bg-amber-50 border-amber-100' }
  ];

  const maxBar = Math.max(...monthlyData.map(m => m.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Procurement Reports</h2>
        <p className="text-slate-500 text-base mt-1.5">Review procurement performance and approval efficiency metrics.</p>
      </div>

      {/* Report Tabs */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {reports.map(r => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-bold transition duration-200 cursor-pointer ${
                activeReport === r.id
                  ? `${r.color}`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {r.name}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        {/* Header bar with export */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900">
            {reports.find(r => r.id === activeReport)?.name}
          </h3>
          <button
            onClick={() => handleExport(activeReport)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="p-6">
          {/* APPROVAL PERFORMANCE */}
          {activeReport === 'approval-performance' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl text-center">
                  <span className="text-3xl font-extrabold text-slate-900">{approvals.length}</span>
                  <p className="text-sm text-slate-500 font-bold mt-1">Total Requests</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <span className="text-3xl font-extrabold text-emerald-700">{approvalRate}%</span>
                  <p className="text-sm text-emerald-600 font-bold mt-1">Approval Rate</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <span className="text-3xl font-extrabold text-blue-700">{avgProcessingTime}h</span>
                  <p className="text-sm text-blue-600 font-bold mt-1">Avg Processing</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl text-center">
                  <span className="text-3xl font-extrabold text-amber-700">{pending.length}</span>
                  <p className="text-sm text-amber-600 font-bold mt-1">Pending Now</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h4 className="text-base font-extrabold text-slate-800">Decision Breakdown</h4>
                {[
                  { label: 'Approved', value: approved.length, total: approvals.length || 1, color: 'bg-emerald-500', icon: CheckCircle2 },
                  { label: 'Rejected', value: rejected.length, total: approvals.length || 1, color: 'bg-rose-500', icon: XCircle },
                  { label: 'Pending', value: pending.length, total: approvals.length || 1, color: 'bg-amber-500', icon: Clock },
                ].map(item => {
                  const pct = ((item.value / item.total) * 100).toFixed(0);
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-4">
                      <Icon className="w-5 h-5 text-slate-500 shrink-0" />
                      <span className="text-base font-bold text-slate-700 w-24">{item.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-base font-extrabold text-slate-900 w-12 text-right">{item.value}</span>
                      <span className="text-sm text-slate-400 w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PROCUREMENT SUMMARY */}
          {activeReport === 'procurement-summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    title: 'RFQs',
                    total: rfqs.length,
                    active: rfqs.filter(r => ['PUBLISHED', 'ACTIVE', 'OPEN'].includes(r.status)).length,
                    completed: rfqs.filter(r => ['CLOSED', 'APPROVED'].includes(r.status)).length,
                    icon: FileText,
                    color: 'text-indigo-600 bg-indigo-50'
                  },
                  {
                    title: 'Purchase Orders',
                    total: purchaseOrders.length,
                    active: purchaseOrders.filter(p => p.status === 'PENDING').length,
                    completed: purchaseOrders.filter(p => p.status === 'COMPLETED').length,
                    icon: Calendar,
                    color: 'text-emerald-600 bg-emerald-50'
                  },
                  {
                    title: 'Invoices',
                    total: invoices.length,
                    active: invoices.filter(i => ['PENDING', 'SENT'].includes(i.status)).length,
                    completed: invoices.filter(i => i.status === 'PAID').length,
                    icon: DollarSign,
                    color: 'text-violet-600 bg-violet-50'
                  }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="p-5 bg-slate-50 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="text-base font-extrabold text-slate-800">{item.title}</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <span className="text-xl font-extrabold text-slate-900">{item.total}</span>
                          <p className="text-slate-500 font-medium">Total</p>
                        </div>
                        <div>
                          <span className="text-xl font-extrabold text-blue-600">{item.active}</span>
                          <p className="text-slate-500 font-medium">Active</p>
                        </div>
                        <div>
                          <span className="text-xl font-extrabold text-emerald-600">{item.completed}</span>
                          <p className="text-slate-500 font-medium">Done</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MONTHLY TRENDS */}
          {activeReport === 'monthly-trends' && (
            <div className="space-y-5">
              <h4 className="text-base font-extrabold text-slate-800">Approval Trends (Last 6 Months)</h4>
              <div className="space-y-3">
                {monthlyData.map(m => (
                  <div key={m.month} className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-600 w-20 shrink-0">{m.month}</span>
                    <div className="flex-1 flex gap-1 h-8">
                      <div
                        className="bg-emerald-500 rounded-l-lg h-full transition-all duration-500 flex items-center justify-center min-w-0"
                        style={{ width: `${m.total > 0 ? (m.approved / maxBar) * 100 : 0}%` }}
                      >
                        {m.approved > 0 && <span className="text-white text-xs font-bold px-1">{m.approved}</span>}
                      </div>
                      <div
                        className="bg-rose-500 rounded-r-lg h-full transition-all duration-500 flex items-center justify-center min-w-0"
                        style={{ width: `${m.total > 0 ? (m.rejected / maxBar) * 100 : 0}%` }}
                      >
                        {m.rejected > 0 && <span className="text-white text-xs font-bold px-1">{m.rejected}</span>}
                      </div>
                      {m.total === 0 && <div className="bg-slate-100 rounded-lg h-full flex-1 flex items-center justify-center"><span className="text-slate-400 text-xs">—</span></div>}
                    </div>
                    <span className="text-sm font-extrabold text-slate-900 w-8 text-right">{m.total}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 text-sm mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-slate-600 font-medium">Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-500" />
                  <span className="text-slate-600 font-medium">Rejected</span>
                </div>
              </div>
            </div>
          )}

          {/* COST ANALYSIS */}
          {activeReport === 'cost-analysis' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: 'Total Approved Value', value: totalApprovedValue, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { label: 'Total Rejected Value', value: totalRejectedValue, color: 'text-rose-700 bg-rose-50 border-rose-200' },
                  { label: 'Total PO Value', value: totalPOValue, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                  { label: 'Total Invoice Value', value: totalInvoiceValue, color: 'text-violet-700 bg-violet-50 border-violet-200' }
                ].map(item => (
                  <div key={item.label} className={`p-5 rounded-xl border ${item.color}`}>
                    <p className="text-sm font-bold opacity-80 mb-1">{item.label}</p>
                    <span className="text-2xl font-extrabold">₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
