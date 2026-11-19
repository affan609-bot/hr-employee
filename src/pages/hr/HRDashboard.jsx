import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import {
  Users, UserCheck, Clock, Calendar, Sparkles,
  AlertTriangle, CheckCircle2, RefreshCw, ArrowRight
} from 'lucide-react';

export default function HRDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getHRDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load HR dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSummarize = async () => {
    if (!data?.kpis || summarizing) return;
    setSummarizing(true);
    try {
      const res = await api.summarizeDashboard(data.kpis);
      setAiSummary(res.summaryBullets);
    } catch (err) {
      console.error('HR AI summary failed:', err);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            HR Operations Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily attendance status, pending approvals, late arrival insights, and leave trends
          </p>
        </div>

        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {summarizing ? 'Generating...' : 'Summarize HR Insights'}
        </button>
      </div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-200/60 dark:border-indigo-800/60 animate-scale-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> AI Operations Brief
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-white/60 dark:bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-200/50">
              AI-Generated
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {aiSummary.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                <span dangerouslySetInnerHTML={{ __html: b.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Employees */}
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-400">Total Staff</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {kpis.headcount || 0}
          </div>
          <span className="text-[10px] text-slate-400">Active workforce</span>
        </div>

        {/* Present Today */}
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Present Today</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis.presentToday || 0}
          </div>
          <span className="text-[10px] text-slate-400">On-time arrivals</span>
        </div>

        {/* Late Today */}
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Late Today</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpis.lateToday || 0}
          </div>
          <span className="text-[10px] text-slate-400">Past grace period</span>
        </div>

        {/* On Leave Today */}
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">On Leave Today</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {kpis.onLeaveToday || 0}
          </div>
          <span className="text-[10px] text-slate-400">Approved leaves</span>
        </div>

        {/* Pending Approvals */}
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Action Required</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {kpis.pendingApprovals || 0}
          </div>
          <span className="text-[10px] text-slate-400">Pending reviews</span>
        </div>

        {/* Attendance Rate */}
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">Attendance Rate</span>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {kpis.attendanceRate || 100}%
          </div>
          <span className="text-[10px] text-slate-400">Month to date</span>
        </div>
      </div>

      {/* Main Grid: Attendance Trends & Top Late-Comers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Attendance Trend */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" /> Attendance Trend (Past 7 Days)
            </h3>
            <Link to="/attendance/board" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-semibold">
              Daily Board <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.attendanceTrend?.map((day) => {
              const total = (day.present || 0) + (day.late || 0) + (day.halfDay || 0) + (day.onLeave || 0);
              const max = Math.max(kpis.headcount || 1, total, 1);
              const presentPct = (day.present / max) * 100;
              const latePct = (day.late / max) * 100;
              const leavePct = (day.onLeave / max) * 100;

              return (
                <div key={day.date} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{day.date}</span>
                    <span className="text-[11px] text-slate-500">
                      Present: <strong className="text-emerald-600">{day.present}</strong> | Late: <strong className="text-amber-600">{day.late}</strong> | Leave: <strong className="text-blue-600">{day.onLeave}</strong>
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                    <div style={{ width: `${presentPct}%` }} className="bg-emerald-500 h-full" title={`Present: ${day.present}`} />
                    <div style={{ width: `${latePct}%` }} className="bg-amber-400 h-full" title={`Late: ${day.late}`} />
                    <div style={{ width: `${leavePct}%` }} className="bg-blue-500 h-full" title={`On Leave: ${day.onLeave}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Late-Comers */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Top Late-Comers (This Month)
            </h3>
          </div>

          <div className="space-y-3">
            {data?.topLateComers?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No late arrivals recorded this month. Excellent!</p>
            ) : (
              data?.topLateComers?.map((c, i) => (
                <div key={c.employeeId} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.department}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    {c.lateCount} time{c.lateCount > 1 ? 's' : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Leave Utilization Breakdown */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" /> Company Leave Utilization YTD
          </h3>
          <Link to="/leaves" className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-semibold">
            Approval Inbox ({kpis.pendingApprovals || 0}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data?.leaveByType?.map((lt) => (
            <div key={lt.code} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{lt.name}</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {lt.days} days
              </div>
              <span className="text-[10px] text-slate-400">Approved leaves</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
