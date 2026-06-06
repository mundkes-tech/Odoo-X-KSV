import React, { useState } from 'react';
import { Search, Filter, Clock, Activity, ArrowDown } from 'lucide-react';

export default function ProcurementLogs({ logs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const filteredLogs = (logs || [])
    .filter((log) => {
      const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (log.action || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;

      return matchesSearch && matchesAction;
    });

  const getLogTypeColor = (action) => {
    switch (action) {
      case 'RFQ_CREATED': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'RFQ_CLOSED': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'VENDOR_SELECTED': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'APPROVAL_REQUESTED': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'PURCHASE_ORDER_GENERATED': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'INVOICE_GENERATED': return 'text-purple-600 bg-purple-50 border-purple-100';
      default: return 'text-slate-650 bg-slate-50 border-slate-150';
    }
  };

  const actionTypes = [
    { id: 'ALL', name: 'All Activities' },
    { id: 'RFQ_CREATED', name: 'RFQ Created' },
    { id: 'RFQ_CLOSED', name: 'RFQ Closed' },
    { id: 'VENDOR_SELECTED', name: 'Contract Award' },
    { id: 'APPROVAL_REQUESTED', name: 'Approvals Submitted' },
    { id: 'PURCHASE_ORDER_GENERATED', name: 'PO Generated' },
    { id: 'INVOICE_GENERATED', name: 'Invoice Issued' }
  ];

  return (
    <div className="space-y-6 select-none font-sans text-base">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Timeline Audit Logs</h2>
        <p className="text-slate-500 text-base mt-1.5 leading-normal">
          Inspect a relational, chronological audit ledger of all procurement activities, quotations compared, and invoices approved.
        </p>
      </div>

      {/* Control bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5.5 h-5.5" />
          <input
            type="text"
            placeholder="Search audit trail by description or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-350 rounded-xl text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        {/* Filter selection dropdown */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50">
          <Filter className="w-4.5 h-4.5 text-slate-450 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="bg-transparent text-base font-bold text-slate-650 focus:outline-none cursor-pointer"
          >
            {actionTypes.map(at => (
              <option key={at.id} value={at.id}>{at.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-14 text-slate-400 font-semibold italic">
            No audit log entries matched the current query.
          </div>
        ) : (
          <div className="relative border-l border-slate-200 pl-8 ml-4 space-y-6">
            {filteredLogs.map((log, idx) => (
              <div key={log.id || idx} className="relative group">
                
                {/* Node Line Marker */}
                <div className={`absolute -left-[42px] top-0.5 p-2 rounded-full border bg-white shadow-sm transition-all text-slate-500`}>
                  <Activity className="w-4.5 h-4.5" />
                </div>

                <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-2xl p-4.5 transition-colors">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className={`px-2.5 py-0.5 rounded border text-[10px] font-extrabold uppercase font-mono tracking-wider ${getLogTypeColor(log.action)}`}>
                      {log.action?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="text-slate-850 text-base font-bold leading-relaxed">{log.description}</p>
                  
                  <div className="mt-3 border-t border-slate-100/50 pt-2.5 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>Initiated By: <strong className="text-slate-700 font-extrabold">{log.user_name}</strong></span>
                    <span>Role: <strong className="text-slate-750 font-extrabold">{log.user_role?.replace('_', ' ')}</strong></span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
