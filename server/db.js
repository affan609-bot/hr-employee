import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'hcm_data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
  company: {
    isSetup: false,
    name: '',
    officeStartTime: '09:00',
    graceMinutes: 15,
    halfDayHours: 5,
    weekendDays: [0, 6], // 0 = Sunday, 6 = Saturday
    officeLocation: {
      lat: 24.8607,
      lng: 67.0011,
      radius: 150, // meters
      address: 'Zaitoon Ashraf IT Park, Karachi'
    },
    latePenaltyRule: true, // 3 lates = 0.5 day deduction
    fiscalYearStartMonth: 1
  },
  users: [],
  departments: [],
  designations: [],
  leaveTypes: [
    { id: 'lt_annual', name: 'Annual Leave', code: 'annual', yearlyQuota: 14, isPaid: true },
    { id: 'lt_sick', name: 'Sick Leave', code: 'sick', yearlyQuota: 8, isPaid: true },
    { id: 'lt_casual', name: 'Casual Leave', code: 'casual', yearlyQuota: 10, isPaid: true },
    { id: 'lt_unpaid', name: 'Unpaid Leave', code: 'unpaid', yearlyQuota: 999, isPaid: false }
  ],
  holidays: [],
  employees: [],
  attendance: [],
  attendanceCorrections: [],
  leaveRequests: [],
  payrollRuns: [],
  payslips: [],
  announcements: [],
  notifications: [],
  auditLogs: [],
  aiLogs: []
};

class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return { ...defaultData, ...parsed };
      }
    } catch (err) {
      console.error('Error loading DB file, initializing fresh:', err);
    }
    this.save(defaultData);
    return JSON.parse(JSON.stringify(defaultData));
  }

  save(data = this.data) {
    try {
      const json = JSON.stringify(data, null, 2);
      // Write directly (atomic rename can fail on Windows due to file locks)
      fs.writeFileSync(DB_FILE, json, 'utf-8');
      // Clean up any leftover temp file
      const tempFile = `${DB_FILE}.tmp`;
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
    } catch (err) {
      console.error('Error saving DB file:', err);
    }
  }

  get(collection) {
    return this.data[collection] || [];
  }

  set(collection, items) {
    this.data[collection] = items;
    this.save();
    return items;
  }

  getCompany() {
    return this.data.company;
  }

  updateCompany(updates) {
    this.data.company = { ...this.data.company, ...updates };
    this.save();
    return this.data.company;
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(defaultData));
    this.save();
    return this.data;
  }
}

export const db = new Database();
export default db;
