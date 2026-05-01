# HAMS Full Project Documentation

## Project Name

HAMS - Hostel Attendance Management System

## Project Summary

HAMS is a web application for managing hostel-related student services. It includes meal attendance, laundry tracking, student records, and dashboards for different user roles.

The system has two main parts:

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Flask, Python, SQLite

The frontend displays the user interface. The backend stores and provides data through API endpoints. The frontend and backend are connected through HTTP requests.

## User Roles

The application supports four roles:

```text
Student
Kitchen Staff
Laundry Staff
Admin
```

Each role has its own section in the frontend.

## Full Project Structure

```text
myadds-main/
  index.html
  package.json
  requirements.txt
  README.md
  BACKEND_DOCUMENTATION.md
  FULL_PROJECT_DOCUMENTATION.md
  logo.jpg

  server/
    app.py
    data/
      hams.sqlite

  src/
    main.tsx
    App.tsx
    index.css

    lib/
      api.ts
      utils.ts

    components/
      layout/
        Layout.tsx
      ui/
        button.tsx
        input.tsx
        label.tsx

    pages/
      Login.tsx

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
        Reports.tsx
        Scanner.tsx

      admin/
        Dashboard.tsx
        Meals.tsx
        Students.tsx
        Analytics.tsx
```

## Frontend Overview

The frontend is built with:

```text
React
TypeScript
Vite
Tailwind CSS
React Router
Lucide React Icons
```

The frontend runs on:

```text
http://localhost:3000
```

## Main Frontend Entry Files

### src/main.tsx

This is the frontend entry point. It renders the React application into the page.

### src/App.tsx

This file defines the application routes.

Main routes:

```text
/login
/student
/student/qr
/student/laundry
/student/profile
/kitchen
/kitchen/scanner
/laundry-staff
/laundry-staff/baskets
/laundry-staff/reports
/laundry-staff/scanner
/admin
/admin/meals
/admin/students
/admin/analytics
```

## Frontend Layout

The shared page layout is located in:

```text
src/components/layout/Layout.tsx
```

This component provides the layout for dashboard pages, including navigation based on the user role.

## Frontend UI Components

Reusable UI components are located in:

```text
src/components/ui/
```

Important files:

```text
button.tsx
input.tsx
label.tsx
```

These components are used across login forms, search inputs, tables, and action buttons.

## Login Page

File:

```text
src/pages/Login.tsx
```

The login page allows the user to select a role:

```text
Student
Kitchen
Laundry
Admin
```

When the user signs in, the frontend sends a login request to the backend:

```text
POST http://localhost:4000/api/auth/login
```

If login succeeds, the user is redirected to the correct dashboard.

## Student Frontend Pages

### Student Dashboard

File:

```text
src/pages/student/Dashboard.tsx
```

Displays:

- Today's meals
- Meal status
- Laundry status
- Recent laundry activity

Backend data source:

```text
GET /api/student/<student_id>/overview
```

### Student Laundry

File:

```text
src/pages/student/Laundry.tsx
```

Displays:

- Current basket status
- Past laundry records

Backend data source:

```text
GET /api/student/<student_id>/overview
```

### Student Profile

File:

```text
src/pages/student/Profile.tsx
```

Displays:

- Name
- Email
- Phone
- Hostel
- Student ID
- Course and level

Backend data source:

```text
GET /api/student/<student_id>/overview
```

### Student QR Code

File:

```text
src/pages/student/QRCode.tsx
```

Displays a QR code interface for student identification.

## Kitchen Frontend Pages

### Kitchen Dashboard

File:

```text
src/pages/kitchen/Dashboard.tsx
```

Displays kitchen service information.

### Meal Scanner

File:

```text
src/pages/kitchen/Scanner.tsx
```

The scanner page simulates meal scanning.

It sends scan requests to:

```text
POST /api/meals/<meal_id>/scan
```

If the meal was not already scanned, the backend approves it.

If the meal was already scanned, the backend denies it.

## Laundry Staff Frontend Pages

### Laundry Dashboard

File:

```text
src/pages/laundry/Dashboard.tsx
```

Displays laundry staff overview information.

### Manage Baskets

File:

```text
src/pages/laundry/Baskets.tsx
```

Displays laundry basket records from the backend.

Backend data source:

```text
GET /api/laundry/baskets
```

### Laundry Reports

File:

```text
src/pages/laundry/Reports.tsx
```

Displays laundry reporting interface.

### Laundry Scanner

File:

```text
src/pages/laundry/Scanner.tsx
```

Displays laundry scanner interface.

## Admin Frontend Pages

### Admin Dashboard

File:

```text
src/pages/admin/Dashboard.tsx
```

Displays admin summary cards and system alerts.

### Manage Meals

File:

```text
src/pages/admin/Meals.tsx
```

Displays meal records from the backend.

Backend data source:

```text
GET /api/meals
```

### Manage Students

File:

