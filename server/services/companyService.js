import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';

export const getCompanyStatus = () => {
  const company = db.getCompany();
  const users = db.get('users');
  const adminExists = users.some(u => u.role === 'admin');

  return {
    isSetup: company.isSetup && adminExists,
    company: {
      name: company.name,
      officeStartTime: company.officeStartTime,
      graceMinutes: company.graceMinutes,
      halfDayHours: company.halfDayHours,
      weekendDays: company.weekendDays,
      officeLocation: company.officeLocation,
      latePenaltyRule: company.latePenaltyRule,
      isSetup: company.isSetup
    }
  };
};

export const setupFirstRun = async ({ companyName, adminName, adminEmail, adminPassword, officeLocation, ip }) => {
  const users = db.get('users');
  const adminExists = users.some(u => u.role === 'admin');
  const company = db.getCompany();

  if (company.isSetup && adminExists) {
    throw new Error('System is already setup. First-run setup is locked.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const adminUser = {
    id: `usr_admin_${uuidv4().substring(0, 8)}`,
    name: adminName || 'System Admin',
    email: adminEmail.toLowerCase().trim(),
    passwordHash,
    role: 'admin',
    employeeId: null,
    status: 'active',
    mustChangePassword: false,
    createdAt: new Date().toISOString()
  };

  users.push(adminUser);

  // Seed a default HR manager account so the HR demo login works out of the box
  const hrEmail = 'hr@company.com';
  if (!users.some(u => u.email === hrEmail)) {
    const hrSalt = await bcrypt.genSalt(10);
    const hrPasswordHash = await bcrypt.hash('HRpass123!', hrSalt);
    const hrUser = {
      id: `usr_hr_${uuidv4().substring(0, 8)}`,
      name: 'HR Manager',
      email: hrEmail,
      passwordHash: hrPasswordHash,
      role: 'hr',
      employeeId: null,
      status: 'active',
      mustChangePassword: true,
      createdAt: new Date().toISOString()
    };
    users.push(hrUser);
  }

  db.set('users', users);

  const updatedCompany = db.updateCompany({
    name: companyName,
    isSetup: true,
    ...(officeLocation ? { officeLocation } : {})
  });

  logAudit({
    actorId: adminUser.id,
    actorName: adminUser.name,
    actorRole: 'admin',
    action: 'FIRST_RUN_SETUP',
    entity: 'company',
    entityId: adminUser.id,
    afterState: { companyName, adminEmail },
    ip
  });

  return { adminUser, company: updatedCompany };
};

export const updateCompanySettings = (updates, actor, ip) => {
  const before = db.getCompany();
  const allowed = [
    'name', 'officeStartTime', 'graceMinutes', 'halfDayHours',
    'weekendDays', 'officeLocation', 'latePenaltyRule'
  ];

  const filteredUpdates = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const updated = db.updateCompany(filteredUpdates);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'UPDATE_SETTINGS',
    entity: 'company',
    entityId: 'company_settings',
    beforeState: before,
    afterState: updated,
    ip
  });

  return updated;
};
