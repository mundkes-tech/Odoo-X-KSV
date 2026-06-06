import React, { useState } from 'react';
import { Search, Filter, Download, Clock, User, FileText, CheckSquare, Shield } from 'lucide-react';

export default function ActivityLogs({ logs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'ALL' || log.action.includes(filterType);
    
    return matchesSearch && matchesFilter;
  });

  const getLogIcon = (action) => {
    if (action.includes('USER')) {
      return <User className="w-4.5 h-4.5 text-indigo-500" />;
    } else if (action.includes('VENDOR')) {
      return <Shield className="w-4.5 h-4.5 text-emerald-500" />;
    } else if (action.includes('RFQ')) {
      return <FileText className="w-4.5 h-4.5 text-blue-500" />;
    } else if (action.includes('APPROVAL') || action.includes('APPROVE')) {
      return <CheckSquare className="w-4.5 h-4.5 text-purple-500" />;
    }
    return <Clock className="w-4.5 h-4.5 text-slate-500" />;
  };

  const getLogColor = (action) => {
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('GENERATED')) {
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    } else if (action.includes('UPDATED') || action.includes('EDIT')) {
      return 'bg-amber-50 text-amber-600 border-amber-100';
    } else if (action.includes('DELETED') || action.includes('DISABLE') || action.includes('SUSPEND')) {
      return 'bg-rose-50 text-rose-600 border-rose-100';
    }
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  const handleExportLogs = () => {
    const textContent = filteredLogs.map(log => `[${log.timestamp || log.created_at}] ${log.user_name || log.user?.full_name || 'System'}: ${log.description} (${log.action})`).join('\n');
    
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vb_activity_logs_${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none font-sans text-sm md:text-base">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">System Activity Logs</h2>
        <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
          Real-time auditing and forensic logs of all major administrative and procurement operations.
        </p>
      </div>

      {/* Control panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Search activity description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        {/* Filters and Export */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="USER">User Operations</option>
              <option value="VENDOR">Vendor Operations</option>
              <option value="RFQ">RFQ & Tender</option>
              <option value="APPROVAL">Approvals</option>
              <option value="PO">Purchase Orders</option>
            </select>
          </div>

          <button
            onClick={handleExportLogs}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-sm font-bold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* Timeline container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2 text-sm">
            <Clock className="w-10 h-10 opacity-30" />
            <p>No matching activity logs found.</p>
          </div>
        ) : (
          <div className="relative border-l border-slate-200 pl-7 ml-3 space-y-6">
            {filteredLogs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Marker Node */}
                <div className={`absolute -left-[40px] top-0 p-1.5 rounded-full border bg-white shadow-sm transition-all group-hover:scale-110 ${getLogColor(log.action)}`}>
                  {getLogIcon(log.action)}
                </div>

                {/* Content */}
                <div className="bg-slate-50/50 group-hover:bg-slate-50/80 border border-slate-150 rounded-2xl p-4.5 transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border fit-content w-max ${getLogColor(log.action)}`}>
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 font-bold font-sans">
                      {log.timestamp || new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p className="text-slate-850 text-sm font-bold mt-1">
                    {log.description}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Triggered By: {log.user_name || log.user?.full_name || 'System'} ({(log.user_role || log.user?.role)?.replace('_', ' ') || 'SYSTEM'})</span>
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
