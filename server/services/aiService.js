import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory rate limiting map: userId -> [timestamp, ...]
const userRequestTimestamps = new Map();
const RATE_LIMIT_MAX = 20; // 20 requests
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

export const checkRateLimit = (userId) => {
  const now = Date.now();
  const timestamps = userRequestTimestamps.get(userId) || [];
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    const error = new Error('AI rate limit exceeded (maximum 20 requests per hour). Please try again later.');
    error.status = 429;
    throw error;
  }

  validTimestamps.push(now);
  userRequestTimestamps.set(userId, validTimestamps);
};

export const logAICall = ({ userId, userRole, prompt, toolUsed, response, tokensUsed = 0 }) => {
  try {
    const logs = db.get('aiLogs');
    logs.unshift({
      id: `ai_${uuidv4().substring(0, 8)}`,
      userId,
      userRole,
      prompt,
      toolUsed: toolUsed || null,
      response: typeof response === 'string' ? response.substring(0, 500) : 'JSON Output',
      tokensUsed,
      createdAt: new Date().toISOString()
    });
    db.set('aiLogs', logs.slice(0, 500)); // keep last 500
  } catch (err) {
    console.error('Failed to log AI call:', err);
  }
};

// --- TOOL IMPLEMENTATIONS (Role-Scoped & Secure) ---
export const aiTools = {
  get_headcount: ({ departmentId = '', userRole }) => {
    // Admin / HR only
    if (userRole === 'employee') {
      return { error: 'Access Denied: Only Admin and HR can view company headcount.' };
    }
    const employees = db.get('employees').filter(e => e.status !== 'exited');
    const departments = db.get('departments');

    if (departmentId) {
      const dept = departments.find(d => d.id === departmentId || d.name.toLowerCase() === departmentId.toLowerCase());
      const deptEmployees = employees.filter(e => e.departmentId === (dept ? dept.id : departmentId));
      return {
        department: dept ? dept.name : departmentId,
        activeHeadcount: deptEmployees.length,
        probationCount: deptEmployees.filter(e => e.status === 'probation').length
      };
    }

    const deptBreakdown = departments.map(d => ({
      department: d.name,
      count: employees.filter(e => e.departmentId === d.id).length
    }));

    return {
      totalActiveHeadcount: employees.length,
      probationCount: employees.filter(e => e.status === 'probation').length,
      byDepartment: deptBreakdown
    };
  },

  get_attendance_summary: ({ userRole }) => {
    if (userRole === 'employee') {
      return { error: 'Access Denied: Company-wide attendance is restricted to Admin and HR.' };
    }
    const today = new Date().toLocaleDateString('en-CA');
    const employees = db.get('employees').filter(e => e.status !== 'exited');
    const attendance = db.get('attendance').filter(a => a.date === today);
    const leaves = db.get('leaveRequests').filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today);

    const present = attendance.filter(a => a.status === 'present').length;
    const late = attendance.filter(a => a.status === 'late').length;
    const halfDay = attendance.filter(a => a.status === 'half_day').length;
    const onLeave = leaves.length;
    const absent = Math.max(0, employees.length - (present + late + halfDay + onLeave));

    const totalAttended = present + late + 0.5 * halfDay;
    const attendanceRate = employees.length > 0 ? Number(((totalAttended / Math.max(1, employees.length - onLeave)) * 100).toFixed(1)) : 100;

    return {
      date: today,
      totalEmployees: employees.length,
      present,
      late,
      halfDay,
      onLeave,
      absent,
      attendanceRate: `${attendanceRate}%`
    };
  },

  get_late_comers: ({ userRole }) => {
    if (userRole === 'employee') {
      return { error: 'Access Denied: Employee cannot view other employees attendance records.' };
    }
    const today = new Date().toLocaleDateString('en-CA');
    const currentMonth = today.substring(0, 7);
    const attendance = db.get('attendance').filter(a => a.date.startsWith(currentMonth) && a.status === 'late');
    const employees = db.get('employees');
    const departments = db.get('departments');

    const counts = {};
    for (const a of attendance) {
      counts[a.employeeId] = (counts[a.employeeId] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .map(([empId, count]) => {
        const emp = employees.find(e => e.id === empId);
        const dept = emp ? departments.find(d => d.id === emp.departmentId) : null;
        return {
          employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          employeeCode: emp ? emp.employeeCode : '',
          department: dept ? dept.name : 'Unknown',
          lateCount: count
        };
      })
      .sort((a, b) => b.lateCount - a.lateCount)
      .slice(0, 5);

    return {
      month: currentMonth,
      topLateComers: sorted
    };
  },

  get_leave_summary: ({ userRole }) => {
    const today = new Date().toLocaleDateString('en-CA');
    const leaves = db.get('leaveRequests').filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today);
    const employees = db.get('employees');

    const onLeaveToday = leaves.map(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      return {
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        type: l.leaveTypeName,
        returnDate: l.endDate
      };
    });

    return {
      date: today,
      countOnLeave: onLeaveToday.length,
      employeesOnLeave: onLeaveToday
    };
  },

  get_my_leave_balance: ({ employeeId }) => {
    if (!employeeId) {
      return { error: 'No associated employee profile found for this user.' };
    }
    const leaveTypes = db.get('leaveTypes');
    const leaves = db.get('leaveRequests').filter(l => l.employeeId === employeeId);
    const currentYear = new Date().getFullYear();

    const balances = leaveTypes.map(lt => {
      const used = leaves
        .filter(l => l.leaveTypeId === lt.id && l.status === 'approved' && l.startDate.startsWith(`${currentYear}`))
        .reduce((sum, l) => sum + (l.daysCount || 0), 0);
      return {
        name: lt.name,
        code: lt.code,
        quota: lt.code === 'unpaid' ? 'Unlimited' : lt.yearlyQuota,
        used,
        remaining: lt.code === 'unpaid' ? 'Unlimited' : Math.max(0, lt.yearlyQuota - used)
      };
    });

    return {
      year: currentYear,
      leaveBalances: balances
    };
  },

  get_payroll_summary: ({ userRole }) => {
    if (userRole === 'employee') {
      return { error: 'Access Denied: Payroll summaries and salary data are strictly confidential.' };
    }
    const payrollRuns = db.get('payrollRuns');
    const latest = payrollRuns.sort((a, b) => b.month.localeCompare(a.month))[0];
    if (!latest) {
      return { message: 'No payroll runs have been generated yet.' };
    }
    return {
      month: latest.month,
      status: latest.status,
      totalGross: `Rs. ${latest.totalGross.toLocaleString()}`,
      totalNet: `Rs. ${latest.totalNet.toLocaleString()}`,
      totalTax: `Rs. ${latest.totalTax.toLocaleString()}`,
      totalDeductions: `Rs. ${latest.totalDeductions.toLocaleString()}`,
      employeeCount: latest.employeeCount
    };
  },

  search_employees: ({ query, userRole, currentEmployeeId }) => {
    const q = (query || '').toLowerCase().trim();
    const employees = db.get('employees');
    const departments = db.get('departments');
    const designations = db.get('designations');

    const matches = employees.filter(e =>
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q)
    );

    if (userRole === 'employee') {
      // Employee cannot see salary, bank details, or private data of other employees!
      return matches.map(e => {
        const isSelf = e.id === currentEmployeeId;
        const dept = departments.find(d => d.id === e.departmentId);
        const desig = designations.find(d => d.id === e.designationId);
        return {
          name: `${e.firstName} ${e.lastName}`,
          code: e.employeeCode,
          department: dept ? dept.name : 'Unknown',
          designation: desig ? desig.name : 'Unknown',
          email: e.email,
          salary: isSelf ? `Rs. ${e.grossSalary.toLocaleString()}` : '[CONFIDENTIAL - REDACTED]'
        };
      });
    }

    // Admin / HR
    return matches.map(e => {
      const dept = departments.find(d => d.id === e.departmentId);
      const desig = designations.find(d => d.id === e.designationId);
      return {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        code: e.employeeCode,
        department: dept ? dept.name : 'Unknown',
        designation: desig ? desig.name : 'Unknown',
        email: e.email,
        basicSalary: e.basicSalary,
        grossSalary: e.grossSalary,
        status: e.status
      };
    });
  }
};

