import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import {
  Bell, Sun, Moon, LogOut, User, Sparkles, Building2,
  ShieldAlert, CheckCircle2, AlertTriangle, Info, Clock, Menu
} from 'lucide-react';

export default function Navbar({ onOpenAI, onToggleSidebar }) {
  const { user, company, logout, notifications, unreadCount, markAllNotificationsRead } = useAuth();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Admin</span>;
      case 'hr':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">HR Manager</span>;
      case 'employee':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Employee</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Sidebar Toggle */}
          {user && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Logo & Company Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Quick<span className="text-indigo-600 dark:text-indigo-400">Serve</span>
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                  {company?.name || 'Affanverse'}
                </p>
              </div>
            </Link>

            {user && (
              <div className="hidden sm:block ml-3">
                {getRoleBadge(user.role)}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Ask AI Button */}
            {user && (
              <button
                onClick={onOpenAI}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">Ask AI Assistant</span>
                <span className="sm:hidden">AI</span>
              </button>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Notifications Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-scale-in">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">No notifications yet</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            className={`p-3 rounded-xl border text-xs transition-colors ${
                              n.isRead
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 text-slate-900 dark:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs">{n.title}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user.name}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">{user.role}</p>
                  </div>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-scale-in">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    {user.role === 'employee' && (
                      <Link
                        to="/employee/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <User className="w-4 h-4" />
                        My Profile
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-xs py-2 px-4"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
