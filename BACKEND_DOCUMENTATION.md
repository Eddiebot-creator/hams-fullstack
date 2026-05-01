# HAMS Backend Documentation

## Project Overview

This project is a Hostel Attendance Management System frontend connected to a Flask backend. The frontend is built with React and Vite, while the backend is built with Flask and uses SQLite as the database.

The backend provides API endpoints for:

- User login
- Student records
- Meal records
- Laundry basket records
- Student dashboard overview
- Meal scanning

## Project Structure

```text
myadds-main/
  server/
    app.py              # Flask backend and SQLite database setup
    data/
      hams.sqlite       # SQLite database, generated automatically

  src/
    lib/
      api.ts            # Frontend API helper that connects React to Flask

    pages/
      Login.tsx
      admin/
        Students.tsx
        Meals.tsx
      kitchen/
        Scanner.tsx
      laundry/
        Baskets.tsx
      student/
        Dashboard.tsx
        Laundry.tsx
        Profile.tsx

  requirements.txt      # Python backend dependency list
  package.json          # Frontend scripts and dependencies
```

## Backend Technology

The backend is created using:

```text
Python
Flask
SQLite
```

Flask handles the API routes, and SQLite stores the data locally in a database file.

## Main Backend File

The backend code is located in:

```text
server/app.py
```

This file contains:

- Flask app setup
- CORS headers for frontend connection
- SQLite connection helper
- Database table creation
- Demo seed data
- API routes

## Database

The database is SQLite.

Database location:

```text
server/data/hams.sqlite
```

This file is generated automatically when the Flask backend runs for the first time.

## Database Tables

### users

Stores students and staff login details.

Fields include:

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

Roles include:

```text
student
kitchen
laundry
admin
```

### meals

Stores meals available for students.

Fields include:

```text
id
type
start_time
end_time
menu
status
```

### meal_scans

Stores meal scan records.

Fields include:

```text
id
student_id
meal_id
scanned_at
```

### laundry_baskets

Stores laundry basket records.

Fields include:

```text
id
basket_code
student_id
status
received_at
estimated_finish
notes
```

### kitchen_scan_logs

Stores kitchen scan history.

Fields include:

```text
id
student_id
meal_type
scanned_time
status
```

### laundry_activity

Stores recent laundry staff actions.

Fields include:

```text
id
basket_code
action
staff_name
activity_time
```

### laundry_machines

Stores washer and dryer usage information.

Fields include:

```text
id
name
machine_type
usage_percent
status
```

### laundry_reports

Stores laundry reporting summaries.

Fields include:

```text
id
report_period
total_baskets_processed
average_turnaround
reported_issues
```

### system_alerts

Stores admin system alerts.

Fields include:

```text
id
alert_type
message
alert_time
```

### analytics_meal_trends

Stores admin meal attendance chart data.

Fields include:

```text
id
day_label
attendance_count
```

### analytics_kpis

Stores admin KPI data.

Fields include:

```text
id
name
value
delta
```

## API Base URL

The backend runs on:

```text
http://localhost:4000
```

The frontend connects to:

```text
http://localhost:4000/api
```

This is configured in:

```text
src/lib/api.ts
```

## API Endpoints

### Health Check

```http
GET /api/health
```

Used to check if the backend is running.

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

Request body:

```json
{
  "email": "student@example.com",
  "password": "password",
  "role": "student"
}
```

Example response:

```json
{
  "user": {
    "id": 1,
    "name": "Samuel Tokunbo",
    "email": "student@example.com",
    "role": "student",
    "studentId": "240011223",
    "hostel": "Blue Nile, Room 402",
    "course": "Computer Science",
    "level": "200 Lv",
    "phone": "+234 8097665431",
    "status": "Active"
  }
}
```

### Get Students

```http
GET /api/students
```

Returns all student records.

### Get Meals

```http
GET /api/meals
```

Returns meal records.

### Get Laundry Baskets

```http
GET /api/laundry/baskets
```

Returns laundry basket records.

### Get Student Overview

```http
GET /api/student/<student_id>/overview
```

Example:

```http
GET /api/student/240011223/overview
```

Returns:

- Student profile
- Meal status
- Laundry status

### Scan Meal

```http
POST /api/meals/<meal_id>/scan
```

Example:

```http
POST /api/meals/2/scan
```

Request body:

```json
{
  "studentId": "240011223"
}
```

Success response:

```json
{
  "message": "Meal approved.",
  "studentId": "240011223",
  "meal": {
    "id": 2,
    "type": "Lunch"
  }
}
```

If the meal has already been scanned:

```json
{
  "message": "Already scanned for Breakfast."
}
```

### Database Summary

```http
GET /api/database/summary
```

Shows how many records are in each database table.

Example response:

```json
{
  "users": 8,
  "meals": 3,
  "meal_scans": 1,
  "laundry_baskets": 4,
  "kitchen_scan_logs": 6,
  "laundry_activity": 5,
  "laundry_machines": 4,
  "laundry_reports": 3,
  "system_alerts": 3,
  "analytics_meal_trends": 7,
  "analytics_kpis": 3
}
```

### Extra Module Endpoints

```http
GET /api/kitchen/dashboard
GET /api/laundry/dashboard
GET /api/laundry/reports
GET /api/admin/analytics
GET /api/admin/alerts
```

These endpoints return seeded data for kitchen, laundry, reports, analytics, and admin alerts.

## Frontend Connection

The frontend connects to the backend through:

```text
src/lib/api.ts
```

This file contains the API helper functions:

```text
login()
students()
meals()
laundryBaskets()
studentOverview()
scanMeal()
```

Example:

```ts
api.students()
```

This sends a request to:

```text
http://localhost:4000/api/students
```

## Connected Frontend Pages

The following frontend pages are connected to the backend:

```text
Login.tsx
admin/Students.tsx
admin/Meals.tsx
laundry/Baskets.tsx
student/Dashboard.tsx
student/Laundry.tsx
student/Profile.tsx
kitchen/Scanner.tsx
```

## How To Run The Project

Open the project folder:

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

Start the backend:

```powershell
python server\app.py
```

Start the frontend in another terminal:

```powershell
npm run dev
```

Open the frontend:

```text
http://localhost:3000
```

Open the backend health check:

```text
http://localhost:4000/api/health
```

## Demo Login Details

All demo users use this password:

```text
password
```

Demo emails:

```text
student@example.com
kitchen@example.com
laundry@example.com
admin@example.com
```

## Summary

The backend is a Flask API connected to a SQLite database. The React frontend uses `src/lib/api.ts` to communicate with Flask. When both servers are running, the frontend can log in users, load student records, load meals, load laundry records, display student profile data, and scan meals through the backend.
