# HAMS Web App

HAMS is a full-stack Hostel Add-on Management System with a React/Vite frontend, Flask backend, and MySQL database support.

## Project Structure

```text
myadds-main/
  src/                 React frontend pages, components, and API client
  public/              Logo, manifest, and service worker
  server/              Flask backend API
  scripts/             Database migration helpers
  package.json         Frontend scripts and dependencies
  requirements.txt     Python backend dependencies
  render.yaml          Render deployment blueprint
```

## Run Locally

Open two VS Code terminals from this project folder.

### Terminal 1 - Backend

```powershell
pip install -r requirements.txt
python server/app.py
```

Backend:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

### Terminal 2 - Frontend

```powershell
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

## Build

```powershell
npm run build
```

## Deploy

Push the repo to GitHub, then deploy on Render with Blueprint. Render reads `render.yaml`, installs Python and Node dependencies, builds the frontend, and starts Flask with Gunicorn.

Set `DATABASE_URL` on Render to your MySQL connection string.

## Key Files

- Frontend API client: `src/lib/api.ts`
- Offline queue: `src/lib/offlineQueue.ts`
- Offline sync: `src/lib/offlineSync.ts`
- Backend API: `server/app.py`
- Deployment config: `render.yaml`

