import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';

// Haversine formula to compute distance in meters between two GPS coordinates
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const checkIn = async ({ employeeId, source = 'web', location = null, faceData = null, actor, ip }) => {
  const company = db.getCompany();
  const attendanceList = db.get('attendance');
  const employees = db.get('employees');

  const employee = employees.find(e => e.id === employeeId);
  if (!employee) throw new Error('Employee not found.');
  if (employee.status === 'exited') throw new Error('Cannot check in for an exited employee.');

  // Current server date and time
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const currentTime = now.toTimeString().split(' ')[0]; // 'HH:MM:SS'

  // Check if already checked in today -> 409 Conflict
  const existing = attendanceList.find(a => a.employeeId === employeeId && a.date === today);
  if (existing) {
    const error = new Error('Already checked in today.');
    error.status = 409;
    throw error;
  }

  // Camera check validation
  let locationInfo = null;
  if (source === 'camera') {
    if (!faceData || !faceData.faceDetected || faceData.faceCount !== 1) {
      const err = new Error('Face verification failed: Exactly one face must be clearly detected in frame.');
      err.status = 422;
      throw err;
    }

    if (!location || location.lat === undefined || location.lng === undefined) {
      const err = new Error('Location coordinates are required for camera attendance.');
      err.status = 422;
      throw err;
    }

    if (location.accuracy && location.accuracy > 100) {
      const err = new Error(`GPS accuracy is too low (${Math.round(location.accuracy)}m > 100m threshold).`);
      err.status = 422;
      throw err;
    }

    const officeLoc = company.officeLocation || { lat: 24.8607, lng: 67.0011, radius: 150 };
    const distance = calculateDistanceMeters(officeLoc.lat, officeLoc.lng, location.lat, location.lng);

    if (distance > (officeLoc.radius || 150)) {
      const err = new Error(`Location outside office radius: ${distance}m away (allowed: ${officeLoc.radius}m).`);
      err.status = 422;
      throw err;
    }

    locationInfo = {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy || 0,
      distance,
      verified: true
    };
  }

  // Determine late or present based on company officeStartTime + graceMinutes
  const [startHour, startMin] = (company.officeStartTime || '09:00').split(':').map(Number);
  const graceMinutes = company.graceMinutes !== undefined ? company.graceMinutes : 15;
  const cutoffMinutes = startHour * 60 + startMin + graceMinutes;

  const [currentH, currentM] = currentTime.split(':').map(Number);
  const currentTotalMinutes = currentH * 60 + currentM;

  const isLate = currentTotalMinutes > cutoffMinutes;
  const status = isLate ? 'late' : 'present';

  const newRecord = {
    id: `att_${uuidv4().substring(0, 8)}`,
    employeeId,
    date: today,
    checkInTime: currentTime,
    checkOutTime: null,
    workHours: 0,
    status, // 'present' | 'late'
    source, // 'web' | 'camera'
    location: locationInfo,
    createdAt: now.toISOString()
  };

  attendanceList.push(newRecord);
  db.set('attendance', attendanceList);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CHECK_IN',
    entity: 'attendance',
    entityId: newRecord.id,
    afterState: { employeeId, date: today, time: currentTime, status, source },
    ip
  });

  return newRecord;
};

export const checkOut = async ({ employeeId, actor, ip }) => {
  const company = db.getCompany();
  const attendanceList = db.get('attendance');
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  const currentTime = now.toTimeString().split(' ')[0];

  const recordIndex = attendanceList.findIndex(a => a.employeeId === employeeId && a.date === today);
  if (recordIndex === -1) {
    const error = new Error('No check-in record found for today. Please check in first.');
    error.status = 404;
    throw error;
  }

  const record = attendanceList[recordIndex];
  if (record.checkOutTime) {
    const error = new Error('Already checked out for today.');
    error.status = 409;
    throw error;
  }

  // Calculate work hours
  const [inH, inM, inS] = record.checkInTime.split(':').map(Number);
  const [outH, outM, outS] = currentTime.split(':').map(Number);
  const inSeconds = inH * 3600 + inM * 60 + (inS || 0);
  const outSeconds = outH * 3600 + outM * 60 + (outS || 0);
  const diffSeconds = Math.max(0, outSeconds - inSeconds);
  const workHours = Number((diffSeconds / 3600).toFixed(2));

  record.checkOutTime = currentTime;
  record.workHours = workHours;

  const halfDayThreshold = company.halfDayHours || 5;
  if (workHours < halfDayThreshold) {
    record.status = 'half_day';
  }

  db.set('attendance', attendanceList);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CHECK_OUT',
    entity: 'attendance',
    entityId: record.id,
    afterState: { employeeId, date: today, checkOutTime: currentTime, workHours, status: record.status },
    ip
  });

  return record;
};

export const getEmployeeAttendance = (employeeId, month = '') => {
  const today = new Date().toLocaleDateString('en-CA');
  let records = db.get('attendance').filter(a => a.employeeId === employeeId);
  if (month) {
    records = records.filter(a => a.date.startsWith(month));
  }
  return records.map((r) => {
    if (!r.checkOutTime && r.date < today && !['on_leave'].includes(r.status)) {
      return { ...r, status: 'missing_checkout' };
    }
    return r;
  }).sort((a, b) => b.date.localeCompare(a.date));
};

