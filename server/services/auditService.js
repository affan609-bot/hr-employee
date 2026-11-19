import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export const logAudit = ({ actorId, actorName, actorRole, action, entity, entityId, beforeState = null, afterState = null, ip = '' }) => {
  try {
    const logs = db.get('auditLogs');
    const newLog = {
      id: `audit_${uuidv4().substring(0, 8)}`,
      actorId: actorId || 'system',
      actorName: actorName || 'System',
      actorRole: actorRole || 'system',
      action, // e.g. 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'FINALIZE', 'LOGIN', 'PASSWORD_CHANGE'
      entity, // e.g. 'company', 'employee', 'leave', 'attendance', 'payroll', 'user'
      entityId: entityId || '',
      beforeState: beforeState ? JSON.parse(JSON.stringify(beforeState)) : null,
      afterState: afterState ? JSON.parse(JSON.stringify(afterState)) : null,
      ip: ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog); // newest first
    db.set('auditLogs', logs);
    return newLog;
  } catch (err) {
    console.error('Audit log error:', err);
  }
};
