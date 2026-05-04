# HAMS Full Project Documentation

## Project Name

HAMS - Hostel Attendance Management System

## Project Summary

HAMS is a full stack hostel service web app for managing student meals, QR scanning, laundry requests, basket tracking, reports, notifications, user accounts, and admin operations.

The system is built as:

```text
React frontend
Flask backend
MySQL production database
SQLite local fallback database
```

The frontend shows role-based dashboards and forms. The backend stores records, checks permissions, and returns live data through API endpoints.

## User Roles

```text
Student
Kitchen staff
Laundry staff
Admin
```

Each role has its own dashboard, routes, actions, navigation, notifications, and account settings.

## Architecture

```text
User browser
    |
    v
React + Vite frontend
    |
    v
src/lib/api.ts
    |
    v
Flask API in server/app.py
    |
    v
MySQL on Aiven in production
or SQLite locally when DATABASE_URL is missing
```

In production, Flask also serves the built React app from `dist/`.

## Project Structure

```text
myadds-main/
  index.html
  package.json
  package-lock.json
  requirements.txt
  runtime.txt
  render.yaml
  README.md
  BACKEND_DOCUMENTATION.md
  DEPLOYMENT_GUIDE.md
  FULL_PROJECT_DOCUMENTATION.md

  public/
    manifest.webmanifest
    sw.js

  server/
    app.py
    data/
      hams.sqlite

  src/
    App.tsx
    main.tsx
    index.css

    lib/
      api.ts
      image.ts
      pagination.ts
      theme.ts
      utils.ts

    components/
      layout/
        GlobalSearch.tsx
        InstallPrompt.tsx
        Layout.tsx
        NetworkStatus.tsx
        RoleTips.tsx
      scanner/
        CameraQrScanner.tsx
      ui/
        button.tsx
        confirm-dialog.tsx
        empty-state.tsx
        input.tsx
        label.tsx
        password-input.tsx
        select-menu.tsx
        skeleton.tsx
        toast.tsx

    pages/
      Login.tsx
      ResetPassword.tsx
      Account.tsx
      Notifications.tsx

      student/
        Dashboard.tsx
        Laundry.tsx
        Profile.tsx
        QRCode.tsx

      kitchen/
        Dashboard.tsx
        Scanner.tsx

      laundry/
        Dashboard.tsx
        Baskets.tsx
        Board.tsx
        Issues.tsx
        Reports.tsx
        Scanner.tsx

      admin/
        Dashboard.tsx
        Meals.tsx
        Students.tsx
        Staff.tsx
        Analytics.tsx
        Audit.tsx
        Approvals.tsx
        Tools.tsx
        UserHistory.tsx
```

## Frontend Overview

Frontend technology:

```text
React
TypeScript
Vite
React Router
Lucide React Icons
Custom responsive CSS
```

Main styling file:

```text
src/index.css
```

Main route file:

```text
src/App.tsx
```

API helper:

```text
src/lib/api.ts
```

## Frontend Routes

### Public

```text
/login
/reset-password
```

### Student

```text
/student
/student/qr
/student/laundry
/student/profile
/student/account
/student/notifications
```

### Kitchen

```text
/kitchen
/kitchen/scanner
/kitchen/account
/kitchen/notifications
```

### Laundry Staff

```text
/laundry-staff
/laundry-staff/baskets
/laundry-staff/board
/laundry-staff/reports
/laundry-staff/issues
/laundry-staff/scanner
/laundry-staff/account
/laundry-staff/notifications
```

### Admin

```text
/admin
/admin/meals
/admin/students
/admin/users/:id
/admin/staff
/admin/analytics
/admin/audit
/admin/approvals
/admin/tools
/admin/account
/admin/notifications
```

## Shared Frontend Features

### Layout

`src/components/layout/Layout.tsx` provides the protected app layout, role navigation, user area, notifications access, and mobile-friendly page structure.

### Global Search

`src/components/layout/GlobalSearch.tsx` lets users search across useful records from one place.

### Network Status

`src/components/layout/NetworkStatus.tsx` warns the user when the connection is offline or unstable.

