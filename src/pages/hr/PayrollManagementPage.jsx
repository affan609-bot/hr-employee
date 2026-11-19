import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import {
  DollarSign, FileText, Lock, Unlock, Download,
  CheckCircle2, RefreshCw, AlertCircle, Sparkles, Building2
} from 'lucide-react';

export default function PayrollManagementPage() {
  const { user } = useAuth();
  const currentMonthStr = new Date().toLocaleDateString('en-CA').substring(0,7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [payrollRun, setPayrollRun] = useState(null);
  const [allRuns, setAllRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadRuns = async () => {
    try {
      setLoading(true);
      const runs = await api.getPayrollRuns();
      setAllRuns(runs);
      const current = runs.find(r => r.month === selectedMonth);
      setPayrollRun(current || null);
    } catch (err) {
      setError(err.message || 'Failed to load payroll.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, [selectedMonth]);

  const handleGenerateDraft = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const draft = await api.generatePayrollDraft(selectedMonth);
      setPayrollRun(draft);
      setSuccess(`Payroll draft for ${selectedMonth} generated successfully.`);
      loadRuns();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm(`FINAL CONFIRMATION: Are you sure you want to lock and finalize payroll for ${selectedMonth}? Once locked, no further adjustments can be made.`)) {
      return;
    }
    setFinalizing(true);
    setError('');
    try {
      const res = await api.finalizePayroll(selectedMonth);
      setPayrollRun(res);
      setSuccess(`Payroll for ${selectedMonth} is now FINALIZED and LOCKED. Official payslips have been published.`);
      loadRuns();
    } catch (err) {
      setError(err.message);
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPDF = async (payslipId, empCode) => {
    try {
      await api.downloadPayslipPDF(payslipId, `payslip-${empCode}-${selectedMonth}.pdf`);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  const isFinalized = payrollRun?.status === 'finalized';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" /> Monthly Payroll Engine (M6, Functionalities 14-17)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Salary structure (Gross = 1.5× Basic), attendance deductions, tax slab computation & payslip PDF generation
          </p>
        </div>

        {/* Month Selector & Actions */}
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input text-xs py-2 px-3"
          />

          <button
            onClick={handleGenerateDraft}
            disabled={generating || isFinalized}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {payrollRun ? 'Recalculate Draft' : 'Create Draft'}
          </button>

          {user?.role === 'admin' && payrollRun && !isFinalized && (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/20"
            >
              <Lock className="w-3.5 h-3.5" />
              {finalizing ? 'Finalizing...' : 'Finalize & Lock'}
            </button>
          )}
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

      {/* Status Bar */}
      {payrollRun && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
          isFinalized
            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            {isFinalized ? <Lock className="w-4 h-4 text-emerald-600" /> : <Unlock className="w-4 h-4 text-amber-600" />}
            <span className="font-bold">
              Month {payrollRun.month} Status: {isFinalized ? 'FINALIZED & LOCKED' : 'DRAFT IN REVIEW'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isFinalized
              ? `Finalized by ${payrollRun.finalizedBy} on ${new Date(payrollRun.finalizedAt).toLocaleDateString()}`
              : `Prepared by ${payrollRun.preparedBy}. Only Admin can lock this month.`}
          </div>
        </div>
      )}

      {/* Aggregate KPI Cards */}
      {payrollRun ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <span className="text-xs font-semibold text-slate-500">Gross Expenditure</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              Rs. {Number(payrollRun.totalGross || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">1.5× Basic (HRA 40%, Med 10%)</p>
          </div>

          <div className="card p-4">
            <span className="text-xs font-semibold text-rose-500">Total Deductions</span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              -Rs. {Number(payrollRun.totalDeductions || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">Absence, unpaid, late penalty</p>
          </div>

          <div className="card p-4">
            <span className="text-xs font-semibold text-purple-500">Income Tax Slab</span>
            <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
              -Rs. {Number(payrollRun.totalTax || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">Progressive annual slab ÷ 12</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-200 dark:border-emerald-800">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Net Payable Amount</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              Rs. {Number(payrollRun.totalNet || 0).toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400">For {payrollRun.employeeCount} active employees</p>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Payroll Run for {selectedMonth}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click 'Create Draft' above to automatically aggregate attendance records, leaves, and compute tax slabs.
          </p>
          <button onClick={handleGenerateDraft} disabled={generating} className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> Generate {selectedMonth} Draft
          </button>
        </div>
      )}

      {/* Breakdown Table */}
      {payrollRun && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Employee Salary Breakdown & Deductions ({payrollRun.payslips?.length || 0})
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Working days in month: {payrollRun.workingDays}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Basic (100%)</th>
                  <th className="py-2.5 px-3">Allowances (50%)</th>
                  <th className="py-2.5 px-3">Gross (1.5×)</th>
                  <th className="py-2.5 px-3">Days / Absent</th>
                  <th className="py-2.5 px-3 text-rose-500">Deductions</th>
                  <th className="py-2.5 px-3 text-purple-500">Tax</th>
                  <th className="py-2.5 px-3 text-emerald-600 font-bold">Net Salary</th>
                  <th className="py-2.5 px-3 text-right">PDF Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payrollRun.payslips?.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 dark:text-white">{p.employeeName}</p>
                      <p className="text-[10px] font-mono text-slate-400">{p.employeeCode} · {p.departmentName}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono">Rs. {p.basicSalary.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      Rs. {(p.hra + p.medical).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      Rs. {p.grossSalary.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      Worked: <strong>{p.actualWorkedDays}</strong> | Absent: <strong className="text-rose-500">{p.absentDays + p.unpaidLeaveDays}</strong>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">
                      -Rs. {p.totalDeductions.toLocaleString()}
                      {p.latePenaltyDeductions > 0 && (
                        <span className="block text-[10px] text-amber-600">Late Pen: -Rs. {p.latePenaltyDeductions}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400">
                      -Rs. {p.taxDeduction.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                      Rs. {p.netSalary.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isFinalized ? (
                        <button
                          onClick={() => handleDownloadPDF(p.id || `ps_${idx}`, p.employeeCode)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Available on lock</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
