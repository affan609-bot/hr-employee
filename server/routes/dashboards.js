import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getAdminAnalytics,
  getHRAnalytics,
  getEmployeePersonalDashboard
} from '../services/dashboardService.js';

const router = express.Router();

// Admin Dashboard Analytics (Admin only)
router.get('/admin', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const data = getAdminAnalytics({ departmentId, startDate, endDate });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HR Dashboard Analytics (HR, Admin)
router.get('/hr', authenticate, requireRole('hr', 'admin'), (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const data = getHRAnalytics({ departmentId, startDate, endDate });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employee Personal Dashboard (Employee)
router.get('/employee', authenticate, (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.query.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }
    const data = getEmployeePersonalDashboard(employeeId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
