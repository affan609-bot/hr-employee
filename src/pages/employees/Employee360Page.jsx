import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import {
  User, Mail, Phone, MapPin, Calendar, Clock,
  DollarSign, FileText, ArrowLeft, RefreshCw, Edit2,
  Check, AlertCircle, ShieldCheck, Download
} from 'lucide-react';

export default function Employee360Page() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit Phone & Address Modal
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployee360(id);
      setData(res);
      setPhone(res.employee.phone || '');
      setAddress(res.employee.address || '');
    } catch (err) {
      setError(err.message || 'Failed to load employee 360 profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.updateEmployee(id, { phone, address });
      setSuccess('Contact details updated successfully.');
      setIsEditing(false);
      loadProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async (payslipId, month) => {
    try {
      await api.downloadPayslipPDF(payslipId, `payslip-${data?.employee?.employeeCode}-${month}.pdf`);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const emp = data?.employee;
  const isSelf = user?.employeeId === emp?.id;
  const canEditSalary = user?.role === 'admin' || user?.role === 'hr';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/employees"
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
        </Link>
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

      {/* Hero Header Card */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            {emp?.firstName?.charAt(0)}{emp?.lastName?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {emp?.firstName} {emp?.lastName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {emp?.status}
              </span>
            </div>
            <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
              {emp?.employeeCode} · {emp?.departmentName} · {emp?.designationName}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Joined on {emp?.joiningDate}</p>
          </div>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit Phone & Address
        </button>
      </div>

      {/* Grid: Details, Salary, Leave Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact & Personal Info */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Contact & Location
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
              <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{emp?.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{emp?.phone || 'No phone provided'}</span>
            </div>
            <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>{emp?.address || 'No residential address set'}</span>
            </div>
          </div>
        </div>

        {/* Salary Structure (Role Scoped) */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center justify-between">
            <span>Salary Package (1.5× Basic)</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </h3>

          {canEditSalary || isSelf ? (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Basic (100%):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {emp?.basicSalary?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">HRA (40%):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {emp?.hra?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medical (10%):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">Rs. {emp?.medical?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-emerald-600 dark:text-emerald-400">
                <span>Monthly Gross:</span>
                <span className="font-mono text-sm">Rs. {emp?.grossSalary?.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-center text-xs text-slate-400">
              [CONFIDENTIAL — Colleague compensation is restricted]
            </div>
          )}
        </div>

        {/* Leave Balances */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Leave Balances (Current Year)
          </h3>
          <div className="space-y-2 text-xs">
            {data?.leaveBalances?.map((b) => (
              <div key={b.id} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{b.name}</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {b.remaining} remaining <span className="text-slate-400 font-normal">({b.used}/{b.yearlyQuota})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Attendance (Last 30 Days) */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" /> Recent Attendance History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Check-In</th>
                <th className="py-2 px-3">Check-Out</th>
                <th className="py-2 px-3">Work Hours</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.attendanceHistory?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">No attendance records found yet.</td>
                </tr>
              ) : (
                data?.attendanceHistory?.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono font-bold">{a.date}</td>
                    <td className="py-2 px-3 font-mono">{a.checkInTime || '—'}</td>
                    <td className="py-2 px-3 font-mono">{a.checkOutTime || '—'}</td>
                    <td className="py-2 px-3 font-bold">{a.workHours} hrs</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        a.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        a.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 capitalize">{a.source || 'web'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslips History */}
      {(canEditSalary || isSelf) && (
        <div className="card p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" /> Published Monthly Payslips
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-3">Gross</th>
                  <th className="py-2 px-3">Deductions</th>
                  <th className="py-2 px-3">Tax</th>
                  <th className="py-2 px-3 font-bold text-emerald-600">Net Pay</th>
                  <th className="py-2 px-3 text-right">Download PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.payslips?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">No finalized payslips available yet.</td>
                  </tr>
                ) : (
                  data?.payslips?.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono font-bold">{p.month}</td>
                      <td className="py-2 px-3 font-mono">Rs. {p.grossSalary.toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-rose-500">-Rs. {p.totalDeductions.toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono text-purple-500">-Rs. {p.taxDeduction.toLocaleString()}</td>
                      <td className="py-2 px-3 font-mono font-black text-emerald-600">Rs. {p.netSalary.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDownloadPDF(p.id, p.month)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Phone & Address Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Update Contact Details
            </h3>
            <form onSubmit={handleUpdateContact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <textarea
                  rows="2"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary py-2 text-xs font-bold">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