### Install Prompt

`src/components/layout/InstallPrompt.tsx` supports installing the web app as a PWA on supported browsers.

### Reusable UI

Shared UI components live in:

```text
src/components/ui/
```

They provide consistent buttons, inputs, password fields, select menus, skeleton loading states, toast alerts, empty states, and confirmation dialogs.

## Login And Account System

The login page accepts real email and password input.

Login request:

```http
POST /api/auth/login
```

Successful login returns:

```text
user
jwt token
```

The frontend stores the logged-in user and sends the token with API requests.

Account features:

- profile editing
- phone update
- hostel and room update
- password change
- password show/hide controls
- theme preference
- notification preferences
- profile photo upload

## Student Interface

Student pages allow a student to:

- view meal status
- view collected and missed meals
- view scan times
- show QR identity badge
- request laundry service
- view laundry timeline
- update profile
- upload photo
- change password
- read notifications
- switch theme

Main student API:

```http
GET /api/student/<student_id>/overview
POST /api/student/<student_id>/laundry-request
```

## Kitchen Interface

Kitchen staff can:

- view meal dashboard
- select active meal
- scan QR code with camera
- manually enter student ID
- approve or deny meal scan
- record late or override reason
- see recent scan activity
- view student photo during scan confirmation

Main kitchen API:

```http
GET /api/kitchen/dashboard
GET /api/meals
POST /api/meals/<meal_id>/scan
```

## Laundry Interface

Laundry staff can:

- add baskets
- edit baskets
- delete baskets
- update basket status
- use a status board
- scan basket code or student ID
- report damaged or missing items
- view reports
- export basket records

Laundry status flow:

```text
Requested
Received
Washing
Drying
Ready
Picked Up
Issue Reported
```

Main laundry API:

```http
GET /api/laundry/dashboard
GET /api/laundry/baskets
POST /api/laundry/baskets
PATCH /api/laundry/baskets/<basket_id>/status
POST /api/laundry/scan
GET /api/laundry/issues
POST /api/laundry/issues
GET /api/laundry/reports
```

## Admin Interface

Admins can:

- manage students
- manage staff
- manage meals
- view analytics
- view audit logs
- view approval queue
- approve or reject requests
- open user history pages
- reset user passwords
- import students from CSV
- export students, meals, baskets, and audit logs
- download database backup
- check database health

Main admin API:

```http
GET /api/admin/dashboard
GET /api/admin/control-center
GET /api/admin/analytics
GET /api/admin/approvals
PATCH /api/admin/approvals/<approval_id>
GET /api/audit-logs
GET /api/export/<kind>
GET /api/database/backup
POST /api/admin/import/students
```

## Backend Overview

Backend technology:

```text
Python
Flask
Gunicorn
PyMySQL
cryptography
```

Backend file:

```text
server/app.py
```

The backend:

- starts the Flask app
- configures CORS
- connects to MySQL or SQLite
- creates missing tables
- seeds demo data
- validates login
- signs JWT tokens
- protects routes by role
- reads and writes records
- logs important actions
- serves the built frontend in production

## Database

Production database:

```text
MySQL
```

Local fallback database:

```text
server/data/hams.sqlite
```

Important tables:

```text
users
meals
meal_scans
laundry_baskets
kitchen_scan_logs
laundry_activity
laundry_machines
laundry_reports
system_alerts
analytics_meal_trends
analytics_kpis
notifications
audit_logs
user_preferences
password_reset_tokens
laundry_issues
approval_requests
```

## Backend API Groups

### Health

```http
GET /api/health
GET /api/database/health
GET /api/database/summary
GET /api/database/repair
POST /api/database/repair
```

### Authentication

```http
POST /api/auth/login
POST /api/auth/request-password-reset
POST /api/auth/reset-password
```

### Search

```http
GET /api/search
```

### Users And Account

```http
GET /api/users/me/preferences
PUT /api/users/me/preferences
PUT /api/users/<user_id>/profile
PUT /api/users/<user_id>/photo
POST /api/users/<user_id>/password
POST /api/users/<user_id>/reset-password
GET /api/users/<user_id>/history
GET /api/users/<user_id>/timeline
```