export const getDailyAttendanceBoard = (date) => {
  const targetDate = date || new Date().toLocaleDateString('en-CA');
  const employees = db.get('employees').filter(e => e.status !== 'exited');
  const departments = db.get('departments');
  const designations = db.get('designations');
  const attendance = db.get('attendance').filter(a => a.date === targetDate);
  const leaves = db.get('leaveRequests').filter(l =>
    l.status === 'approved' &&
    l.startDate <= targetDate &&
    l.endDate >= targetDate
  );

  return employees.map(emp => {
    const dept = departments.find(d => d.id === emp.departmentId);
    const desig = designations.find(d => d.id === emp.designationId);
    const att = attendance.find(a => a.employeeId === emp.id);
    const leave = leaves.find(l => l.employeeId === emp.id);

    let status = 'absent';
    let checkInTime = null;
    let checkOutTime = null;
    let workHours = 0;
    let source = null;

    if (att) {
      status = att.status;
      checkInTime = att.checkInTime;
      checkOutTime = att.checkOutTime;
      workHours = att.workHours;
      source = att.source;
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (!att.checkOutTime && targetDate < todayStr) {
        status = 'missing_checkout';
      }
    } else if (leave) {
      status = 'on_leave';
    }

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      department: dept ? dept.name : 'Unknown',
      designation: desig ? desig.name : 'Unknown',
      date: targetDate,
      status,
      checkInTime,
      checkOutTime,
      workHours,
      source
    };
  });
};

// --- ATTENDANCE CORRECTIONS ---
export const requestCorrection = ({ employeeId, date, requestedCheckIn, requestedCheckOut, reason, actor, ip }) => {
  if (!date || !requestedCheckIn || !reason) {
    throw new Error('Date, requested check-in time, and reason are required.');
  }

  const corrections = db.get('attendanceCorrections');
  const newCorr = {
    id: `corr_${uuidv4().substring(0, 8)}`,
    employeeId,
    date,
    requestedCheckIn,
    requestedCheckOut: requestedCheckOut || null,
    reason: reason.trim(),
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    reviewComment: '',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date().toISOString()
  };

  corrections.push(newCorr);
  db.set('attendanceCorrections', corrections);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'REQUEST_ATTENDANCE_CORRECTION',
    entity: 'attendance_correction',
    entityId: newCorr.id,
    afterState: newCorr,
    ip
  });

  return newCorr;
};

export const getCorrections = (filterEmployeeId = null) => {
  const corrections = db.get('attendanceCorrections');
  const employees = db.get('employees');

  const filtered = filterEmployeeId
    ? corrections.filter(c => c.employeeId === filterEmployeeId)
    : corrections;

  return filtered.map(c => {
    const emp = employees.find(e => e.id === c.employeeId);
    return {
      ...c,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
      employeeCode: emp ? emp.employeeCode : ''
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const reviewCorrection = ({ id, status, reviewComment, actor, ip }) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error("Status must be 'approved' or 'rejected'.");
  }

  const corrections = db.get('attendanceCorrections');
  const corrIndex = corrections.findIndex(c => c.id === id);
  if (corrIndex === -1) throw new Error('Correction request not found.');

  const corr = corrections[corrIndex];
  corr.status = status;
  corr.reviewComment = reviewComment || '';
  corr.reviewedBy = actor.name;
  corr.reviewedAt = new Date().toISOString();

  if (status === 'approved') {
    // Update or insert attendance record
    const attendance = db.get('attendance');
    const existingIndex = attendance.findIndex(a => a.employeeId === corr.employeeId && a.date === corr.date);

    // Calculate work hours
    let workHours = 8;
    if (corr.requestedCheckOut && corr.requestedCheckIn) {
      const [inH, inM] = corr.requestedCheckIn.split(':').map(Number);
      const [outH, outM] = corr.requestedCheckOut.split(':').map(Number);
      workHours = Number((Math.max(0, (outH * 60 + outM) - (inH * 60 + inM)) / 60).toFixed(2));
    }

    const company = db.getCompany();
    const halfDayThreshold = company.halfDayHours || 5;
    const [startHour, startMin] = (company.officeStartTime || '09:00').split(':').map(Number);
    const graceMinutes = company.graceMinutes !== undefined ? company.graceMinutes : 15;
    const cutoffMinutes = startHour * 60 + startMin + graceMinutes;

    const [inH, inM] = corr.requestedCheckIn.split(':').map(Number);
    const isLate = (inH * 60 + inM) > cutoffMinutes;

    let finalStatus = isLate ? 'late' : 'present';
    if (workHours < halfDayThreshold && workHours > 0) {
      finalStatus = 'half_day';
    }

    if (existingIndex !== -1) {
      attendance[existingIndex].checkInTime = corr.requestedCheckIn;
      attendance[existingIndex].checkOutTime = corr.requestedCheckOut || attendance[existingIndex].checkOutTime;
      attendance[existingIndex].workHours = workHours;
      attendance[existingIndex].status = finalStatus;
    } else {
      attendance.push({
        id: `att_${uuidv4().substring(0, 8)}`,
        employeeId: corr.employeeId,
        date: corr.date,
        checkInTime: corr.requestedCheckIn,
        checkOutTime: corr.requestedCheckOut,
        workHours,
        status: finalStatus,
        source: 'correction',
        location: null,
        createdAt: new Date().toISOString()
      });
    }
    db.set('attendance', attendance);
  }

  db.set('attendanceCorrections', corrections);

  // In-app notification for employee
  const users = db.get('users');
  const targetUser = users.find(u => u.employeeId === corr.employeeId);
  if (targetUser) {
    const notifications = db.get('notifications');
    notifications.unshift({
      id: `notif_${uuidv4().substring(0, 8)}`,
      userId: targetUser.id,
      title: `Attendance Correction ${status.toUpperCase()}`,
      message: `Your correction request for ${corr.date} was ${status}. Comment: ${reviewComment || 'None'}`,
      type: 'correction',
      isRead: false,
      createdAt: new Date().toISOString()
    });
    db.set('notifications', notifications);
  }

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: `CORRECTION_${status.toUpperCase()}`,
    entity: 'attendance_correction',
    entityId: id,
    afterState: corr,
    ip
  });

  return corr;
};
