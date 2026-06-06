import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, User, Mail, Shield, Lock, Unlock, 
  Play, CheckCircle2, XCircle, Terminal, 
  Layers, Settings, HelpCircle, FileText, CheckSquare, Bell,
  Users, BarChart3, FileBarChart, Clock, ShieldCheck, Activity,
  FileSpreadsheet, Receipt
} from 'lucide-react';

// Import Admin components
import AdminHome from '../components/admin/AdminHome';
import UserManagement from '../components/admin/UserManagement';
import VendorManagement from '../components/admin/VendorManagement';
import ProcurementAnalytics from '../components/admin/ProcurementAnalytics';
import ReportsModule from '../components/admin/ReportsModule';
import ActivityLogs from '../components/admin/ActivityLogs';
import NotificationCenter from '../components/admin/NotificationCenter';

// Import Procurement Officer components
import ProcurementHome from '../components/procurement/ProcurementHome';
import RfqManagement from '../components/procurement/RfqManagement';
import QuotationManagement from '../components/procurement/QuotationManagement';
import ApprovalRequest from '../components/procurement/ApprovalRequest';
import PoManagement from '../components/procurement/PoManagement';
import InvoiceManagement from '../components/procurement/InvoiceManagement';
import ProcurementLogs from '../components/procurement/ProcurementLogs';

// Import Manager components
import ManagerHome from '../components/manager/ManagerHome';
import ApprovalWorkflow from '../components/manager/ApprovalWorkflow';
import ProcurementMonitor from '../components/manager/ProcurementMonitor';
import ManagerReports from '../components/manager/ManagerReports';
import ManagerNotifications from '../components/manager/ManagerNotifications';
import ManagerActivityLogs from '../components/manager/ManagerActivityLogs';

// Import Vendor components
import VendorHome from '../components/vendor/VendorHome';
import VendorRfqList from '../components/vendor/VendorRfqList';
import VendorQuotations from '../components/vendor/VendorQuotations';
import VendorRfqTracking from '../components/vendor/VendorRfqTracking';
import VendorPurchaseOrders from '../components/vendor/VendorPurchaseOrders';
import VendorNotifications from '../components/vendor/VendorNotifications';
// VendorActivityLogs removed from imports: vendors must not access activity logs per RBAC
import VendorProfile from '../components/vendor/VendorProfile';

// --- INITIAL SEED DATABASES (FALLBACKS) ---
const INITIAL_USERS = [
  {
    id: '1',
    full_name: 'Sujal Vasara',
    email: 'vasarasujal.cg@gmail.com',
    role: 'ADMIN',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    phone: '+91 98765 43210',
    rfqs_created: 0,
    approvals_done: 0,
    pos_generated: 0,
    last_login: 'Today, 10:15 AM'
  },
  {
    id: '2',
    full_name: 'John Doe',
    email: 'john@vendorbridge.com',
    role: 'PROCUREMENT_OFFICER',
    is_active: true,
    created_at: '2026-02-15T00:00:00Z',
    phone: '+91 99999 88888',
    rfqs_created: 12,
    approvals_done: 0,
    pos_generated: 8,
    last_login: 'Yesterday, 4:30 PM'
  },
  {
    id: '3',
    full_name: 'Sarah Smith',
    email: 'sarah@vendorbridge.com',
    role: 'MANAGER',
    is_active: true,
    created_at: '2026-03-10T00:00:00Z',
    phone: '+91 98888 77777',
    rfqs_created: 0,
    approvals_done: 22,
    pos_generated: 0,
    last_login: 'Today, 8:45 AM'
  }
];

const INITIAL_VENDORS = [
  {
    id: 'v1',
    company_name: 'Acme Corporation',
    gst_number: '27AAAAA1111A1Z1',
    category: 'Manufacturing',
    contact_person: 'John Acme',
    email: 'contact@acme.com',
    phone: '+91 98765 43210',
    address: 'MIDC Phase II, Block G-4, Andheri East, Mumbai, Maharashtra',
    status: 'ACTIVE',
    created_at: '2026-01-10T00:00:00Z',
    rfqs_participated: 15,
    quotations_submitted: 12,
    success_rate: 80,
    rating: 4.8,
    delivery_performance: 96,
    procurement_value: 350000
  },
  {
    id: 'v2',
    company_name: 'Globex Corporation',
    gst_number: '27BBBBB2222B2Z2',
    category: 'Logistics',
    contact_person: 'Alice Globex',
    email: 'info@globex.com',
    phone: '+91 98765 43211',
    address: 'Sector 15, Industrial Estate, Gurugram, Haryana',
    status: 'ACTIVE',
    created_at: '2026-02-05T00:00:00Z',
    rfqs_participated: 10,
    quotations_submitted: 8,
    success_rate: 62,
    rating: 4.2,
    delivery_performance: 89,
    procurement_value: 120000
  }
];