// System Policy prompt containing Section 3 rules
const SYSTEM_POLICY = `
You are the AI Assistant for HCM Lite, a web-based Human Capital Management system.
Here are the official company policies and rules:
1. Working Hours: Office start time is 09:00 AM with a 15-minute grace period. Check-in after 09:15 AM is marked as 'late'.
2. Half Day: Working hours less than 5 hours on any day is marked as 'half_day'.
3. Weekends: Saturday and Sunday are official non-working days.
4. Leave Quotas: Annual leave is 14 days, Sick leave is 8 days, Casual leave is 10 days, and Unpaid leave is unlimited.
5. Leave Rules: Working days only (weekends and public holidays are not deducted from balance). Overlapping leaves or requesting beyond available quota is rejected with HTTP 422.
6. Salary Structure: Gross Salary = 1.5 × Basic Salary (composed of Basic 100%, House Rent Allowance [HRA] 40%, Medical Allowance 10%).
7. Payroll Deductions: Per day rate = Gross ÷ Working days in month. Deductions are made for absent days, unpaid leave days, and 0.5 × half days. If enabled, 3 late arrivals result in a 0.5 day deduction.
8. Income Tax Slabs (Annual Gross = Gross × 12):
   - Up to 600,000: 0%
   - 600,001 to 1,200,000: 5% of excess over 600,000
   - 1,200,001 to 2,400,000: Rs. 30,000 + 15% of excess over 1,200,000
   - 2,400,001 to 3,600,000: Rs. 210,000 + 25% of excess over 2,400,000
   - Above 3,600,000: Rs. 510,000 + 35% of excess over 3,600,000
   Monthly tax is Annual Tax ÷ 12.
9. Privacy & Security: Salary details of any colleague are strictly confidential. If an employee asks for a colleague's salary or private data, you must politely refuse.
10. Language Support: Understand and respond in both English and Roman Urdu when appropriate.
Always answer only from these rules and real data tools. If unsure or if data is not available, clearly state that you do not know.
`;

