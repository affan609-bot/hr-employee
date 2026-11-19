import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  UserCog, UserPlus, KeyRound, Power, Check,
  AlertCircle, RefreshCw, Shield, Users, User
} from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create HR Modal
  const [showCreateHR, setShowCreateHR] = useState(false);
  const [hrName, setHrName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [hrPass, setHrPass] = useState('HRpass123!');
  const [creating, setCreating] = useState(false);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState(null);
  const [newTempPass, setNewTempPass] = useState('ResetPass123!');
  const [resetting, setResetting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      setUsers(res);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateHR = async (e) => {
    e.preventDefault();
    if (!hrName.trim() || !hrEmail.trim()) return;
    setCreating(true);
    setError('');

    try {
      const res = await api.createHRUser({
        name: hrName,
        email: hrEmail,
        password: hrPass
      });
      setShowCreateHR(false);
      setHrName('');
      setHrEmail('');
      setSuccess(`HR user '${res.name}' created successfully with temporary password '${res.temporaryPassword}'.`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (!window.confirm(`Are you sure you want to ${user.status === 'active' ? 'deactivate' : 'activate'} login for ${user.name}?`)) {
      return;
    }
    setError('');
    try {
      const res = await api.toggleUserStatus(user.id);
      setUsers(users.map(u => u.id === user.id ? { ...u, status: res.status } : u));
      setSuccess(`User status changed to ${res.status}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingUser) return;
    setResetting(true);
    setError('');
    try {
      const res = await api.resetUserPassword(resettingUser.id, { temporaryPassword: newTempPass });
      setResettingUser(null);
      setSuccess(`Password for ${resettingUser.name} reset to '${res.temporaryPassword}'. Temporary flag set.`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-indigo-600" /> User Accounts & Logins (M2, Functionality 05)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create HR credentials, deactivate/activate user accounts, and reset temporary passwords
          </p>
        </div>

        <button
          onClick={() => setShowCreateHR(true)}
          className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Create HR Login
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Password State</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {u.role === 'admin' ? <Shield className="w-3.5 h-3.5 text-rose-500" /> : u.role === 'hr' ? <Users className="w-3.5 h-3.5 text-indigo-500" /> : <User className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    {u.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' :
                      u.role === 'hr' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {u.mustChangePassword ? (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">Temporary (Must change)</span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Verified</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setResettingUser(u);
                          setNewTempPass('ResetPass123!');
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Reset Pass
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === 'active'
                              ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={u.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create HR Modal */}
      {showCreateHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Create New HR Manager Login
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              HR managers have operational access to register employees, approve leaves, review attendance corrections, and generate payroll drafts.
            </p>

            <form onSubmit={handleCreateHR} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Khan"
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. hr@company.com"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={hrPass}
                  onChange={(e) => setHrPass(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateHR(false)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary py-2 text-xs font-bold"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Reset Password for {resettingUser.name}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Assign a temporary password. The user will be required to change it on their next login.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  required
                  value={newTempPass}
                  onChange={(e) => setNewTempPass(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="btn-primary py-2 text-xs font-bold"
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
