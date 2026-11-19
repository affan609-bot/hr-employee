import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Building2, Briefcase, Calendar, Plus, Trash2, Edit2,
  Check, RefreshCw, AlertCircle, Sun
} from 'lucide-react';

export default function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Department Form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // Designation Form
  const [desigName, setDesigName] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');

  // Holiday Form
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  // Edit Leave Type Quota Modal
  const [editingLT, setEditingLT] = useState(null);
  const [editQuota, setEditQuota] = useState('');

  const loadAll = async () => {
    try {
      setLoading(true);
      const [depts, desigs, lts, hols] = await Promise.all([
        api.getDepartments(),
        api.getDesignations(),
        api.getLeaveTypes(),
        api.getHolidays()
      ]);
      setDepartments(depts);
      setDesignations(desigs);
      setLeaveTypes(lts);
      setHolidays(hols);
      if (depts.length > 0 && !desigDeptId) {
        setDesigDeptId(depts[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load organization data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    setError('');
    try {
      const newD = await api.createDepartment({ name: deptName, code: deptCode });
      setDepartments([...departments, newD]);
      setDeptName('');
      setDeptCode('');
      setSuccess('Department added successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    setError('');
    try {
      await api.deleteDepartment(id);
      setDepartments(departments.filter(d => d.id !== id));
      setSuccess('Department deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateDesig = async (e) => {
    e.preventDefault();
    if (!desigName.trim() || !desigDeptId) return;
    setError('');
    try {
      const newD = await api.createDesignation({ name: desigName, departmentId: desigDeptId });
      setDesignations([...designations, newD]);
      setDesigName('');
      setSuccess('Designation added.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDesig = async (id) => {
    if (!window.confirm('Delete this designation?')) return;
    setError('');
    try {
      await api.deleteDesignation(id);
      setDesignations(designations.filter(d => d.id !== id));
      setSuccess('Designation deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveLeaveType = async (e) => {
    e.preventDefault();
    if (!editingLT) return;
    setError('');
    try {
      const updated = await api.updateLeaveType(editingLT.id, {
        yearlyQuota: Number(editQuota)
      });
      setLeaveTypes(leaveTypes.map(lt => lt.id === updated.id ? updated : lt));
      setEditingLT(null);
      setSuccess('Leave type quota updated.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) return;
    setError('');
    try {
      const newH = await api.createHoliday({
        name: holidayName,
        date: holidayDate,
        description: holidayDesc
      });
      setHolidays([...holidays, newH]);
      setHolidayName('');
      setHolidayDate('');
      setHolidayDesc('');
      setSuccess('Public holiday added.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    setError('');
    try {
      await api.deleteHoliday(id);
      setHolidays(holidays.filter(h => h.id !== id));
      setSuccess('Holiday deleted.');
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
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Organization Setup (M2)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Departments, designations, leave quotas, and public holidays
        </p>
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

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'departments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" /> Departments ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('designations')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'designations'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Designations ({designations.length})
        </button>

        <button
          onClick={() => setActiveTab('leaveTypes')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'leaveTypes'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" /> Leave Types & Quotas ({leaveTypes.length})
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'holidays'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          }`}
        >
          <Sun className="w-4 h-4" /> Public Holidays ({holidays.length})
        </button>
      </div>

      {/* 1. DEPARTMENTS TAB */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Add New Department
            </h3>
            <form onSubmit={handleCreateDept} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering, Sales, HR"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. ENG"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="input text-xs uppercase"
                />
              </div>
              <button type="submit" className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Create Department
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Registered Departments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-slate-400">No departments added yet.</td>
                    </tr>
                  ) : (
                    departments.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{d.name}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400">{d.code}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteDept(d.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}

      {/* 2. DESIGNATIONS TAB */}
      {activeTab === 'designations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Add New Designation
            </h3>
            <form onSubmit={handleCreateDesig} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Designation Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Software Engineer"
                  value={desigName}
                  onChange={(e) => setDesigName(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  required
                  value={desigDeptId}
                  onChange={(e) => setDesigDeptId(e.target.value)}
                  className="input text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={departments.length === 0}
                className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Designation
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Registered Designations
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {designations.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-slate-400">No designations added yet.</td>
                    </tr>
                  ) : (
                    designations.map((des) => {
                      const dept = departments.find(d => d.id === des.departmentId);
                      return (
                        <tr key={des.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{des.name}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{dept ? dept.name : 'Unknown'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteDesig(des.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. LEAVE TYPES & QUOTAS TAB */}
      {activeTab === 'leaveTypes' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Yearly Leave Quotas (M5 Rule)
              </h3>
              <p className="text-[11px] text-slate-400">Default rules: Annual (14), Sick (8), Casual (10), Unpaid (unlimited)</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Leave Type</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Yearly Quota</th>
                  <th className="py-2.5 px-3">Paid / Unpaid</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{lt.name}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400">{lt.code}</td>
                    <td className="py-2.5 px-3 font-semibold">
                      {lt.code === 'unpaid' ? 'Unlimited' : `${lt.yearlyQuota} days / yr`}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lt.isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {lt.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {lt.code !== 'unpaid' && (
                        <button
                          onClick={() => {
                            setEditingLT(lt);
                            setEditQuota(String(lt.yearlyQuota));
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-1 ml-auto"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Quota
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Quota Modal */}
      {editingLT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Update Quota for {editingLT.name}
            </h3>
            <form onSubmit={handleSaveLeaveType} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Yearly Quota (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={editQuota}
                  onChange={(e) => setEditQuota(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLT(null)}
                  className="btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 text-xs font-bold">
                  Save Quota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. PUBLIC HOLIDAYS TAB */}
      {activeTab === 'holidays' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Add Public Holiday
            </h3>
            <form onSubmit={handleCreateHoliday} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Independence Day"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Official public gazetted holiday"
                  value={holidayDesc}
                  onChange={(e) => setHolidayDesc(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <button type="submit" className="w-full btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Holiday
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Registered Public Holidays
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Holiday</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">No public holidays registered yet.</td>
                    </tr>
                  ) : (
                    holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{h.date}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{h.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{h.description || '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}
    </div>
  );
}
