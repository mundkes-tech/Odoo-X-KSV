import React, { useState, useEffect } from 'react';
import {
  Building2, Mail, Phone, MapPin, Shield,
  Star, TrendingUp, CheckCircle2, XCircle,
  Loader2, Award, FileText, BarChart3, User
} from 'lucide-react';

export default function VendorProfile({
  user,
  quotations,
  purchaseOrders,
  token,
  API_BASE
}) {
  const [vendorData, setVendorData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try to fetch the vendor profile linked to this user's email
  useEffect(() => {
    const fetchVendorProfile = async () => {
      setLoading(true);
      try {
        // The vendors list endpoint is restricted to ADMIN/PO, so we'll construct
        // profile data from user info + quotation stats. If we get lucky with
        // a custom endpoint, use it.
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // Try fetching vendor by checking purchase orders for vendor info
        let vendorInfo = null;
        if (purchaseOrders.length > 0) {
          const po = purchaseOrders[0];
          if (po.vendor) {
            vendorInfo = po.vendor;
          }
        }

        setVendorData(vendorInfo);
      } catch {
        setVendorData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVendorProfile();
  }, [token, API_BASE, purchaseOrders]);

  // Quotation stats
  const totalQuotes = quotations.length;
  const approvedQuotes = quotations.filter(q => q.status === 'APPROVED').length;
  const rejectedQuotes = quotations.filter(q => q.status === 'REJECTED').length;
  const submittedQuotes = quotations.filter(q => q.status === 'SUBMITTED').length;
  const successRate = totalQuotes > 0 ? ((approvedQuotes / totalQuotes) * 100).toFixed(1) : 0;

  // PO stats
  const totalPOs = purchaseOrders.length;
  const completedPOs = purchaseOrders.filter(p => p.status === 'COMPLETED').length;
  const totalPOValue = purchaseOrders.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

  const performanceCards = [
    { label: 'Total Quotations', value: totalQuotes, icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { label: 'Approved', value: approvedQuotes, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Total PO Value', value: `₹${totalPOValue.toLocaleString('en-IN')}`, icon: BarChart3, color: 'text-violet-600 bg-violet-50' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">My Profile</h2>
        <p className="text-slate-500 text-base mt-1.5">View your company information and performance metrics.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Profile Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-xl shrink-0">
                {(vendorData?.company_name || user?.full_name || 'V').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-slate-900">{vendorData?.company_name || user?.full_name || 'Vendor'}</h3>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mt-0.5">Registered Vendor</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase">Active</span>
                  {vendorData?.category && (
                    <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold uppercase">{vendorData.category}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" /> Company Information
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Company Name</span>
                  <span className="text-base font-bold text-slate-800">{vendorData?.company_name || user?.full_name || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">GST Number</span>
                  <span className="text-base font-bold text-slate-800 font-mono">{vendorData?.gst_number || 'Not available'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Business Category</span>
                  <span className="text-base font-bold text-slate-800">{vendorData?.category || 'General'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Address</span>
                  <span className="text-base text-slate-700 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    {vendorData?.address || 'Not available'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" /> Contact Information
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Contact Person</span>
                  <span className="text-base font-bold text-slate-800">{vendorData?.contact_person || user?.full_name || '-'}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Email</span>
                  <span className="text-base text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {user?.email || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Phone</span>
                  <span className="text-base text-slate-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {vendorData?.phone || 'Not available'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-900 mb-5 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Performance Summary
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {performanceCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="p-4 bg-slate-50 rounded-xl text-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 block">{card.value}</span>
                    <p className="text-sm text-slate-500 font-bold mt-1">{card.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Detailed breakdown */}
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
              <h4 className="text-base font-extrabold text-slate-800">Quotation Breakdown</h4>
              {[
                { label: 'Approved', value: approvedQuotes, total: totalQuotes || 1, color: 'bg-emerald-500' },
                { label: 'Submitted (Pending)', value: submittedQuotes, total: totalQuotes || 1, color: 'bg-blue-500' },
                { label: 'Rejected', value: rejectedQuotes, total: totalQuotes || 1, color: 'bg-rose-500' },
              ].map(item => {
                const pct = ((item.value / item.total) * 100).toFixed(0);
                return (
                  <div key={item.label} className="flex items-center gap-4">
                    <span className="text-base font-bold text-slate-700 w-40">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-base font-extrabold text-slate-900 w-10 text-right">{item.value}</span>
                    <span className="text-sm text-slate-400 w-12 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>

            {/* PO Stats */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <h4 className="text-base font-extrabold text-slate-800 mb-3">Purchase Order Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-xl font-extrabold text-slate-900">{totalPOs}</span>
                  <p className="text-sm text-slate-500 font-medium">Total POs</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <span className="text-xl font-extrabold text-emerald-700">{completedPOs}</span>
                  <p className="text-sm text-emerald-600 font-medium">Completed</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <span className="text-xl font-extrabold text-indigo-700">₹{totalPOValue.toLocaleString('en-IN')}</span>
                  <p className="text-sm text-indigo-600 font-medium">Total Value</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
