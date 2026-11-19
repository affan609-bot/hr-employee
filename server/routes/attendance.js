import express from 'express';
import { authenticate, requireRole, ensureEmployeeScope } from '../middleware/auth.js';
import {
  checkIn,
  checkOut,
  getEmployeeAttendance,
  getDailyAttendanceBoard,
  requestCorrection,
  getCorrections,
  reviewCorrection
} from '../services/attendanceService.js';

const router = express.Router();

// Web Check-in / Camera Check-in
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.body.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee ID provided or associated with account.' });
    }

    const { source = 'web', location, faceData } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const record = await checkIn({
      employeeId,
      source,
      location,
      faceData,
      actor: req.user,
      ip
    });

    res.status(201).json(record);
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message });
  }
});

// Check-out
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.body.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'No employee ID provided or associated with account.' });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const record = await checkOut({
      employeeId,
      actor: req.user,
      ip
    });

    res.json(record);
  } catch (err) {
    const status = err.status || 400;
    res.status(status).json({ error: err.message });
  }
});

// Get My Attendance (Employee)
router.get('/my', authenticate, (req, res) => {
  try {
    if (!req.user.employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }
    const records = getEmployeeAttendance(req.user.employeeId, req.query.month);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daily Attendance Board (Admin, HR)
router.get('/daily-board', authenticate, requireRole('admin', 'hr'), (req, res) => {
  try {
    const board = getDailyAttendanceBoard(req.query.date);
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Attendance for a specific employee
router.get('/employee/:id', authenticate, (req, res) => {
  try {
    if (!ensureEmployeeScope(req, req.params.id)) {
      return res.status(403).json({ error: 'Access denied: Employee can only view their own attendance.' });
    }
    const records = getEmployeeAttendance(req.params.id, req.query.month);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Request Attendance Correction (Employee)
router.post('/corrections', authenticate, (req, res) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employeeId : req.body.employeeId;
    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID required.' });
    }

    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const corr = requestCorrection({
      employeeId,
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      actor: req.user,
      ip
    });

    res.status(201).json(corr);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get Attendance Corrections
router.get('/corrections', authenticate, (req, res) => {
  try {
    const filterEmployeeId = req.user.role === 'employee' ? req.user.employeeId : req.query.employeeId;
    const list = getCorrections(filterEmployeeId);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Review Attendance Correction (HR only)
router.post('/corrections/:id/review', authenticate, requireRole('hr', 'admin'), (req, res) => {
  try {
    const { status, reviewComment } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    const reviewed = reviewCorrection({
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

export default router;
