import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import stream from 'stream';
import { authenticate, requireRole, ensureEmployeeScope } from '../middleware/auth.js';
import {
  getEmployees,
  getEmployeeById,
  getEmployee360,
  registerEmployee,
  updateEmployee,
  validateAndImportCSV,
  exportEmployeesCSV
} from '../services/employeeService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get employee directory with search & filters
router.get('/', authenticate, (req, res) => {
  try {
    const { search, departmentId, status, page, limit } = req.query;
    const result = getEmployees({ search, departmentId, status, page, limit });

    // If requester is an employee, redact salary information for other colleagues!
    if (req.user.role === 'employee') {
      result.employees = result.employees.map(e => {
        const isSelf = e.id === req.user.employeeId;
        return {
          ...e,
          basicSalary: isSelf ? e.basicSalary : undefined,
          hra: isSelf ? e.hra : undefined,
          medical: isSelf ? e.medical : undefined,
          grossSalary: isSelf ? e.grossSalary : undefined,
          bankDetails: isSelf ? e.bankDetails : undefined
        };
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CSV Export (HR and Admin)
router.get('/csv-export', authenticate, requireRole('admin', 'hr'), (req, res) => {
  try {
    const csvData = exportEmployeesCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="employees-export.csv"');
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee by ID
router.get('/:id', authenticate, (req, res) => {
  try {
    if (!ensureEmployeeScope(req, req.params.id)) {
      return res.status(403).json({ error: 'Access denied: Employee can only view their own profile.' });
    }

    const employee = getEmployeeById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Employee 360 profile
router.get('/:id/360', authenticate, (req, res) => {
  try {
    if (!ensureEmployeeScope(req, req.params.id)) {
      return res.status(403).json({ error: 'Access denied: Employee can only view their own 360 profile.' });
    }

    const profile360 = getEmployee360(req.params.id);
    res.json(profile360);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Register Employee (creates login with temporary password) (HR and Admin)
router.post('/', authenticate, requireRole('admin', 'hr'), async (req, res) => {
  try {
    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const result = await registerEmployee(req.body, req.user, ip);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Employee (HR/Admin: any field; Employee: only phone and address)
router.put('/:id', authenticate, (req, res) => {
  try {
    if (!ensureEmployeeScope(req, req.params.id)) {
      return res.status(403).json({ error: 'Unauthorized to update another employee profile.' });
    }

    const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const updated = updateEmployee(req.params.id, req.body, req.user, ip);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// CSV Import with Dry-Run Error Report (HR and Admin)
router.post('/csv-import', authenticate, requireRole('admin', 'hr'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file.' });
    }

    const dryRun = req.query.dryRun !== 'false';
    const rows = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
      .pipe(csvParser())
      .on('data', (data) => rows.push(data))
      .on('end', async () => {
        try {
          const ip = (req.headers && req.headers['x-forwarded-for']) || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
          const report = await validateAndImportCSV(rows, dryRun, req.user, ip);
          res.json(report);
        } catch (innerErr) {
          res.status(400).json({ error: innerErr.message });
        }
      })
      .on('error', (parseErr) => {
        res.status(400).json({ error: `CSV parse error: ${parseErr.message}` });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
