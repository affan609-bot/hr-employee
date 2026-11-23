import http from 'http';

async function runTests() {
  console.log('🧪 Starting End-to-End System Test (Vercel dev)...\n');

  const BASE = 'http://localhost:3000/api';

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

  const health = await req('/health');
  console.log('1. Health Check:', health.status, health.data?.service);

  const loginRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@company.com', password: 'AdminPass123!' })
  });
  const adminToken = loginRes.data.token;
  console.log('3. Admin Login:', loginRes.status, 'Token acquired:', Boolean(adminToken));

  const deptList = await req('/org/departments', { headers: { Authorization: `Bearer ${adminToken}` } });
  const deptId = deptList.data?.[0]?.id;
  console.log('4. Dept:', deptId);

  const hrLogin = await req('/auth/login', { method:'POST', body: JSON.stringify({ email:'hr@company.com', password:'HRpass123!' }) });
  const hrToken = hrLogin.data.token;
  console.log('6. HR Login:', hrLogin.status, Boolean(hrToken));

  const empList = await req('/employees', { headers: { Authorization: `Bearer ${hrToken}` } });
  console.log('7. Emps:', empList.data?.employees?.length);

  // employee login
  const usersRes = await req('/org/users', { headers: { Authorization: `Bearer ${adminToken}` } });
  const empUser = usersRes.data?.find(u => u.email === 'ali.raza@company.com');
  if (empUser) {
    await req(`/org/users/${empUser.id}/reset-password`, { method:'POST', headers:{Authorization:`Bearer ${adminToken}`}, body: JSON.stringify({ newPassword:'ResetPass123!' }) });
  }
  const empLogin = await req('/auth/login', { method:'POST', body: JSON.stringify({ email:'ali.raza@company.com', password:'ResetPass123!' }) });
  const empToken = empLogin.data?.token;
  console.log('8. Emp Login:', empLogin.status, Boolean(empToken));

  const checkInRes = await req('/attendance/check-in', { method:'POST', headers:{Authorization:`Bearer ${empToken}`}, body: JSON.stringify({ source:'web' }) });
  console.log('9. CheckIn:', checkInRes.status, checkInRes.data?.status || checkInRes.data?.error);

  const smartLeave = await req('/ai/smart-leave', { method:'POST', headers:{Authorization:`Bearer ${empToken}`}, body: JSON.stringify({ prompt:'Need next Monday and Tuesday off for my sister wedding' }) });
  console.log('10. SmartLeave:', smartLeave.status, smartLeave.data?.type);

  const pdfRes = await fetch('http://localhost:3000/api/payroll/payslips/'+ (await (await fetch('http://localhost:3000/api/payroll/my-payslips',{headers:{Authorization:'Bearer '+empToken}})).json())[0]?.id +'/pdf', { headers:{Authorization:'Bearer '+empToken}});
  console.log('PDF status:', pdfRes.status, pdfRes.headers.get('content-type'));

  const currentMonth = new Date().toISOString().substring(0,7);
  const payrollDraft = await req('/payroll/draft', { method:'POST', headers:{Authorization:`Bearer ${hrToken}`}, body: JSON.stringify({ month: currentMonth }) });
  console.log('13. PayrollDraft:', payrollDraft.status, payrollDraft.data?.month);

  console.log('\nDONE');
}

runTests().catch(console.error);
