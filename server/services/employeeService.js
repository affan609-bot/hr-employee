import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { logAudit } from './auditService.js';

export const getEmployees = ({ search = '', departmentId = '', status = '', page = 1, limit = 20 }) => {
  let employees = db.get('employees');
  const departments = db.get('departments');
  const designations = db.get('designations');

  if (departmentId) {
    employees = employees.filter(e => e.departmentId === departmentId);
  }

  if (status) {
    employees = employees.filter(e => e.status === status);
  }

  if (search) {
    const q = search.toLowerCase();
    employees = employees.filter(e =>
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q)
    );
  }

  const total = employees.length;
  const startIndex = (page - 1) * limit;
  const paginated = employees.slice(startIndex, startIndex + Number(limit));

  const enriched = paginated.map(e => {
    const dept = departments.find(d => d.id === e.departmentId);
    const desig = designations.find(d => d.id === e.designationId);
    return {
      ...e,
      departmentName: dept ? dept.name : 'Unknown',
      designationName: desig ? desig.name : 'Unknown'
    };
  });

  return {
    employees: enriched,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit)
  };
};

export const getEmployeeById = (id) => {
  const employees = db.get('employees');
  const employee = employees.find(e => e.id === id);
  if (!employee) return null;

  const departments = db.get('departments');
  const designations = db.get('designations');
  const dept = departments.find(d => d.id === employee.departmentId);
  const desig = designations.find(d => d.id === employee.designationId);

  return {
    ...employee,
    departmentName: dept ? dept.name : 'Unknown',
    designationName: desig ? desig.name : 'Unknown'
  };
};

export const getEmployee360 = (id) => {
  const employee = getEmployeeById(id);
  if (!employee) throw new Error('Employee not found.');

  const attendance = db.get('attendance').filter(a => a.employeeId === id);
  const leaves = db.get('leaveRequests').filter(l => l.employeeId === id);
  const payslips = db.get('payslips').filter(p => p.employeeId === id);
  const leaveTypes = db.get('leaveTypes');

  // Calculate leave balances
  const currentYear = new Date().getFullYear();
  const balances = leaveTypes.map(lt => {
    const used = leaves
      .filter(l => l.leaveTypeId === lt.id && l.status === 'approved' && l.startDate.startsWith(`${currentYear}`))
      .reduce((sum, l) => sum + (l.daysCount || 0), 0);
    return {
      id: lt.id,
      name: lt.name,
      code: lt.code,
      yearlyQuota: lt.yearlyQuota,
      used,
      remaining: Math.max(0, lt.yearlyQuota - used)
    };
  });

  return {
    employee,
    attendanceHistory: attendance.slice(-30), // last 30 records
    leaves: leaves.slice(-20),
    leaveBalances: balances,
    payslips: payslips.slice(-12)
  };
};

