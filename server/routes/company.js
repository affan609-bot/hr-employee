import express from 'express';
import db from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { updateCompanySettings } from '../services/companyService.js';

const router = express.Router();

// Get Company Settings (Admin, HR)
router.get('/settings', authenticate, requireRole('admin', 'hr'), (req, res) => {
  const company = db.getCompany();
  res.json(company);
});

// Update Company Settings (Admin ONLY)
router.put('/settings', authenticate, requireRole('admin'), (req, res) => {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const updated = updateCompanySettings(req.body, req.user, ip);
    res.json({ message: 'Company settings updated successfully.', company: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
