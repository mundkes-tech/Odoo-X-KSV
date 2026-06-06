import React from 'react';
import { 
  Users, Shield, FileText, CheckSquare, Receipt, 
  UserPlus, ShieldAlert, FileBarChart, BarChart3, 
  ArrowUpRight, Clock, Plus, HelpCircle, Activity
} from 'lucide-react';

export default function AdminHome({ 
  users, 
  vendors, 
  rfqs, 
  purchaseOrders, 
  invoices, 
  logs,
  onNavigateTab,
  onOpenCreateUser,
  onOpenAddVendor
}) {
  // Calculations
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;

  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.status === 'ACTIVE').length;
  const inactiveVendors = totalVendors - activeVendors;
  
  // Simple check for new vendors (created in the last 30 days)
  const newVendorsThisMonth = vendors.filter(v => {
    const createdDate = new Date(v.created_at);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const totalRfqs = rfqs.length;
  const openRfqs = rfqs.filter(r => r.status === 'OPEN').length;
  const closedRfqs = rfqs.filter(r => r.status === 'CLOSED').length;
  const pendingRfqs = rfqs.filter(r => r.status === 'PENDING').length;

  const pendingPOs = purchaseOrders.filter(p => p.status === 'PENDING').length;
  const completedPOs = purchaseOrders.filter(p => p.status === 'COMPLETED').length;
  const cancelledPOs = purchaseOrders.filter(p => p.status === 'CANCELLED').length;

  const paidInvoices = invoices.filter(i => i.status === 'PAID').length;
  const pendingInvoices = invoices.filter(i => i.status === 'PENDING').length;
  const overdueInvoices = invoices.filter(i => i.status === 'OVERDUE').length;

  const cards = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      stats: [
        { label: 'Active', value: activeUsers, color: 'text-emerald-600' },
        { label: 'Inactive', value: inactiveUsers, color: 'text-rose-600' }
      ]
    },
    {
      title: 'Total Vendors',
      value: totalVendors,
      icon: Shield,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      stats: [
        { label: 'Active', value: activeVendors, color: 'text-emerald-600' },
        { label: 'New This Month', value: newVendorsThisMonth || 1, color: 'text-blue-600' }
      ]
    },
    {
      title: 'Active RFQs',
      value: openRfqs + pendingRfqs,
      icon: FileText,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      stats: [
        { label: 'Open', value: openRfqs, color: 'text-emerald-600' },
        { label: 'Pending Approval', value: pendingRfqs, color: 'text-amber-600' }
      ]
    },
    {
      title: 'Active Purchase Orders',
      value: pendingPOs,
      icon: CheckSquare,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      stats: [
        { label: 'Completed', value: completedPOs, color: 'text-emerald-600' },
        { label: 'Cancelled', value: cancelledPOs, color: 'text-rose-600' }
      ]
    },
    {
      title: 'Total Invoices',
      value: paidInvoices + pendingInvoices + overdueInvoices,
      icon: Receipt,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      stats: [
        { label: 'Paid', value: paidInvoices, color: 'text-emerald-600' },
        { label: 'Overdue', value: overdueInvoices, color: 'text-rose-600 font-bold' }
      ]
    }
  ];

  const quickActions = [
    {
      label: 'Create User',
      description: 'Add system roles & scopes',
      icon: UserPlus,
      onClick: onOpenCreateUser,
      color: 'hover:border-indigo-300 hover:bg-indigo-50/10 text-indigo-600'
    },
    {
      label: 'Add Vendor',
      description: 'Register tax & corporate details',
      icon: ShieldAlert,
      onClick: onOpenAddVendor,
      color: 'hover:border-emerald-300 hover:bg-emerald-50/10 text-emerald-600'
    },
    {
      label: 'View Reports',
      description: 'Generate audit ledgers',
      icon: FileBarChart,
      onClick: () => onNavigateTab('reports'),
      color: 'hover:border-blue-300 hover:bg-blue-50/10 text-blue-600'
    },
    {
      label: 'View Analytics',
      description: 'Audit visual dashboards',
      icon: BarChart3,
      onClick: () => onNavigateTab('analytics'),
      color: 'hover:border-amber-300 hover:bg-amber-50/10 text-amber-600'
    }
  ];

  return (
    <div className="space-y-8 select-none font-sans text-sm">
      {/* Welcome header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md">
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight">System Operator Console</h2>
          <p className="text-slate-300 text-sm leading-normal">
            Welcome back, Administrator. Monitoring portal integrity, active registers, and compliance ledgers.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-xs font-bold tracking-wider uppercase">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>System Healthy</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
                <div className={`p-2.5 rounded-xl border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <span className="text-3xl font-extrabold text-slate-900 leading-none">{card.value}</span>
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  {card.stats.map((stat, sIdx) => (
                    <div key={sIdx} className="space-y-0.5">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wide">{stat.label}</span>
                      <span className={`block font-extrabold ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions and Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5">Quick Actions</h3>
          
          <div className="grid grid-cols-1 gap-3.5">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border border-slate-150 hover:shadow-sm text-left transition-all cursor-pointer ${action.color}`}
                >
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-slate-800 block leading-tight">{action.label}</span>
                    <span className="text-xs text-slate-400 font-semibold block">{action.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Timeline Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live System Logs</h3>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider cursor-pointer"
            >
              Full Timeline
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {logs.slice(0, 4).map((log, idx) => (
              <div key={log.id} className="flex gap-3 relative group">
                {/* Visual Line connector */}
                {idx !== 3 && (
                  <div className="absolute left-3.5 top-7 bottom-[-22px] w-0.5 bg-slate-100" />
                )}

                <div className="w-7 h-7 rounded-full bg-slate-55 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Activity className="w-4 h-4 text-slate-400" />
                </div>

                <div className="flex-1 min-w-0 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl p-3.5 transition-colors">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-850 text-sm font-semibold leading-relaxed truncate">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