```text
src/pages/admin/Students.tsx
```

Displays student records from the backend.

Backend data source:

```text
GET /api/students
```

### Analytics

File:

```text
src/pages/admin/Analytics.tsx
```

Displays analytics and reporting information.

## Frontend Backend Connection

The frontend connects to Flask through this file:

```text
src/lib/api.ts
```

This file defines the API base URL:

```ts
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
```

It also defines helper functions:

```text
login()
students()
meals()
laundryBaskets()
studentOverview()
scanMeal()
```

These functions are imported into frontend pages when backend data is needed.

Example:

```ts
api.students()
```

This calls:

```text
http://localhost:4000/api/students
```

## Backend Overview

The backend is built with:

```text
Python
Flask
SQLite
```

Backend file:

```text
server/app.py
```

The backend runs on:

```text
http://localhost:4000
```

## Backend Responsibilities

The backend handles:

- Creating the SQLite database
- Creating database tables
- Adding demo data
- Receiving login requests
- Returning student data
- Returning meal data
- Returning laundry data
- Recording meal scans
- Preventing duplicate meal scans

## SQLite Database

Database file:

```text
server/data/hams.sqlite
```

This file is generated automatically when the backend starts.

## Database Tables

### users

Stores users and role information.

```text
id
name
email
password
role
student_id
hostel
course
level
phone
status
```

### meals

Stores meal information.

```text
id
type
start_time
end_time
menu
status
```

### meal_scans

Stores scanned meal records.

```text
id
student_id
meal_id
scanned_at
```

### laundry_baskets

Stores laundry basket records.

```text
id
basket_code
student_id
status
received_at
estimated_finish
notes
```

### Other Seeded Tables

The backend also creates and fills these supporting tables:

```text
kitchen_scan_logs
laundry_activity
laundry_machines
laundry_reports
system_alerts
analytics_meal_trends
analytics_kpis
```

These tables provide data for kitchen activity, laundry activity, machine usage, reports, admin alerts, analytics charts, and KPI cards.

## Backend API Endpoints

### Health Check

```http
GET /api/health
```

Checks if the backend is running.

Example response:

```json
{
  "ok": true
}
```

### Login

```http
POST /api/auth/login
```

Logs in a user.

Example request:

```json
{
  "email": "student@example.com",
  "password": "password",
  "role": "student"
}
```

### Get Students

```http
GET /api/students
```

Returns all student users.

### Get Meals

```http
GET /api/meals
```

Returns all meals.

### Get Laundry Baskets

```http
GET /api/laundry/baskets
```

Returns all laundry baskets.

### Get Student Overview

```http
GET /api/student/<student_id>/overview
```

Example:

```http
GET /api/student/240011223/overview
```

Returns student profile, meals, and laundry data.

### Scan Meal

```http
POST /api/meals/<meal_id>/scan
```

Example:

```http
POST /api/meals/2/scan
```

Example request:

```json
{
  "studentId": "240011223"
}
```

### Database Summary

```http
GET /api/database/summary
```

Use this endpoint to confirm that all database tables have been created and seeded.

### Extra Database Endpoints

```http
GET /api/kitchen/dashboard
GET /api/laundry/dashboard
GET /api/laundry/reports
GET /api/admin/analytics
GET /api/admin/alerts
```

## How To Run The Full Project

Open the project directory:

```powershell
cd "C:\Users\HP ELITEBOOK 1040 G7\Documents\myadds-main\myadds-main"
```

Install frontend dependencies:

```powershell
npm install
```

Install backend dependency:

```powershell
pip install -r requirements.txt
```

Start backend in terminal 1:

```powershell
python server\app.py
```

Start frontend in terminal 2:

```powershell
npm run dev
```

Open frontend:

```text
http://localhost:3000
```

Open backend health check:

```text
http://localhost:4000/api/health
```

## Demo Login Details

Password for all demo users:

```text
password
```

Demo users:

```text
student@example.com
kitchen@example.com
laundry@example.com
admin@example.com
```

## How To Show That Frontend And Backend Are Connected

1. Start Flask backend.
2. Start React frontend.
3. Open:

```text
http://localhost:4000/api/health
```

If it shows this, backend is running:

```json
{
  "ok": true
}
```

4. Open frontend:

```text
http://localhost:3000
```

5. Login as a student.
6. The dashboard loads student meal and laundry data from Flask.
7. Go to kitchen scanner and click Success.
8. The scan result is sent to Flask and saved in SQLite.

## Complete System Flow

```text
User opens React frontend
        |
        v
React page calls src/lib/api.ts
        |
        v
HTTP request goes to Flask backend
        |
        v
Flask reads or writes SQLite database
        |
        v
Flask returns JSON response
        |
        v
React displays updated data in the UI
```

## Summary

The complete project is a connected full stack system. React handles the user interface, Flask handles backend logic, and SQLite stores the data. The connection between frontend and backend is done through API calls in `src/lib/api.ts`.
