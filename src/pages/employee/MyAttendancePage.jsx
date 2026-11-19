import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import CameraAttendanceModal from '../../components/CameraAttendanceModal';
import {
  Clock, Calendar, CheckCircle2, AlertTriangle, AlertCircle,
  RefreshCw, Camera, Globe, Plus, Edit3, X, Check
} from 'lucide-react';

export default function MyAttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleDateString('en-CA').substring(0,7));
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // Correction Form
  const [corrDate, setCorrDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [corrIn, setCorrIn] = useState('09:00');
  const [corrOut, setCorrOut] = useState('17:00');
  const [corrReason, setCorrReason] = useState('');
  const [submittingCorr, setSubmittingCorr] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [att, corrs] = await Promise.all([
        api.getMyAttendance(selectedMonth),
        api.getCorrections()
      ]);
      setAttendance(att);
      setCorrections(corrs);
    } catch (err) {
      setError(err.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingCorr(true);
    setError('');

    try {
      await api.requestCorrection({
        date: corrDate,
        requestedCheckIn: corrIn,
        requestedCheckOut: corrOut,
        reason: corrReason
      });
      setSuccess('Attendance correction requested successfully. Awaiting HR review.');
      setShowCorrectionModal(false);
      setCorrReason('');
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingCorr(false);
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
      case 'missing_checkout':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Missing Out</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> My Attendance Calendar (M4, Functionalities 09-11)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View your daily timestamps, source stamps (web/camera), and submit attendance corrections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input text-xs py-2 px-3"
          />

          <button
            onClick={() => setShowCorrectionModal(true)}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> Request Correction
          </button>

          <button
            onClick={() => setShowCameraModal(true)}
            className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
          >
            <Camera className="w-3.5 h-3.5" /> Camera Check-In
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
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Attendance History Table */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
          Attendance Records for {selectedMonth} ({attendance.length} days logged)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Check-In</th>
                <th className="py-2.5 px-3">Check-Out</th>
                <th className="py-2.5 px-3">Hours Worked</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Verification Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">Loading attendance records...</td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">No attendance records found for {selectedMonth}.</td>
                </tr>
              ) : (
                attendance.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{rec.date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">{rec.checkInTime || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-semibold">{rec.checkOutTime || '—'}</td>
                    <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">{rec.workHours} hrs</td>
                    <td className="py-2.5 px-3">{getStatusBadge(rec.status)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {rec.source === 'camera' ? (
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1">
                          <Camera className="w-3.5 h-3.5" /> Face + GPS ({rec.location?.distance || 0}m)
                        </span>
                      ) : rec.source === 'web' ? (
                        <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                          <Globe className="w-3.5 h-3.5" /> Web
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-600 flex items-center justify-end gap-1">
                          <Edit3 className="w-3.5 h-3.5" /> HR Correction
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

      {/* Your Correction Requests */}
      <div className="card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
          Your Correction Requests ({corrections.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Requested In / Out</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">HR Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {corrections.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">No correction requests made.</td>
                </tr>
              ) : (
                corrections.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold">{c.date}</td>
                    <td className="py-2.5 px-3 font-mono">{c.requestedCheckIn} → {c.requestedCheckOut || 'N/A'}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{c.reason}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        c.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {c.reviewComment || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REQUEST CORRECTION MODAL */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Request Attendance Correction (M4)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Forgot to check in or experienced a technical glitch? Submit a correction with reason for HR approval.
            </p>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Check-In Time</label>
                  <input
                    type="time"
                    required
                    value={corrIn}
                    onChange={(e) => setCorrIn(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={corrOut}
                    onChange={(e) => setCorrOut(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Correction</label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Electric power outage at morning check-in"
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCorrectionModal(false)} className="btn-secondary py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={submittingCorr} className="btn-primary py-2 text-xs font-bold">
                  {submittingCorr ? 'Submitting...' : 'Submit to HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      <CameraAttendanceModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onSuccess={(record) => {
          setSuccess(`Camera attendance confirmed at ${record.checkInTime} (${record.status.toUpperCase()})!`);
          loadData();
        }}
      />
    </div>
  );
}
