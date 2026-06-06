import React from 'react';
import {
  FileText, Layers, FileSpreadsheet, Bell,
  ArrowUpRight, Clock, AlertCircle, CheckCircle2,
  XCircle, Send, Eye, TrendingUp, Activity
} from 'lucide-react';

export default function VendorHome({
  rfqs,
  quotations,
  purchaseOrders,
  notifications,
  onNavigateTab
}) {
  const now = new Date();

  // RFQ stats
  const openRfqs = rfqs.filter(r => ['PUBLISHED', 'ACTIVE', 'OPEN'].includes(r.status));
  const closingSoon = openRfqs.filter(r => {
    if (!r.deadline) return false;
    const diff = new Date(r.deadline).getTime() - now.getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  }).length;
  const newRfqs = openRfqs.filter(r => {
    const created = new Date(r.created_at);
    return (now - created) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  // Quotation stats
  const submitted = quotations.filter(q => q.status === 'SUBMITTED').length;
  const underReview = quotations.filter(q => q.status === 'SUBMITTED' || q.status === 'SELECTED').length;
  const approvedQuotes = quotations.filter(q => q.status === 'APPROVED').length;
  const rejectedQuotes = quotations.filter(q => q.status === 'REJECTED').length;

  // PO stats
  const activePOs = purchaseOrders.filter(p => p.status === 'PENDING' || p.status === 'GENERATED').length;
  const completedPOs = purchaseOrders.filter(p => p.status === 'COMPLETED').length;
  const pendingDelivery = purchaseOrders.filter(p => p.status === 'PENDING').length;

  // Notification stats
  const recentNotifs = (notifications || []).filter(n => !n.is_read && !n.read).slice(0, 3);

  const cards = [
    {
      title: 'Open RFQs',
      value: openRfqs.length,
      icon: FileText,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      stats: [
        { label: 'Closing Soon', value: closingSoon, color: 'text-amber-600' },
        { label: 'New RFQs', value: newRfqs, color: 'text-emerald-600' }
      ]
    },
    {
      title: 'Submitted Quotations',
      value: quotations.length,
      icon: Layers,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      stats: [
        { label: 'Under Review', value: underReview, color: 'text-amber-600' },
        { label: 'Approved', value: approvedQuotes, color: 'text-emerald-600' },
        { label: 'Rejected', value: rejectedQuotes, color: 'text-rose-600' }
      ]
    },
    {
      title: 'Purchase Orders',
      value: purchaseOrders.length,
      icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      stats: [
        { label: 'Active', value: activePOs, color: 'text-blue-600' },
        { label: 'Completed', value: completedPOs, color: 'text-emerald-600' },
        { label: 'Pending Delivery', value: pendingDelivery, color: 'text-amber-600' }
      ]
    },
    {
      title: 'Recent Notifications',
      value: recentNotifs.length,
      icon: Bell,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
      stats: recentNotifs.map(n => ({
        label: n.message?.substring(0, 40) + '...',
        value: '',
        color: 'text-slate-500'
      }))
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Vendor Dashboard</h2>
        <p className="text-slate-500 text-base mt-1.5 leading-normal">
          View procurement opportunities, manage your quotations, and track orders.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-5.5 h-5.5" />
                </div>
                <span className="text-3xl font-extrabold text-slate-900">{card.value}</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-800 mb-3">{card.title}</h3>
              <div className="space-y-1.5">
                {card.stats.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium truncate flex-1 mr-2">{s.label}</span>
                    {s.value !== '' && <span className={`font-extrabold ${s.color}`}>{s.value}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigateTab('vendor-rfqs')}
            className="flex items-center gap-2.5 px-5 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-base font-bold hover:bg-indigo-100 transition duration-200 cursor-pointer"
          >
            <FileText className="w-5 h-5" />
            View RFQs
            {openRfqs.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded-full">{openRfqs.length}</span>
            )}
          </button>
          <button
            onClick={() => onNavigateTab('vendor-quotations')}
            className="flex items-center gap-2.5 px-5 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-base font-bold hover:bg-blue-100 transition duration-200 cursor-pointer"
          >
            <Send className="w-5 h-5" />
            Submit Quotation
          </button>
          <button
            onClick={() => onNavigateTab('vendor-tracking')}
            className="flex items-center gap-2.5 px-5 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-base font-bold hover:bg-amber-100 transition duration-200 cursor-pointer"
          >
            <Eye className="w-5 h-5" />
            Track RFQ Status
          </button>
          <button
            onClick={() => onNavigateTab('vendor-pos')}
            className="flex items-center gap-2.5 px-5 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-base font-bold hover:bg-emerald-100 transition duration-200 cursor-pointer"
          >
            <FileSpreadsheet className="w-5 h-5" />
            View Purchase Orders
          </button>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Open Opportunities */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-slate-900">Open Opportunities</h3>
            <button
              onClick={() => onNavigateTab('vendor-rfqs')}
              className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          {openRfqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm">
              <FileText className="w-10 h-10 mb-2 opacity-30" />
              <span>No open RFQs available.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {openRfqs.slice(0, 4).map((r, i) => (
                <div key={r.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-base font-bold text-slate-800 truncate">{r.title || 'Untitled RFQ'}</p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {r.deadline ? `Deadline: ${new Date(r.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'No deadline'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold uppercase">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotation Activity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-slate-900">My Quotations</h3>
            <button
              onClick={() => onNavigateTab('vendor-quotations')}
              className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          {quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-sm">
              <Layers className="w-10 h-10 mb-2 opacity-30" />
              <span>No quotations submitted yet.</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {quotations.slice(0, 4).map((q, i) => {
                const statusColors = {
                  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
                  SELECTED: 'bg-amber-50 text-amber-700 border-amber-200',
                  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
                  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
                  WITHDRAWN: 'bg-gray-50 text-gray-700 border-gray-200'
                };
                return (
                  <div key={q.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-base font-bold text-slate-800">₹{Number(q.price || 0).toLocaleString('en-IN')}</p>
                      <p className="text-sm text-slate-400 mt-0.5">{q.delivery_days ? `${q.delivery_days} days delivery` : 'N/A'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold uppercase ${statusColors[q.status] || statusColors.DRAFT}`}>
                      {q.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
