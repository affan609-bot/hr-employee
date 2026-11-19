import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getDepartments, createDepartment, deleteDepartment,
  getDesignations, createDesignation, deleteDesignation,
  getLeaveTypes, updateLeaveType,
  getHolidays, createHoliday, deleteHoliday,
  getUsers, createHRUser, toggleUserStatus, resetUserPassword
} from '../services/orgService.js';

const router = express.Router();

// --- DEPARTMENTS ---
router.get('/departments', authenticate, (req, res) => {
  res.json(getDepartments());
});

router.post('/departments', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const dept = createDepartment(req.body, req.user, ip);
    res.status(201).json(dept);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/departments/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const result = deleteDepartment(req.params.id, req.user, ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- DESIGNATIONS ---
router.get('/designations', authenticate, (req, res) => {
  res.json(getDesignations(req.query.departmentId));
});

router.post('/designations', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const desig = createDesignation(req.body, req.user, ip);
    res.status(201).json(desig);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/designations/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const result = deleteDesignation(req.params.id, req.user, ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- LEAVE TYPES & QUOTAS ---
router.get('/leave-types', authenticate, (req, res) => {
  res.json(getLeaveTypes());
});

router.put('/leave-types/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const updated = updateLeaveType(req.params.id, req.body, req.user, ip);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- PUBLIC HOLIDAYS ---
router.get('/holidays', authenticate, (req, res) => {
  res.json(getHolidays());
});

router.post('/holidays', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const holiday = createHoliday(req.body, req.user, ip);
    res.status(201).json(holiday);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/holidays/:id', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const result = deleteHoliday(req.params.id, req.user, ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- USERS MANAGEMENT (Admin creates HR, deactivates, resets) ---
router.get('/users', authenticate, requireRole('admin'), (req, res) => {
  res.json(getUsers());
});

router.post('/users/hr', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const newHR = await createHRUser(req.body, req.user, ip);
    res.status(201).json(newHR);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/users/:id/status', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const result = toggleUserStatus(req.params.id, req.user, ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/users/:id/reset-password', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const result = await resetUserPassword(req.params.id, req.body.temporaryPassword, req.user, ip);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