const INITIAL_RFQS = [
  { id: 'RFQ-2026-001', title: 'Industrial Steel Supply', status: 'CLOSED', created_at: '2026-05-01', category: 'Manufacturing' },
  { id: 'RFQ-2026-002', title: 'Office IT Equipment', status: 'OPEN', created_at: '2026-05-15', category: 'IT Services' },
  { id: 'RFQ-2026-003', title: 'Warehouse Security Systems', status: 'PENDING', created_at: '2026-06-01', category: 'Security' }
];

const INITIAL_POS = [
  { id: 'PO-2026-001', title: 'Steel Plates Order', amount: 150000, vendor: 'Acme Corporation', status: 'COMPLETED', created_at: '2026-05-10' },
  { id: 'PO-2026-002', title: 'Laptops & Monitors', amount: 75000, vendor: 'Initech LLC', status: 'PENDING', created_at: '2026-05-22' }
];

const INITIAL_INVOICES = [
  { id: 'INV-2026-001', amount: 150000, vendor: 'Acme Corporation', status: 'PAID', due_date: '2026-05-30', created_at: '2026-05-10' },
  { id: 'INV-2026-002', amount: 75000, vendor: 'Initech LLC', status: 'PENDING', due_date: '2026-06-22', created_at: '2026-05-22' }
];

const INITIAL_LOGS = [
  { id: 'l1', action: 'VENDOR_CREATED', description: 'Admin registered new vendor "Umbrella Corp"', user_name: 'Sujal Vasara', user_role: 'ADMIN', timestamp: '10:00 AM' },
  { id: 'l2', action: 'RFQ_CREATED', description: 'Procurement Officer Created RFQ "RFQ-2026-003"', user_name: 'John Doe', user_role: 'PROCUREMENT_OFFICER', timestamp: '10:15 AM' }
];

const INITIAL_NOTIFICATIONS = [
  { id: 'n1', type: 'RFQ_CREATED', message: 'RFQ-2026-003 "Warehouse Security Systems" has been created.', time: '10:15 AM', read: false },
  { id: 'n2', type: 'VENDOR_ADDED', message: 'Vendor "Umbrella Corp" was registered by Admin.', time: '10:00 AM', read: false }
];

