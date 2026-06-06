import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, Lock, Eye, EyeOff, User, AlertCircle, 
  Shield, CheckCircle, Store, Users, FileText, ArrowRight
} from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('VENDOR'); // Default
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = [
    {
      id: 'VENDOR',
      name: 'Vendor',
      icon: Store,
      desc: 'Submit bids, track sales, and upload invoices.',
      theme: 'hover:border-slate-300 text-slate-700',
    },
    {
      id: 'PROCUREMENT_OFFICER',
      name: 'Procurement',
      icon: FileText,
      desc: 'Create RFQs, manage vendors, and award POs.',
      theme: 'hover:border-slate-300 text-slate-700',
    },
    {
      id: 'MANAGER',
      name: 'Manager',
      icon: Users,
      desc: 'Review transactions, approvals, and statistics.',
      theme: 'hover:border-slate-300 text-slate-700',
    },
    {
      id: 'ADMIN',
      name: 'Admin',
      icon: Shield,
      desc: 'Manage configurations, users, and audit logs.',
      theme: 'hover:border-slate-300 text-slate-700',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all basic fields.');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsSubmitting(false);
      return;
    }

    const res = await register(fullName, email, password, selectedRole);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(res.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Successful</h2>
          <p className="text-slate-500 text-sm">
            Your account has been created. Redirecting to login in a moment...
          </p>
          <div className="w-full bg-slate-100 h-1 mt-6 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full animate-progress rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-50 font-sans antialiased overflow-hidden">
      
      {/* Left side: Navy promotional panel (cohesive with login) */}
      <div className="w-full md:w-1/2 bg-[#0b1528] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden h-full select-none">
        {/* Glowing background gradients */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-blue-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight">VendorBridge</span>
        </div>

        {/* Core Value Prop */}
        <div className="my-auto py-6 max-w-md z-10 flex flex-col justify-center flex-grow">
          <h1 className="text-3xl md:text-4.5xl font-bold tracking-tight text-white leading-tight mb-4">
            Procurement, <br />orchestrated.
          </h1>
          <p className="text-slate-400 text-sm md:text-base mb-8 leading-relaxed">
            Manage vendors, RFQs, quotations, approvals, purchase orders and invoices — all from one centralized ERP workspace.
          </p>

          <ul className="space-y-4">
            {[
              'Role-based access for officers, approvers, vendors and admins',
              'Side-by-side quotation comparison and audit trail',
              'PDF Invoices, email dispatch, real-time analytics',
            ].map((feature, idx) => (
              <li key={idx} className="flex items-start gap-3 text-slate-355 text-sm md:text-base">
                <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 z-10 mt-auto">
          © VendorBridge ERP
        </div>
      </div>

      {/* Right side: Modern Sign Up form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 h-full overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm my-auto">
          
          {/* Welcome Text */}
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Create an account</h2>
            <p className="text-slate-500 text-sm mt-1">Get started by filling out your details below.</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <Link 
              to="/login" 
              className="text-slate-500 hover:text-slate-900 py-2 px-4 rounded-lg text-sm font-semibold flex-1 text-center transition duration-200"
            >
              Sign in
            </Link>
            <div className="bg-white text-slate-900 shadow-sm py-2 px-4 rounded-lg text-sm font-semibold flex-1 text-center cursor-default">
              Sign up
            </div>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="mb-5 p-3 bg-red-50/70 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-700 text-sm animate-shake">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 rounded-xl transition duration-200 outline-none text-sm"
                  required
                />
                <User className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Email</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 rounded-xl transition duration-200 outline-none text-sm"
                  required
                />
                <Mail className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 rounded-xl transition duration-200 outline-none text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role Selection Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Portal Role</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((roleObj) => {
                  const Icon = roleObj.icon;
                  const isSelected = selectedRole === roleObj.id;
                  
                  return (
                    <button
                      key={roleObj.id}
                      type="button"
                      onClick={() => setSelectedRole(roleObj.id)}
                      className={`flex flex-col items-start p-2.5 text-left rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/30 text-blue-900 ring-1 ring-blue-600/20' 
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 font-bold">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{roleObj.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-normal">{roleObj.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition duration-200 mt-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}