export const registerEmployee = async (data, actor, ip) => {
  const employees = db.get('employees');
  const users = db.get('users');
  const email = data.email.toLowerCase().trim();
  const employeeCode = data.employeeCode.toUpperCase().trim();

  if (employees.some(e => e.email === email)) {
    throw new Error(`Employee with email '${email}' already exists.`);
  }
  if (employees.some(e => e.employeeCode === employeeCode)) {
    throw new Error(`Employee code '${employeeCode}' is already in use.`);
  }

  const basicSalary = Number(data.basicSalary) || 0;
  const hra = Math.round(basicSalary * 0.40);
  const medical = Math.round(basicSalary * 0.10);
  const grossSalary = Math.round(basicSalary * 1.50);

  const employeeId = `emp_${uuidv4().substring(0, 8)}`;
  const newEmployee = {
    id: employeeId,
    employeeCode,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email,
    phone: data.phone ? data.phone.trim() : '',
    address: data.address ? data.address.trim() : '',
    gender: data.gender || 'unspecified',
    departmentId: data.departmentId,
    designationId: data.designationId || '',
    joiningDate: data.joiningDate || new Date().toLocaleDateString('en-CA'),
    exitDate: null,
    status: data.status || 'active', // 'active', 'probation', 'exited'
    basicSalary,
    hra,
    medical,
    grossSalary,
    bankDetails: {
      accountTitle: `${data.firstName} ${data.lastName}`,
      accountNumber: data.accountNumber || '',
      bankName: data.bankName || ''
    },
    createdAt: new Date().toISOString()
  };

  employees.push(newEmployee);
  db.set('employees', employees);

  // Automatically create user login with temporary password
  const tempPassword = data.temporaryPassword || 'TempPass123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(tempPassword, salt);

  const newUser = {
    id: `usr_${uuidv4().substring(0, 8)}`,
    name: `${newEmployee.firstName} ${newEmployee.lastName}`,
    email,
    passwordHash,
    role: 'employee',
    employeeId,
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
    action: 'REGISTER_EMPLOYEE',
    entity: 'employee',
    entityId: employeeId,
    afterState: { id: employeeId, code: employeeCode, email, grossSalary },
    ip
  });

  return {
    employee: newEmployee,
    temporaryPassword: tempPassword
  };
};

export const updateEmployee = (id, updates, actor, ip) => {
  const employees = db.get('employees');
  const index = employees.findIndex(e => e.id === id);
  if (index === -1) throw new Error('Employee not found.');

  const before = { ...employees[index] };

  // If role is employee, only phone and address can be updated
  if (actor.role === 'employee') {
    if (actor.employeeId !== id) {
      throw new Error('Unauthorized to edit another employee details.');
    }
    employees[index].phone = updates.phone !== undefined ? updates.phone : employees[index].phone;
    employees[index].address = updates.address !== undefined ? updates.address : employees[index].address;
  } else {
    // Admin / HR
    const allowed = [
      'firstName', 'lastName', 'phone', 'address', 'gender',
      'departmentId', 'designationId', 'joiningDate', 'exitDate', 'status'
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        employees[index][key] = updates[key];
      }
    }

    if (updates.basicSalary !== undefined) {
      const basic = Number(updates.basicSalary);
      employees[index].basicSalary = basic;
      employees[index].hra = Math.round(basic * 0.40);
      employees[index].medical = Math.round(basic * 0.10);
      employees[index].grossSalary = Math.round(basic * 1.50);
    }
  }

  db.set('employees', employees);

  logAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'UPDATE_EMPLOYEE',
    entity: 'employee',
    entityId: id,
    beforeState: before,
    afterState: employees[index],
    ip
  });

  return employees[index];
};

