import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  CalendarDays, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Check, X, Filter, MessageSquare, Clock
} from 'lucide-react';

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Review Modal
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.getLeaveRequests({ status: statusFilter });
      setLeaves(res);
    } catch (err) {
      setError(err.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [statusFilter]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewingLeave) return;
    setSubmitting(true);
    setError('');

    try {
      await api.reviewLeave(reviewingLeave.id, {
        status: reviewDecision,
        reviewComment
      });
      setSuccess(`Leave request has been ${reviewDecision}.`);
      setReviewingLeave(null);
      setReviewComment('');
      loadLeaves();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const pastLeaves = leaves.filter(l => l.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600" /> Leave Approval Inbox (M5, Functionality 13)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review employee leave applications with working day calculation (weekends and holidays excluded)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs py-2 px-3"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={loadLeaves} className="btn-secondary py-2 px-3 text-xs flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
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

      {/* Pending Approvals Section */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Pending Approval Inbox ({pendingLeaves.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Leave Type</th>
                <th className="py-2.5 px-3">Date Range</th>
                <th className="py-2.5 px-3">Working Days</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading leave requests...</td>
                </tr>
              ) : pendingLeaves.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No pending leave requests! Inbox is clear.</td>
                </tr>
              ) : (
                pendingLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 dark:text-white">{l.employeeName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{l.employeeCode} · {l.departmentName}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {l.leaveTypeName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {l.startDate} → {l.endDate}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {l.daysCount} working day{l.daysCount > 1 ? 's' : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setReviewingLeave(l);
                          setReviewDecision('approved');
                          setReviewComment('');
                        }}
                        className="btn-primary py-1 px-3 text-xs font-bold"
                      >
                        Review Request
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Records */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
          All Leave Applications & Decision History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Dates</th>
                <th className="py-2.5 px-3">Days</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Reviewer & Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pastLeaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-slate-900 dark:text-white">{l.employeeName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{l.employeeCode}</p>
                  </td>
                  <td className="py-2.5 px-3">{l.leaveTypeName}</td>
                  <td className="py-2.5 px-3 font-mono whitespace-nowrap">{l.startDate} → {l.endDate}</td>
                  <td className="py-2.5 px-3 font-bold">{l.daysCount} d</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                      l.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {l.reviewedBy ? `${l.reviewedBy}: ${l.reviewComment || 'Approved'}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Review Leave for {reviewingLeave.employeeName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {reviewingLeave.leaveTypeName} · <strong className="text-slate-700 dark:text-slate-300 font-mono">{reviewingLeave.startDate} to {reviewingLeave.endDate}</strong> ({reviewingLeave.daysCount} working days)
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee's Reason
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 italic">
                  "{reviewingLeave.reason}"
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approved')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Leave
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDecision('rejected')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      reviewDecision === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Reject Leave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Review Comment (Mandatory / Recommended)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved. Enjoy your leave!"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 text-xs font-bold"
                >
                  {submitting ? 'Submitting...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
