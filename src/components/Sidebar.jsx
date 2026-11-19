import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Users, CalendarDays,
  FileCheck2, DollarSign, Bell, Shield, Sliders, UserCog,
  FileText, Clock, UserCheck
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;

  const adminNav = [
    { name: 'Company Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Company Settings', to: '/admin/settings', icon: Sliders },
    { name: 'Org Structure & Rules', to: '/admin/org-setup', icon: Building2 },
    { name: 'User Management', to: '/admin/users', icon: UserCog },
    { name: 'Employee Directory', to: '/employees', icon: Users },
    { name: 'Daily Attendance', to: '/attendance/board', icon: Clock },
    { name: 'Leave Requests', to: '/leaves', icon: CalendarDays },
    { name: 'Payroll & Finalize', to: '/payroll', icon: DollarSign },
    { name: 'Announcements', to: '/announcements', icon: Bell },
    { name: 'Audit Log', to: '/admin/audit-logs', icon: Shield },
  ];

  const hrNav = [
    { name: 'HR Dashboard', to: '/hr/dashboard', icon: LayoutDashboard },
    { name: 'Employee Operations', to: '/employees', icon: Users },
    { name: 'Attendance & Corrections', to: '/attendance/board', icon: Clock },
    { name: 'Leave Approval Inbox', to: '/leaves', icon: CalendarDays },
    { name: 'Payroll Run & Drafts', to: '/payroll', icon: DollarSign },
    { name: 'Announcements', to: '/announcements', icon: Bell },
  ];

  const employeeNav = [
    { name: 'My Dashboard', to: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Attendance Calendar', to: '/employee/attendance', icon: Clock },
    { name: 'My Leave & Smart Apply', to: '/employee/leave', icon: CalendarDays },
    { name: 'My Payslips (PDF)', to: '/employee/payslips', icon: FileText },
    { name: 'My Profile', to: '/employee/profile', icon: UserCheck },
    { name: 'Announcements', to: '/announcements', icon: Bell },
  ];

  const links = user.role === 'admin' ? adminNav : user.role === 'hr' ? hrNav : employeeNav;

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1">
        <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          {user.role} workspace
        </p>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Role Scope Notice */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">RBAC Scope Active</p>
          <p className="leading-relaxed">
            {user.role === 'admin' && 'Company-level permissions & payroll lock.'}
            {user.role === 'hr' && 'People operations & approvals.'}
            {user.role === 'employee' && 'Self-service: restricted to your own records.'}
          </p>
        </div>
      </div>
    </aside>
  );
}
