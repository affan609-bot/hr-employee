import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AIAssistant from './components/AIAssistant';
import ChangePasswordModal from './components/ChangePasswordModal';

import FirstRunSetupPage from './pages/FirstRunSetupPage';
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CompanySettingsPage from './pages/admin/CompanySettingsPage';
import OrgSetupPage from './pages/admin/OrgSetupPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import AuditLogPage from './pages/admin/AuditLogPage';

// HR Pages
import HRDashboard from './pages/hr/HRDashboard';
import AttendanceBoardPage from './pages/hr/AttendanceBoardPage';
import LeaveManagementPage from './pages/hr/LeaveManagementPage';
import PayrollManagementPage from './pages/hr/PayrollManagementPage';

// Employee & Shared Pages
import EmployeeDirectoryPage from './pages/employees/EmployeeDirectoryPage';
import Employee360Page from './pages/employees/Employee360Page';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyAttendancePage from './pages/employee/MyAttendancePage';
import MyLeavePage from './pages/employee/MyLeavePage';
import MyPayslipsPage from './pages/employee/MyPayslipsPage';
import MyProfilePage from './pages/employee/MyProfilePage';
import AnnouncementsPage from './pages/AnnouncementsPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isSetup, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading HCM Lite...</p>
        </div>
      </div>
    );
  }

  if (!isSetup) {
    return <Navigate to="/setup" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, redirect to user's home dashboard
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
}

function RoleHomeRedirect() {
  const { user, isSetup, loading } = useAuth();
  if (loading) return null;
  if (!isSetup) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

function MainLayout() {
  const { user, isSetup } = useAuth();
  const location = useLocation();
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [prefilledSmartLeave, setPrefilledSmartLeave] = useState(null);

  const isPublicPage = location.pathname === '/login' || location.pathname === '/setup';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {!isPublicPage && <Navbar onOpenAI={() => setIsAIOpen(true)} />}

      <div className="flex-1 flex overflow-hidden">
        {!isPublicPage && user && <Sidebar />}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/setup" element={<FirstRunSetupPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <CompanySettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/org-setup"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <OrgSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />

            {/* HR Routes */}
            <Route
              path="/hr/dashboard"
              element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <HRDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance/board"
              element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <AttendanceBoardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaves"
              element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <LeaveManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payroll"
              element={
                <ProtectedRoute allowedRoles={['hr', 'admin']}>
                  <PayrollManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Employee Self-Service Routes */}
            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeDashboard onOpenAI={() => setIsAIOpen(true)} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/attendance"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <MyAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/leave"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <MyLeavePage prefilledLeave={prefilledSmartLeave} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/payslips"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <MyPayslipsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/profile"
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <MyProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Shared Directory & Announcements */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}>
                  <EmployeeDirectoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees/:id/360"
              element={
                <ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}>
                  <Employee360Page />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}>
                  <AnnouncementsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Floating Global AI Assistant Drawer */}
      <AIAssistant
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onApplySmartLeave={(smartData) => {
          setPrefilledSmartLeave(smartData);
          // Navigate to employee leave page if not already there
          if (window.location.pathname !== '/employee/leave') {
            window.location.href = '/employee/leave';
          }
        }}
      />

      {/* Forced Password Change Modal */}
      <ChangePasswordModal />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </Router>
  );
}
