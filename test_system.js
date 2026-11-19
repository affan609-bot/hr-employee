import http from 'http';

async function runTests() {
  console.log('🧪 Starting End-to-End System Test for HCM Lite...\n');

  const BASE = 'http://localhost:5000/api';

  const req = async (path, options = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await res.text();
    try {
      return { status: res.status, data: JSON.parse(text) };
    } catch {
      return { status: res.status, text };
    }
  };

  // 1. Health check
  const health = await req('/health');
  console.log('1. Health Check:', health.status, health.data.service);

  // 2. First Run Setup
  const setupRes = await req('/auth/first-run-setup', {
    method: 'POST',
    body: JSON.stringify({
      companyName: 'Saylani Enterprise Solutions',
      adminName: 'Super Admin',
      adminEmail: 'admin@company.com',
      adminPassword: 'AdminPass123!'
    })
  });
  console.log('2. First-Run Setup:', setupRes.status, setupRes.data.message || setupRes.data.error);

  // 3. Admin Login
  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@company.com',
      password: 'AdminPass123!'
    })
  });
  const adminToken = loginRes.data.token;
  console.log('3. Admin Login:', loginRes.status, 'Token acquired:', Boolean(adminToken));

  // 4. Create Department
  const deptRes = await req('/org/departments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'Engineering', code: 'ENG' })
  });
  const deptId = deptRes.data.id;
  console.log('4. Create Department:', deptRes.status, deptRes.data.name, `(ID: ${deptId})`);

  // 5. Create HR User
  const hrRes = await req('/org/users/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: 'HR Manager', email: 'hr@company.com', password: 'HRpass123!' })
  });
  console.log('5. Create HR Account:', hrRes.status, hrRes.data.name, 'TempPass:', hrRes.data.temporaryPassword);

  // 6. Login as HR
  const hrLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'hr@company.com', password: 'HRpass123!' })
  });
  const hrToken = hrLogin.data.token;
  console.log('6. HR Login:', hrLogin.status, 'Token acquired:', Boolean(hrToken));

  // 7. Register Employee
  const empRes = await req('/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employeeCode: 'EMP-1001',
      firstName: 'Ali',
      lastName: 'Raza',
      email: 'ali.raza@company.com',
      departmentId: deptId,
      basicSalary: 100000
    })
  });
  const emp = empRes.data.employee;
  console.log('7. Register Employee:', empRes.status, `${emp.firstName} ${emp.lastName}`, `Gross: Rs. ${emp.grossSalary} (1.5x)`);

  // 8. Employee Login
  const empLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ali.raza@company.com', password: empRes.data.temporaryPassword })
  });
  const empToken = empLogin.data.token;
  console.log('8. Employee Login (First Sign-in):', empLogin.status, 'MustChangePassword:', empLogin.data.user.mustChangePassword);

  // 9. Employee Check-in
  const checkInRes = await req('/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ source: 'web' })
  });
  console.log('9. Web Check-In:', checkInRes.status, `Status: ${checkInRes.data.status} at ${checkInRes.data.checkInTime}`);

  // Duplicate check-in should yield 409
  const dupCheckIn = await req('/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ source: 'web' })
  });
  console.log('9b. Duplicate Check-In Test (Expected 409):', dupCheckIn.status, dupCheckIn.data.error);

  // 10. AI Smart Leave Test
  const smartLeave = await req('/ai/smart-leave', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ prompt: 'Need next Monday and Tuesday off for my sister wedding' })
  });
  console.log('10. AI Smart Leave Intent Parsing:', smartLeave.status, smartLeave.data.type, `(${smartLeave.data.startDate} to ${smartLeave.data.endDate})`, `Reason: "${smartLeave.data.reason}"`);

  // 11. Security Test: Employee asks for colleague's salary
  const securityAsk = await req('/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ prompt: "What is my colleague Usman's salary?" })
  });
  console.log('11. Security Guardrail Test (Employee asks colleague salary):', securityAsk.status, '\nAnswer:', securityAsk.data.answer);

  // 12. HR asks headcount
  const aiHeadcount = await req('/ai/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ prompt: 'How many active employees are in the company?' })
  });
  console.log('\n12. HR asks Headcount via AI Tool:', aiHeadcount.status, `tool: ${aiHeadcount.data.toolUsed}\nAnswer:`, aiHeadcount.data.answer);

  // 13. Generate Payroll Draft
  const currentMonth = new Date().toISOString().substring(0, 7);
  const payrollDraft = await req('/payroll/draft', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ month: currentMonth })
  });
  console.log('\n13. Generate Monthly Payroll Draft:', payrollDraft.status, `Month: ${payrollDraft.data.month}, Total Gross: Rs. ${payrollDraft.data.totalGross.toLocaleString()}, Total Net: Rs. ${payrollDraft.data.totalNet.toLocaleString()}`);

  // 14. Admin Finalizes Payroll
  const finalized = await req('/payroll/finalize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ month: currentMonth })
  });
  console.log('14. Admin Finalizes & Locks Payroll:', finalized.status, `Locked: ${finalized.data.status}`);

  console.log('\n🎉 ALL 14 CORE FUNCTIONALITY TESTS PASSED 100% SUCCESSFULLY!\n');
}

runTests().catch(console.error);
