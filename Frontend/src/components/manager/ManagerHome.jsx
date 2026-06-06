import React from 'react';
import {
  CheckSquare, CheckCircle2, XCircle, Layers,
  ArrowUpRight, AlertCircle, Activity, Clock,
  FileText, FileSpreadsheet, Receipt, TrendingUp
} from 'lucide-react';

export default function ManagerHome({
  approvals,
  rfqs,
  purchaseOrders,
  invoices,
  logs,
  onNavigateTab
}) {
  // --- Stats ---
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
  const approvedApprovals = approvals.filter(a => a.status === 'APPROVED');
  const rejectedApprovals = approvals.filter(a => a.status === 'REJECTED');

  const highPriority = pendingApprovals.filter(a => Number(a.price) > 100000).length;
  const urgent = pendingApprovals.filter(a => {
    const created = new Date(a.created_at);
    const now = new Date();
    return (now - created) > 3 * 24 * 60 * 60 * 1000; // older than 3 days
  }).length;

  const today = new Date().toDateString();
  const todayApproved = approvedApprovals.filter(a => new Date(a.approved_at).toDateString() === today).length;
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyApproved = approvedApprovals.filter(a => {
    const d = new Date(a.approved_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const recentRejections = rejectedApprovals.filter(a => {
    const d = new Date(a.approved_at);
    const now = new Date();
    return (now - d) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const activeRfqs = rfqs.filter(r => r.status === 'PUBLISHED' || r.status === 'ACTIVE' || r.status === 'OPEN').length;
  const activePOs = purchaseOrders.filter(p => p.status === 'PENDING' || p.status === 'GENERATED').length;
  const openInvoices = invoices.filter(i => i.status === 'PENDING' || i.status === 'GENERATED' || i.status === 'SENT').length;

  const cards = [
    {
      title: 'Pending Approvals',
      value: pendingApprovals.length,
      icon: CheckSquare,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      accent: 'amber',
      stats: [
        { label: 'High Priority', value: highPriority, color: 'text-rose-600' },
        { label: 'Urgent', value: urgent, color: 'text-orange-600' }
      ]
    },
    {
      title: 'Approved Requests',
      value: approvedApprovals.length,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      accent: 'emerald',
      stats: [
        { label: "Today's", value: todayApproved, color: 'text-emerald-600' },
        { label: 'This Month', value: monthlyApproved, color: 'text-blue-600' }
      ]
    },
    {
      title: 'Rejected Requests',
      value: rejectedApprovals.length,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      accent: 'rose',
      stats: [
        { label: 'Total Rejected', value: rejectedApprovals.length, color: 'text-rose-600' },
        { label: 'Recent (7d)', value: recentRejections, color: 'text-amber-600' }
      ]
    },
    {
      title: 'Active Workflows',
      value: activeRfqs + activePOs + openInvoices,
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      accent: 'indigo',
      stats: [
        { label: 'Active RFQs', value: activeRfqs, color: 'text-indigo-600' },
        { label: 'Active POs', value: activePOs, color: 'text-blue-600' },
        { label: 'Open Invoices', value: openInvoices, color: 'text-violet-600' }
      ]
    }
  ];

  const recentLogs = (logs || []).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Manager Dashboard</h2>
        <p className="text-slate-500 text-base mt-1.5 leading-normal">
          Review procurement approvals, monitor workflows, and track your decisions.
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
                {card.stats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">{s.label}</span>
                    <span className={`font-extrabold ${s.color}`}>{s.value}</span>
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
            onClick={() => onNavigateTab('manager-approvals')}
            className="flex items-center gap-2.5 px-5 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-base font-bold hover:bg-amber-100 transition duration-200 cursor-pointer"
          >
            <CheckSquare className="w-5 h-5" />
            Review Approvals
            {pendingApprovals.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-full">
                {pendingApprovals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => onNavigateTab('manager-monitor')}
            className="flex items-center gap-2.5 px-5 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-base font-bold hover:bg-indigo-100 transition duration-200 cursor-pointer"
          >
            <Activity className="w-5 h-5" />
            Monitor Workflows
          </button>
          <button
            onClick={() => onNavigateTab('manager-reports')}
            className="flex items-center gap-2.5 px-5 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-base font-bold hover:bg-blue-100 transition duration-200 cursor-pointer"
          >
            <TrendingUp className="w-5 h-5" />
            View Reports
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-extrabold text-slate-900">Recent Activity</h3>
          <button
            onClick={() => onNavigateTab('manager-logs')}
            className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-base">
            <Clock className="w-10 h-10 mb-3 opacity-40" />
            <span>No recent activity to display.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log, i) => (
              <div key={log.id || i} className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 transition">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-800 leading-snug">{log.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-400">
                    <span className="font-medium">{log.user_name}</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider shrink-0">
                  {log.action?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
