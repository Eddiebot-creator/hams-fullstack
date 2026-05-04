# HAMS Full Stack Web App

HAMS is a hostel service management web app for students, kitchen staff, laundry staff, and admins. It connects a React frontend to a Flask backend and stores live records in MySQL when `DATABASE_URL` is configured.

The app supports meal scanning, student profiles, laundry tracking, reports, notifications, dark mode, mobile layouts, account settings, audit logs, approvals, imports, exports, and deployment on Render.

## Main Stack

- Frontend: React, TypeScript, Vite, React Router, Lucide icons, custom CSS in `src/index.css`
- Backend: Python, Flask, Gunicorn
- Database: MySQL in production, SQLite fallback for local development when no `DATABASE_URL` is set
- Production hosting: Render web service
- Production database option: Aiven MySQL

## Important Folders

```text
myadds-main/
  server/
    app.py                  Flask API, auth, database setup, production static server
    data/hams.sqlite        Local SQLite fallback database, generated automatically

  src/
    App.tsx                 App routes and role protection
    main.tsx                React entry point
    index.css               Main styling for the whole web app
    lib/api.ts              Frontend API client for Flask
    components/             Shared layout, scanner, UI, toast, skeleton, install prompt
    pages/                  Login, dashboards, admin, student, kitchen, laundry pages

  public/
    manifest.webmanifest    PWA install metadata
    sw.js                   Service worker

  render.yaml               Render deployment blueprint
  requirements.txt          Python dependencies
  package.json              Frontend scripts and dependencies
```

## User Roles

- Student: view meals, QR code, laundry status, profile, notifications, and account settings.
- Kitchen staff: view meal dashboard, scan student QR codes or IDs, record meal collection, and manage account settings.
- Laundry staff: manage baskets, board statuses, scanner, reports, issues, notifications, and account settings.
- Admin: manage students, staff, meals, approvals, analytics, audit logs, tools, imports, exports, backups, and system health.

## Current Features

- Real login form using email and password.
- JWT token returned after login and sent with protected API requests.
- Role-based frontend routing and backend route checks.
- MySQL support with SSL connection strings.
- Local SQLite fallback if `DATABASE_URL` is not provided.
- Profile editing for phone, hostel, room, and account details.
- Password change and reset-token flow.
- Password show/hide input support.
- Student photo upload and profile avatars.
- Meal scan duplicate prevention and late or override reason capture.
- Camera QR scanner plus manual ID fallback.
- Student meal history and laundry status.
- Laundry tracking timeline and status board.
- Laundry issue reporting for damaged or missing items.
- Admin approval queue.
- Notifications with read and unread states.
- Global search, table search, filters, and exports.
- Admin audit trail and user activity history.
- Dashboard analytics and KPI sections.
- Loading skeletons, toast alerts, empty states, and network status notices.
- Responsive mobile layout and PWA install support.
- Dark, light, and system theme preferences.

## Local Setup

Open the real project folder:

```powershell
cd "C:\Users\HP ELITEBOOK 1040 G7\Documents\myadds-main\myadds-main"
```

Install frontend dependencies:

```powershell
npm install
```

Install backend dependencies:

```powershell
pip install -r requirements.txt
```

Start the Flask backend:

```powershell
python server\app.py
```

Start the React frontend in a second terminal:

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

## Running As One Production App Locally

Build the frontend:

```powershell
npm run build
```

Start Flask:

```powershell
python server\app.py
```

Open:

```text
http://localhost:4000
```

In this mode, Flask serves both the React website and the `/api` backend.

## Demo Login Accounts

All seeded demo accounts use this password:

```text
password
```

Default emails:

```text
student@example.com
kitchen@example.com
laundry@example.com
admin@example.com
```

## Environment Variables

For production, set these in Render:

```text
DATABASE_URL=mysql://avnadmin:YOUR_PASSWORD@YOUR_PUBLIC_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED
SECRET_KEY=use-a-long-random-secret
CLIENT_ORIGIN=https://your-render-site.onrender.com
TOKEN_TTL_SECONDS=86400
MYSQL_POOL_SIZE=5
```

Notes:

- `DATABASE_URL` is required for MySQL.
- Use the public Aiven MySQL service URI, not a private/VPC hostname.
- Keep `?ssl-mode=REQUIRED` for Aiven MySQL.
- Do not commit your real database password to GitHub.
- If `DATABASE_URL` is missing, the app uses local SQLite for development.

## Deployment

The project includes `render.yaml`, so Render can deploy it as a Blueprint.

High-level deployment flow:

1. Push the project to GitHub.
2. Create or open a Render account.
3. Choose `New > Blueprint`.
4. Select the GitHub repository.
5. Add the production environment variables.
6. Deploy.

After deployment, test:

```text
https://your-site.onrender.com/api/health
https://your-site.onrender.com/api/database/health
https://your-site.onrender.com/api/database/summary
```

## Common Fixes

If login shows `Request failed`, open:

```text
https://your-site.onrender.com/api/database/health
```

If it says `Name or service not known`, Render cannot resolve the MySQL host. Copy the public Aiven Service URI again and update Render `DATABASE_URL`.

If it says `cryptography package is required`, redeploy after confirming `requirements.txt` includes `cryptography`.

If the first page load is slow on Render free tier, the service may be waking up after sleeping.

## More Documentation

- Backend details: `BACKEND_DOCUMENTATION.md`
- Full system details: `FULL_PROJECT_DOCUMENTATION.md`
- Render and Aiven deployment: `DEPLOYMENT_GUIDE.md`