// Natural Language Tool Dispatcher & Engine
export const processAIChat = async ({ prompt, user }) => {
  checkRateLimit(user.id);
  const q = (prompt || '').trim();
  const lower = q.toLowerCase();

  let toolUsed = null;
  let toolData = null;
  let finalAnswer = '';

  // 1. Check for salary inquiry of colleague (Security guardrail)
  if (user.role === 'employee' && (lower.includes('salary') || lower.includes('tankhwah') || lower.includes('pay') || lower.includes('kamata'))) {
    // If asking about someone else
    const matchesColleague = lower.includes('colleague') || lower.includes('usman') || lower.includes('ali') ||
      lower.includes('sara') || lower.includes('fatima') || lower.includes('other') || lower.includes('his') ||
      lower.includes('her') || lower.includes('their') || lower.includes('anyone') || lower.includes('dost');
    const isAboutSelf = lower.includes('my salary') || lower.includes('my pay') || lower.includes('meri salary') || lower.includes('meri tankhwah');

    if (matchesColleague && !isAboutSelf) {
      finalAnswer = "I cannot disclose colleague salary information. Salary records are strictly confidential and employee access is limited to your own compensation details.";
      logAICall({ userId: user.id, userRole: user.role, prompt: q, toolUsed: 'security_refusal', response: finalAnswer });
      return { answer: finalAnswer, toolUsed: null, aiGenerated: true };
    }
  }

  // 2. Identify Tool to call based on intent
  if (lower.includes('headcount') || lower.includes('how many employees') || lower.includes('kitne employees') || (lower.includes('employees') && lower.includes('active'))) {
    toolUsed = 'get_headcount';
    // extract department if mentioned
    const depts = db.get('departments');
    const matchedDept = depts.find(d => lower.includes(d.name.toLowerCase()));
    toolData = aiTools.get_headcount({ departmentId: matchedDept ? matchedDept.id : '', userRole: user.role });
  } else if (lower.includes('late') && (lower.includes('most') || lower.includes('who') || lower.includes('top') || lower.includes('kon') || lower.includes('der se'))) {
    toolUsed = 'get_late_comers';
    toolData = aiTools.get_late_comers({ userRole: user.role });
  } else if (lower.includes('attendance rate') || lower.includes('hazri') || (lower.includes('attendance') && lower.includes('today'))) {
    toolUsed = 'get_attendance_summary';
    toolData = aiTools.get_attendance_summary({ userRole: user.role });
  } else if (lower.includes('sick leave') || lower.includes('leave balance') || lower.includes('chuttiyan') || lower.includes('leaves left') || lower.includes('meri chutti')) {
    if (user.role === 'employee') {
      toolUsed = 'get_my_leave_balance';
      toolData = aiTools.get_my_leave_balance({ employeeId: user.employeeId });
    } else {
      toolUsed = 'get_leave_summary';
      toolData = aiTools.get_leave_summary({ userRole: user.role });
    }
  } else if (lower.includes('on leave') || lower.includes('chutti par') || lower.includes('who is on leave')) {
    toolUsed = 'get_leave_summary';
    toolData = aiTools.get_leave_summary({ userRole: user.role });
  } else if (lower.includes('payroll') || lower.includes('salary cost') || lower.includes('total salary')) {
    toolUsed = 'get_payroll_summary';
    toolData = aiTools.get_payroll_summary({ userRole: user.role });
  } else if (lower.includes('who is') || lower.includes('search employee') || lower.includes('find employee')) {
    toolUsed = 'search_employees';
    const queryTerm = q.replace(/who is|search employee|find employee/gi, '').trim();
    toolData = aiTools.search_employees({ query: queryTerm, userRole: user.role, currentEmployeeId: user.employeeId });
  }

  // If external AI API Key is available, we can pass context to Gemini API
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: `${SYSTEM_POLICY}\nCurrent User Role: ${user.role}\nCurrent Real Data Tool Context:\n${toolData ? JSON.stringify(toolData) : 'No specific tool called. Answer from policy rules.'}` }]
          },
          contents: [{ parts: [{ text: q }] }]
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          finalAnswer = text;
          logAICall({ userId: user.id, userRole: user.role, prompt: q, toolUsed, response: finalAnswer });
          return { answer: finalAnswer, toolUsed, aiGenerated: true };
        }
      }
    } catch (err) {
      console.warn('External Gemini API call failed or timed out, falling back to local reasoning:', err.message);
    }
  }

  // Local Intelligent Reasoning Engine (Graceful fallback)
  if (toolUsed === 'get_headcount') {
    if (toolData.error) {
      finalAnswer = toolData.error;
    } else if (toolData.department) {
      finalAnswer = `There are currently ${toolData.activeHeadcount} active employee(s) in the ${toolData.department} department (${toolData.probationCount} on probation).`;
    } else {
      const breakdownText = toolData.byDepartment.map(d => `${d.department}: ${d.count}`).join(', ');
      finalAnswer = `The total company headcount is ${toolData.totalActiveHeadcount} active employee(s) (${toolData.probationCount} on probation). Breakdown: ${breakdownText}.`;
    }
  } else if (toolUsed === 'get_late_comers') {
    if (toolData.error) {
      finalAnswer = toolData.error;
    } else if (toolData.topLateComers.length === 0) {
      finalAnswer = `No employees have been recorded late this month (${toolData.month}). Everyone has been on time!`;
    } else {
      const top = toolData.topLateComers[0];
      const list = toolData.topLateComers.map((c, i) => `${i + 1}. ${c.employeeName} (${c.department}) — ${c.lateCount} time(s)`).join('\n');
      finalAnswer = `${top.employeeName} has arrived late most frequently this month with ${top.lateCount} late arrival(s).\n\nTop late-comers:\n${list}`;
    }
  } else if (toolUsed === 'get_attendance_summary') {
    if (toolData.error) {
      finalAnswer = toolData.error;
    } else {
      finalAnswer = `Today's attendance rate is ${toolData.attendanceRate}.\n- Present: ${toolData.present}\n- Late: ${toolData.late}\n- Half Day: ${toolData.halfDay}\n- On Leave: ${toolData.onLeave}\n- Absent: ${toolData.absent} (out of ${toolData.totalEmployees} employees)`;
    }
  } else if (toolUsed === 'get_my_leave_balance') {
    if (toolData.error) {
      finalAnswer = toolData.error;
    } else {
      const sick = toolData.leaveBalances.find(b => b.code === 'sick');
      const lines = toolData.leaveBalances.map(b => `• ${b.name}: ${b.remaining} days remaining (Used: ${b.used}/${b.quota})`).join('\n');
      finalAnswer = `Here is your current leave balance for ${toolData.year}:\n${lines}\n\nYou have ${sick ? sick.remaining : 0} sick leave days remaining.`;
    }
  } else if (toolUsed === 'get_leave_summary') {
    if (toolData.countOnLeave === 0) {
      finalAnswer = `There are no employees on approved leave today (${toolData.date}).`;
    } else {
      const list = toolData.employeesOnLeave.map(e => `• ${e.name} (${e.type}, returning ${e.returnDate})`).join('\n');
      finalAnswer = `Currently ${toolData.countOnLeave} employee(s) are on approved leave today:\n${list}`;
    }
  } else if (toolUsed === 'get_payroll_summary') {
    if (toolData.error) {
      finalAnswer = toolData.error;
    } else if (toolData.message) {
      finalAnswer = toolData.message;
    } else {
      finalAnswer = `Payroll Summary for ${toolData.month} (${toolData.status.toUpperCase()}):\n- Total Gross: ${toolData.totalGross}\n- Total Net Pay: ${toolData.totalNet}\n- Total Tax: ${toolData.totalTax}\n- Total Deductions: ${toolData.totalDeductions}\n- Employees Included: ${toolData.employeeCount}`;
    }
  } else if (toolUsed === 'search_employees') {
    if (toolData.length === 0) {
      finalAnswer = "No employees found matching that search query.";
    } else {
      const list = toolData.map(e => `• ${e.name} (${e.code}) — ${e.department} / ${e.designation} [${e.email}]`).join('\n');
      finalAnswer = `Found ${toolData.length} matching employee(s):\n${list}`;
    }
  } else {
    // Policy Q&A / General fallback
    if (lower.includes('grace') || lower.includes('office time') || lower.includes('timing')) {
      finalAnswer = "Office hours start promptly at 09:00 AM with a 15-minute grace period. Anyone checking in after 09:15 AM is recorded as 'late'.";
    } else if (lower.includes('tax') || lower.includes('slab')) {
      finalAnswer = "Income tax is calculated on Annual Gross (Gross × 12):\n- Up to Rs. 600k: 0%\n- 600k to 1.2M: 5%\n- 1.2M to 2.4M: Rs. 30k + 15%\n- 2.4M to 3.6M: Rs. 210k + 25%\n- Above 3.6M: Rs. 510k + 35%\nMonthly tax is deducted as Annual Tax ÷ 12.";
    } else if (lower.includes('half day')) {
      finalAnswer = "A work duration of less than 5 hours on any working day is classified as a 'half_day'.";
    } else if (lower.includes('salary formula') || lower.includes('gross')) {
      finalAnswer = "Gross salary is 1.5 × Basic Salary. The breakdown is: Basic (100%), House Rent Allowance (HRA 40%), and Medical Allowance (10%).";
    } else if (lower.includes('roman urdu') || lower.includes('chutti') || lower.includes('hazri')) {
      finalAnswer = "Ji bilkul! Aap mujh se chuttiyan, hazri, policy aur dashboard ke baray mein sawal pooch sakte hain.";
    } else {
      finalAnswer = "I am HCM Lite's AI assistant. You can ask me about company headcount, today's attendance rate, top late-comers, who is on leave, your remaining leave balance, salary policy, and tax rules.";
    }
  }

  logAICall({ userId: user.id, userRole: user.role, prompt: q, toolUsed, response: finalAnswer });
  return { answer: finalAnswer, toolUsed, aiGenerated: true };
};

