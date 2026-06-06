import React from 'react';
import { Bell, Check, Trash2, X, AlertCircle, Info, CheckCircle2, FileText, UserPlus } from 'lucide-react';

export default function NotificationCenter({ 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onClearAll, 
  isOpen, 
  onClose 
}) {
  if (!isOpen) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'RFQ_CREATED':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'VENDOR_ADDED':
        return <UserPlus className="w-5 h-5 text-emerald-500" />;
      case 'APPROVAL_COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-purple-500" />;
      case 'PO_GENERATED':
        return <Info className="w-5 h-5 text-amber-500" />;
      case 'INVOICE_GENERATED':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getNotificationBadgeColor = (type) => {
    switch (type) {
      case 'RFQ_CREATED': return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'VENDOR_ADDED': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'APPROVAL_COMPLETED': return 'bg-purple-50 border-purple-100 text-purple-700';
      case 'PO_GENERATED': return 'bg-amber-50 border-amber-100 text-amber-700';
      case 'INVOICE_GENERATED': return 'bg-rose-50 border-rose-100 text-rose-700';
      default: return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read && !n.read).length;

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-[slideIn_0.3s_ease-out] select-none text-sm md:text-base">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bell className="w-6 h-6 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">Notification Center</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Control Actions */}
      <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-xs md:text-sm">
        <span className="text-slate-500 font-semibold">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</span>
        <div className="flex gap-4">
          {unreadCount > 0 && (
            <button 
              onClick={onMarkAllRead}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={onClearAll}
              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-sm">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center text-slate-400 gap-2.5">
            <Bell className="w-10 h-10 opacity-30" />
            <p>All caught up! No notifications.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isRead = n.is_read || n.read;
            return (
              <div 
                key={n.id} 
                className={`p-5 transition-colors relative flex gap-3.5 ${!isRead ? 'bg-blue-50/20' : 'hover:bg-slate-50'}`}
              >
                <div className="mt-0.5">
                  <div className={`p-2 rounded-xl border ${getNotificationBadgeColor(n.type || 'INFO')}`}>
                    {getNotificationIcon(n.type || 'INFO')}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-sans">
                      {(n.type || n.title || 'INFO')?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {n.time || new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-800 text-sm font-semibold leading-relaxed">{n.message}</p>
                </div>

                {/* Individual actions */}
                <div className="absolute right-3 top-3 flex gap-1">
                  {!isRead && (
                    <button 
                      onClick={() => onMarkRead(n.id)}
                      title="Mark as read"
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded border border-transparent hover:border-slate-100 shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
