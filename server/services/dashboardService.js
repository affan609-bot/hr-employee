import db from '../db.js';
import { calculateWorkingDays } from './leaveService.js';

export const getAdminAnalytics = ({ departmentId = '', startDate = '', endDate = '' }) => {
  let employees = db.get('employees');
  const departments = db.get('departments');
  const designations = db.get('designations');
  const auditLogs = db.get('auditLogs');
  const payrollRuns = db.get('payrollRuns');
  const attendanceList = db.get('attendance');

  if (departmentId) {
    employees = employees.filter(e => e.departmentId === departmentId);
  }

  const activeEmployees = employees.filter(e => e.status === 'active' || e.status === 'probation');
  const exitedEmployees = employees.filter(e => e.status === 'exited');

  const headcount = activeEmployees.length;

  // Attrition YTD
  const totalHistoric = headcount + exitedEmployees.length;
  const avgHeadcount = totalHistoric > 0 ? (headcount + (headcount + exitedEmployees.length)) / 2 : headcount;
  const attritionYTD = avgHeadcount > 0 ? Number(((exitedEmployees.length / avgHeadcount) * 100).toFixed(1)) : 0;

  // Payroll cost & Average salary
  const totalGrossPayroll = activeEmployees.reduce((sum, e) => sum + (e.grossSalary || 0), 0);
  const avgSalary = headcount > 0 ? Math.round(totalGrossPayroll / headcount) : 0;

  // Headcount by department
  const headcountByDept = departments.map(d => {
    const count = activeEmployees.filter(e => e.departmentId === d.id).length;
    const deptGross = activeEmployees
      .filter(e => e.departmentId === d.id)
      .reduce((sum, e) => sum + (e.grossSalary || 0), 0);
    return {
      departmentId: d.id,
      departmentName: d.name,
      count,
      payrollCost: deptGross,
      avgSalary: count > 0 ? Math.round(deptGross / count) : 0
    };
  });

  // Gender distribution
  const genderDist = {
    male: activeEmployees.filter(e => e.gender === 'male').length,
    female: activeEmployees.filter(e => e.gender === 'female').length,
    other: activeEmployees.filter(e => !['male', 'female'].includes(e.gender)).length
  };

  // Tenure distribution (< 6 months, 6-12 months, 1-2 years, 2+ years)
  const now = new Date();
  const tenureDist = {
    under6m: 0,
    m6to12: 0,
    y1to2: 0,
    over2y: 0
  };

  for (const emp of activeEmployees) {
    if (emp.joiningDate) {
      const join = new Date(emp.joiningDate);
      const diffMonths = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
      if (diffMonths < 6) tenureDist.under6m++;
      else if (diffMonths < 12) tenureDist.m6to12++;
      else if (diffMonths < 24) tenureDist.y1to2++;
      else tenureDist.over2y++;
    }
  }

  // Monthly payroll trends from finalized/draft payroll runs
  let filteredPayrollRuns = payrollRuns;
  if (startDate || endDate) {
    const startMonth = startDate ? startDate.slice(0, 7) : '';
    const endMonth = endDate ? endDate.slice(0, 7) : '';
    filteredPayrollRuns = payrollRuns.filter(r =>
      (!startMonth || r.month >= startMonth) && (!endMonth || r.month <= endMonth)
    );
  }
  const payrollTrends = filteredPayrollRuns.slice(0, 6).map(r => ({
    month: r.month,
    totalGross: r.totalGross,
    totalNet: r.totalNet,
    totalDeductions: r.totalDeductions,
    totalTax: r.totalTax,
    employeeCount: r.employeeCount
  })).reverse();

  return {
    kpis: {
      headcount,
      attritionYTD,
      payrollCost: totalGrossPayroll,
      avgSalary
    },
    headcountByDept,
    genderDist,
    tenureDist,
    payrollTrends,
    recentAudits: auditLogs.slice(0, 10)
  };
};

