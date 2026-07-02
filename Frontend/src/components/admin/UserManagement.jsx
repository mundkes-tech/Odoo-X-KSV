import React, { useState } from 'react';
import { Search, Filter, Plus, Eye, Edit2, ShieldAlert, Lock, MoreVertical, X, Check, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement({ users, onAddUser, onUpdateUser, onResetPassword, onAddLog }) {
  const { API_BASE } = useAuth();
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'PROCUREMENT_OFFICER',
    status: 'ACTIVE',
    phone: '',
  });

  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [formErrors, setFormErrors] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ACTIONS ---
  
  const handleOpenCreateModal = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'PROCUREMENT_OFFICER',
      status: 'ACTIVE',
      phone: '',
    });
    setFormErrors('');
    setIsCreateModalOpen(true);
  };

  const handleOpenDetails = (user) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.full_name,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      status: user.is_active ? 'ACTIVE' : 'INACTIVE',
      phone: user.phone || '',
    });
    setFormErrors('');
    setIsEditModalOpen(true);
  };

  const handleOpenResetPassword = (user) => {
    setSelectedUser(user);
    setResetPasswordVal('');
    setFormErrors('');
    setIsResetPasswordOpen(true);
  };

  // Create User
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setFormErrors('');

    // Validations
    if (!formData.fullName || !formData.email || !formData.password || !formData.role) {
      setFormErrors('All mandatory fields must be filled.');
      return;
    }

    if (formData.password.length < 8) {
      setFormErrors('Password must be at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFormErrors('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      // Call register API
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'API Registration failed.');
      }

      // Add to local state (using standard response format)
      const newUser = {
        id: data.data.id || Math.random().toString(),
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role,
        is_active: formData.status === 'ACTIVE',
        created_at: new Date().toISOString(),
        phone: formData.phone || '+91 99999 88888',
        // Mock activity fields
        rfqs_created: 0,
        approvals_done: 0,
        pos_generated: 0,
        last_login: 'Never'
      };

      onAddUser(newUser);
      onAddLog('USER_CREATED', `Admin registered new user: ${formData.fullName} (${formData.role})`);
      setIsCreateModalOpen(false);
    } catch (err) {
      setFormErrors(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update User
  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    setFormErrors('');

    if (!formData.fullName || !formData.email) {
      setFormErrors('Name and Email are required.');
      return;
    }

    setLoading(true);

    try {
      const updatedUser = {
        ...selectedUser,
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role,
        is_active: formData.status === 'ACTIVE',
        phone: formData.phone,
      };

      await onUpdateUser(updatedUser);
      setIsEditModalOpen(false);
    } catch (err) {
      setFormErrors(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Disable / Enable User toggle
  const handleToggleStatus = async (user) => {
    const updatedUser = {
      ...user,
      is_active: !user.is_active,
    };
    await onUpdateUser(updatedUser);
    // Sync active details modal
    if (selectedUser?.id === user.id) {
      setSelectedUser(updatedUser);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setFormErrors('');

    if (!resetPasswordVal || resetPasswordVal.length < 8) {
      setFormErrors('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await onResetPassword(selectedUser, resetPasswordVal);
      setIsResetPasswordOpen(false);
      if (isDetailsModalOpen) {
        setIsDetailsModalOpen(false);
      }
    } catch (err) {
      setFormErrors(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTER & SORT LOGIC ---
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;

    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'date_asc') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortBy === 'name_asc') {
      return a.full_name.localeCompare(b.full_name);
    }
    return 0;
  });

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'MANAGER': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'VENDOR': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'PROCUREMENT_OFFICER': return 'bg-blue-50 text-blue-700 border-blue-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-6 select-none font-sans text-sm md:text-base">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">User Management Module</h2>
          <p className="text-slate-500 text-sm md:text-base mt-1 leading-normal">
            Manage system operators, assign permission scopes, edit active user profiles, and audit logins.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-4.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all cursor-pointer w-max self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Create User</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
          />
        </div>

        {/* Sorting and Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
              <option value="MANAGER">Manager</option>
              <option value="VENDOR">Vendor</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4.5">Name</th>
                <th className="px-6 py-4.5">Email</th>
                <th className="px-6 py-4.5">Role</th>
                <th className="px-6 py-4.5">Status</th>
                <th className="px-6 py-4.5">Created Date</th>
                <th className="px-6 py-4.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-14 text-slate-400 font-semibold text-sm">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-900">{user.full_name}</td>
                    <td className="px-6 py-5 text-slate-500 font-semibold">{user.email}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{user.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-5 text-slate-400 font-bold">
                      {new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetails(user)}
                          title="View Details"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit User"
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: CREATE USER --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Create New System User</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4">
              {formErrors && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formErrors}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  placeholder="e.g. john@vendorbridge.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                    placeholder="Min. 8 chars"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                    placeholder="Confirm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role Selection *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-300 cursor-pointer"
                  >
                    <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-300 cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <span>Save User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: USER DETAILS --- */}
      {isDetailsModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">User Details Profile</h3>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Profile Information</h4>
                
                <div className="grid grid-cols-2 gap-5 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Full Name</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedUser.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Email</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Role Scope</span>
                    <span className={`px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-wider block mt-1 w-max ${getRoleBadgeStyle(selectedUser.role)}`}>
                      {selectedUser.role?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Contact Phone</span>
                    <span className="font-extrabold text-slate-800 block mt-1">{selectedUser.phone || '+91 99999 88888'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Status</span>
                    <span className={`font-extrabold block mt-1 ${selectedUser.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedUser.is_active ? 'Active Operation' : 'Disabled / Suspended'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wide">Created Date</span>
                    <span className="font-extrabold text-slate-800 block mt-1">
                      {new Date(selectedUser.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity statistics */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Activity Summary</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-150 rounded-xl p-4.5">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold text-xs">RFQs Created</span>
                    <span className="text-xl font-extrabold text-slate-900 block">{selectedUser.rfqs_created ?? 0}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold text-xs">Approvals Processed</span>
                    <span className="text-xl font-extrabold text-slate-900 block">{selectedUser.approvals_done ?? 0}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold text-xs">POs Generated</span>
                    <span className="text-xl font-extrabold text-slate-900 block">{selectedUser.pos_generated ?? 0}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-bold text-xs">Last Login Trace</span>
                    <span className="text-sm font-bold text-slate-700 block mt-1">{selectedUser.last_login || 'Never'}</span>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 text-sm">
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenEdit(selectedUser);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Edit User
                </button>
                <button
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`flex-1 py-2.5 font-bold rounded-xl border transition-colors cursor-pointer ${
                    selectedUser.is_active
                      ? 'border-rose-200 text-rose-600 hover:bg-rose-50/50'
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50/50'
                  }`}
                >
                  {selectedUser.is_active ? 'Disable User' : 'Enable User'}
                </button>
                <button
                  onClick={() => {
                    handleOpenResetPassword(selectedUser);
                  }}
                  className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Reset User Password</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: EDIT USER --- */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Update User Credentials</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="p-5 space-y-4">
              {formErrors && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formErrors}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role Scope</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-300 cursor-pointer"
                  >
                    <option value="PROCUREMENT_OFFICER">Procurement Officer</option>
                    <option value="MANAGER">Manager</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-slate-300 cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: RESET PASSWORD DIRECT FORM --- */}
      {isResetPasswordOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-[zoomIn_0.2s_ease-out]">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Reset Password</h3>
              <button onClick={() => setIsResetPasswordOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              {formErrors && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{formErrors}</span>
                </div>
              )}

              <p className="text-slate-500 text-sm leading-relaxed">
                Enter a new password of at least 8 characters for <strong>{selectedUser.full_name}</strong>.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password *</label>
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-white"
                  placeholder="Min. 8 characters"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-4.5 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
