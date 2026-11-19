import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import {
  User, Mail, Phone, MapPin, Building2, Briefcase,
  Calendar, Check, AlertCircle, RefreshCw, ShieldCheck
} from 'lucide-react';

export default function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (!user?.employeeId) return;
      const res = await api.getEmployeeById(user.employeeId);
      setProfile(res);
      setPhone(res.phone || '');
      setAddress(res.address || '');
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.updateEmployee(user.employeeId, { phone, address });
      setSuccess('Profile contact details updated successfully.');
      loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-600" /> My Profile (Self-Service)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          View official employment records and keep your personal contact details up to date
        </p>
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

      {/* Hero Badge */}
      <div className="card p-6 flex items-center gap-4 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
          {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {profile?.firstName} {profile?.lastName}
          </h2>
          <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
            {profile?.employeeCode} · {profile?.departmentName} · {profile?.designationName}
          </p>
          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {profile?.status}
          </span>
        </div>
      </div>

      {/* Official Employment Details (Read-only) */}
      <div className="card p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-indigo-500" /> Official Employment Details (Read-Only)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Work Email:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{profile?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Joining Date:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{profile?.joiningDate}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Department:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.departmentName}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Designation:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.designationName}</span>
          </div>
        </div>
      </div>

      {/* Editable Phone and Address */}
      <div className="card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-emerald-500" /> Personal Contact Information (Editable by Employee)
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Personal Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Residential Address
            </label>
            <textarea
              rows="3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your current home address"
              className="input text-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Save Contact Details
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