// CSV Import with Dry-Run Validation
// Checks: required fields, unique code/email, valid email format, known department, valid ISO date, salary > 0
export const validateAndImportCSV = async (rows, dryRun = true, actor, ip) => {
  const existingEmployees = db.get('employees');
  const departments = db.get('departments');
  const designations = db.get('designations');

  const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));
  const existingCodes = new Set(existingEmployees.map(e => e.employeeCode.toUpperCase()));

  const seenBatchEmails = new Set();
  const seenBatchCodes = new Set();

  const errors = [];
  const validRows = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Check required fields
    const required = ['employeeCode', 'firstName', 'lastName', 'email', 'department', 'basicSalary'];
    let rowHasError = false;

    for (const req of required) {
      if (!row[req] || String(row[req]).trim() === '') {
        errors.push({ row: rowNum, field: req, reason: `Missing required field '${req}'` });
        rowHasError = true;
      }
    }

    if (rowHasError) continue;

    const email = String(row.email).toLowerCase().trim();
    const code = String(row.employeeCode).toUpperCase().trim();

    // Check email format
    if (!emailRegex.test(email)) {
      errors.push({ row: rowNum, field: 'email', reason: `Invalid email format '${email}'` });
      rowHasError = true;
    }

    // Check unique email
    if (existingEmails.has(email) || seenBatchEmails.has(email)) {
      errors.push({ row: rowNum, field: 'email', reason: `Duplicate email '${email}'` });
      rowHasError = true;
    }

    // Check unique code
    if (existingCodes.has(code) || seenBatchCodes.has(code)) {
      errors.push({ row: rowNum, field: 'employeeCode', reason: `Duplicate employee code '${code}'` });
      rowHasError = true;
    }

    // Check department exists (by name or code or id)
    const dept = departments.find(d =>
      d.id === row.department ||
      d.name.toLowerCase() === String(row.department).toLowerCase().trim() ||
      d.code.toLowerCase() === String(row.department).toLowerCase().trim()
    );
    if (!dept) {
      errors.push({ row: rowNum, field: 'department', reason: `Unknown department '${row.department}'` });
      rowHasError = true;
    }

    // Check salary > 0
    const basicSalary = Number(row.basicSalary);
    if (isNaN(basicSalary) || basicSalary <= 0) {
      errors.push({ row: rowNum, field: 'basicSalary', reason: 'Basic salary must be a positive number greater than 0' });
      rowHasError = true;
    }

    // Check joining date if provided
    let joiningDate = row.joiningDate ? String(row.joiningDate).trim() : new Date().toLocaleDateString('en-CA');
    if (row.joiningDate && !isoDateRegex.test(joiningDate)) {
      errors.push({ row: rowNum, field: 'joiningDate', reason: `Invalid date format '${row.joiningDate}', expected YYYY-MM-DD` });
      rowHasError = true;
    }

    if (!rowHasError) {
      seenBatchEmails.add(email);
      seenBatchCodes.add(code);

      // Check designation if provided
      let desigId = '';
      if (row.designation && dept) {
        const desig = designations.find(d =>
          d.departmentId === dept.id &&
          d.name.toLowerCase() === String(row.designation).toLowerCase().trim()
        );
        if (desig) desigId = desig.id;
      }

      validRows.push({
        employeeCode: code,
        firstName: String(row.firstName).trim(),
        lastName: String(row.lastName).trim(),
        email,
        phone: row.phone ? String(row.phone).trim() : '',
        address: row.address ? String(row.address).trim() : '',
        gender: row.gender ? String(row.gender).toLowerCase().trim() : 'unspecified',
        departmentId: dept.id,
        designationId: desigId,
        joiningDate,
        basicSalary,
        status: row.status || 'active'
      });
    }
  }

  // If dryRun is true, do not insert, just report
  if (dryRun) {
    return {
      dryRun: true,
      totalRows: rows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      errors
    };
  }

  // If dryRun is false, only import valid rows
  const imported = [];
  for (const item of validRows) {
    const res = await registerEmployee(item, actor, ip);
    imported.push(res.employee);
  }

  return {
    dryRun: false,
    totalRows: rows.length,
    importedCount: imported.length,
    errorCount: errors.length,
    errors
  };
};

export const exportEmployeesCSV = () => {
  const employees = db.get('employees');
  const departments = db.get('departments');
  const designations = db.get('designations');

  const headers = [
    'employeeCode', 'firstName', 'lastName', 'email', 'phone',
    'department', 'designation', 'joiningDate', 'status', 'basicSalary', 'grossSalary'
  ];

  const lines = [headers.join(',')];

  for (const e of employees) {
    const dept = departments.find(d => d.id === e.departmentId);
    const desig = designations.find(d => d.id === e.designationId);
    const row = [
      e.employeeCode,
      `"${e.firstName}"`,
      `"${e.lastName}"`,
      e.email,
      `"${e.phone || ''}"`,
      `"${dept ? dept.name : ''}"`,
      `"${desig ? desig.name : ''}"`,
      e.joiningDate,
      e.status,
      e.basicSalary,
      e.grossSalary
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
};
