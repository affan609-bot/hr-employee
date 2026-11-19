import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import CameraAttendanceModal from '../../components/CameraAttendanceModal';
import {
  Clock, CheckCircle2, AlertTriangle, Calendar, AlertCircle,
  FileText, Sparkles, Camera, Globe, ArrowRight,
  TrendingUp, Download, RefreshCw, Bell
} from 'lucide-react';

export default function EmployeeDashboard({ onOpenAI }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployeeDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load personal dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleWebCheckIn = async () => {
    setCheckingIn(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.checkIn({ source: 'web' });
      setSuccess(`Checked in successfully at ${res.checkInTime} (${res.status.toUpperCase()})`);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleWebCheckOut = async () => {
    setCheckingOut(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.checkOut();
      setSuccess(`Checked out successfully at ${res.checkOutTime}. Work duration: ${res.workHours} hours.`);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleDownloadLastPayslip = async () => {
    if (!data?.lastPayslip?.id) return;
    try {
      await api.downloadPayslipPDF(data.lastPayslip.id, `my-payslip-${data.lastPayslip.month}.pdf`);
    } catch (err) {
      alert('Failed to download payslip: ' + err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const todayStatus = data?.todayStatus;
  const isCheckedIn = todayStatus === 'present' || todayStatus === 'late' || todayStatus === 'half_day';
  const hasCheckedOut = Boolean(data?.todayRecord?.checkOutTime);
  const weeklyHours = data?.hoursThisWeek || 0;
  const weeklyPct = Math.min(100, Math.round((weeklyHours / 40) * 100));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your self-service workstation: attendance check-in, weekly hours, leave balances, and payslips
          </p>
        </div>

        <button
          onClick={onOpenAI}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>Ask My Assistant</span>
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

      {/* Main Grid: Check-In Card & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-In Widget */}
        <div className="card p-6 bg-gradient-to-br from-indigo-600/5 via-purple-600/5 to-transparent border-indigo-100 dark:border-indigo-900/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Today's Check-In (M4)
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isCheckedIn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {todayStatus.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900 dark:text-white font-mono">
              {data?.todayRecord?.checkInTime || '--:--:--'}
            </p>
            <p className="text-xs text-slate-400">
              {isCheckedIn
                ? `Checked in at ${data?.todayRecord?.checkInTime} (${data?.todayRecord?.source})`
                : 'Not checked in yet today'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {!isCheckedIn ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleWebCheckIn}
                  disabled={checkingIn}
                  className="btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Globe className="w-4 h-4" />
                  {checkingIn ? 'Checking In...' : 'Web Check-In'}
                </button>

                <button
                  onClick={() => setShowCameraModal(true)}
                  className="btn-secondary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                >
                  <Camera className="w-4 h-4" />
                  Camera + GPS
                </button>
              </div>
            ) : !hasCheckedOut ? (
              <button
                onClick={handleWebCheckOut}
                disabled={checkingOut}
                className="w-full btn-danger py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {checkingOut ? 'Checking Out...' : 'Check Out for Today'}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Check-out recorded: {data?.todayRecord?.checkOutTime} ({data?.todayRecord?.workHours} hrs)
              </div>
            )}
          </div>
        </div>

        {/* Weekly Hours Progress */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Weekly Target Progress</span>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {weeklyHours}h / 40h
              </span>
            </div>

            <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {weeklyPct >= 100 ? 'Weekly goal reached!' : `${40 - weeklyHours} hours remaining this week`}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Late arrivals this month:</span>
            <span className={`font-black font-mono px-2 py-0.5 rounded-full ${
              data?.lateCountThisMonth > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-slate-100 text-slate-600'
            }`}>
              {data?.lateCountThisMonth || 0} times
            </span>
          </div>
        </div>

        {/* Last Payslip Summary */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Latest Payslip</span>
              <FileText className="w-4 h-4 text-emerald-500" />
            </div>

            {data?.lastPayslip ? (
              <div className="space-y-1">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  Rs. {data.lastPayslip.netSalary.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Month: {data.lastPayslip.month} (Gross: Rs. {data.lastPayslip.grossSalary.toLocaleString()})</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No published payslip yet.</p>
            )}
          </div>

          {data?.lastPayslip && (
            <button
              onClick={handleDownloadLastPayslip}
              className="mt-4 w-full btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" /> Download Payslip PDF
            </button>
          )}
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" /> Your Leave Balances (Yearly Quota)
          </h3>
          <Link to="/employee/leave" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold flex items-center gap-1">
            Apply / Smart Leave <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data?.leaveBalances?.map((bal) => (
            <div key={bal.code} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{bal.name}</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {bal.remaining}
              </div>
              <span className="text-[10px] text-slate-400">
                {bal.code === 'unpaid' ? 'No limit' : `Used: ${bal.used} / ${bal.yearlyQuota}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements Feed */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500" /> Recent Company Announcements
          </h3>
          <Link to="/announcements" className="text-xs text-indigo-600 font-semibold">
            View All
          </Link>
        </div>

        <div className="space-y-3">
          {data?.announcements?.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No announcements posted yet.</p>
          ) : (
            data?.announcements?.map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{ann.title}</span>
                  <span className="text-[10px] text-slate-400">{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{ann.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Camera Attendance Modal */}
      <CameraAttendanceModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onSuccess={(record) => {
          setSuccess(`Camera check-in confirmed at ${record.checkInTime} (${record.status.toUpperCase()})! Location verified.`);
          loadDashboard();
        }}
      />
    </div>
  );
}
