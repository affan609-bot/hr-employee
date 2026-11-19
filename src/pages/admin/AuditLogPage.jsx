import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Shield, Search, RefreshCw, Eye, X, Filter } from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        page,
        limit: 30,
        action: filterAction,
        entity: filterEntity
      });
      setLogs(res.logs);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, filterAction, filterEntity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" /> Security Audit Trail (M9, Functionality 25)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of all create, update, approve, reject, and finalize actions with before/after state diffs
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Filters:</span>
        </div>

        <input
          type="text"
          placeholder="Filter by Action (e.g. CREATE, LOGIN)..."
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input text-xs py-1.5 px-3 max-w-xs"
        />

        <input
          type="text"
          placeholder="Filter by Entity (e.g. employee, payroll)..."
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="input text-xs py-1.5 px-3 max-w-xs"
        />
      </div>

      {/* Audit Table */}
      <div className="card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">No audit records found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{log.actorName}</td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{log.entity}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{log.entityId || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{log.ip}</td>
                    <td className="py-2.5 px-3 text-right">
                      {(log.beforeState || log.afterState) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View JSON
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{selectedLog.action}</span>
                  <span className="text-slate-400 font-normal">on {selectedLog.entity}</span>
                </h3>
                <p className="text-[11px] text-slate-400">By {selectedLog.actorName} at {new Date(selectedLog.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs font-mono">
              {selectedLog.beforeState && (
                <div>
                  <span className="font-bold uppercase text-[10px] text-amber-600 dark:text-amber-400 block mb-1">
                    Before State (JSON)
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-950 text-amber-200 overflow-x-auto text-[11px] leading-relaxed">
                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterState && (
                <div>
                  <span className="font-bold uppercase text-[10px] text-emerald-600 dark:text-emerald-400 block mb-1">
                    After State (JSON)
                  </span>
                  <pre className="p-3 rounded-xl bg-slate-950 text-emerald-200 overflow-x-auto text-[11px] leading-relaxed">
                    {JSON.stringify(selectedLog.afterState, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
