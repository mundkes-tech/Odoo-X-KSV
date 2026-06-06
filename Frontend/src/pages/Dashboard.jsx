import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, User, Mail, Shield, Lock, Unlock, 
  Play, CheckCircle2, XCircle, Terminal, 
  Layers, Settings, HelpCircle, FileText, CheckSquare, Bell
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, logout, API_BASE } = useAuth();
  
  const [testEndpoint, setTestEndpoint] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const testEndpoints = [
    {
      name: 'Admin Endpoint',
      path: '/auth/admin-only',
      requiredRole: 'ADMIN',
    },
    {
      name: 'Manager Endpoint',
      path: '/auth/manager-only',
      requiredRole: 'MANAGER',
    },
    {
      name: 'Vendor Endpoint',
      path: '/auth/vendor-only',
      requiredRole: 'VENDOR',
    },
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

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'MANAGER':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'VENDOR':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'PROCUREMENT_OFFICER':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased select-none">
      
      {/* Top Navbar */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            VB
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">VendorBridge ERP</span>
          <span className="hidden sm:inline px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider">
            v1.0.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition duration-200">
            <Bell className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
              {getInitials(user.full_name)}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-slate-900 block leading-none">{user.full_name}</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5 block">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Canvas layout with Sidebar & Content */}
      <div className="flex flex-1">
        
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between p-4 z-20">
          <div className="space-y-6">
            <div className="space-y-1">
              {[
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
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 text-sm font-semibold rounded-xl transition duration-200">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Help Center</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm font-semibold rounded-xl transition duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl">
          <div className="space-y-6">
            
            {/* Header info */}
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Portal</h2>
              <p className="text-slate-500 text-xs mt-1 leading-normal">
                Review your active session details and test platform access layers.
              </p>
            </div>

            {/* Grid details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Profile Card */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-950 text-sm leading-none">{user.full_name}</h4>
                      <span className="text-slate-400 text-[10px] font-semibold tracking-wider mt-1 block uppercase">{user.role}</span>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-2.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400" />
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] font-mono break-all text-slate-500 leading-normal">
                  <span className="font-semibold text-slate-700 block mb-0.5 uppercase tracking-wider text-[9px]">Session Token:</span>
                  Bearer {token.substring(0, 15)}...{token.substring(token.length - 15)}
                </div>
              </div>

              {/* Developer route test center */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-950 text-sm">Access Control Unit</h4>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-normal">
                      Query backend routes with your active credentials. Only corresponding roles are authorized.
                    </p>
                  </div>

                  {/* Route rows */}
                  <div className="space-y-2">
                    {testEndpoints.map((ep) => {
                      const isTesting = testEndpoint === ep.path && testLoading;
                      const hasAccess = user.role === ep.requiredRole;
                      
                      return (
                        <div 
                          key={ep.path} 
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold font-mono">
                              GET
                            </span>
                            <span className="font-mono text-xs text-slate-700">{ep.path}</span>
                          </div>

                          <button
                            onClick={() => handleTestEndpoint(ep)}
                            disabled={testLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg shadow-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-slate-400" />
                            <span>Run Test</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Console Output widget */}
                <div className="mt-6 border border-slate-200 bg-[#0f172a] rounded-xl p-4 min-h-[140px] flex flex-col justify-between text-slate-200">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Response Inspector</span>
                    </div>
                    {testEndpoint && (
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                        {testEndpoint}
                      </span>
                    )}
                  </div>

                  {testLoading ? (
                    <div className="flex items-center justify-center flex-grow py-4">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : testResult ? (
                    <div className="space-y-3 flex-grow font-sans text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {testResult.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                          <span className="font-bold">
                            {testResult.success ? 'Access Granted' : 'Access Denied'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          HTTP {testResult.status}
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] leading-relaxed">{testResult.message}</p>

                      {testResult.data && (
                        <pre className="text-[10px] bg-slate-950 p-2.5 rounded border border-slate-850 font-mono text-blue-300 overflow-x-auto select-text leading-relaxed">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 py-6 gap-1.5">
                      <Unlock className="w-5 h-5 opacity-40" />
                      <span className="text-[11px]">Select "Run Test" on a route to inspect the response.</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