export default function Dashboard() {
  const { user, token, logout, API_BASE } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isProcurementOfficer = user?.role === 'PROCUREMENT_OFFICER';
  const isManager = user?.role === 'MANAGER';
  const isVendor = user?.role === 'VENDOR';

  // --- STATE FOR ALL ROLE MODULES ---
  const [activeTab, setActiveTab] = useState(isAdmin ? 'dashboard' : isManager ? 'manager-home' : isVendor ? 'vendor-home' : 'overview');
  const [selectedRfqForQuotation, setSelectedRfqForQuotation] = useState(null);
  const [vendorRfqs, setVendorRfqs] = useState([]);
  const [users, setUsers] = useState(() => {
    const cached = localStorage.getItem('vb_users');
    return cached ? JSON.parse(cached) : INITIAL_USERS;
  });
  const [vendors, setVendors] = useState(() => {
    const cached = localStorage.getItem('vb_vendors');
    return cached ? JSON.parse(cached) : INITIAL_VENDORS;
  });
  const [rfqs, setRfqs] = useState(INITIAL_RFQS);
  const [purchaseOrders, setPurchaseOrders] = useState(INITIAL_POS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [approvals, setApprovals] = useState([]);
  const [quotations, setQuotations] = useState([]);
  
  const [logs, setLogs] = useState(() => {
    const cached = localStorage.getItem('vb_logs');
    return cached ? JSON.parse(cached) : INITIAL_LOGS;
  });
  
  const [notifications, setNotifications] = useState(() => {
    const cached = localStorage.getItem('vb_notifications');
    return cached ? JSON.parse(cached) : INITIAL_NOTIFICATIONS;
  });

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // --- DEV PANEL STATE (Original) ---
  const [testEndpoint, setTestEndpoint] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // --- BACKEND API SYNCS ---
  const loadAllData = async () => {
    if (!token) return;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 1. Fetch Users (Admin Only)
    if (isAdmin) {
      try {
        const res = await fetch(`${API_BASE}/auth/users`, { headers });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          setUsers(data.data);
        }
      } catch (err) {
        console.warn("Failed to fetch users from backend", err);
      }
    }

    // 2. Fetch Vendors
    try {
      const res = await fetch(`${API_BASE}/vendors?limit=100`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.vendors) {
        setVendors(data.vendors);
      }
    } catch (err) {
      console.warn("Failed to fetch vendors from backend", err);
    }

    // 3. Fetch RFQs
    try {
      const res = await fetch(`${API_BASE}/rfqs`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.rfqs) {
        setRfqs(data.rfqs);
      }
    } catch (err) {
      console.warn("Failed to fetch RFQs from backend", err);
    }

    // 4. Fetch Purchase Orders
    try {
      const res = await fetch(`${API_BASE}/purchase-orders`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const list = data.data.purchaseOrders || data.data;
        if (Array.isArray(list)) {
          setPurchaseOrders(list.map(p => ({
            id: p.id,
            po_number: p.po_number || `PO-${p.id.substring(0,5)}`,
            total_amount: Number(p.total_amount),
            status: p.status,
            created_at: p.created_at,
            vendor: p.vendor || { company_name: p.vendor_name || 'Vendor' },
            quotation: p.quotation || { price: Number(p.total_amount) },
            rfq: p.rfq || { title: p.rfq_title || 'RFQ Requirement' }
          })));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch POs from backend", err);
    }

    // 5. Fetch Invoices
    try {
      const res = await fetch(`${API_BASE}/invoices`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const list = data.data.invoices || data.data;
        if (Array.isArray(list)) {
          setInvoices(list.map(i => ({
            id: i.id,
            invoice_number: i.invoice_number,
            subtotal: Number(i.subtotal),
            tax_amount: Number(i.tax_amount),
            total_amount: Number(i.total_amount),
            status: i.status === 'GENERATED' ? 'PENDING' : i.status,
            created_at: i.created_at,
            purchase_order: i.purchase_order || { po_number: i.po_number || 'PO' },
            vendor: i.vendor || { company_name: i.vendor_name || 'Vendor' }
          })));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch invoices from backend", err);
    }

  // 6. Fetch Logs (Admin, Manager or Procurement Officer)
    if (isAdmin || isManager || isProcurementOfficer) {
      try {
        const res = await fetch(`${API_BASE}/activity-logs?limit=100`, { headers });
        const data = await res.json();
        if (res.ok && data.success && data.data && data.data.activity_logs) {
          setLogs(data.data.activity_logs.map(log => ({
            id: log.id,
            action: log.action,
            description: log.description,
            user_name: log.user?.full_name || 'System',
            user_role: log.user?.role || 'SYSTEM',
            timestamp: new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            created_at: log.created_at
          })));
        }
      } catch (err) {
        console.warn("Failed to fetch logs from backend", err);
      }
    }

    // 7. Fetch Notifications
    try {
      const res = await fetch(`${API_BASE}/notifications`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.data && data.data.notifications) {
        setNotifications(data.data.notifications.map(n => ({
          id: n.id,
          type: n.title,
          message: n.message,
          time: new Date(n.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          read: n.is_read,
          is_read: n.is_read,
          created_at: n.created_at
        })));
      }
    } catch (err) {
      console.warn("Failed to fetch notifications from backend", err);
    }

    // 8. Fetch Quotations (All roles except default)
    if (isProcurementOfficer || isAdmin || isManager || isVendor) {
      try {
        const res = await fetch(`${API_BASE}/quotations`, { headers });
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.data || data.quotations || [];
          setQuotations(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.warn("Failed to fetch quotations from backend", err);
      }
    }

    // 9. Fetch Approvals (Procurement / Admin / Manager)
    if (isProcurementOfficer || isAdmin || isManager) {
      try {
        const res = await fetch(`${API_BASE}/approvals`, { headers });
        const data = await res.json();
        if (res.ok && data.success && data.data && data.data.approvals) {
          setApprovals(data.data.approvals);
        }
      } catch (err) {
        console.warn("Failed to fetch approvals from backend", err);
      }
    }

    // 10. Fetch Vendor's assigned RFQs (Vendor only)
    if (isVendor && user?.id) {
      try {
        const res = await fetch(`${API_BASE}/vendors/me/rfqs`, { headers });
        const data = await res.json();
        if (res.ok && data.success && data.rfqs) {
          setVendorRfqs(data.rfqs);
        }
      } catch (err) {
        console.warn("Failed to fetch vendor RFQs from backend", err);
        // Fallback: try listing all RFQs (some may be visible)
        try {
          const res2 = await fetch(`${API_BASE}/rfqs`, { headers });
          const data2 = await res2.json();
          if (res2.ok && data2.success && data2.rfqs) {
            setVendorRfqs(data2.rfqs);
          }
        } catch (err2) {
          console.warn("Fallback RFQ fetch also failed", err2);
        }
      }
    }
  };

  useEffect(() => {
    if (isAdmin || isProcurementOfficer || isManager || isVendor) {
      loadAllData();
    }
  }, [token, isAdmin, isProcurementOfficer, isManager, isVendor]);

  // Sync state to local storage when changed as backup
  useEffect(() => {
    localStorage.setItem('vb_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('vb_vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem('vb_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('vb_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // --- MUTATORS WITH BACKEND SYNC ---
  const handleAddUser = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      const res = await fetch(`${API_BASE}/auth/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: updatedUser.full_name,
          email: updatedUser.email,
          role: updatedUser.role,
          is_active: updatedUser.is_active
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? data.data : u));
        handleAddLog('USER_UPDATED', `Admin updated user details: ${updatedUser.full_name}`);
        return;
      }
    } catch (err) {
      console.warn("Failed to update user in backend, updating locally", err);
    }
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    handleAddLog('USER_UPDATED', `Admin updated user details (Local): ${updatedUser.full_name}`);
  };

  const handleResetPassword = async (userObj, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/users/${userObj.id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Password for ${userObj.full_name} has been updated successfully on the backend!`);
        handleAddLog('USER_PASSWORD_RESET', `Admin reset password for user: ${userObj.full_name}`);
        return;
      }
    } catch (err) {
      console.warn("Failed to reset password on backend", err);
    }
    alert(`Password updated failed on backend. (Simulated complete)`);
  };

  const handleSyncVendors = (backendVendors) => {
    setVendors(backendVendors);
  };

  const handleAddVendor = (newVendor) => {
    setVendors(prev => [newVendor, ...prev]);
  };

  const handleUpdateVendor = (updatedVendor) => {
    setVendors(prev => prev.map(v => v.id === updatedVendor.id ? updatedVendor : v));
  };

  const handleDeleteVendor = (vendorId) => {
    setVendors(prev => prev.filter(v => v.id !== vendorId));
  };

  const handleAddLog = (action, description) => {
    const newLog = {
      id: Math.random().toString(),
      action,
      description,
      user_name: user?.full_name || 'Admin',
      user_role: user?.role || 'ADMIN',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- NOTIFICATION HANDLERS ---
  const handleMarkNotificationRead = async (id) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Failed to mark notification as read on backend", err);
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, is_read: true } : n));
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Failed to mark all notifications as read on backend", err);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
  };

  const handleClearAllNotifications = async () => {
    try {
      await fetch(`${API_BASE}/notifications/clear`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Failed to clear notifications on backend", err);
    }
    setNotifications([]);
  };

  // --- ORIGINAL ROUTE TESTING LOGIC ---
  const testEndpoints = [
    { name: 'Admin Endpoint', path: '/auth/admin-only', requiredRole: 'ADMIN' },
    { name: 'Manager Endpoint', path: '/auth/manager-only', requiredRole: 'MANAGER' },
    { name: 'Vendor Endpoint', path: '/auth/vendor-only', requiredRole: 'VENDOR' },
  ];

  const handleTestEndpoint = async (endpoint) => {
    setTestEndpoint(endpoint.path);
    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setTestResult({
        status: response.status,
        success: response.ok && data.success,
        message: data.message || (response.ok ? 'Access granted' : 'Access denied'),
        data: data.data || null
      });
    } catch (err) {
      setTestResult({
        status: 500,
        success: false,
        message: err.message || 'Network error occurred.',
        data: null
      });
    } finally {
      setTestLoading(false);
    }
  };

  // --- HELPERS ---
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'MANAGER': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'VENDOR': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'PROCUREMENT_OFFICER': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().substring(0, 2);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read && !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased select-none text-sm md:text-base">
      
      {/* Top Navbar */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base">
            VB
          </div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight">VendorBridge ERP</span>
          <span className="hidden sm:inline px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
            v1.0.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-55 rounded-xl transition duration-200 relative cursor-pointer"
          >
            <Bell className="w-5.5 h-5.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          
          <div className="flex items-center gap-3.5 border-l border-slate-200 pl-4">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700">
              {getInitials(user?.full_name)}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-sm font-extrabold text-slate-900 block leading-none">{user?.full_name}</span>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 block">{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1">
        
        {/* Sidebar Navigation */}
        <aside className="w-68 h-[calc(100vh-4.5rem)] bg-white border-r border-slate-200 hidden md:flex flex-col p-5 z-20 shrink-0 sticky top-[4.5rem] overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-4">
            <div className="space-y-1.5">
              
              {/* ADMIN SIDEBAR LINKS */}
              {isAdmin ? (
                <>
                  {[
                    { id: 'dashboard', name: 'Dashboard', icon: Layers },
                    { id: 'users', name: 'Users', icon: Users },
                    { id: 'vendors', name: 'Vendors', icon: ShieldCheck },
                    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
                    { id: 'reports', name: 'Reports', icon: FileBarChart },
                    { id: 'logs', name: 'Activity Logs', icon: Clock },
                    { id: 'settings', name: 'Settings', icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-extrabold transition duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-50/50' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                  <hr className="border-slate-100 my-3" />
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-extrabold transition duration-200 cursor-pointer ${
                      activeTab === 'overview' 
                        ? 'bg-slate-100 text-slate-900' 
                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-55'
                    }`}
                  >
                    <Terminal className="w-5 h-5" />
                    <span>Dev Access Console</span>
                  </button>
                </>
              ) : isProcurementOfficer ? (
                <>
                  {[
                    { id: 'overview', name: 'Dashboard', icon: Layers },
                    { id: 'rfqs', name: 'RFQs & Tenders', icon: FileText },
                    { id: 'quotations', name: 'Quotations', icon: BarChart3 },
                    { id: 'approvals', name: 'Approvals', icon: CheckSquare },
                    { id: 'pos', name: 'Purchase Orders', icon: FileSpreadsheet },
                    { id: 'invoices', name: 'Tax Invoices', icon: Receipt },
                    { id: 'logs', name: 'Audit Logs', icon: Clock },
                    { id: 'settings', name: 'Settings', icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-extrabold transition duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-50/50' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </>
              ) : isManager ? (
                <>
                  {[
                    { id: 'manager-home', name: 'Dashboard', icon: Layers },
                    { id: 'manager-approvals', name: 'Approvals', icon: CheckSquare },
                    { id: 'manager-monitor', name: 'Procurement Monitor', icon: Activity },
                    { id: 'manager-reports', name: 'Reports', icon: FileBarChart },
                    { id: 'manager-notifications', name: 'Notifications', icon: Bell },
                    { id: 'manager-logs', name: 'Activity Logs', icon: Clock },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-extrabold transition duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-50/50' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </>
              ) : isVendor ? (
                <>
                  {[
                    { id: 'vendor-home', name: 'Dashboard', icon: Layers },
                    { id: 'vendor-rfqs', name: 'RFQ Invitations', icon: FileText },
                    { id: 'vendor-quotations', name: 'My Quotations', icon: BarChart3 },
                    { id: 'vendor-tracking', name: 'Track RFQs', icon: Activity },
                    { id: 'vendor-pos', name: 'Purchase Orders', icon: FileSpreadsheet },
                    { id: 'vendor-notifications', name: 'Notifications', icon: Bell },
                    { id: 'vendor-profile', name: 'My Profile', icon: User },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-extrabold transition duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-50/50' 
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </>
              ) : (
                /* DEFAULT SIDEBAR LINKS */
                [
                  { id: 'overview', name: 'Overview', icon: Layers },
                  { id: 'rfqs', name: 'RFQs & Tenders', icon: FileText },
                  { id: 'approvals', name: 'Approvals', icon: CheckSquare },
                  { id: 'settings', name: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-base font-extrabold transition duration-200 cursor-pointer ${
                        isActive 
                          ? 'bg-slate-100 text-slate-900' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-55'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </button>
                  );
                })
              )}

            </div>
          </div>

          <div className="shrink-0 space-y-3 pt-4 border-t border-slate-100 bg-white">
            <button 
              onClick={() => alert("VendorBridge ERP v1.0.0 Help Center. Contact admin@vendorbridge.com for technical support.")}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-550 hover:text-slate-900 text-base font-extrabold rounded-xl transition duration-200 cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span>Help Center</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 text-base font-extrabold rounded-xl transition duration-200 cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-6xl">
          <div className="space-y-6">
            
            {/* 1. ADMIN - HOME DASHBOARD */}
            {isAdmin && activeTab === 'dashboard' && (
              <AdminHome 
                users={users} 
                vendors={vendors} 
                rfqs={rfqs} 
                purchaseOrders={purchaseOrders} 
                invoices={invoices} 
                logs={logs}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCreateUser={() => setActiveTab('users')}
                onOpenAddVendor={() => setActiveTab('vendors')}
              />
            )}

            {/* 2. ADMIN - USER MANAGEMENT */}
            {isAdmin && activeTab === 'users' && (
              <UserManagement 
                users={users} 
                onAddUser={handleAddUser} 
                onUpdateUser={handleUpdateUser} 
                onResetPassword={handleResetPassword}
                onAddLog={handleAddLog} 
              />
            )}

            {/* 3. ADMIN - VENDOR MANAGEMENT */}
            {isAdmin && activeTab === 'vendors' && (
              <VendorManagement 
                vendors={vendors} 
                onSyncVendors={handleSyncVendors}
                onAddVendor={handleAddVendor} 
                onUpdateVendor={handleUpdateVendor} 
                onDeleteVendor={handleDeleteVendor} 
                onAddLog={handleAddLog} 
              />
            )}

            {/* 4. ADMIN - PROCUREMENT ANALYTICS */}
            {isAdmin && activeTab === 'analytics' && (
              <ProcurementAnalytics 
                vendors={vendors} 
                rfqs={rfqs} 
                purchaseOrders={purchaseOrders} 
                invoices={invoices} 
                token={token}
                API_BASE={API_BASE}
              />
            )}

            {/* 5. ADMIN - REPORTS */}
            {isAdmin && activeTab === 'reports' && (
              <ReportsModule 
                users={users} 
                vendors={vendors} 
                rfqs={rfqs} 
                purchaseOrders={purchaseOrders} 
                invoices={invoices} 
              />
            )}

            {/* 6. ADMIN - ACTIVITY LOGS */}
            {isAdmin && activeTab === 'logs' && (
              <ActivityLogs logs={logs} />
            )}

            {/* 7. ADMIN - SETTINGS */}
            {isAdmin && activeTab === 'settings' && (
              <div className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">System Parameters Config</h3>
                  <p className="text-slate-500 text-sm mt-1">Manage session behaviors, database retention limits, and security logs.</p>
                </div>
                
                <hr className="border-slate-100" />
                
                <div className="space-y-4 max-w-lg text-sm">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <span className="font-extrabold text-slate-800 block">Maintenance Protocol Mode</span>
                      <span className="text-slate-400 text-xs block mt-1">Restrict non-admin user dashboard authentication layer access.</span>
                    </div>
                    <input type="checkbox" className="w-9 h-5 rounded-full cursor-pointer bg-slate-300" defaultChecked={false} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <span className="font-extrabold text-slate-800 block">Relational Log Auditing Retention</span>
                      <span className="text-slate-400 text-xs block mt-1">Rotate audit logs when records reach database limits.</span>
                    </div>
                    <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer">
                      <option>90 Days</option>
                      <option>180 Days</option>
                      <option>365 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PROCUREMENT OFFICER VIEWS */}
            {isProcurementOfficer && activeTab === 'overview' && (
              <ProcurementHome 
                rfqs={rfqs}
                quotations={quotations}
                approvals={approvals}
                purchaseOrders={purchaseOrders}
                invoices={invoices}
                logs={logs}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCreateRfq={() => setActiveTab('rfqs')}
              />
            )}

            {isProcurementOfficer && activeTab === 'rfqs' && (
              <RfqManagement 
                rfqs={rfqs}
                vendors={vendors}
                onAddLog={handleAddLog}
                token={token}
                API_BASE={API_BASE}
                onRfqUpdate={(updatedRfqs) => setRfqs(updatedRfqs)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {isProcurementOfficer && activeTab === 'quotations' && (
              <QuotationManagement 
                initialQuotations={quotations}
                rfqs={rfqs}
                onAddLog={handleAddLog}
                token={token}
                API_BASE={API_BASE}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {isProcurementOfficer && activeTab === 'approvals' && (
              <ApprovalRequest 
                quotations={quotations}
                onAddLog={handleAddLog}
                token={token}
                API_BASE={API_BASE}
              />
            )}

            {isProcurementOfficer && activeTab === 'pos' && (
              <PoManagement 
                initialPurchaseOrders={purchaseOrders}
                quotations={quotations}
                onAddLog={handleAddLog}
                token={token}
                API_BASE={API_BASE}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {isProcurementOfficer && activeTab === 'invoices' && (
              <InvoiceManagement 
                initialInvoices={invoices}
                purchaseOrders={purchaseOrders}
                onAddLog={handleAddLog}
                token={token}
                API_BASE={API_BASE}
              />
            )}

            {isProcurementOfficer && activeTab === 'logs' && (
              <ProcurementLogs logs={logs} />
            )}

            {isProcurementOfficer && activeTab === 'settings' && (
              <div className="space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Procurement Settings</h3>
                  <p className="text-slate-500 text-sm mt-1">Configure active session preferences, bid notifications, and procurement display options.</p>
                </div>
                
                <hr className="border-slate-100" />
                
                <div className="space-y-4 max-w-lg text-base">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <span className="font-extrabold text-slate-800 block">Push Bid Notifications</span>
                      <span className="text-slate-400 text-sm block mt-1">Alert when vendor submits a quotation.</span>
                    </div>
                    <input type="checkbox" className="w-9 h-5 rounded-full cursor-pointer bg-slate-300" defaultChecked={true} />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <span className="font-extrabold text-slate-800 block">Default Valuation Currency</span>
                      <span className="text-slate-400 text-sm block mt-1">Render quotation metrics in local currency (INR).</span>
                    </div>
                    <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer text-sm">
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* MANAGER VIEWS */}
            {isManager && activeTab === 'manager-home' && (
              <ManagerHome
                approvals={approvals}
                rfqs={rfqs}
                purchaseOrders={purchaseOrders}
                invoices={invoices}
                logs={logs}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {isManager && activeTab === 'manager-approvals' && (
              <ApprovalWorkflow
                initialApprovals={approvals}
                rfqs={rfqs}
                vendors={vendors}
                token={token}
                API_BASE={API_BASE}
                onAddLog={handleAddLog}
                onRefreshData={loadAllData}
              />
            )}

            {isManager && activeTab === 'manager-monitor' && (
              <ProcurementMonitor
                rfqs={rfqs}
                approvals={approvals}
                purchaseOrders={purchaseOrders}
                invoices={invoices}
              />
            )}

            {isManager && activeTab === 'manager-reports' && (
              <ManagerReports
                approvals={approvals}
                rfqs={rfqs}
                purchaseOrders={purchaseOrders}
                invoices={invoices}
              />
            )}

            {isManager && activeTab === 'manager-notifications' && (
              <ManagerNotifications
                notifications={notifications}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onClearAll={handleClearAllNotifications}
              />
            )}

            {isManager && activeTab === 'manager-logs' && (
              <ManagerActivityLogs logs={logs} />
            )}

            {/* VENDOR VIEWS */}
            {isVendor && activeTab === 'vendor-home' && (
              <VendorHome
                rfqs={vendorRfqs}
                quotations={quotations}
                purchaseOrders={purchaseOrders}
                notifications={notifications}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {isVendor && activeTab === 'vendor-rfqs' && (
              <VendorRfqList
                rfqs={vendorRfqs}
                token={token}
                API_BASE={API_BASE}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onSelectRfqForQuotation={(rfq) => setSelectedRfqForQuotation(rfq)}
              />
            )}

            {isVendor && activeTab === 'vendor-quotations' && (
              <VendorQuotations
                initialQuotations={quotations}
                rfqs={vendorRfqs}
                selectedRfq={selectedRfqForQuotation}
                token={token}
                API_BASE={API_BASE}
                onAddLog={handleAddLog}
                onRefreshData={loadAllData}
              />
            )}

            {isVendor && activeTab === 'vendor-tracking' && (
              <VendorRfqTracking
                rfqs={vendorRfqs}
                quotations={quotations}
              />
            )}

            {isVendor && activeTab === 'vendor-pos' && (
              <VendorPurchaseOrders
                purchaseOrders={purchaseOrders}
                token={token}
                API_BASE={API_BASE}
              />
            )}

            {isVendor && activeTab === 'vendor-notifications' && (
              <VendorNotifications
                notifications={notifications}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllNotificationsRead}
                onClearAll={handleClearAllNotifications}
              />
            )}

            {/* Vendor activity logs removed from vendor UI to prevent access to audit logs */}

            {isVendor && activeTab === 'vendor-profile' && (
              <VendorProfile
                user={user}
                quotations={quotations}
                purchaseOrders={purchaseOrders}
                token={token}
                API_BASE={API_BASE}
              />
            )}

            {/* 8. ORIGINAL OVERVIEW / DEV ACCESS PANEL */}
            {!isProcurementOfficer && !isManager && !isVendor && activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Access Control Unit</h2>
                  <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
                    Review your active session details and test platform access layers.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Profile Card */}
                  <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 font-extrabold text-base">
                          {getInitials(user?.full_name)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-950 text-base leading-none">{user?.full_name}</h4>
                          <span className="text-slate-400 text-xs font-bold tracking-wider mt-1 block uppercase">{user?.role}</span>
                        </div>
                      </div>

                      <hr className="border-slate-100" />

                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2.5">
                          <Mail className="w-5 h-5 text-slate-400" />
                          <span className="truncate">{user?.email}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-5 h-5 text-slate-400" />
                          <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user?.role)}`}>
                            {user?.role?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs font-mono break-all text-slate-500 leading-normal">
                      <span className="font-extrabold text-slate-700 block mb-1 uppercase tracking-wider text-[10px]">Session Token:</span>
                      Bearer {token?.substring(0, 15)}...{token?.substring(token.length - 15)}
                    </div>
                  </div>

                  {/* Access Control list */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-extrabold text-slate-950 text-base">Access Control Unit</h4>
                        <p className="text-slate-400 text-xs mt-0.5 leading-normal">
                          Query backend routes with your active credentials. Only corresponding roles are authorized.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {testEndpoints.map((ep) => (
                          <div 
                            key={ep.path} 
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-150 bg-slate-55/50 hover:bg-slate-50 transition duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold font-mono">
                                GET
                              </span>
                              <span className="font-mono text-sm text-slate-700">{ep.path}</span>
                            </div>

                            <button
                              onClick={() => handleTestEndpoint(ep)}
                              disabled={testLoading}
                              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg shadow-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 text-slate-400" />
                              <span>Run Test</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Console Response box */}
                    <div className="mt-6 border border-slate-200 bg-[#0f172a] rounded-xl p-4 min-h-[140px] flex flex-col justify-between text-slate-200">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-3.5">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                          <Terminal className="w-4.5 h-4.5" />
                          <span>Response Inspector</span>
                        </div>
                        {testEndpoint && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            {testEndpoint}
                          </span>
                        )}
                      </div>

                      {testLoading ? (
                        <div className="flex items-center justify-center flex-grow py-4">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : testResult ? (
                        <div className="space-y-3.5 flex-grow font-sans text-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {testResult.success ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                              )}
                              <span className="font-extrabold">
                                {testResult.success ? 'Access Granted' : 'Access Denied'}
                              </span>
                            </div>
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                              testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              HTTP {testResult.status}
                            </span>
                          </div>

                          <p className="text-slate-400 text-xs leading-relaxed">{testResult.message}</p>

                          {testResult.data && (
                            <pre className="text-xs bg-slate-950 p-3 rounded border border-slate-850 font-mono text-blue-300 overflow-x-auto select-text leading-relaxed">
                              {JSON.stringify(testResult.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 py-6 gap-1.5 text-xs">
                          <Unlock className="w-6 h-6 opacity-40" />
                          <span>Select "Run Test" on a route to inspect the response.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>

      {/* --- NOTIFICATION CENTER SLIDEOUT PANEL --- */}
      <NotificationCenter 
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onClearAll={handleClearAllNotifications}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

    </div>
  );
}
