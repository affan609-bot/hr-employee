# ⚡ QuickServe: AI-Assisted Workforce Management

> **A product by Affanverse.**
> Smart HR, attendance, leave and payroll for Admins, HR Managers and Employees, with an AI assistant built in.

QuickServe is a web-based workforce management system built from scratch with zero pre-loaded dummy data. The system starts completely empty. The Admin sets up the company profile, HR registers employees and manages operations, employees self-serve check-ins and leaves, and every dashboard metric and AI insight is derived from real database transactions.

---

## 🚀 Quick Start (Run in under 2 minutes)

### Prerequisites
- Node.js (v18+ or v20+)
- npm (v9+)

### Installation & Run

1. **Navigate to the repository:**
   ```bash
   cd quickserve
   ```

2. **Install root and server dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   ```
   *(The AI Assistant has a built-in local tool-calling fallback engine. You can optionally add `GEMINI_API_KEY` or `AI_API_KEY` to `server/.env`.)*

4. **Launch backend and frontend together:**
   ```bash
   npm start
   ```
   - **Frontend app:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 🧭 5-Minute Product Walkthrough

1. **First-run setup:**
   - Open [http://localhost:5173](http://localhost:5173). The app detects a fresh database and shows the **First-Run Wizard**.
   - Enter the company name (*e.g. Affanverse Solutions*), Admin name, Admin email (*admin@company.com*) and a master password (*AdminPass123!*). Set the office coordinates and click **Initialize Company & Launch**.

2. **Organization setup and HR login:**
   - In **Org Structure & Rules** (`/admin/org-setup`), add departments (*Engineering*, *Human Resources*, *Sales*) and designations (*Senior Software Engineer*, *HR Specialist*).
   - In **User Management** (`/admin/users`), click **Create HR Login** (*hr@company.com / HRpass123!*).

3. **HR registers employees and imports CSV:**
   - Log out and log in as HR (*hr@company.com*).
   - Go to **Employee Operations** (`/employees`) and register two employees (*e.g. Ali Raza, basic Rs. 150,000; Usman Tariq, basic Rs. 90,000*). The system automatically creates their logins with temporary passwords.
   - Alternatively, click **Import CSV**, upload `sample_employees.csv`, run the **Dry-Run Validation** and commit.

4. **Employee self-service (check-in and smart leave):**
   - Log in as the new employee (*ali.raza@company.com / TempPass123!*).
   - On first sign-in, the app asks for a new password. Set one.
   - On the **Employee Dashboard**, click **Web Check-In** (marks present or late depending on the 09:15 cutoff), or open **Camera Check-In** (verifies face presence and GPS distance within the 150 m office perimeter).
   - Open **My Leave** or the **AI Assistant** and type in plain words:
     `"Need next Monday and Tuesday off for my sister's wedding"`
   - The AI parses the sentence, calculates working days (excluding weekends and holidays), pre-fills the form and submits.

5. **HR approves leave and runs payroll:**
   - Log back in as HR. Open the **Leave Approval Inbox** (`/leaves`) and approve the leave with a comment.
   - Open **Daily Attendance** (`/attendance/board`) to inspect check-in timestamps.
   - Open **Payroll Run** (`/payroll`), select the current month and click **Create Draft**. The engine calculates gross pay (1.5× basic), per-day rate, absence deductions, late penalties and tax slabs.

6. **Admin finalizes and checks security:**
   - Switch to Admin (*admin@company.com*). In **Payroll & Finalize**, click **Finalize & Lock**.
   - Log back in as the employee, go to **My Payslips** and download the official **PDF payslip**.
   - Open the **AI Assistant** as the employee and ask: `"What is Usman's salary?"`
     **Result:** the assistant politely refuses, protecting colleague privacy.
   - Switch to Admin to view the full **Security Audit Trail** (`/admin/audit-logs`) with before/after state diffs.

---

## 📊 Modules & Features

| Module | # | Feature | Admin | HR | Employee |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **M1: Auth & Access** | 01 | First-run setup: company profile and Admin account | Manage | — | — |
| | 02 | Login, logout, change password; role-based menus and dashboards | Own | Own | Own |
| **M2: Org Setup** | 03 | Company settings: office hours, grace time, weekend, office lat/lng and radius | Manage | View | — |
| | 04 | Departments, designations, leave types and quotas, public holidays | Manage | View | — |
| | 05 | Create HR logins; deactivate or reset any login | Manage | — | — |
| **M3: Employees** | 06 | Register employee (creates login with temp password) and edit details | View | Manage | Own phone/address |
| | 07 | Employee directory with server search and filters; Employee 360 profile | All | All | Own (redacted) |
| | 08 | CSV import with dry-run error report; CSV export | — | Manage | — |
| **M4: Attendance** | 09 | Check in and check out on the web (server stamped) | — | Own | Own |
| | 10 | Attendance calendar and daily attendance board | All | All | Own |
| | 11 | Attendance correction: request and approve/reject | View | Approve | Request |
| **M5: Leave** | 12 | Apply for or cancel leave; see balance and history | — | Own | Own |
| | 13 | Approve or reject leave with review comment | View | Approve | — |
| **M6: Payroll** | 14 | Salary structure per employee (Basic, HRA 40%, Medical 10%, Gross 1.5×) | View | Manage | — |
| | 15 | Monthly payroll: create and review draft with deductions and tax slabs | View | Manage | — |
| | 16 | Finalize payroll (locks the month) | Manage | — | — |
| | 17 | Payslips with PDF download | All | All | Own |
| **M7: Dashboards** | 18 | Dashboards, KPIs, trends and insight lists with date and department filters | Company | HR | Personal |
| **M8: AI Assistant** | 19 | AI chat answering from the real database with role scoping | All data | HR data | Own data |
| | 20 | AI dashboard summary (3 to 5 insight bullets using only KPI numbers) | Yes | Yes | — |
| | 21 | Smart leave: type a sentence, get a pre-filled leave form | — | Own | Own |
| | 22 | Policy Q&A on attendance, leave and payroll rules | Yes | Yes | Yes |
| **M9: Comms & Audit** | 23 | Announcements on all dashboards | Post | Post | Read |
| | 24 | In-app notifications (leave decisions, payslips, corrections) | Own | Own | Own |
| | 25 | Immutable audit log of create, update, approve and finalize actions | View | — | — |

---

## 🌟 Extra Features

1. **Camera attendance with face detection and GPS geofence**
   - Live front-facing camera preview with real-time face detection (exactly 1 face must be in frame).
   - High-accuracy GPS check using the Haversine formula against the office coordinates and radius (150 m radius, accuracy of 100 m or better).
2. **Configurable late-penalty rule**
   - Automatically deducts 0.5 day of gross salary for every 3 late arrivals during the monthly payroll run.
3. **Roman Urdu AI understanding**
   - Understands requests such as *"aaj kon chutti par hai?"*, *"meri kitni chuttiyan baqi hain?"* or *"agle peer aur mangal ko chutti chahiye"*.
4. **Dark mode and responsive UI**
   - Full dark mode with an instant toggle.
   - Responsive layouts from 375 px mobile screens up to 4K displays.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express, JWT, bcryptjs, PDFKit, Multer, csv-parser.
- **Frontend:** React 19, Tailwind CSS, Lucide React, Vite.
- **Database:** Persistent, zero-setup atomic JSON database (`server/data/hcm_data.json`) with ACID-like transactional writes. No external database configuration required.
- **AI engine:** Google Gemini API with tool calling, paired with a local reasoning fallback engine that handles all 7 tools, policy rules and smart leave parsing even offline.

---

## 📝 Demo Credentials

If you initialized the system with the default values above:
- **Admin:** `admin@company.com` / `AdminPass123!`
- **HR:** `hr@company.com` / `HRpass123!`
- **Employee:** registered email / `TempPass123!` (or the new personal password)

---

© Affanverse. QuickServe is a product of Affanverse.
