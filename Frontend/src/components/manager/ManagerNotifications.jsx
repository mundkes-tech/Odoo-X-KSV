import React, { useState } from 'react';
import {
  Bell, CheckCircle2, Eye, Trash2, Check,
  CheckCheck, FileText, AlertCircle, Clock,
  FileSpreadsheet, Receipt, Filter
} from 'lucide-react';

export default function ManagerNotifications({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll
}) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const notificationTypes = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'Approval', label: 'Approvals', icon: CheckCircle2 },
    { id: 'RFQ', label: 'RFQs', icon: FileText },
    { id: 'Purchase', label: 'POs', icon: FileSpreadsheet },
    { id: 'Invoice', label: 'Invoices', icon: Receipt }
  ];

  const filtered = notifications.filter(n => {
    if (filterType !== 'all' && !(n.type || n.message || '').includes(filterType)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (n.message || '').toLowerCase().includes(q) || (n.type || '').toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read && !n.read).length;

  const getNotificationIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('approv')) return { icon: CheckCircle2, color: 'text-amber-600 bg-amber-50 border-amber-100' };
    if (t.includes('rfq')) return { icon: FileText, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
    if (t.includes('purchase') || t.includes('po')) return { icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
    if (t.includes('invoice')) return { icon: Receipt, color: 'text-violet-600 bg-violet-50 border-violet-100' };
    return { icon: Bell, color: 'text-blue-600 bg-blue-50 border-blue-100' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Notification Center</h2>
          <p className="text-slate-500 text-base mt-1.5">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'All notifications are read.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-100 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
          <button
            onClick={onClearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        {notificationTypes.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-bold transition duration-200 cursor-pointer ${
                filterType === type.id
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
        />
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 shadow-sm flex flex-col items-center text-slate-400">
            <Bell className="w-12 h-12 mb-3 opacity-30" />
            <span className="text-base font-bold">No notifications found.</span>
            <span className="text-sm mt-1">New notifications will appear here when actions are taken.</span>
          </div>
        ) : (
          filtered.map(n => {
            const isUnread = !n.is_read && !n.read;
            const { icon: NIcon, color } = getNotificationIcon(n.type || n.message);
            return (
              <div
                key={n.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm flex items-start gap-4 transition duration-200 hover:shadow-md ${
                  isUnread ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${color}`}>
                  <NIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-500 uppercase tracking-wider mb-1">{n.type || 'Notification'}</p>
                      <p className={`text-base leading-relaxed ${isUnread ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {n.message}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-2 animate-pulse" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2.5">
                    <span className="text-sm text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {n.time || (n.created_at ? new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-')}
                    </span>
                    {isUnread && (
                      <button
                        onClick={() => onMarkRead(n.id)}
                        className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:text-blue-800 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
