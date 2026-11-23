# HCM Lite — AI-Assisted Human Capital Management System

> **Saylani Hackathon — 24 October 2026, Zaitoon Ashraf IT Park**  
> Built for Admin, HR Managers, and Employees.

HCM Lite is a web-based Human Capital Management system built from scratch with zero pre-loaded dummy data. The system starts completely empty; Admin sets up the company profile, HR registers employees and manages operations, employees self-serve check-ins and leaves, and every single dashboard metric and AI insight is dynamically derived from real database transactions.

---

## 🚀 Quick Start (Run in under 2 minutes)

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Installation & Run

1. **Clone or Navigate to the Repository:**
   ```bash
   cd quickserve
   ```

2. **Install Root & Server Dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Configure Environment (Optional):**
   ```bash
   cp .env.example .env
   ```
   *(The AI Assistant has a built-in local tool-calling fallback engine, but you can optionally add `GEMINI_API_KEY` or `AI_API_KEY` into `server/.env`).*

4. **Launch Backend & Frontend Together:**
   ```bash
   npm start
   ```
   - **Frontend App:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 🧭 5-Minute Demo Script (Judging Walkthrough)

1. **First-Run Setup:**
   - Open [http://localhost:5173](http://localhost:5173). The app automatically recognizes that the database is fresh and displays the **First-Run Wizard**.
   - Enter Company Name (*e.g. Saylani Enterprise Solutions*), Admin Name, Admin Email (*admin@company.com*), and Master Password (*AdminPass123!*). Set the office coordinates and click **Initialize Company & Launch**.

2. **Organization Setup & HR Login:**
   - In **Org Structure & Rules** (`/admin/org-setup`), add departments (*Engineering*, *Human Resources*, *Sales*) and designations (*Senior Software Engineer*, *HR Specialist*).
   - In **User Management** (`/admin/users`), click **Create HR Login** (*hr@company.com / HRpass123!*).

3. **HR Registers Employees & CSV Import:**
   - Log out and log in as HR (*hr@company.com*).
   - Go to **Employee Operations** (`/employees`) and register two employees (*e.g. Ali Raza, basic Rs. 150,000; Usman Tariq, basic Rs. 90,000*). The system automatically creates their employee logins with temporary passwords.
   - Alternatively, click **Import CSV**, upload `sample_employees.csv`, test the **Dry-Run Validation**, and commit.

4. **Employee Self-Service (Check-In & Smart Leave):**
   - Log in as the newly registered employee (*ali.raza@company.com / TempPass123!*).
   - The security guard prompts to change the temporary password on first sign-in. Set a new password.
   - On the **Employee Dashboard**, click **Web Check-In** (stamps present/late depending on 09:15 cutoff) or open **Camera Check-In** (verifies face presence and GPS distance within the 150m office perimeter).
   - Open **My Leave** or the **AI Assistant** and type in plain words:  
     `"Need next Monday and Tuesday off for my sister's wedding"`
   - The AI parses the sentence, calculates working days (excluding weekends & holidays), pre-fills the form, and submits.

5. **HR Approves & Runs Payroll:**
   - Log back into HR. Open **Leave Approval Inbox** (`/leaves`) and approve the leave with a comment.
   - Open **Daily Attendance** (`/attendance/board`) to inspect check-in timestamps.
   - Open **Payroll Run** (`/payroll`), select the current month, and click **Create Draft**. The engine calculates Gross (1.5× basic), per-day rate, absence deductions, late penalties, and tax slabs.

6. **Admin Finalizes & Security Check:**
   - Switch to Admin (*admin@company.com*). In **Payroll & Finalize**, click **Finalize & Lock**.
   - Log back into Employee, go to **My Payslips**, and download the official **PDF Payslip**.
   - Open the **AI Assistant** as Employee and ask: `"What is Usman's salary?"`  
     **Result:** The assistant politely refuses to protect colleague privacy.
   - Switch to Admin to view the full **Security Audit Trail** (`/admin/audit-logs`) with before/after state diffs.

---

## 📊 Modules & 25 Functionalities Checklist

| Module | # | Functionality | Admin | HR | Employee |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **M1: Auth & Access** | 01 | First-run setup: company profile and Admin account | Manage | — | — |
| | 02 | Login, logout, change password; role-based menus & dashboards | Own | Own | Own |
| **M2: Org Setup** | 03 | Company settings: office hours, grace time, weekend, office lat/lng & radius | Manage | View | — |
| | 04 | Departments, designations, leave types & quotas, public holidays | Manage | View | — |
| | 05 | Create HR logins; deactivate or reset any login | Manage | — | — |
| **M3: Employees** | 06 | Register employee (creates login with temp password) & edit details | View | Manage | Own phone/address |
| | 07 | Employee directory with server search, filters; Employee 360 profile | All | All | Own (redacted) |
| | 08 | CSV import with dry-run error report; CSV export | — | Manage | — |
| **M4: Attendance** | 09 | Check in and check out on the web (server stamped) | — | Own | Own |
| | 10 | Attendance calendar and daily attendance board | All | All | Own |
| | 11 | Attendance correction: request and approve/reject | View | Approve | Request |
| **M5: Leave** | 12 | Apply for or cancel leave; see balance and history | — | Own | Own |
| | 13 | Approve or reject leave with review comment | View | Approve | — |
| **M6: Payroll Lite** | 14 | Salary structure per employee (Basic, HRA 40%, Medical 10%, Gross 1.5×) | View | Manage | — |
| | 15 | Monthly payroll: create and review draft with deductions & tax slabs | View | Manage | — |
| | 16 | Finalize payroll (locks the month) | Manage | — | — |
| | 17 | Payslips with PDF download | All | All | Own |
| **M7: Dashboards** | 18 | Dashboards, KPIs, trends and insight lists with date/dept filters | Company | HR | Personal |
| **M8: AI Assistant** | 19 | AI assistant chat answering from real database with role-scoping | All data | HR data | Own data |
| | 20 | AI dashboard summary (3–5 insight bullets using only KPI numbers) | Yes | Yes | — |
| | 21 | Smart leave: type a sentence, get a pre-filled leave form | — | Own | Own |
| | 22 | Policy Q&A on attendance, leave and payroll rules | Yes | Yes | Yes |
| **M9: Comms & Audit**| 23 | Announcements on all dashboards | Post | Post | Read |
| | 24 | In-app notifications (leave decisions, payslips, corrections) | Own | Own | Own |
| | 25 | Audit log of create, update, approve and finalize actions (immutable) | View | — | — |

---

## 🌟 Bonus Features Included (+10 Points)

1. **Camera Attendance with Face Detection & GPS Geofence:**
   - Live front-facing camera preview with real-time face detection (requires exactly 1 face in frame).
   - High-accuracy GPS geolocation check using the Haversine formula against office coordinates & radius (threshold: 150m radius, ≤ 100m accuracy).
2. **Late Penalty Rule (Configurable in Settings):**
   - Automatically deducts 0.5 day's gross salary for every 3 late arrivals during the monthly payroll run.
3. **Roman Urdu AI Understanding:**
   - Understands inquiries such as *"aaj kon chutti par hai?"*, *"meri kitni chuttiyan baqi hain?"*, or *"agle peer aur mangal ko chutti chahiye"*.
4. **Dark Mode & Responsive UI:**
   - Full dark mode support with instant toggle.
   - Responsive layouts optimized from 375px mobile screens up to 4K displays.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express, JWT, bcryptjs, PDFKit, Multer, csv-parser.
- **Frontend:** React 19, Tailwind CSS, Lucide React, Vite.
- **Database:** Persistent, zero-setup atomic JSON database (`server/data/hcm_data.json`) with ACID-like transactional writes. Zero external database configuration required.
- **AI Engine:** Google Gemini API integration with tool calling, paired with an intelligent local reasoning fallback engine that handles all 7 tools, policy rules, and smart leave parsing even offline.

---

## 📝 Demo Credentials Helper

If you have initialized the system with default values:
- **Admin:** `admin@company.com` / `AdminPass123!`
- **HR:** `hr@company.com` / `HRpass123!`
- **Employee:** Registered email / `TempPass123!` (or new personal password)
# hr-employee
# hr-employee
"# hr-employee" 
