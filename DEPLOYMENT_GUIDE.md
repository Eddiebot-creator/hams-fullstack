# Permanent Online Deployment Guide

## Goal

This guide explains how to make the HAMS project permanently accessible online from any phone or computer.

The recommended simple deployment is:

```text
Render Web Service
Flask backend
React frontend build served by Flask
SQLite database stored on a Render persistent disk
```

## Files Added For Deployment

```text
render.yaml
runtime.txt
requirements.txt
server/app.py
```

## How Production Works

In development, the frontend runs on:

```text
http://localhost:3000
```

and the backend runs on:

```text
http://localhost:4000
```

In production, Render will build the React frontend into:

```text
dist/
```

Then Flask will serve that frontend and the backend API from the same website.

Example production URL:

```text
https://hams-fullstack.onrender.com
```

API examples:

```text
https://hams-fullstack.onrender.com/api/health
https://hams-fullstack.onrender.com/api/students
```

## Render Setup Steps

### 1. Push Project To GitHub

Create a GitHub repository and upload this project folder:

```text
C:\Users\HP ELITEBOOK 1040 G7\Documents\myadds-main\myadds-main
```

The repository should include:

```text
server/app.py
src/
package.json
requirements.txt
render.yaml
runtime.txt
```

### 2. Create Render Account

Go to:

```text
https://render.com
```

Sign up or log in.

### 3. Create Blueprint

On Render:

```text
New
Blueprint
```

Connect your GitHub repository.

Render will detect:

```text
render.yaml
```

and create the web service.

### 4. Render Build Command

The project already includes this in `render.yaml`:

```text
pip install -r requirements.txt
npm install
npm run build
```

This installs Python dependencies, installs frontend dependencies, and builds React.

### 5. Render Start Command

The project already includes this:

```text
gunicorn server.app:app
```

This starts Flask in production mode.

### 6. Database Storage

The project uses SQLite.

On Render free tier, persistent disks are not supported. The app will still create and seed SQLite automatically, but the database can reset when the service is rebuilt or redeployed.

Local/default database path:

```text
server/data/hams.sqlite
```

For a school demo, this is acceptable because the backend seeds the database again automatically.

For a real permanent database, use one of these options:

```text
Render paid web service with persistent disk
Hosted PostgreSQL such as Neon, Supabase, or Render PostgreSQL
```

## Important Notes

The free Render plan may sleep after inactivity. When someone opens the website after it sleeps, it may take some time to wake up.

For a bigger real production system, PostgreSQL is better than SQLite.

## How To Test After Deployment

Open:

```text
https://your-render-link.onrender.com/api/health
```

Expected response:

```json
{
  "ok": true
}
```

Then open:

```text
https://your-render-link.onrender.com
```

Try logging in with:

```text
student@example.com
kitchen@example.com
laundry@example.com
admin@example.com
```

Password:

```text
password
```

## Local Commands Still Work

Backend:

```powershell
python server\app.py
```

Frontend:

```powershell
npm run dev
```

Production build test:

```powershell
npm run build
python server\app.py
```

Then open:

```text
http://localhost:4000
```

This tests Flask serving the built frontend locally.
