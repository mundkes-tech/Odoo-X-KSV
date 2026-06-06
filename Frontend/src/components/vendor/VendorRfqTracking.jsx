import React from 'react';
import {
  FileText, Send, Eye, CheckCircle2, XCircle,
  Clock, ChevronRight, Layers, AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function VendorRfqTracking({ rfqs, quotations }) {
  // Map quotations to their RFQs
  const trackingData = quotations.map(q => {
    const rfq = rfqs.find(r => r.id === q.rfq_id);
    return {
      quotation: q,
      rfq: rfq || { id: q.rfq_id, title: 'Unknown RFQ', status: 'UNKNOWN' }
    };
  });

  // Status counts
  const submitted = quotations.filter(q => q.status === 'SUBMITTED').length;
  const underReview = quotations.filter(q => q.status === 'SELECTED').length;
  const approved = quotations.filter(q => q.status === 'APPROVED').length;
  const rejected = quotations.filter(q => q.status === 'REJECTED').length;

  const statusCards = [
    { label: 'Submitted', value: submitted, icon: Send, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { label: 'Under Review', value: underReview, icon: Eye, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Approved', value: approved, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Rejected', value: rejected, icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-100' },
  ];

  const getStatusStep = (status) => {
    switch (status) {
      case 'DRAFT': return 0;
      case 'SUBMITTED': return 1;
      case 'SELECTED': return 2;
      case 'APPROVED': return 3;
      case 'REJECTED': return 3;
      default: return 0;
    }
  };

  const workflowSteps = [
    { label: 'RFQ Invitation', desc: 'Received from procurement', icon: FileText },
    { label: 'Quotation Submitted', desc: 'Your bid submitted', icon: Send },
    { label: 'Under Review', desc: 'Being evaluated', icon: Eye },
    { label: 'Decision', desc: 'Approved or rejected', icon: CheckCircle2 },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUBMITTED': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'SELECTED': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'APPROVED': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'REJECTED': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'DRAFT': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">RFQ Status Tracking</h2>
        <p className="text-slate-500 text-base mt-1.5">Track the progress of your quotations through the procurement lifecycle.</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-3xl font-extrabold text-slate-900">{card.value}</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-800">{card.label}</h3>
            </div>
          );
        })}
      </div>

      {/* Workflow Reference */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 mb-5">Procurement Workflow</h3>
        <div className="flex items-center justify-between flex-wrap gap-2">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-800">{step.label}</p>
                    <p className="text-xs text-slate-400">{step.desc}</p>
                  </div>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-slate-300 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Tracking List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900">Your Quotation Tracking</h3>
        </div>

        {trackingData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Layers className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-base font-bold">No quotations to track.</span>
            <span className="text-sm mt-1">Submit a quotation to start tracking.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {trackingData.map(({ quotation, rfq }) => {
              const currentStep = getStatusStep(quotation.status);
              return (
                <div key={quotation.id} className="p-5 hover:bg-slate-50/60 transition">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">{rfq.title || 'Untitled RFQ'}</h4>
                      <p className="text-sm text-slate-400 font-mono mt-0.5">RFQ: {(rfq.id || '').substring(0, 8)}... | Quote: {(quotation.id || '').substring(0, 8)}...</p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${getStatusColor(quotation.status)}`}>
                      {quotation.status}
                    </span>
                  </div>

                  {/* Mini Timeline */}
                  <div className="flex items-center gap-1">
                    {workflowSteps.map((step, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const isRejected = quotation.status === 'REJECTED' && idx === currentStep;
                      return (
                        <React.Fragment key={step.label}>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isCurrent
                              ? isRejected
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : isCompleted
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-50 text-slate-400'
                          }`}>
                            {isCompleted && !isCurrent && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isCurrent && !isRejected && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{idx === 3 ? (quotation.status === 'REJECTED' ? 'Rejected' : quotation.status === 'APPROVED' ? 'Approved' : step.label) : step.label}</span>
                          </div>
                          {idx < workflowSteps.length - 1 && (
                            <div className={`w-4 h-0.5 ${isCompleted && idx < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Submission details */}
                  <div className="flex gap-4 mt-3 text-sm text-slate-500">
                    <span className="font-medium">₹{Number(quotation.price || 0).toLocaleString('en-IN')}</span>
                    <span>•</span>
                    <span>{quotation.delivery_days} days delivery</span>
                    <span>•</span>
                    <span>{quotation.submitted_at ? new Date(quotation.submitted_at).toLocaleDateString('en-IN') : '-'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
