import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import {
  Bell, Plus, Send, AlertTriangle, Check,
  RefreshCw, Clock, User, Sparkles
} from 'lucide-react';

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canPost = user?.role === 'admin' || user?.role === 'hr';

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await api.getAnnouncements();
      setAnnouncements(res);
    } catch (err) {
      setError(err.message || 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setPosting(true);
    setError('');

    try {
      await api.createAnnouncement({ title, content, priority });
      setSuccess('Announcement published to all employee boards.');
      setShowCreate(false);
      setTitle('');
      setContent('');
      loadAnnouncements();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" /> Company Announcements (M9, Functionality 23)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast official notices, holiday declarations, and policy updates to all roles
          </p>
        </div>

        {canPost && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Post Announcement
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Post Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Broadcast New Announcement
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office Closed on Upcoming Friday"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="input text-xs"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High (Urgent Announcement)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Announcement Details
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Write message details for the company..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary py-2 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={posting} className="btn-primary py-2 text-xs font-bold">
                  {posting ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements Stream */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="card p-12 text-center text-slate-400 text-xs">
            No announcements broadcast yet.
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className={`card p-5 transition-all ${
                ann.priority === 'high'
                  ? 'border-l-4 border-l-rose-500 bg-rose-50/20 dark:bg-rose-950/10'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ann.title}</h3>
                  {ann.priority === 'high' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      High Priority
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(ann.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {ann.content}
              </p>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Posted by <strong>{ann.postedByName}</strong> ({ann.postedByRole?.toUpperCase()})
                </span>
                <span>{new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
