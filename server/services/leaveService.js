import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';

// Calculate working days between two ISO dates (inclusive), skipping weekends and public holidays
export const calculateWorkingDays = (startDateStr, endDateStr) => {
  const company = db.getCompany();
  const holidays = db.get('holidays').map(h => h.date);
  const weekendDays = company.weekendDays || [0, 6]; // 0: Sun, 6: Sat

  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);

  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toLocaleDateString('en-CA');

    // Check if weekend
    const isWeekend = weekendDays.includes(dayOfWeek);
    // Check if public holiday
    const isHoliday = holidays.includes(dateStr);

    if (!isWeekend && !isHoliday) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
};

export const getLeaveBalances = (employeeId) => {
  const leaveTypes = db.get('leaveTypes');
  const leaves = db.get('leaveRequests').filter(l => l.employeeId === employeeId);
  const currentYear = new Date().getFullYear();

  return leaveTypes.map(lt => {
    const used = leaves
      .filter(l => l.leaveTypeId === lt.id && l.status === 'approved' && l.startDate.startsWith(`${currentYear}`))
      .reduce((sum, l) => sum + (l.daysCount || 0), 0);

    const pending = leaves
      .filter(l => l.leaveTypeId === lt.id && l.status === 'pending' && l.startDate.startsWith(`${currentYear}`))
      .reduce((sum, l) => sum + (l.daysCount || 0), 0);

    const isUnlimited = lt.code === 'unpaid';
    const remaining = isUnlimited ? 999 : Math.max(0, lt.yearlyQuota - used);

    return {
      leaveTypeId: lt.id,
      name: lt.name,
      code: lt.code,
      yearlyQuota: isUnlimited ? 'Unlimited' : lt.yearlyQuota,
      used,
      pending,
      remaining: isUnlimited ? 'Unlimited' : remaining,
      isPaid: lt.isPaid
    };
  });
};

export const applyLeave = async ({ employeeId, leaveTypeId, startDate, endDate, reason, actor, ip }) => {
  if (!startDate || !endDate || !leaveTypeId || !reason) {
    const err = new Error('Start date, end date, leave type, and reason are required.');
    err.status = 400;
    throw err;
  }

  if (startDate > endDate) {
    const err = new Error('Start date cannot be after end date.');
    err.status = 400;
    throw err;
  }

  const leaveTypes = db.get('leaveTypes');
  const lt = leaveTypes.find(t => t.id === leaveTypeId || t.code === leaveTypeId);
  if (!lt) {
    const err = new Error('Invalid leave type.');
    err.status = 400;
    throw err;
  }

  const workingDays = calculateWorkingDays(startDate, endDate);
  if (workingDays === 0) {
    const err = new Error('Selected date range contains 0 working days (all days are weekends or public holidays).');
    err.status = 422;
    throw err;
  }

  // Check overlap with existing approved or pending leaves
  const existingLeaves = db.get('leaveRequests').filter(l =>
    l.employeeId === employeeId &&
    (l.status === 'approved' || l.status === 'pending')
  );

  const hasOverlap = existingLeaves.some(l => {
    return !(endDate < l.startDate || startDate > l.endDate);
  });

  if (hasOverlap) {
    const err = new Error('Leave request overlaps with an existing pending or approved leave.');
    err.status = 422;
    throw err;
  }

  // Check balance quota
  if (lt.code !== 'unpaid') {
    const balances = getLeaveBalances(employeeId);
    const bal = balances.find(b => b.leaveTypeId === lt.id);
    if (bal && typeof bal.remaining === 'number' && workingDays > bal.remaining) {
      const err = new Error(`Insufficient leave balance: requested ${workingDays} days, but only ${bal.remaining} days available.`);
      err.status = 422;
      throw err;
    }
  }

  const newLeave = {
    id: `leave_${uuidv4().substring(0, 8)}`,
    employeeId,
    leaveTypeId: lt.id,
    leaveTypeName: lt.name,
    startDate,
    endDate,
    daysCount: workingDays,
    reason: reason.trim(),
    status: 'pending', // 'pending' | 'approved' | 'rejected' | 'cancelled'
    reviewComment: '',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date().toISOString()
  };

  const leaves = db.get('leaveRequests');
  leaves.push(newLeave);
  db.set('leaveRequests', leaves);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'APPLY_LEAVE',
    entity: 'leave',
    entityId: newLeave.id,
    afterState: newLeave,
    ip
  });

  return newLeave;
};

export const cancelLeave = ({ id, employeeId, actor, ip }) => {
  const leaves = db.get('leaveRequests');
  const index = leaves.findIndex(l => l.id === id);
  if (index === -1) throw new Error('Leave request not found.');

  const leave = leaves[index];
  if (leave.employeeId !== employeeId) {
    throw new Error('Unauthorized to cancel this leave.');
  }

  if (leave.status === 'rejected' || leave.status === 'cancelled') {
    throw new Error(`Cannot cancel a leave with status '${leave.status}'.`);
  }

  leave.status = 'cancelled';
  db.set('leaveRequests', leaves);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CANCEL_LEAVE',
    entity: 'leave',
    entityId: id,
    afterState: leave,
    ip
  });

  return leave;
};

export const reviewLeave = ({ id, status, reviewComment, actor, ip }) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error("Status must be 'approved' or 'rejected'.");
  }

  const leaves = db.get('leaveRequests');
  const index = leaves.findIndex(l => l.id === id);
  if (index === -1) throw new Error('Leave request not found.');

  const leave = leaves[index];
  leave.status = status;
  leave.reviewComment = reviewComment || '';
  leave.reviewedBy = actor.name;
  leave.reviewedAt = new Date().toISOString();

  db.set('leaveRequests', leaves);

  // Send in-app notification to employee
  const users = db.get('users');
  const targetUser = users.find(u => u.employeeId === leave.employeeId);
  if (targetUser) {
    const notifications = db.get('notifications');
    notifications.unshift({
      id: `notif_${uuidv4().substring(0, 8)}`,
      userId: targetUser.id,
      title: `Leave Request ${status.toUpperCase()}`,
      message: `Your ${leave.leaveTypeName} request (${leave.startDate} to ${leave.endDate}) was ${status}. Comment: ${reviewComment || 'None'}`,
      type: 'leave',
      isRead: false,
      createdAt: new Date().toISOString()
    });
    db.set('notifications', notifications);
  }

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: `LEAVE_${status.toUpperCase()}`,
    entity: 'leave',
    entityId: id,
    afterState: leave,
    ip
  });

  return leave;
};

export const getLeaves = ({ employeeId = null, status = '', departmentId = '' }) => {
  let leaves = db.get('leaveRequests');
  const employees = db.get('employees');
  const departments = db.get('departments');
  const leaveTypes = db.get('leaveTypes');

  if (employeeId) {
    leaves = leaves.filter(l => l.employeeId === employeeId);
  }

  if (status) {
    leaves = leaves.filter(l => l.status === status);
  }

  if (departmentId) {
    const deptEmpIds = new Set(employees.filter(e => e.departmentId === departmentId).map(e => e.id));
    leaves = leaves.filter(l => deptEmpIds.has(l.employeeId));
  }

  return leaves.map(l => {
    const emp = employees.find(e => e.id === l.employeeId);
    const dept = emp ? departments.find(d => d.id === emp.departmentId) : null;
    const lt = leaveTypes.find(t => t.id === l.leaveTypeId);

    return {
      ...l,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
      employeeCode: emp ? emp.employeeCode : '',
      departmentName: dept ? dept.name : 'Unknown',
      leaveTypeName: lt ? lt.name : l.leaveTypeName
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};
