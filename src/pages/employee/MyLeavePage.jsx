import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import {
  Calendar, CalendarDays, Sparkles, Plus, X,
  Check, AlertCircle, RefreshCw, Clock, Ban, CheckCircle2, ArrowRight
} from 'lucide-react';

export default function MyLeavePage({ prefilledLeave }) {
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [workingDaysPreview, setWorkingDaysPreview] = useState(null);
  const [applying, setApplying] = useState(false);

  // Smart Leave NLP input
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      if (!user?.employeeId) return;

      const [bals, lts, myLeaves] = await Promise.all([
        api.getLeaveBalances(user.employeeId),
        api.getLeaveTypes(),
        api.getLeaveRequests({ employeeId: user.employeeId })
      ]);

      setBalances(bals);
      setLeaveTypes(lts);
      setLeaves(myLeaves);

      if (lts.length > 0 && !leaveTypeId) {
        setLeaveTypeId(lts[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load leaves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle prefilled leave if passed from AI Assistant
  useEffect(() => {
    if (prefilledLeave) {
      setStartDate(prefilledLeave.startDate || '');
      setEndDate(prefilledLeave.endDate || '');
      setReason(prefilledLeave.reason || '');
      if (prefilledLeave.leaveTypeId) {
        setLeaveTypeId(prefilledLeave.leaveTypeId);
      }
      setShowApplyModal(true);
    }
  }, [prefilledLeave]);

  // Preview working days whenever start or end date changes
  useEffect(() => {
    if (startDate && endDate && startDate <= endDate) {
      api.calculateWorkingDays(startDate, endDate)
        .then(res => setWorkingDaysPreview(res.workingDays))
        .catch(() => setWorkingDaysPreview(null));
    } else {
      setWorkingDaysPreview(null);
    }
  }, [startDate, endDate]);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    setError('');

    try {
      await api.applyLeave({
        leaveTypeId,
        startDate,
        endDate,
        reason
      });
      setSuccess('Leave request submitted successfully. Awaiting HR approval.');
      setShowApplyModal(false);
      setReason('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleSmartLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!smartPrompt.trim() || smartLoading) return;
    setSmartLoading(true);
    setError('');

    try {
      const smartRes = await api.smartLeave(smartPrompt);
      setStartDate(smartRes.startDate);
      setEndDate(smartRes.endDate);
      setReason(smartRes.reason);
      setLeaveTypeId(smartRes.leaveTypeId);
      setShowApplyModal(true);
      setSmartPrompt('');
    } catch (err) {
      setError('Smart Leave interpretation failed: ' + err.message);
    } finally {
      setSmartLoading(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    setError('');
    try {
      await api.cancelLeave(leaveId);
      setSuccess('Leave cancelled.');
      loadData();
    } catch (err) {
      setError(err.message);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" /> My Leaves & Smart Leave (M5, Functionalities 12 & 21)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Apply with real-time working day computation (excludes weekends and public gazetted holidays)
          </p>
        </div>

        <button
          onClick={() => {
            setShowApplyModal(true);
            setWorkingDaysPreview(null);
          }}
          className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
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
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SMART LEAVE NATURAL LANGUAGE BAR */}
      <div className="card p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-200/60 dark:border-indigo-800/60">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
            Smart Leave in Plain Words (Functionality 21)
          </span>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            AI Parser
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
          Type your leave intent naturally (e.g. <em>"Need next Monday and Tuesday off for my sister's wedding"</em> or in Roman Urdu <em>"kal bukhar hai chutti chahiye"</em>).
        </p>

        <form onSubmit={handleSmartLeaveSubmit} className="flex gap-2">
          <input
            type="text"
            value={smartPrompt}
            onChange={(e) => setSmartPrompt(e.target.value)}
            placeholder="e.g. Need next Monday and Tuesday off for a wedding..."
            className="input text-xs flex-1 bg-white dark:bg-slate-900"
          />
          <button
            type="submit"
            disabled={!smartPrompt.trim() || smartLoading}
            className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            {smartLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Parsing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Parse & Pre-fill Form
              </>
            )}
          </button>
        </form>
      </div>

      {/* Leave Balances Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.map((b) => (
          <div key={b.leaveTypeId} className="card p-5 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{b.name}</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {b.remaining}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {b.code === 'unpaid' ? 'Unlimited allowance' : `Used: ${b.used} / Quota: ${b.yearlyQuota}`}
            </p>
          </div>
        ))}
      </div>

      {/* Leave Request History Table */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
          Your Leave Applications History ({leaves.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Leave Type</th>
                <th className="py-2.5 px-3">Date Range</th>
                <th className="py-2.5 px-3">Working Days</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action / Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No leave requests found. Click 'Apply for Leave' to submit one.</td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{l.leaveTypeName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                      {l.startDate} → {l.endDate}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {l.daysCount} working day{l.daysCount > 1 ? 's' : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        l.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                        l.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' :
                        l.status === 'cancelled' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {l.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelLeave(l.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Cancel
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {l.reviewComment || l.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* APPLY FOR LEAVE MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" /> Apply for Leave
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Category
                </label>
                <select
                  required
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  className="input text-xs"
                >
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code === 'unpaid' ? 'Unlimited' : `${lt.yearlyQuota} days/yr`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* Working Days Computation Preview */}
              {workingDaysPreview !== null && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Computed Working Days:</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">
                    {workingDaysPreview} day{workingDaysPreview > 1 ? 's' : ''} (Weekends/Holidays excluded)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Attending sister's wedding in Lahore"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowApplyModal(false)} className="btn-secondary py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={applying || workingDaysPreview === 0} className="btn-primary py-2 text-xs font-bold">
                  {applying ? 'Submitting...' : 'Confirm & Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
