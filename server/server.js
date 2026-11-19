import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import db from './db.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/company.js';
import orgRoutes from './routes/org.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import payrollRoutes from './routes/payroll.js';
import dashboardRoutes from './routes/dashboards.js';
import aiRoutes from './routes/ai.js';
import commsRoutes from './routes/comms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config(); // root .env
dotenv.config({ path: path.join(__dirname, '.env') }); // server/.env (optional)

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Check if ADMIN_EMAIL & ADMIN_PASSWORD env variables are set to auto-setup Admin on first run
const checkEnvAdminSetup = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const companyName = process.env.COMPANY_NAME || 'Saylani Enterprise Solutions';

  if (adminEmail && adminPassword) {
    const users = db.get('users');
    const company = db.getCompany();
    const hasAdmin = users.some(u => u.role === 'admin');

    if (!hasAdmin || !company.isSetup) {
      console.log(`Auto-configuring initial Admin from environment variables (${adminEmail})...`);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      const adminUser = {
        id: `usr_admin_${uuidv4().substring(0, 8)}`,
        name: process.env.ADMIN_NAME || 'Super Admin',
        email: adminEmail.toLowerCase().trim(),
        passwordHash,
        role: 'admin',
        employeeId: null,
        status: 'active',
        mustChangePassword: false,
        createdAt: new Date().toISOString()
      };

      users.push(adminUser);
      db.set('users', users);
      db.updateCompany({ name: companyName, isSetup: true });
      console.log('Initial Admin account configured from env successfully.');
    }
  }
};

checkEnvAdminSetup().catch(console.error);

// Dual-mount routes (with /api and without /api) for seamless Vercel serverless execution
const routeModules = [
  ['/auth', authRoutes],
  ['/company', companyRoutes],
  ['/org', orgRoutes],
  ['/employees', employeeRoutes],
  ['/attendance', attendanceRoutes],
  ['/leave', leaveRoutes],
  ['/payroll', payrollRoutes],
  ['/dashboards', dashboardRoutes],
  ['/ai', aiRoutes],
  ['/comms', commsRoutes]
];

for (const [prefix, router] of routeModules) {
  app.use(`/api${prefix}`, router);
  app.use(prefix, router);
}

// Health check on both /api/health and /health
const healthHandler = (req, res) => {
  const company = db.getCompany();
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'HCM Lite API',
    companySetup: company.isSetup
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.VERCEL_ENV) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`  HCM Lite Backend Server Started!      `);
    console.log(`  URL: http://127.0.0.1:${PORT}         `);
    console.log(`  Port: ${PORT}                         `);
    console.log(`========================================`);
  });
}

// Export the app for Vercel Serverless Functions
export default app;
