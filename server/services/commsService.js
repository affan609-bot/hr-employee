import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';

// --- ANNOUNCEMENTS ---
export const getAnnouncements = () => {
  return db.get('announcements').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createAnnouncement = ({ title, content, priority = 'normal', actor, ip }) => {
  if (!title || !content) {
    throw new Error('Title and content are required.');
  }

  const announcements = db.get('announcements');
  const newAnn = {
    id: `ann_${uuidv4().substring(0, 8)}`,
    title: title.trim(),
    content: content.trim(),
    priority, // 'normal' | 'high'
    postedBy: actor.id,
    postedByName: actor.name,
    postedByRole: actor.role,
    createdAt: new Date().toISOString()
  };

  announcements.unshift(newAnn);
  db.set('announcements', announcements);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'POST_ANNOUNCEMENT',
    entity: 'announcement',
    entityId: newAnn.id,
    afterState: newAnn,
    ip
  });

  return newAnn;
};

// --- NOTIFICATIONS ---
export const getUserNotifications = (userId) => {
  return db.get('notifications')
    .filter(n => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const markNotificationRead = (id, userId) => {
  const notifications = db.get('notifications');
  const notif = notifications.find(n => n.id === id && n.userId === userId);
  if (notif) {
    notif.isRead = true;
    db.set('notifications', notifications);
  }
  return { success: true };
};

export const markAllNotificationsRead = (userId) => {
  const notifications = db.get('notifications');
  for (const n of notifications) {
    if (n.userId === userId) {
      n.isRead = true;
    }
  }
  db.set('notifications', notifications);
  return { success: true };
};

// --- AUDIT LOGS ---
export const getAuditLogs = ({ page = 1, limit = 50, entity = '', action = '' }) => {
  let logs = db.get('auditLogs');

  if (entity) {
    logs = logs.filter(l => l.entity === entity);
  }
  if (action) {
    logs = logs.filter(l => l.action === action);
  }

  const total = logs.length;
  const startIndex = (page - 1) * limit;
  const paginated = logs.slice(startIndex, startIndex + Number(limit));

  return {
    logs: paginated,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  };
};

// --- AI LOGS ---
export const getAILogs = () => {
  return db.get('aiLogs').slice(0, 100);
};