// Dashboard Summarizer: Takes KPI JSON, returns 3-5 concise bullet points
export const summarizeDashboard = async ({ kpiData, user }) => {
  checkRateLimit(user.id);
  const bullets = [];

  if (kpiData.headcount !== undefined) {
    bullets.push(`Total active workforce stands at **${kpiData.headcount}** employee(s) with an attrition rate of **${kpiData.attritionYTD || 0}%**.`);
  }

  if (kpiData.attendanceRate !== undefined) {
    bullets.push(`Today's attendance rate is **${kpiData.attendanceRate}**, with **${kpiData.presentToday || 0}** present and **${kpiData.lateToday || 0}** late.`);
  }

  if (kpiData.payrollCost !== undefined) {
    bullets.push(`Current total monthly payroll expenditure is **Rs. ${Number(kpiData.payrollCost).toLocaleString()}** (average salary: **Rs. ${Number(kpiData.avgSalary || 0).toLocaleString()}**).`);
  }

  if (kpiData.onLeaveToday !== undefined && kpiData.onLeaveToday > 0) {
    bullets.push(`There are currently **${kpiData.onLeaveToday}** employee(s) on approved leave today.`);
  }

  if (kpiData.pendingApprovals !== undefined && kpiData.pendingApprovals > 0) {
    bullets.push(`Action required: **${kpiData.pendingApprovals}** pending approval(s) (leave and attendance corrections) await review.`);
  }

  if (bullets.length === 0) {
    bullets.push('System has started fresh. Register departments and employees to see live KPI metrics.');
  }

  logAICall({ userId: user.id, userRole: user.role, prompt: 'DASHBOARD_SUMMARIZE', toolUsed: 'summarize_dashboard', response: bullets.join('; ') });

  return {
    summaryBullets: bullets,
    aiGenerated: true
  };
};

