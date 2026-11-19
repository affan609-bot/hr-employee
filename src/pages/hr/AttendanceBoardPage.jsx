import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Clock, Calendar, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Check, X, Camera, Globe, Edit3, Filter
} from 'lucide-react';

export default function AttendanceBoardPage() {
  const [activeTab, setActiveTab] = useState('board');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [boardData, setBoardData] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Review Correction Modal
  const [reviewingCorr, setReviewingCorr] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [board, corrs] = await Promise.all([
        api.getDailyAttendanceBoard(selectedDate),
        api.getCorrections()
      ]);
      setBoardData(board);
      setCorrections(corrs);
    } catch (err) {
      setError(err.message || 'Failed to load attendance board.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewingCorr) return;
    setReviewing(true);
    setError('');

    try {
      await api.reviewCorrection(reviewingCorr.id, {
        status: reviewStatus,
        reviewComment
      });
      setSuccess(`Correction request ${reviewStatus} successfully.`);
      setReviewingCorr(null);
      setReviewComment('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Present</span>;
      case 'late':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Late</span>;
      case 'half_day':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">Half Day</span>;
      case 'on_leave':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">On Leave</span>;
      case 'missing_checkout':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Missing Out</span>;
      case 'absent':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Absent</span>;
    }
  };

  const pendingCorrections = corrections.filter(c => c.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> Daily Attendance & Corrections (M4)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor daily employee check-ins, work hours, and approve attendance corrections
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input text-xs py-2 px-3"
          />
          <button onClick={loadData} className="btn-secondary py-2 px-3 text-xs flex items-center gap-1">
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('board')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'board'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" /> Attendance Board ({boardData.length})
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'corrections'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Edit3 className="w-4 h-4" /> Correction Requests ({pendingCorrections.length} pending)
        </button>
      </div>

      {/* TAB 1: DAILY BOARD */}
      {activeTab === 'board' && (
        <div className="card p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Check-In</th>
                  <th className="py-2.5 px-3">Check-Out</th>
                  <th className="py-2.5 px-3">Work Hours</th>
                  <th className="py-2.5 px-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">Loading board...</td>
                  </tr>
                ) : boardData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">No active employees found for this date.</td>
                  </tr>
                ) : (
                  boardData.map((row) => (
                    <tr key={row.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{row.name}</p>
                        <p className="text-[10px] font-mono text-slate-400">{row.employeeCode}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{row.department}</td>
                      <td className="py-2.5 px-3">{getStatusBadge(row.status)}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {row.checkInTime || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {row.checkOutTime || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {row.workHours ? `${row.workHours} hrs` : '0 hrs'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {row.source === 'camera' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                            <Camera className="w-3.5 h-3.5" /> Face + GPS
                          </span>
                        ) : row.source === 'web' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            <Globe className="w-3.5 h-3.5" /> Web
                          </span>
                        ) : row.source === 'correction' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                            <Edit3 className="w-3.5 h-3.5" /> Corrected
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CORRECTIONS */}
      {activeTab === 'corrections' && (
        <div className="card p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Requested In / Out</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {corrections.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">No correction requests found.</td>
                  </tr>
                ) : (
                  corrections.map((corr) => (
                    <tr key={corr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {corr.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{corr.employeeName}</p>
                        <p className="text-[10px] font-mono text-slate-400">{corr.employeeCode}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {corr.requestedCheckIn} → {corr.requestedCheckOut || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={corr.reason}>
                        {corr.reason}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          corr.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                          corr.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          {corr.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {corr.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setReviewingCorr(corr);
                              setReviewStatus('approved');
                              setReviewComment('');
                            }}
                            className="btn-primary py-1 px-3 text-xs font-bold"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">{corr.reviewComment || 'Reviewed'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingCorr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Review Correction for {reviewingCorr.employeeName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Date: <strong className="text-slate-700 dark:text-slate-300 font-mono">{reviewingCorr.date}</strong> | Requested: <strong className="text-slate-700 dark:text-slate-300 font-mono">{reviewingCorr.requestedCheckIn} - {reviewingCorr.requestedCheckOut || 'None'}</strong>
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason provided by employee
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 italic">
                  "{reviewingCorr.reason}"
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('approved')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      reviewStatus === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('rejected')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      reviewStatus === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Review Comment (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved per email confirmation"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingCorr(null)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="btn-primary py-2 text-xs font-bold"
                >
                  {reviewing ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
