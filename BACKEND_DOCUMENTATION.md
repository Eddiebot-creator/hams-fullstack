# HAMS Backend Documentation

## Overview

The HAMS backend is a Flask API that powers the React frontend. It handles authentication, role permissions, MySQL or SQLite database access, student records, meal scanning, laundry tracking, notifications, approvals, audit logs, imports, exports, and production static file serving.

Production should use MySQL through `DATABASE_URL`. If `DATABASE_URL` is missing, the backend falls back to local SQLite for development.

## Backend Stack

```text
Python
Flask
Gunicorn
PyMySQL
cryptography
MySQL in production
SQLite fallback in local development
```

Main backend file:

```text
server/app.py
```

Python dependencies:

```text
requirements.txt
```

## Runtime Modes

### Development With Separate Frontend

```text
React dev server: http://localhost:3000
Flask API:        http://localhost:4000/api
```

Start backend:

```powershell
python server\app.py
```

Start frontend:

```powershell
npm run dev
```

### Production

In production, Render runs:

```text
gunicorn server.app:app
```

Flask serves:

- React build output from `dist/`
- API routes under `/api/*`
- frontend fallback routes such as `/login`, `/student`, `/admin`, and other React routes

## Environment Variables

```text
DATABASE_URL
SECRET_KEY
CLIENT_ORIGIN
TOKEN_TTL_SECONDS
MYSQL_POOL_SIZE
SHOW_RESET_TOKEN
```

### DATABASE_URL

MySQL connection string for production:

```text
mysql://avnadmin:YOUR_PASSWORD@PUBLIC_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED
```

If missing, the backend uses:

```text
server/data/hams.sqlite
```

### SECRET_KEY

Used to sign JWT tokens.

Set this in production:

```text
SECRET_KEY=use-a-long-random-secret
```

### CLIENT_ORIGIN

Allowed frontend origin for CORS, usually:

```text
CLIENT_ORIGIN=https://your-render-site.onrender.com
```

### TOKEN_TTL_SECONDS

How long login tokens last. Default:

```text
86400
```

### MYSQL_POOL_SIZE

Maximum pooled MySQL connections. Default:

```text
5
```

### SHOW_RESET_TOKEN

Development-only helper. If set to `1`, password reset responses can include the reset token. Do not enable this for real production users.

## Authentication

Login endpoint:

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "student@example.com",
  "password": "password"
}
```

Response includes:

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "student"
  }
}
```

Frontend requests send the token with:

```http
Authorization: Bearer <token>
```

## Role Protection

The backend checks the logged-in user's role before protected actions.

General rules:

- Admin can manage users, meals, approvals, analytics, tools, exports, audit logs, and database checks.
- Kitchen staff can access kitchen dashboard and meal scanning.
- Laundry staff can manage laundry baskets, laundry board, scanner, reports, and issues.
- Students can access their own profile, meals, laundry status, QR data, notifications, and account settings.

Students should only be able to view and update their own student records.

## Database Support

The backend supports:

```text
MySQL:     when DATABASE_URL starts with mysql:// or mysql+pymysql://
SQLite:    when DATABASE_URL is not configured
```

MySQL is the intended production database.

SQLite is useful for local development because it runs without a database server.

## Database Tables

### users

Stores students, kitchen staff, laundry staff, and admins.

Important fields:

```text
id
name
email
password
role
student_id
hostel
room
course
level
phone
status
photo_url
created_at
updated_at
```

### meals

Stores meal windows and menus.

```text
id
type
start_time
end_time
menu
status
created_at
updated_at
```

### meal_scans

Stores successful and denied meal scan records.

```text
id
student_id
meal_id
scanned_at
status
reason
staff_id
```

A unique index helps prevent duplicate scans for the same student and meal.

### laundry_baskets

Stores basket tracking records.

```text
id
basket_code
student_id
status
received_at
estimated_finish
notes
assigned_staff
created_at
updated_at
```

### kitchen_scan_logs

Stores kitchen scan history for dashboards and audit context.

### laundry_activity

Stores basket timeline events such as received, washing, drying, ready, and picked up.

### laundry_machines

Stores washer and dryer status for the laundry dashboard.

### laundry_reports

Stores reporting summaries for laundry periods.

### notifications

Stores notifications for roles and students.

Important fields:

```text
id
user_role
student_id
title
message
type
is_read
created_at
```

### audit_logs

Stores important system actions.

Examples:

```text
login
failed_login
profile_update
password_change
meal_scan
student_create
student_update
student_delete
laundry_issue
approval_decision
```

### user_preferences

Stores per-user settings:

```text
theme
dashboard_layout
table_filters
last_selected_meal
notification settings
```

### password_reset_tokens

Stores password reset tokens and expiry information.

### laundry_issues

Stores damaged, missing, or delayed laundry reports.

### approval_requests

Stores admin approval tasks such as laundry requests, password reset requests, new users, and reported issues.

### Analytics Tables

Supporting analytics tables:

```text
analytics_meal_trends
analytics_kpis
system_alerts
```

## Main API Endpoints

### Health

```http
GET /api/health
GET /api/database/health
GET /api/database/summary
GET /api/database/repair
POST /api/database/repair
```

Use these to confirm the backend and database are working.

### Auth

```http
POST /api/auth/login
POST /api/auth/request-password-reset
POST /api/auth/reset-password
```

### Preferences And Account

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

### Meals And Scanning

```http
GET /api/meals
POST /api/meals
PUT /api/meals/<meal_id>
DELETE /api/meals/<meal_id>
POST /api/meals/<meal_id>/scan
GET /api/kitchen/dashboard
```

Meal scanning supports:

- student ID or QR input
- active meal validation
- duplicate prevention
- inactive student blocking
- late or override reason
- scan logging

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

Laundry tracking supports:

- requested
- received
- washing
- drying
- ready
- picked up
- issue reported

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
GET /api/search
GET /api/export/<kind>
GET /api/database/backup
POST /api/admin/import/students
```

## Default Seed Users

Default password:

```text
password
```

Default accounts:

```text
student@example.com
kitchen@example.com
laundry@example.com
admin@example.com
```

The backend seeds starter data for users, meals, laundry, notifications, analytics, reports, and audit logs if the tables are empty.

## Frontend Connection

Frontend API file:

```text
src/lib/api.ts
```

In development, it calls:

```text
http://localhost:4000/api
```

In production, the frontend and backend share the same Render domain.

## Testing Backend Health

Local:

```text
http://localhost:4000/api/health
http://localhost:4000/api/database/health
http://localhost:4000/api/database/summary
```

Production:

```text
https://your-render-site.onrender.com/api/health
https://your-render-site.onrender.com/api/database/health
https://your-render-site.onrender.com/api/database/summary
```

## Troubleshooting

### Request failed on login

Check:

```text
/api/database/health
```

If the database is not reachable, login cannot complete.

### Name or service not known

Render cannot resolve the MySQL hostname.

Fix:

- Copy the public Aiven Service URI.
- Replace Render `DATABASE_URL`.
- Confirm the Aiven MySQL service is running.
- Redeploy Render.

### cryptography package is required

The backend needs `cryptography` for Aiven MySQL authentication. Confirm `requirements.txt` includes it and redeploy.

### Slow first load

Render free services can sleep. The first request after sleep can be slow, then later requests should be faster.

## Security Notes

- Keep `SECRET_KEY` private.
- Keep `DATABASE_URL` private.
- Do not commit real database passwords to GitHub.
- Use MySQL for production data.
- Use role checks for every protected API route.
- Use audit logs for admin changes, scans, password events, imports, exports, and deletes.
