import React from 'react';
import {
  FileText, CheckSquare, FileSpreadsheet, Receipt,
  ArrowRight, Activity, Clock, TrendingUp,
  ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function ProcurementMonitor({
  rfqs,
  approvals,
  purchaseOrders,
  invoices
}) {
  const activeRfqs = rfqs.filter(r => ['PUBLISHED', 'ACTIVE', 'OPEN'].includes(r.status));
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const activePOs = purchaseOrders.filter(p => ['PENDING', 'GENERATED'].includes(p.status));
  const openInvoices = invoices.filter(i => ['PENDING', 'GENERATED', 'SENT'].includes(i.status));

  const monitorCards = [
    {
      title: 'Active RFQs',
      value: activeRfqs.length,
      total: rfqs.length,
      icon: FileText,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      items: activeRfqs.slice(0, 3).map(r => ({
        label: r.title || 'Untitled RFQ',
        detail: r.status,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'
      }))
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals.length,
      total: approvals.length,
      icon: CheckSquare,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      items: pendingApprovals.slice(0, 3).map(a => ({
        label: a.rfq_title || 'Request',
        detail: `₹${Number(a.price || 0).toLocaleString('en-IN')}`,
        date: a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'
      }))
    },
    {
      title: 'Active Purchase Orders',
      value: activePOs.length,
      total: purchaseOrders.length,
      icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      items: activePOs.slice(0, 3).map(p => ({
        label: p.po_number || p.rfq?.title || 'Purchase Order',
        detail: `₹${Number(p.total_amount || 0).toLocaleString('en-IN')}`,
        date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'
      }))
    },
    {
      title: 'Generated Invoices',
      value: openInvoices.length,
      total: invoices.length,
      icon: Receipt,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
      items: openInvoices.slice(0, 3).map(i => ({
        label: i.invoice_number || 'Invoice',
        detail: `₹${Number(i.total_amount || 0).toLocaleString('en-IN')}`,
        date: i.created_at ? new Date(i.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'
      }))
    }
  ];

  const workflowSteps = [
    { label: 'RFQ Created', icon: FileText, color: 'bg-indigo-500', count: rfqs.length, desc: 'Requirements published' },
    { label: 'Vendor Assigned', icon: Activity, color: 'bg-blue-500', count: rfqs.filter(r => r.status !== 'DRAFT').length, desc: 'Vendors invited to bid' },
    { label: 'Quotation Submitted', icon: TrendingUp, color: 'bg-cyan-500', count: rfqs.filter(r => ['CLOSED', 'VENDOR_SELECTED', 'APPROVED'].includes(r.status)).length, desc: 'Vendor bids received' },
    { label: 'Quotation Selected', icon: CheckSquare, color: 'bg-amber-500', count: approvals.length, desc: 'Best quote selected' },
    { label: 'Approval Pending', icon: Clock, color: 'bg-orange-500', count: pendingApprovals.length, desc: 'Awaiting manager decision' },
    { label: 'Approved', icon: CheckCircle2, color: 'bg-emerald-500', count: approvals.filter(a => a.status === 'APPROVED').length, desc: 'Manager approved' },
    { label: 'PO Generated', icon: FileSpreadsheet, color: 'bg-teal-500', count: purchaseOrders.length, desc: 'Purchase order issued' },
    { label: 'Invoice Generated', icon: Receipt, color: 'bg-violet-500', count: invoices.length, desc: 'Tax invoice created' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Procurement Monitor</h2>
        <p className="text-slate-500 text-base mt-1.5">Track procurement operations and workflow progress across the organization.</p>
      </div>

      {/* Monitor Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {monitorCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-slate-900">{card.value}</span>
                  <span className="text-sm text-slate-400 font-medium ml-1">/ {card.total}</span>
                </div>
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mb-3">{card.title}</h3>
              {card.items.length > 0 ? (
                <div className="space-y-2">
                  {card.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-700 font-medium truncate flex-1 mr-2">{item.label}</span>
                      <span className="text-slate-500 font-bold text-xs shrink-0">{item.detail}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No active items</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Workflow Tracking */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 mb-6">Procurement Lifecycle</h3>
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200" />

          <div className="space-y-1">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.count > 0;
              return (
                <div key={step.label} className="relative flex items-start gap-5 py-3.5 pl-1">
                  {/* Dot */}
                  <div className={`relative z-10 w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? `${step.color} text-white shadow-lg` : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-base font-extrabold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                        {step.label}
                      </h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {step.count}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{step.desc}</p>
                  </div>

                  {/* Connector Arrow (except last) */}
                  {index < workflowSteps.length - 1 && (
                    <div className="absolute left-[22px] bottom-[-6px] z-20">
                      <ChevronRight className="w-3 h-3 text-slate-300 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