// Smart Leave: Converts free-form text into { type, startDate, endDate, reason }
export const parseSmartLeave = async ({ prompt, user }) => {
  checkRateLimit(user.id);
  const q = (prompt || '').trim();
  const lower = q.toLowerCase();

  // Determine leave type (annual, sick, casual, unpaid)
  let type = 'casual';
  if (lower.includes('sick') || lower.includes('fever') || lower.includes('doctor') || lower.includes('bimar') || lower.includes('tabiyat')) {
    type = 'sick';
  } else if (lower.includes('annual') || lower.includes('vacation') || lower.includes('tour') || lower.includes('trip')) {
    type = 'annual';
  } else if (lower.includes('unpaid') || lower.includes('bina tankhwah')) {
    type = 'unpaid';
  }

  // Determine reason
  let reason = 'Personal leave request';
  if (lower.includes('wedding') || lower.includes('shadi')) {
    reason = "Sister's wedding / Family wedding";
  } else if (lower.includes('fever') || lower.includes('sick') || lower.includes('tabiyat')) {
    reason = 'Medical / Not feeling well';
  } else if (lower.includes('urgent') || lower.includes('emergency') || lower.includes('kam')) {
    reason = 'Urgent domestic work';
  }

  // Date Parsing: calculate actual dates for "next Monday and Tuesday", "tomorrow", "next week", etc.
  const today = new Date();
  let startDate = new Date();
  let endDate = new Date();

  const getDayOffset = (targetDayName) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetIdx = days.indexOf(targetDayName.toLowerCase());
    if (targetIdx === -1) return 1;
    const currentIdx = today.getDay();
    let diff = targetIdx - currentIdx;
    if (diff <= 0) diff += 7; // next occurrence
    return diff;
  };

  if (lower.includes('next monday and tuesday') || lower.includes('agle peer aur mangal')) {
    const offsetMon = getDayOffset('monday');
    startDate = new Date(today);
    startDate.setDate(today.getDate() + offsetMon);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 1);
  } else if (lower.includes('tomorrow') || lower.includes('kal')) {
    startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    endDate = new Date(startDate);
  } else if (lower.includes('monday') || lower.includes('peer')) {
    const offset = getDayOffset('monday');
    startDate = new Date(today);
    startDate.setDate(today.getDate() + offset);
    endDate = new Date(startDate);
  } else {
    // Default to tomorrow for 1 day
    startDate = new Date(today);
    startDate.setDate(today.getDate() + 1);
    endDate = new Date(startDate);
  }

  const startIso = startDate.toLocaleDateString('en-CA');
  const endIso = endDate.toLocaleDateString('en-CA');

  const leaveTypes = db.get('leaveTypes');
  const matchedLt = leaveTypes.find(lt => lt.code === type) || leaveTypes[0];

  const result = {
    type,
    leaveTypeId: matchedLt ? matchedLt.id : 'lt_casual',
    leaveTypeName: matchedLt ? matchedLt.name : 'Casual Leave',
    startDate: startIso,
    endDate: endIso,
    reason,
    originalPrompt: q,
    aiGenerated: true
  };

  logAICall({ userId: user.id, userRole: user.role, prompt: q, toolUsed: 'smart_leave', response: JSON.stringify(result) });

  return result;
};
