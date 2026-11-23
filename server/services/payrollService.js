import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';
import { calculateWorkingDays } from './leaveService.js';

// Calculate Pakistan illustrative tax slab from the Hackathon brief
export const calculateAnnualTax = (annualGross) => {
  if (annualGross <= 600000) {
    return 0;
  } else if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  } else if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  } else if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  } else {
    return 510000 + (annualGross - 3600000) * 0.35;
  }
};

// Get all calendar days in a month 'YYYY-MM'
export const getMonthDateRange = (monthStr) => {
  const [year, month] = monthStr.split('-').map(Number);
  const start = `${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, lastDay };
};

export const generatePayrollDraft = (monthStr, actor, ip) => {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    throw new Error("Invalid month format, expected 'YYYY-MM'.");
  }

  const payrollRuns = db.get('payrollRuns');
  const existing = payrollRuns.find(p => p.month === monthStr);
  if (existing && existing.status === 'finalized') {
    throw new Error(`Payroll for ${monthStr} has already been finalized and locked.`);
  }

  const company = db.getCompany();
  const employees = db.get('employees').filter(e => e.status !== 'exited' || (e.exitDate && e.exitDate >= `${monthStr}-01`));
  const departments = db.get('departments');
  const designations = db.get('designations');
  const attendanceList = db.get('attendance').filter(a => a.date.startsWith(monthStr));
  const leaves = db.get('leaveRequests').filter(l => l.status === 'approved' && (l.startDate.startsWith(monthStr) || l.endDate.startsWith(monthStr)));

  const { start, end, lastDay } = getMonthDateRange(monthStr);
  const totalWorkingDaysInMonth = calculateWorkingDays(start, end);

  const payslipsData = [];
  let totalGrossAll = 0;
  let totalDeductionsAll = 0;
  let totalTaxAll = 0;
  let totalNetAll = 0;

  for (const emp of employees) {
    const dept = departments.find(d => d.id === emp.departmentId);
    const desig = designations.find(d => d.id === emp.designationId);

    // Prorate for joiners or leavers
    let empStart = start;
    if (emp.joiningDate && emp.joiningDate > start) {
      empStart = emp.joiningDate;
    }
    let empEnd = end;
    if (emp.exitDate && emp.exitDate < end) {
      empEnd = emp.exitDate;
    }

    const empExpectedWorkingDays = calculateWorkingDays(empStart, empEnd);
    const perDayGross = totalWorkingDaysInMonth > 0 ? (emp.grossSalary / totalWorkingDaysInMonth) : 0;

    // Proration adjustment if joined mid-month
    const unworkedScheduledDays = Math.max(0, totalWorkingDaysInMonth - empExpectedWorkingDays);
    const prorationDeduction = Math.round(unworkedScheduledDays * perDayGross);

    // Filter attendance for this employee in this month
    const empAtt = attendanceList.filter(a => a.employeeId === emp.id);

    // Count present, late, half_day
    const lateRecords = empAtt.filter(a => a.status === 'late');
    const lateCount = lateRecords.length;
    const halfDayCount = empAtt.filter(a => a.status === 'half_day').length;

    // Approved leaves in month
    const empLeaves = leaves.filter(l => l.employeeId === emp.id);
    let unpaidLeaveDays = 0;
    for (const l of empLeaves) {
      if (l.leaveTypeName && l.leaveTypeName.toLowerCase().includes('unpaid')) {
        unpaidLeaveDays += l.daysCount || 0;
      }
    }

    // Determine absent days: expected working days minus (present/late/half_day days + approved leave days)
    const attendedDays = empAtt.filter(a => ['present', 'late', 'half_day'].includes(a.status)).length;
    const approvedLeaveDays = empLeaves.reduce((sum, l) => sum + (l.daysCount || 0), 0);
    const absentDays = Math.max(0, empExpectedWorkingDays - (attendedDays + approvedLeaveDays));

    // Deductions: per day * (absent + unpaid + 0.5 * halfDays)
    let attendanceDeductions = Math.round(perDayGross * (absentDays + unpaidLeaveDays + 0.5 * halfDayCount));

    // Bonus late penalty rule: 3 lates = 0.5 day deduction
    let latePenaltyDeductions = 0;
    if (company.latePenaltyRule && lateCount >= 3) {
      const penaltyUnits = Math.floor(lateCount / 3);
      latePenaltyDeductions = Math.round(penaltyUnits * 0.5 * perDayGross);
    }

    const totalDeductions = attendanceDeductions + latePenaltyDeductions + prorationDeduction;

    // Annual tax calculation
    const annualGross = emp.grossSalary * 12;
    const annualTax = calculateAnnualTax(annualGross);
    const monthlyTax = Math.round(annualTax / 12);

    const netSalary = Math.max(0, Math.round(emp.grossSalary - totalDeductions - monthlyTax));

    totalGrossAll += emp.grossSalary;
    totalDeductionsAll += totalDeductions;
    totalTaxAll += monthlyTax;
    totalNetAll += netSalary;

    payslipsData.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      departmentName: dept ? dept.name : 'Unknown',
      designationName: desig ? desig.name : 'Unknown',
      basicSalary: emp.basicSalary,
      hra: emp.hra,
      medical: emp.medical,
      grossSalary: emp.grossSalary,
      workingDays: totalWorkingDaysInMonth,
      actualWorkedDays: attendedDays,
      absentDays,
      unpaidLeaveDays,
      halfDays: halfDayCount,
      lateCount,
      latePenaltyDeductions,
      attendanceDeductions,
      prorationDeduction,
      totalDeductions,
      taxDeduction: monthlyTax,
      netSalary
    });
  }

  // Create or update draft payroll run
  const runId = existing ? existing.id : `pr_${uuidv4().substring(0, 8)}`;
  const draftRun = {
    id: runId,
    month: monthStr,
    status: 'draft',
    totalGross: totalGrossAll,
    totalDeductions: totalDeductionsAll,
    totalTax: totalTaxAll,
    totalNet: totalNetAll,
    workingDays: totalWorkingDaysInMonth,
    employeeCount: employees.length,
    preparedBy: actor.name,
    preparedById: actor.id,
    finalizedBy: null,
    finalizedAt: null,
    payslips: payslipsData,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const runs = payrollRuns.filter(r => r.month !== monthStr);
  runs.push(draftRun);
  db.set('payrollRuns', runs);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'GENERATE_PAYROLL_DRAFT',
    entity: 'payroll',
    entityId: runId,
    afterState: { month: monthStr, totalGross: totalGrossAll, totalNet: totalNetAll },
    ip
  });

  return draftRun;
};

export const getPayrollRuns = () => {
  return db.get('payrollRuns').sort((a, b) => b.month.localeCompare(a.month));
};

export const getPayrollRunByMonth = (monthStr) => {
  return db.get('payrollRuns').find(p => p.month === monthStr) || null;
};

export const finalizePayroll = (monthStr, actor, ip) => {
  const payrollRuns = db.get('payrollRuns');
  const runIndex = payrollRuns.findIndex(p => p.month === monthStr);
  if (runIndex === -1) {
    throw new Error(`No payroll run found for ${monthStr}. Please generate a draft first.`);
  }

  const run = payrollRuns[runIndex];
  if (run.status === 'finalized') {
    throw new Error(`Payroll for ${monthStr} is already finalized and locked.`);
  }

  run.status = 'finalized';
  run.finalizedBy = actor.name;
  run.finalizedById = actor.id;
  run.finalizedAt = new Date().toISOString();

  // Create official payslip records
  const allPayslips = db.get('payslips').filter(p => p.month !== monthStr);
  const notifications = db.get('notifications');
  const users = db.get('users');

  for (const p of run.payslips) {
    const payslipId = `ps_${uuidv4().substring(0, 8)}`;
    allPayslips.push({
      id: payslipId,
      payrollRunId: run.id,
      month: monthStr,
      ...p,
      status: 'paid',
      createdAt: new Date().toISOString()
    });

    // Notify employee
    const targetUser = users.find(u => u.employeeId === p.employeeId);
    if (targetUser) {
      notifications.unshift({
        id: `notif_${uuidv4().substring(0, 8)}`,
        userId: targetUser.id,
        title: `Payslip Available (${monthStr})`,
        message: `Your payslip for ${monthStr} is ready. Net Salary: Rs. ${p.netSalary.toLocaleString()}`,
        type: 'payslip',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  db.set('payrollRuns', payrollRuns);
  db.set('payslips', allPayslips);
  db.set('notifications', notifications);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'FINALIZE_PAYROLL',
    entity: 'payroll',
    entityId: run.id,
    afterState: { month: monthStr, finalizedAt: run.finalizedAt },
    ip
  });

  return run;
};

export const getEmployeePayslips = (employeeId) => {
  return db.get('payslips')
    .filter(p => p.employeeId === employeeId)
    .sort((a, b) => b.month.localeCompare(a.month));
};

export const getPayslipById = (id) => {
  return db.get('payslips').find(p => p.id === id) || null;
};

// Generate Payslip PDF stream
export const streamPayslipPDF = (payslip, company, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=payslip-${payslip.employeeCode}-${payslip.month}.pdf`);

  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(company.name || 'QuickServe Company', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Confidential Employee Payslip', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica-Oblique').text(`Payroll Month: ${payslip.month}`, { align: 'center' });
  doc.moveDown(1);

  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);

  // Employee Details Grid
  const detailsY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').text('Employee Information', 40, detailsY);
  doc.font('Helvetica').fontSize(9);
  doc.text(`Employee Code: ${payslip.employeeCode}`, 40, detailsY + 18);
  doc.text(`Name: ${payslip.employeeName}`, 40, detailsY + 32);
  doc.text(`Department: ${payslip.departmentName}`, 40, detailsY + 46);
  doc.text(`Designation: ${payslip.designationName}`, 40, detailsY + 60);

  doc.fontSize(10).font('Helvetica-Bold').text('Attendance Summary', 320, detailsY);
  doc.font('Helvetica').fontSize(9);
  doc.text(`Working Days in Month: ${payslip.workingDays}`, 320, detailsY + 18);
  doc.text(`Days Worked: ${payslip.actualWorkedDays}`, 320, detailsY + 32);
  doc.text(`Late Days: ${payslip.lateCount}`, 320, detailsY + 46);
  doc.text(`Absent / Unpaid: ${payslip.absentDays + payslip.unpaidLeaveDays} days`, 320, detailsY + 60);

  doc.moveDown(4.5);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);

  // Earnings & Deductions Table
  const tableY = doc.y;
  doc.fontSize(11).font('Helvetica-Bold').text('Earnings', 40, tableY);
  doc.fontSize(11).text('Deductions', 320, tableY);
  doc.moveDown(0.5);

  const drawRow = (leftLabel, leftVal, rightLabel, rightVal, isBold = false) => {
    const y = doc.y;
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    doc.text(leftLabel, 40, y);
    doc.text(leftVal ? `Rs. ${Number(leftVal).toLocaleString()}` : '', 220, y, { align: 'right', width: 60 });
    doc.text(rightLabel, 320, y);
    doc.text(rightVal ? `Rs. ${Number(rightVal).toLocaleString()}` : '', 490, y, { align: 'right', width: 60 });
    doc.moveDown(0.6);
  };

  drawRow('Basic Salary', payslip.basicSalary, 'Absenteeism / Unpaid Leave', payslip.attendanceDeductions);
  drawRow('House Rent Allowance (HRA 40%)', payslip.hra, 'Late Arrival Penalty', payslip.latePenaltyDeductions || 0);
  drawRow('Medical Allowance (10%)', payslip.medical, 'Proration Adjustment', payslip.prorationDeduction || 0);
  drawRow('', '', 'Income Tax Slab', payslip.taxDeduction);

  doc.moveDown(0.5);
  doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  drawRow('Total Gross Earnings', payslip.grossSalary, 'Total Deductions', (payslip.totalDeductions || 0) + (payslip.taxDeduction || 0), true);

  doc.moveDown(1);
  doc.rect(40, doc.y, 515, 36).fillAndStroke('#f1f5f9', '#94a3b8');
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold')
    .text(`NET PAYABLE AMOUNT: Rs. ${payslip.netSalary.toLocaleString()}`, 50, doc.y - 26);

  doc.moveDown(3);
  doc.fillColor('#64748b').fontSize(8).font('Helvetica')
    .text('This is a computer-generated payslip and does not require a physical signature.', { align: 'center' });

  doc.end();
};
