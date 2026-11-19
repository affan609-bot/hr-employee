import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import {
  Users, UserPlus, Upload, Download, Search,
  Filter, Check, AlertCircle, RefreshCw, Eye, Edit2, X, CheckCircle2
} from 'lucide-react';

export default function EmployeeDirectoryPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Register Employee Modal
  const [showRegister, setShowRegister] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('male');
  const [deptId, setDeptId] = useState('');
  const [desigId, setDesigId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [basicSalary, setBasicSalary] = useState('100000');
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);

  // CSV Import Modal
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [importing, setImporting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, depts, desigs] = await Promise.all([
        api.getEmployees({ search, departmentId: selectedDept, status: selectedStatus, page, limit: 15 }),
        api.getDepartments(),
        api.getDesignations()
      ]);
      setEmployees(empRes.employees);
      setTotal(empRes.total);
      setDepartments(depts);
      setDesignations(desigs);
      if (depts.length > 0 && !deptId) {
        setDeptId(depts[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedDept, selectedStatus, page]);

  // Dynamic salary computation (Gross = 1.5× basic)
  const basicNum = Number(basicSalary) || 0;
  const hraNum = Math.round(basicNum * 0.40);
  const medNum = Math.round(basicNum * 0.10);
  const grossNum = Math.round(basicNum * 1.50);

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.registerEmployee({
        employeeCode: empCode,
        firstName,
        lastName,
        email,
        phone,
        address,
        gender,
        departmentId: deptId,
        designationId: desigId,
        joiningDate,
        basicSalary: basicNum
      });
      setCreatedResult(res);
      setSuccess(`Employee ${res.employee.firstName} ${res.employee.lastName} registered!`);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCSVImport = async (dryRun = true) => {
    if (!csvFile) return;
    setImporting(true);
    setError('');

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await api.importEmployeesCSV(formData, dryRun);
      setDryRunReport(res);
      if (!dryRun) {
        setSuccess(`Successfully imported ${res.importedCount} employees.`);
        loadData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await api.exportEmployeesCSV();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees-export-${new Date().toLocaleDateString('en-CA')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Employee Directory (M3, Functionalities 06-08)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personnel register, salary structures, Employee 360 profiles, CSV import with dry run & export
          </p>
        </div>

        {(user?.role === 'admin' || user?.role === 'hr') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCSVModal(true);
                setDryRunReport(null);
                setCsvFile(null);
              }}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" /> Import CSV
            </button>

            <button
              onClick={handleExportCSV}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </button>

            <button
              onClick={() => {
                setShowRegister(true);
                setCreatedResult(null);
                setEmpCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
              }}
              className="btn-primary py-2 px-3.5 text-xs font-bold flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Register Employee
            </button>
          </div>
        )}
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

      {/* Search & Filter Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, employee code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="input text-xs py-2 px-3"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input text-xs py-2 px-3"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="exited">Exited</option>
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3">Joining Date</th>
                <th className="py-2.5 px-3">Status</th>
                {(user?.role === 'admin' || user?.role === 'hr') && (
                  <th className="py-2.5 px-3">Gross Salary</th>
                )}
                <th className="py-2.5 px-3 text-right">360 View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">Loading directory...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">No employees registered yet. Click 'Register Employee' or Import CSV.</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{emp.employeeCode} · {emp.email}</p>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">{emp.departmentName}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{emp.designationName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{emp.joiningDate}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                        emp.status === 'probation' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    {(user?.role === 'admin' || user?.role === 'hr') && (
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        Rs. {emp.grossSalary?.toLocaleString() || '0'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to={`/employees/${emp.id}/360`}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> 360 Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER EMPLOYEE MODAL */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" /> Register Employee (Creates Login)
              </h3>
              <button onClick={() => setShowRegister(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Employee Registered Successfully!</h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-left space-y-2 border border-slate-200 dark:border-slate-700">
                  <p><strong>Employee:</strong> {createdResult.employee.firstName} {createdResult.employee.lastName} ({createdResult.employee.employeeCode})</p>
                  <p><strong>Login Email:</strong> <span className="font-mono text-indigo-600">{createdResult.employee.email}</span></p>
                  <p><strong>Temporary Password:</strong> <span className="font-mono bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">{createdResult.temporaryPassword}</span></p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">User will be prompted to change this temporary password upon first login.</p>
                </div>
                <button onClick={() => setShowRegister(false)} className="btn-primary py-2.5 px-6 text-xs font-bold">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Code</label>
                    <input type="text" required value={empCode} onChange={(e) => setEmpCode(e.target.value)} className="input text-xs font-mono uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="input text-xs">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                    <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                    <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="input text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" className="input text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                    <select required value={deptId} onChange={(e) => setDeptId(e.target.value)} className="input text-xs">
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                    <select value={desigId} onChange={(e) => setDesigId(e.target.value)} className="input text-xs">
                      <option value="">Select Designation</option>
                      {designations.filter(d => !deptId || d.departmentId === deptId).map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Salary Structure Rules */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Salary Structure Rules (M6)
                  </span>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Basic Salary (PKR)</label>
                    <input type="number" min="1000" step="1000" required value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} className="input text-xs font-mono" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400">HRA (40%)</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">Rs. {hraNum.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400">Medical (10%)</span>
                      <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">Rs. {medNum.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] text-emerald-600 font-bold">Gross (1.5×)</span>
                      <p className="font-bold text-emerald-600 mt-0.5">Rs. {grossNum.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowRegister(false)} className="btn-secondary py-2 text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary py-2 text-xs font-bold">
                    {submitting ? 'Registering...' : 'Register & Create Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CSV IMPORT WITH DRY-RUN REPORT MODAL */}
      {showCSVModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" /> Bulk CSV Import with Dry-Run Report (M3)
              </h3>
              <button onClick={() => setShowCSVModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setCsvFile(e.target.files[0]);
                    setDryRunReport(null);
                  }}
                  className="input text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Required columns: <code>employeeCode, firstName, lastName, email, department, basicSalary</code>
                </p>
              </div>

              {/* Dry-Run Validation Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!csvFile || importing}
                  onClick={() => handleCSVImport(true)}
                  className="btn-secondary py-2 px-4 text-xs font-bold"
                >
                  {importing ? 'Validating...' : 'Run Dry-Run Check'}
                </button>

                {dryRunReport && dryRunReport.validCount > 0 && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => handleCSVImport(false)}
                    className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Confirm & Import {dryRunReport.validCount} Valid Records
                  </button>
                )}
              </div>

              {/* Dry-Run Report Display */}
              {dryRunReport && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Dry-Run Analysis Report</span>
                    <span className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">{dryRunReport.validCount || dryRunReport.importedCount || 0} Valid</span>
                      <span className="text-rose-600 font-bold">{dryRunReport.errorCount || 0} Errors</span>
                    </span>
                  </div>

                  {dryRunReport.errors?.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border-t border-slate-200 dark:border-slate-700 pt-2 text-xs">
                      {dryRunReport.errors.map((err, i) => (
                        <div key={i} className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-between text-[11px]">
                          <span><strong>Row {err.row}:</strong> {err.field} — {err.reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-semibold">All rows passed validation checks without any errors!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
