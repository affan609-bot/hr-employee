import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  FileText, Download, DollarSign, Calendar,
  CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const res = await api.getMyPayslips();
      setPayslips(res);
    } catch (err) {
      setError(err.message || 'Failed to load payslips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, []);

  const handleDownloadPDF = async (payslipId, month) => {
    try {
      await api.downloadPayslipPDF(payslipId, `payslip-${month}.pdf`);
    } catch (err) {
      alert('Failed to download payslip PDF: ' + err.message);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" /> My Payslips (M6, Functionality 17)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Download your confidential, computer-generated monthly salary payslips in PDF format
          </p>
        </div>

        <button onClick={loadPayslips} className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payslips Grid */}
      <div className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Payroll Month</th>
                <th className="py-2.5 px-3">Basic Salary</th>
                <th className="py-2.5 px-3">Gross Earnings</th>
                <th className="py-2.5 px-3 text-rose-500">Deductions</th>
                <th className="py-2.5 px-3 text-purple-500">Income Tax</th>
                <th className="py-2.5 px-3 font-bold text-emerald-600">Net Payable</th>
                <th className="py-2.5 px-3 text-right">PDF Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No finalized payslips available yet. Once HR drafts and Admin finalizes a month, it will appear here.
                  </td>
                </tr>
              ) : (
                payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {p.month}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      Rs. {p.basicSalary.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      Rs. {p.grossSalary.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-600 dark:text-rose-400">
                      -Rs. {p.totalDeductions.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-purple-600 dark:text-purple-400">
                      -Rs. {p.taxDeduction.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      Rs. {p.netSalary.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDownloadPDF(p.id, p.month)}
                        className="btn-primary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </td>
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
