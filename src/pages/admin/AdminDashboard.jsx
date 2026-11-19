import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Users, TrendingDown, DollarSign, Award, Sparkles,
  Building2, Shield, RefreshCw, Filter, ArrowUpRight
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, deptsRes] = await Promise.all([
        api.getAdminDashboard({ departmentId: selectedDept }),
        api.getDepartments()
      ]);
      setData(dashRes);
      setDepartments(deptsRes);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDept]);

  const handleSummarize = async () => {
    if (!data?.kpis || summarizing) return;
    setSummarizing(true);
    try {
      const res = await api.summarizeDashboard(data.kpis);
      setAiSummary(res.summaryBullets);
    } catch (err) {
      console.error('AI summary failed:', err);
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
      {/* Top Banner & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Company Executive Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time workforce metrics, payroll expenditure, and audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Department Filter */}
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs py-2 px-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* AI Summarize Button */}
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {summarizing ? 'Analyzing...' : 'Summarize KPIs'}
          </button>
        </div>
      </div>

      {/* AI Summary Box */}
      {aiSummary && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-200/60 dark:border-indigo-800/60 animate-scale-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> AI Executive Summary
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Headcount</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.headcount || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active + probation staff</p>
        </div>

        {/* Attrition */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Attrition Rate (YTD)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {kpis.attritionYTD || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Exits ÷ average workforce</p>
        </div>

        {/* Total Payroll Cost */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Payroll Cost</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Rs. {Number(kpis.payrollCost || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sum of active gross compensation</p>
        </div>

        {/* Average Salary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Salary</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Rs. {Number(kpis.avgSalary || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Mean gross salary per employee</p>
        </div>
      </div>

      {/* Department Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Dept */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" /> Headcount by Department
          </h3>
          <div className="space-y-3">
            {data?.headcountByDept?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No departments configured yet.</p>
            ) : (
              data?.headcountByDept?.map((dept) => {
                const percent = kpis.headcount > 0 ? (dept.count / kpis.headcount) * 100 : 0;
                return (
                  <div key={dept.departmentId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{dept.departmentName}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {dept.count} ({Math.round(percent)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payroll Cost by Dept */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Payroll Allocation by Department
          </h3>
          <div className="space-y-3">
            {data?.headcountByDept?.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No payroll data yet.</p>
            ) : (
              data?.headcountByDept?.map((dept) => {
                const costPercent = kpis.payrollCost > 0 ? (dept.payrollCost / kpis.payrollCost) * 100 : 0;
                return (
                  <div key={dept.departmentId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{dept.departmentName}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Rs. {dept.payrollCost.toLocaleString()} ({Math.round(costPercent)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${costPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Demographics & Tenure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Workforce Gender Diversity</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Male</span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{data?.genderDist?.male || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Female</span>
              <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">{data?.genderDist?.female || 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Unspecified</span>
              <p className="text-lg font-black text-slate-500 mt-1">{data?.genderDist?.other || 0}</p>
            </div>
          </div>
        </div>

        {/* Tenure Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Tenure Distribution</h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">&lt;6 mos</span>
              <p className="text-base font-black text-slate-900 dark:text-white mt-1">{data?.tenureDist?.under6m || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">6-12 mos</span>
              <p className="text-base font-black text-slate-900 dark:text-white mt-1">{data?.tenureDist?.m6to12 || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">1-2 yrs</span>
              <p className="text-base font-black text-slate-900 dark:text-white mt-1">{data?.tenureDist?.y1to2 || 0}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">2+ yrs</span>
              <p className="text-base font-black text-slate-900 dark:text-white mt-1">{data?.tenureDist?.over2y || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent System Audit Feed */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-rose-500" /> Recent System Audit Logs
          </h3>
          <span className="text-xs text-slate-400">Immutable trail of critical actions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.recentAudits?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-slate-400">No audit events recorded yet.</td>
                </tr>
              ) : (
                data?.recentAudits?.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{log.actorName}</td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-500">{log.entity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
