import express from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  getAnnouncements,
  createAnnouncement,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getAuditLogs
} from '../services/commsService.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

// --- ANNOUNCEMENTS ---
router.get('/announcements', authenticate, (req, res) => {
  try {
    const list = getAnnouncements();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/announcements', authenticate, requireRole('admin', 'hr'), (req, res) => {
  try {
    const { title, content, priority } = req.body;
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';

    const ann = createAnnouncement({
      title,
      content,
      priority,
      actor: req.user,
      ip
    });

    res.status(201).json(ann);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- NOTIFICATIONS ---
router.get('/notifications', authenticate, (req, res) => {
  try {
    const notifs = getUserNotifications(req.user.id);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/:id/read', authenticate, (req, res) => {
  try {
    const result = markNotificationRead(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read-all', authenticate, (req, res) => {
  try {
    const result = markAllNotificationsRead(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUDIT LOGS (Admin only) ---
router.get('/audit-logs', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { page, limit, entity, action } = req.query;
    const result = getAuditLogs({ page, limit, entity, action });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset System / Fresh Install (Admin only) - allows judges or admin to test clean slate easily
router.post('/reset-system', authenticate, requireRole('admin'), (req, res) => {
  try {
    db.resetAll();
    res.json({ message: 'System database has been reset to fresh empty state.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
