import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { getCompanyStatus, setupFirstRun } from '../services/companyService.js';
import { logAudit } from '../services/auditService.js';

const router = express.Router();

// System Setup Status
router.get('/status', (req, res) => {
  try {
    const status = getCompanyStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// First-Run Setup
router.post('/first-run-setup', async (req, res) => {
  try {
    const { companyName, adminName, adminEmail, adminPassword, officeLocation } = req.body;
    if (!companyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Company name, admin email, and admin password are required.' });
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const result = await setupFirstRun({
      companyName,
      adminName,
      adminEmail,
      adminPassword,
      officeLocation,
      ip
    });

    const token = generateToken(result.adminUser);
    res.json({
      message: 'First-run setup completed successfully.',
      token,
      user: {
        id: result.adminUser.id,
        name: result.adminUser.name,
        email: result.adminUser.email,
        role: result.adminUser.role,
        mustChangePassword: false
      },
      company: result.company
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = db.get('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact Admin.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const company = db.getCompany();

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'LOGIN',
      entity: 'user',
      entityId: user.id,
      ip
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword
      },
      company: {
        name: company.name,
        officeStartTime: company.officeStartTime,
        graceMinutes: company.graceMinutes,
        officeLocation: company.officeLocation
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Current User Details
router.get('/me', authenticate, (req, res) => {
  const users = db.get('users');
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const company = db.getCompany();
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      mustChangePassword: user.mustChangePassword
    },
    company: {
      name: company.name,
      officeStartTime: company.officeStartTime,
      graceMinutes: company.graceMinutes,
      officeLocation: company.officeLocation
    }
  });
});

// Change Password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const users = db.get('users');
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Verify current password unless mustChangePassword was mandated
    if (currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    db.set('users', users);

    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'PASSWORD_CHANGE',
      entity: 'user',
      entityId: user.id,
      ip
    });

    const newToken = generateToken(user);
    res.json({
      message: 'Password changed successfully.',
      token: newToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
