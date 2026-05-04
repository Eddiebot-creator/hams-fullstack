# Permanent Online Deployment Guide

This guide explains how to deploy HAMS permanently so it can be opened from phones, laptops, and other devices using one public Render link.

## Recommended Production Setup

```text
Render Web Service
Flask backend
React frontend build served by Flask
Aiven MySQL database
```

In production, Render builds the React app into `dist/`, then Flask serves:

- the website pages
- all `/api/*` backend routes
- the same domain for frontend and backend

Example:

```text
https://hams-fullstack.onrender.com
https://hams-fullstack.onrender.com/api/health
https://hams-fullstack.onrender.com/api/database/health
```

## Files Used For Deployment

```text
render.yaml          Render blueprint
runtime.txt          Python version
requirements.txt     Python dependencies
package.json         Node build scripts
server/app.py        Flask backend and production static serving
src/                 React frontend
public/              PWA files and static assets
```

## What `render.yaml` Does

The project already contains:

```yaml
services:
  - type: web
    name: hams-fullstack
    runtime: python
    plan: free
    buildCommand: |
      pip install -r requirements.txt
      npm install
      npm run build
    startCommand: gunicorn server.app:app
```

Render will:

1. install Python packages
2. install frontend packages
3. build React with Vite
4. start Flask with Gunicorn

## Step 1: Push Project To GitHub

Use the real project folder:

```text
C:\Users\HP ELITEBOOK 1040 G7\Documents\myadds-main\myadds-main
```

Make sure GitHub contains:

```text
server/app.py
src/
public/
package.json
requirements.txt
render.yaml
runtime.txt
```

## Step 2: Create Aiven MySQL

1. Go to Aiven.
2. Create a MySQL service.
3. Wait until the service status is running.
4. Copy the public MySQL Service URI.

The production URL should look like this:

```text
mysql://avnadmin:YOUR_PASSWORD@PUBLIC_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED
```

Important:

- Use the public host shown by Aiven.
- Do not use a private/VPC-only host.
- Keep `?ssl-mode=REQUIRED`.
- Do not put spaces in the URL.
- Do not paste the URL into PowerShell as a command. It belongs in Render environment variables.

## Step 3: Create Render Blueprint

On Render:

```text
New
Blueprint
Select your GitHub repository
```

Render will read `render.yaml` and create the web service.

## Step 4: Add Render Environment Variables

Open the Render service:

```text
Environment
Add Environment Variable
```

Add:

```text
DATABASE_URL=mysql://avnadmin:YOUR_PASSWORD@PUBLIC_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED
SECRET_KEY=use-a-long-random-secret
CLIENT_ORIGIN=https://your-render-site.onrender.com
TOKEN_TTL_SECONDS=86400
MYSQL_POOL_SIZE=5
```

Required:

- `DATABASE_URL`
- `SECRET_KEY`

Optional but recommended:

- `CLIENT_ORIGIN`
- `TOKEN_TTL_SECONDS`
- `MYSQL_POOL_SIZE`

Do not commit these secrets to GitHub.

## Step 5: Deploy

After environment variables are saved, click:

```text
Manual Deploy
Deploy latest commit
```

Render will build and start the service.

## Step 6: Test The Deployment

Open these links in the browser:

```text
https://your-render-site.onrender.com/api/health
https://your-render-site.onrender.com/api/database/health
https://your-render-site.onrender.com/api/database/summary
```

Good database health response:

```json
{
  "database": "mysql",
  "ok": true
}
```

Good summary response:

```json
{
  "database": "mysql",
  "ok": true,
  "summary": {
    "users": 8,
    "meals": 3,
    "laundry_baskets": 4
  }
}
```

The exact numbers can grow as users add records.

## Demo Login

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

## Common Deployment Errors

### Login service error: Name or service not known

Example:

```text
Can't connect to MySQL server on 'mysql-...aivencloud.com' ([Errno -2] Name or service not known)
```

Meaning:

Render cannot resolve the MySQL hostname.

Fix:

1. Open Aiven.
2. Copy the public MySQL Service URI again.
3. Replace Render `DATABASE_URL`.
4. Make sure the Aiven service is running.
5. Redeploy on Render.

### cryptography package is required

Meaning:

The MySQL driver needs `cryptography` for Aiven's authentication method.

Fix:

1. Confirm `requirements.txt` contains `cryptography`.
2. Push the file to GitHub.
3. Redeploy on Render.

### Access denied for user

Meaning:

The username or password in `DATABASE_URL` is wrong.

Fix:

Copy the full Aiven Service URI again and update Render `DATABASE_URL`.

### Website loads slowly at first

Render free services can sleep after inactivity. The first visit may take time while the server wakes up.

Ways to improve:

- Upgrade Render plan for no sleeping.
- Keep API responses paginated.
- Use cached frontend data and loading skeletons.
- Keep images compressed.

### Frontend works but backend fails on phone

In production, use the Render link, not `localhost`.

This is correct on phone:

```text
https://your-render-site.onrender.com
```

This is not correct on phone:

```text
http://localhost:3000
http://localhost:4000
```

On a phone, `localhost` means the phone itself, not your laptop.

## Local Development

Open project folder:

```powershell
cd "C:\Users\HP ELITEBOOK 1040 G7\Documents\myadds-main\myadds-main"
```

Install packages:

```powershell
npm install
pip install -r requirements.txt
```

Start backend:

```powershell
python server\app.py
```

Start frontend:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

Backend health:

```text
http://localhost:4000/api/health
```

## Local MySQL Test

In PowerShell, set `DATABASE_URL` for the current terminal:

```powershell
$env:DATABASE_URL="mysql://avnadmin:YOUR_PASSWORD@PUBLIC_AIVEN_HOST:PORT/defaultdb?ssl-mode=REQUIRED"
python server\app.py
```

Then open:

```text
http://localhost:4000/api/database/health
```

If `DATABASE_URL` is not set, the backend uses local SQLite at:

```text
server/data/hams.sqlite
```

## Data Migration Note

Old SQLite records do not automatically move to MySQL just because `DATABASE_URL` is changed. To move records, use the migration script if it exists in the project:

```powershell
python scripts\migrate_sqlite_to_mysql.py
```

After migration, verify:

```text
https://your-render-site.onrender.com/api/database/summary
```

## Production Checklist

- GitHub repo has latest code.
- Render service is connected to the repo.
- `DATABASE_URL` points to public Aiven MySQL.
- `SECRET_KEY` is set.
- `/api/health` returns ok.
- `/api/database/health` returns MySQL ok.
- Login works for admin.
- Student, kitchen, laundry, and admin dashboards load.
- PWA logo and browser favicon display.
- Mobile layout is tested from a phone using the Render URL.
