import express from 'express';
import { authenticate, requireRole, ensureEmployeeScope } from '../middleware/auth.js';
import {
  calculateWorkingDays,
  getLeaveBalances,
  applyLeave,
  cancelLeave,
  reviewLeave,
  getLeaves
} from '../services/leaveService.js';

const router = express.Router();

// Get Leave Balances for an employee
router.get('/balances/:employeeId', authenticate, (req, res) => {
  try {
    if (!ensureEmployeeScope(req, req.params.employeeId)) {
      return res.status(403).json({ error: 'Access denied: Employee can only view their own leave balances.' });
    }
    const balances = getLeaveBalances(req.params.employeeId);
    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate working days between two dates (preview)
router.get('/calculate-days', authenticate, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required.' });
    }
    const days = calculateWorkingDays(startDate, endDate);
    res.json({ workingDays: days });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Apply for Leave (Employee)
router.post('/apply', authenticate, async (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.body.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }

    const { leaveTypeId, startDate, endDate, reason } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const leave = await applyLeave({
      employeeId,
      leaveTypeId,
      startDate,
      endDate,
      reason,
      actor: req.user,
      ip
    });

    res.status(201).json(leave);
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message });
  }
});

// Cancel Leave (Employee)
router.post('/:id/cancel', authenticate, (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.body.employeeId;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const cancelled = cancelLeave({
      id: req.params.id,
      employeeId,
      actor: req.user,
      ip
    });

    res.json(cancelled);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Review Leave Request (HR only)
router.post('/:id/review', authenticate, requireRole('hr', 'admin'), (req, res) => {
  try {
    const { status, reviewComment } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const reviewed = reviewLeave({
      id: req.params.id,
      status,
      reviewComment,
      actor: req.user,
      ip
    });

    res.json(reviewed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Leave Requests (Admin/HR: all; Employee: only own)
router.get('/requests', authenticate, (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.query.employeeId;
    const leaves = getLeaves({
      employeeId,
      status: req.query.status,
      departmentId: req.query.departmentId
    });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
