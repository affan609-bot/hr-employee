import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';

// --- DEPARTMENTS ---
export const getDepartments = () => db.get('departments');

export const createDepartment = (data, actor, ip) => {
  const departments = db.get('departments');
  const exists = departments.some(d => d.name.toLowerCase() === data.name.trim().toLowerCase());
  if (exists) throw new Error(`Department '${data.name}' already exists.`);

  const newDept = {
    id: `dept_${uuidv4().substring(0, 8)}`,
    name: data.name.trim(),
    code: (data.code || data.name.substring(0, 3)).toUpperCase().trim(),
    description: data.description || '',
    createdAt: new Date().toISOString()
  };

  departments.push(newDept);
  db.set('departments', departments);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CREATE',
    entity: 'department',
    entityId: newDept.id,
    afterState: newDept,
    ip
  });

  return newDept;
};

export const deleteDepartment = (id, actor, ip) => {
  const departments = db.get('departments');
  const employees = db.get('employees');
  const hasEmployees = employees.some(e => e.departmentId === id && e.status !== 'exited');
  if (hasEmployees) throw new Error('Cannot delete department with active employees.');

  const target = departments.find(d => d.id === id);
  if (!target) throw new Error('Department not found.');

  const remaining = departments.filter(d => d.id !== id);
  db.set('departments', remaining);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'DELETE',
    entity: 'department',
    entityId: id,
    beforeState: target,
    ip
  });

  return { success: true };
};

// --- DESIGNATIONS ---
export const getDesignations = (departmentId) => {
  const all = db.get('designations');
  if (departmentId) return all.filter(d => d.departmentId === departmentId);
  return all;
};

export const createDesignation = (data, actor, ip) => {
  const designations = db.get('designations');
  const newDesig = {
    id: `desig_${uuidv4().substring(0, 8)}`,
    name: data.name.trim(),
    departmentId: data.departmentId,
    createdAt: new Date().toISOString()
  };

  designations.push(newDesig);
  db.set('designations', designations);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CREATE',
    entity: 'designation',
    entityId: newDesig.id,
    afterState: newDesig,
    ip
  });

  return newDesig;
};

export const deleteDesignation = (id, actor, ip) => {
  const designations = db.get('designations');
  const target = designations.find(d => d.id === id);
  if (!target) throw new Error('Designation not found.');

  const remaining = designations.filter(d => d.id !== id);
  db.set('designations', remaining);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'DELETE',
    entity: 'designation',
    entityId: id,
    beforeState: target,
    ip
  });

  return { success: true };
};

// --- LEAVE TYPES & QUOTAS ---
export const getLeaveTypes = () => db.get('leaveTypes');

export const updateLeaveType = (id, data, actor, ip) => {
  const leaveTypes = db.get('leaveTypes');
  const index = leaveTypes.findIndex(lt => lt.id === id);
  if (index === -1) throw new Error('Leave type not found.');

  const before = leaveTypes[index];
  leaveTypes[index] = {
    ...before,
    name: data.name !== undefined ? data.name : before.name,
    yearlyQuota: data.yearlyQuota !== undefined ? Number(data.yearlyQuota) : before.yearlyQuota,
    isPaid: data.isPaid !== undefined ? Boolean(data.isPaid) : before.isPaid
  };

  db.set('leaveTypes', leaveTypes);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'UPDATE',
    entity: 'leave_type',
    entityId: id,
    beforeState: before,
    afterState: leaveTypes[index],
    ip
  });

  return leaveTypes[index];
};

// --- PUBLIC HOLIDAYS ---
export const getHolidays = () => db.get('holidays');

export const createHoliday = (data, actor, ip) => {
  const holidays = db.get('holidays');
  const exists = holidays.some(h => h.date === data.date);
  if (exists) throw new Error(`Holiday on ${data.date} already exists.`);

  const newHoliday = {
    id: `hol_${uuidv4().substring(0, 8)}`,
    name: data.name.trim(),
    date: data.date, // YYYY-MM-DD
    description: data.description || '',
    createdAt: new Date().toISOString()
  };

  holidays.push(newHoliday);
  db.set('holidays', holidays);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CREATE',
    entity: 'holiday',
    entityId: newHoliday.id,
    afterState: newHoliday,
    ip
  });

  return newHoliday;
};

export const deleteHoliday = (id, actor, ip) => {
  const holidays = db.get('holidays');
  const target = holidays.find(h => h.id === id);
  if (!target) throw new Error('Holiday not found.');

  const remaining = holidays.filter(h => h.id !== id);
  db.set('holidays', remaining);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'DELETE',
    entity: 'holiday',
    entityId: id,
    beforeState: target,
    ip
  });

  return { success: true };
};

// --- USER MANAGEMENT (Admin creates HR logins, deactivates, resets) ---
export const getUsers = () => {
  const users = db.get('users');
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    employeeId: u.employeeId,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    createdAt: u.createdAt
  }));
};

export const createHRUser = async (data, actor, ip) => {
  const users = db.get('users');
  const email = data.email.toLowerCase().trim();
  if (users.some(u => u.email === email)) {
    throw new Error(`User with email '${email}' already exists.`);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password || 'HRpass123!', salt);

  const newUser = {
    id: `usr_hr_${uuidv4().substring(0, 8)}`,
    name: data.name.trim(),
    email,
    passwordHash,
    role: 'hr',
    employeeId: null,
    status: 'active',
    mustChangePassword: true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  db.set('users', users);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CREATE_HR_USER',
    entity: 'user',
    entityId: newUser.id,
    afterState: { id: newUser.id, name: newUser.name, email: newUser.email, role: 'hr' },
    ip
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    status: newUser.status,
    temporaryPassword: data.password || 'HRpass123!'
  };
};

export const toggleUserStatus = (id, actor, ip) => {
  const users = db.get('users');
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('User not found.');
  if (user.id === actor.id) throw new Error('Cannot deactivate your own account.');

  const beforeStatus = user.status;
  user.status = user.status === 'active' ? 'inactive' : 'active';
  db.set('users', users);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'TOGGLE_USER_STATUS',
    entity: 'user',
    entityId: id,
    beforeState: { status: beforeStatus },
    afterState: { status: user.status },
    ip
  });

  return { id: user.id, status: user.status };
};

export const resetUserPassword = async (id, temporaryPassword, actor, ip) => {
  const users = db.get('users');
  const user = users.find(u => u.id === id);
  if (!user) throw new Error('User not found.');

  const tempPass = temporaryPassword || 'ResetPass123!';
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(tempPass, salt);
  user.mustChangePassword = true;

  db.set('users', users);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'RESET_PASSWORD',
    entity: 'user',
    entityId: id,
    ip
  });

  return { success: true, temporaryPassword: tempPass };
};
