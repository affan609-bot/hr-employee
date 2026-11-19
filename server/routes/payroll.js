import express from 'express';
import db from '../db.js';
import { authenticate, requireRole, ensureEmployeeScope } from '../middleware/auth.js';
import {
  generatePayrollDraft,
  getPayrollRuns,
  getPayrollRunByMonth,
  finalizePayroll,
  getEmployeePayslips,
  getPayslipById,
  streamPayslipPDF
} from '../services/payrollService.js';

const router = express.Router();

// Get all payroll runs (Admin, HR)
router.get('/runs', authenticate, requireRole('admin', 'hr'), (req, res) => {
  try {
    const runs = getPayrollRuns();
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get payroll run details for a specific month (Admin, HR)
router.get('/runs/:month', authenticate, requireRole('admin', 'hr'), (req, res) => {
  try {
    const run = getPayrollRunByMonth(req.params.month);
    if (!run) return res.status(404).json({ error: `No payroll run found for ${req.params.month}` });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate / Review Payroll Draft (HR and Admin)
router.post('/draft', authenticate, requireRole('admin', 'hr'), (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: "Month parameter ('YYYY-MM') is required." });

    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const draft = generatePayrollDraft(month, req.user, ip);
    res.json(draft);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Finalize Payroll Run (Admin ONLY locks the month)
router.post('/finalize', authenticate, requireRole('admin'), (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: "Month parameter ('YYYY-MM') is required." });

    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const finalized = finalizePayroll(month, req.user, ip);
    res.json(finalized);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get My Payslips (Employee)
router.get('/my-payslips', authenticate, (req, res) => {
  try {
    if (!req.user.employeeId) {
      return res.status(400).json({ error: 'No associated employee profile.' });
    }
    const payslips = getEmployeePayslips(req.user.employeeId);
    res.json(payslips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download Payslip PDF
router.get('/payslips/:id/pdf', authenticate, (req, res) => {
  try {
    const payslip = getPayslipById(req.params.id);
    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });

    // Ensure data-scope: Employee can only download their own payslip
    if (!ensureEmployeeScope(req, payslip.employeeId)) {
      return res.status(403).json({ error: 'Access denied: Employee cannot download another employee payslip.' });
    }

    const company = db.getCompany();
    streamPayslipPDF(payslip, company, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
