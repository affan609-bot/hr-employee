const BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '';

export const getAuthToken = () => localStorage.getItem('hcm_token');
export const getToken = getAuthToken;

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('hcm_token', token);
  } else {
    localStorage.removeItem('hcm_token');
  }
};
export const setToken = setAuthToken;

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Normalize endpoint: ensure it starts with /api
  const trimmed = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = trimmed.startsWith('/api/') ? trimmed : `/api${trimmed}`;
  const targetUrl = `${BASE_URL}${apiPath}`;

  let response;
  try {
    response = await fetch(targetUrl, {
      ...options,
      headers
    });
  } catch (networkErr) {
    console.error('API Network Error:', networkErr);
    throw new Error('Backend server is not reachable. Please ensure the server is running on port 5000.');
  }

  // On 401, purge stale token so future requests aren't permanently broken
  if (response.status === 401) {
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/status')) {
      setAuthToken(null);
    }
  }

  // Handle binary PDF download
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    if (!response.ok) {
      throw new Error('Failed to download PDF.');
    }
    return response.blob();
  }

  if (contentType.includes('text/csv')) {
    if (!response.ok) {
      throw new Error('Failed to export CSV.');
    }
    return response.text();
  }

  // Safely parse response — text first, then try JSON
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = (data && data.error)
      ? data.error
      : (typeof data === 'string' && data.length < 200 && !data.includes('<!doctype')
          ? data
          : `Request failed with status ${response.status}`);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth & System Setup
  getSystemStatus: () => apiRequest('/auth/status'),
  firstRunSetup: (data) => apiRequest('/auth/first-run-setup', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getCurrentUser: () => apiRequest('/auth/me'),
  changePassword: (data) => apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Company Settings
  getCompanySettings: () => apiRequest('/company/settings'),
  updateCompanySettings: (data) => apiRequest('/company/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Org Setup
  getDepartments: () => apiRequest('/org/departments'),
  createDepartment: (data) => apiRequest('/org/departments', { method: 'POST', body: JSON.stringify(data) }),
  deleteDepartment: (id) => apiRequest(`/org/departments/${id}`, { method: 'DELETE' }),

  getDesignations: (deptId) => apiRequest(`/org/designations${deptId ? `?departmentId=${deptId}` : ''}`),
  createDesignation: (data) => apiRequest('/org/designations', { method: 'POST', body: JSON.stringify(data) }),
  deleteDesignation: (id) => apiRequest(`/org/designations/${id}`, { method: 'DELETE' }),

  getLeaveTypes: () => apiRequest('/org/leave-types'),
  updateLeaveType: (id, data) => apiRequest(`/org/leave-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getHolidays: () => apiRequest('/org/holidays'),
  createHoliday: (data) => apiRequest('/org/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id) => apiRequest(`/org/holidays/${id}`, { method: 'DELETE' }),

  // User Management
  getUsers: () => apiRequest('/org/users'),
  createHRUser: (data) => apiRequest('/org/users/hr', { method: 'POST', body: JSON.stringify(data) }),
  toggleUserStatus: (id) => apiRequest(`/org/users/${id}/status`, { method: 'PATCH' }),
  resetUserPassword: (id, data) => apiRequest(`/org/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify(data) }),

  // Employees
  getEmployees: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/employees${query ? `?${query}` : ''}`);
  },
  getEmployeeById: (id) => apiRequest(`/employees/${id}`),
  getEmployee360: (id) => apiRequest(`/employees/${id}/360`),
  registerEmployee: (data) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  importEmployeesCSV: (formData, dryRun = true) => apiRequest(`/employees/csv-import?dryRun=${dryRun}`, {
    method: 'POST',
    body: formData
  }),
  exportEmployeesCSV: () => apiRequest('/employees/csv-export'),

  // Attendance
  checkIn: (data) => apiRequest('/attendance/check-in', { method: 'POST', body: JSON.stringify(data) }),
  checkOut: () => apiRequest('/attendance/check-out', { method: 'POST', body: JSON.stringify({}) }),
  getMyAttendance: (month) => apiRequest(`/attendance/my${month ? `?month=${month}` : ''}`),
  getDailyAttendanceBoard: (date) => apiRequest(`/attendance/daily-board${date ? `?date=${date}` : ''}`),
  getEmployeeAttendance: (id, month) => apiRequest(`/attendance/employee/${id}${month ? `?month=${month}` : ''}`),
  requestCorrection: (data) => apiRequest('/attendance/corrections', { method: 'POST', body: JSON.stringify(data) }),
  getCorrections: (empId) => apiRequest(`/attendance/corrections${empId ? `?employeeId=${empId}` : ''}`),
  reviewCorrection: (id, data) => apiRequest(`/attendance/corrections/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),

  // Leave
  getLeaveBalances: (empId) => apiRequest(`/leave/balances/${empId}`),
  calculateWorkingDays: (startDate, endDate) => apiRequest(`/leave/calculate-days?startDate=${startDate}&endDate=${endDate}`),
  applyLeave: (data) => apiRequest('/leave/apply', { method: 'POST', body: JSON.stringify(data) }),
  cancelLeave: (id) => apiRequest(`/leave/${id}/cancel`, { method: 'POST' }),
  reviewLeave: (id, data) => apiRequest(`/leave/${id}/review`, { method: 'POST', body: JSON.stringify(data) }),
  getLeaveRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/leave/requests${query ? `?${query}` : ''}`);
  },

  // Payroll
  getPayrollRuns: () => apiRequest('/payroll/runs'),
  getPayrollRunByMonth: (month) => apiRequest(`/payroll/runs/${month}`),
  generatePayrollDraft: (month) => apiRequest('/payroll/draft', { method: 'POST', body: JSON.stringify({ month }) }),
  finalizePayroll: (month) => apiRequest('/payroll/finalize', { method: 'POST', body: JSON.stringify({ month }) }),
  getMyPayslips: () => apiRequest('/payroll/my-payslips'),
  downloadPayslipPDF: async (payslipId, filename = 'payslip.pdf') => {
    const blob = await apiRequest(`/payroll/payslips/${payslipId}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Dashboards & Analytics
  getAdminDashboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboards/admin${query ? `?${query}` : ''}`);
  },
  getHRDashboard: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/dashboards/hr${query ? `?${query}` : ''}`);
  },
  getEmployeeDashboard: () => apiRequest('/dashboards/employee'),

  // AI Assistant
  askAI: (prompt) => apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify({ prompt }) }),
  summarizeDashboard: (kpiData) => apiRequest('/ai/summarize-dashboard', { method: 'POST', body: JSON.stringify({ kpiData }) }),
  smartLeave: (prompt) => apiRequest('/ai/smart-leave', { method: 'POST', body: JSON.stringify({ prompt }) }),
  getAILogs: () => apiRequest('/ai/logs'),

  // Comms & Audit
  getAnnouncements: () => apiRequest('/comms/announcements'),
  createAnnouncement: (data) => apiRequest('/comms/announcements', { method: 'POST', body: JSON.stringify(data) }),
  getNotifications: () => apiRequest('/comms/notifications'),
  markNotificationRead: (id) => apiRequest(`/comms/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/comms/notifications/read-all', { method: 'POST' }),
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/comms/audit-logs${query ? `?${query}` : ''}`);
  },
  resetSystem: () => apiRequest('/comms/reset-system', { method: 'POST' })
};