export const getHRAnalytics = ({ departmentId = '', startDate = '', endDate = '' }) => {
  let employees = db.get('employees').filter(e => e.status !== 'exited');
  const departments = db.get('departments');
  const attendanceList = db.get('attendance');
  const leaves = db.get('leaveRequests');
  const corrections = db.get('attendanceCorrections');
  const leaveTypes = db.get('leaveTypes');

  if (departmentId) {
    employees = employees.filter(e => e.departmentId === departmentId);
  }

  const today = endDate || new Date().toLocaleDateString('en-CA');
  const empIds = new Set(employees.map(e => e.id));

  const todayAttendance = attendanceList.filter(a => a.date === today && empIds.has(a.employeeId));
  const todayLeaves = leaves.filter(l =>
    l.status === 'approved' &&
    l.startDate <= today &&
    l.endDate >= today &&
    empIds.has(l.employeeId)
  );

  const presentToday = todayAttendance.filter(a => a.status === 'present' || a.status === 'half_day').length;
  const lateToday = todayAttendance.filter(a => a.status === 'late').length;
  const onLeaveToday = todayLeaves.length;

  const pendingLeaves = leaves.filter(l => l.status === 'pending' && empIds.has(l.employeeId)).length;
  const pendingCorrections = corrections.filter(c => c.status === 'pending' && empIds.has(c.employeeId)).length;

  // Attendance Trend (date range or past 7 days)
  const trendDays = [];
  if (startDate && endDate) {
    const cur = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (cur <= end && trendDays.length < 62) {
      trendDays.push(cur.toLocaleDateString('en-CA'));
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendDays.push(d.toLocaleDateString('en-CA'));
    }
  }

  const past7Days = trendDays.map((dStr) => {
    const dayAtt = attendanceList.filter(a => a.date === dStr && empIds.has(a.employeeId));
    const dayLeaves = leaves.filter(l => l.status === 'approved' && l.startDate <= dStr && l.endDate >= dStr && empIds.has(l.employeeId));
    return {
      date: dStr,
      present: dayAtt.filter(a => a.status === 'present').length,
      late: dayAtt.filter(a => a.status === 'late').length,
      halfDay: dayAtt.filter(a => a.status === 'half_day').length,
      onLeave: dayLeaves.length
    };
  });

  // Top 5 Late-Comers this month
  const currentMonth = today.substring(0, 7);
  const monthAttendance = attendanceList.filter(a => a.date.startsWith(currentMonth) && empIds.has(a.employeeId));

  const lateCounts = {};
  for (const a of monthAttendance) {
    if (a.status === 'late') {
      lateCounts[a.employeeId] = (lateCounts[a.employeeId] || 0) + 1;
    }
  }

  const topLateComers = Object.entries(lateCounts)
    .map(([empId, count]) => {
      const emp = employees.find(e => e.id === empId);
      const dept = emp ? departments.find(d => d.id === emp.departmentId) : null;
      return {
        employeeId: empId,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp ? emp.employeeCode : '',
        department: dept ? dept.name : 'Unknown',
        lateCount: count
      };
    })
    .sort((a, b) => b.lateCount - a.lateCount)
    .slice(0, 5);

  // Leave by type utilization
  const currentYear = new Date().getFullYear();
  const leaveByType = leaveTypes.map(lt => {
    const approvedCount = leaves
      .filter(l => l.leaveTypeId === lt.id && l.status === 'approved' && l.startDate.startsWith(`${currentYear}`) && empIds.has(l.employeeId))
      .reduce((sum, l) => sum + (l.daysCount || 0), 0);
    return {
      name: lt.name,
      code: lt.code,
      days: approvedCount
    };
  });

  // Overall Attendance Rate this month:
  // Formula: (present + late + missing_checkout + 0.5 * half_day) / (working-day records - on_leave)
  const totalMonthAttRecords = monthAttendance.length;
  const presentOrLate = monthAttendance.filter(a => ['present', 'late', 'missing_checkout'].includes(a.status)).length;
  const halfDays = monthAttendance.filter(a => a.status === 'half_day').length;
  const attendanceRate = totalMonthAttRecords > 0
    ? Number((((presentOrLate + 0.5 * halfDays) / totalMonthAttRecords) * 100).toFixed(1))
    : 100;

  return {
    kpis: {
      headcount: employees.length,
      presentToday,
      lateToday,
      onLeaveToday,
      pendingApprovals: pendingLeaves + pendingCorrections,
      attendanceRate
    },
    attendanceTrend: past7Days,
    topLateComers,
    leaveByType,
    pendingBreakdown: {
      leaves: pendingLeaves,
      corrections: pendingCorrections
    }
  };
};

export const getEmployeePersonalDashboard = (employeeId) => {
  const employee = db.get('employees').find(e => e.id === employeeId);
  if (!employee) throw new Error('Employee not found.');

  const today = new Date().toLocaleDateString('en-CA');
  const attendance = db.get('attendance').filter(a => a.employeeId === employeeId);
  const todayRecord = attendance.find(a => a.date === today) || null;

  // Calculate hours worked this week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay() || 7; // Sunday = 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek - 1));
  const mondayStr = monday.toLocaleDateString('en-CA');

  const thisWeekAttendance = attendance.filter(a => a.date >= mondayStr && a.date <= today);
  const hoursThisWeek = Number(thisWeekAttendance.reduce((sum, a) => sum + (a.workHours || 0), 0).toFixed(1));

  // Late count this month
  const currentMonth = today.substring(0, 7);
  const lateCountThisMonth = attendance.filter(a => a.date.startsWith(currentMonth) && a.status === 'late').length;

  // Leave balances
  const leaveTypes = db.get('leaveTypes');
  const leaves = db.get('leaveRequests').filter(l => l.employeeId === employeeId);
  const currentYear = new Date().getFullYear();

  const leaveBalances = leaveTypes.map(lt => {
    const used = leaves
      .filter(l => l.leaveTypeId === lt.id && l.status === 'approved' && l.startDate.startsWith(`${currentYear}`))
      .reduce((sum, l) => sum + (l.daysCount || 0), 0);
    return {
      name: lt.name,
      code: lt.code,
      yearlyQuota: lt.yearlyQuota,
      used,
      remaining: lt.code === 'unpaid' ? 'Unlimited' : Math.max(0, lt.yearlyQuota - used)
    };
  });

  // Last finalized payslip
  const payslips = db.get('payslips').filter(p => p.employeeId === employeeId);
  const lastPayslip = payslips.sort((a, b) => b.month.localeCompare(a.month))[0] || null;

  // Recent announcements
  const announcements = db.get('announcements').slice(0, 5);

  return {
    todayStatus: todayRecord ? todayRecord.status : 'not_checked_in',
    todayRecord,
    hoursThisWeek,
    weeklyTargetHours: 40,
    lateCountThisMonth,
    leaveBalances,
    lastPayslip: lastPayslip ? {
      month: lastPayslip.month,
      netSalary: lastPayslip.netSalary,
      grossSalary: lastPayslip.grossSalary,
      deductions: lastPayslip.totalDeductions,
      tax: lastPayslip.taxDeduction,
      id: lastPayslip.id
    } : null,
    announcements
  };
};