### Students And Staff

```http
GET /api/students
POST /api/students
PUT /api/students/<user_id>
DELETE /api/students/<user_id>
GET /api/staff
POST /api/staff
```

### Meals

```http
GET /api/meals
POST /api/meals
PUT /api/meals/<meal_id>
DELETE /api/meals/<meal_id>
POST /api/meals/<meal_id>/scan
```

### Laundry

```http
GET /api/laundry/dashboard
GET /api/laundry/reports
GET /api/laundry/baskets
POST /api/laundry/baskets
PUT /api/laundry/baskets/<basket_id>
PATCH /api/laundry/baskets/<basket_id>/status
DELETE /api/laundry/baskets/<basket_id>
POST /api/student/<student_id>/laundry-request
POST /api/laundry/scan
GET /api/laundry/issues
POST /api/laundry/issues
PATCH /api/laundry/issues/<issue_id>
```

### Notifications

```http
GET /api/notifications
PATCH /api/notifications/<notification_id>/read
PATCH /api/notifications/read-all
```

### Admin

```http
GET /api/admin/dashboard
GET /api/admin/control-center
GET /api/admin/analytics
GET /api/admin/alerts
GET /api/admin/approvals
PATCH /api/admin/approvals/<approval_id>
GET /api/audit-logs
GET /api/export/<kind>
GET /api/database/backup
POST /api/admin/import/students
```

## Default Accounts

Password:

```text
password
```

Emails:

```text
student@example.com
kitchen@example.com
laundry@example.com
admin@example.com
```

## Local Run Instructions

Open the real project folder:

```powershell
cd "C:\Users\HP ELITEBOOK 1040 G7\Documents\myadds-main\myadds-main"
```

Install dependencies:

```powershell
npm install
pip install -r requirements.txt
```

Start Flask:

```powershell
python server\app.py
```

Start React:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:4000/api/health
```

## Production Run Instructions

Render uses:

```text
pip install -r requirements.txt
npm install
npm run build
gunicorn server.app:app
```

Set Render environment variables:

```text
DATABASE_URL=mysql://avnadmin:YOUR_PASSWORD@PUBLIC_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED
SECRET_KEY=use-a-long-random-secret
CLIENT_ORIGIN=https://your-render-site.onrender.com
```

## How To Confirm Everything Is Connected

Backend live:

```text
/api/health
```

Database live:

```text
/api/database/health
```

Tables seeded:

```text
/api/database/summary
```

Frontend connected:

1. Open the deployed website.
2. Login with a demo account.
3. Open the dashboard.
4. Create or update a record.
5. Refresh the page.
6. The record should still appear because it was saved in MySQL.

## Mobile And PWA Support

The app includes:

- responsive layouts
- mobile-friendly dashboard sections
- bottom navigation behavior
- improved form spacing
- designed select menus
- consistent buttons and inputs
- install prompt
- manifest file
- service worker
- network status message

On phones, use the Render URL:

```text
https://your-render-site.onrender.com
```

Do not use:

```text
http://localhost:3000
http://localhost:4000
```

`localhost` on a phone points to the phone itself, not the laptop.

## Troubleshooting

### Request failed on login

Check:

```text
/api/database/health
```

If the database is down or the hostname is wrong, login will fail.

### MySQL Name or service not known

Render cannot find the MySQL host.

Fix:

- copy the public Aiven Service URI
- update Render `DATABASE_URL`
- redeploy

### Some data is missing after switching to MySQL

SQLite records do not move automatically to MySQL. Run the migration script if the project includes it:

```powershell
python scripts\migrate_sqlite_to_mysql.py
```

Then check:

```text
/api/database/summary
```

### First load is slow

Render free services can sleep. After waking up, later requests should be faster.

## Summary

HAMS is now a connected full stack app. React handles the interface, Flask handles backend logic and security, and MySQL stores permanent production data. The system supports real user actions across student, kitchen, laundry, and admin workspaces, and those actions are saved through the backend.
