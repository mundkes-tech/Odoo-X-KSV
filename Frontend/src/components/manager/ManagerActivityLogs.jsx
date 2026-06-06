import React, { useState } from 'react';
import {
  Activity, Search, Filter, Download, Clock,
  CheckCircle2, XCircle, FileText, User,
  FileSpreadsheet, Receipt, AlertCircle, Shield
} from 'lucide-react';

export default function ManagerActivityLogs({ logs }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  const actionTypes = [
    { id: 'all', label: 'All Activity' },
    { id: 'APPROVAL', label: 'Approvals' },
    { id: 'RFQ', label: 'RFQs' },
    { id: 'QUOTATION', label: 'Quotations' },
    { id: 'PO', label: 'Purchase Orders' },
    { id: 'INVOICE', label: 'Invoices' },
    { id: 'VENDOR', label: 'Vendors' },
    { id: 'USER', label: 'Users' }
  ];

  const filtered = logs.filter(log => {
    if (filterAction !== 'all' && !(log.action || '').includes(filterAction)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (log.description || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.user_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getActionStyle = (action) => {
    const a = (action || '').toUpperCase();
    if (a.includes('APPROVED') || a.includes('CREATED') || a.includes('GENERATED')) {
      return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    }
    if (a.includes('REJECTED') || a.includes('DELETED') || a.includes('CANCELLED')) {
      return { icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-100' };
    }
    if (a.includes('RFQ')) return { icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    if (a.includes('PO') || a.includes('PURCHASE')) return { icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-50 border-blue-100' };
    if (a.includes('INVOICE')) return { icon: Receipt, color: 'text-violet-600 bg-violet-50 border-violet-100' };
    if (a.includes('USER') || a.includes('PASSWORD')) return { icon: User, color: 'text-amber-600 bg-amber-50 border-amber-100' };
    if (a.includes('VENDOR')) return { icon: Shield, color: 'text-teal-600 bg-teal-50 border-teal-100' };
    return { icon: Activity, color: 'text-slate-600 bg-slate-50 border-slate-100' };
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'MANAGER': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'PROCUREMENT_OFFICER': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleExport = () => {
    const csvHeader = 'Timestamp,Action,Description,User,Role\n';
    const csvBody = filtered.map(log =>
      `"${log.timestamp || ''}","${log.action || ''}","${(log.description || '').replace(/"/g, '""')}","${log.user_name || ''}","${log.user_role || ''}"`
    ).join('\n');

    const blob = new Blob([csvHeader + csvBody], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Activity Logs</h2>
          <p className="text-slate-500 text-base mt-1.5">Track all procurement and approval activities across the system.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-700 font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        >
          {actionTypes.map(at => (
            <option key={at.id} value={at.id}>{at.label}</option>
          ))}
        </select>
      </div>

      {/* Activity Count */}
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
        <Activity className="w-4 h-4" />
        Showing {filtered.length} of {logs.length} activities
      </div>

      {/* Timeline */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Clock className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-base font-bold">No activity logs found.</span>
            <span className="text-sm mt-1">Activity will be recorded as procurement operations occur.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((log, index) => {
              const { icon: LogIcon, color } = getActionStyle(log.action);
              return (
                <div key={log.id || index} className="flex items-start gap-4 p-5 hover:bg-slate-50/60 transition">
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${color}`}>
                    <LogIcon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-800 leading-snug">{log.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="text-sm text-slate-500 font-medium flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {log.user_name || 'System'}
                      </span>
                      {log.user_role && (
                        <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${getRoleBadge(log.user_role)}`}>
                          {log.user_role.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-sm text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {log.timestamp || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Action Badge */}
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider shrink-0 hidden sm:block">
                    {(log.action || '').replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
