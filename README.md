# HAMS Web App - Arranged Frontend and Backend

This project has been reorganized into a clean structure:

```text
hams-web-arranged/
  frontend/        React + Vite frontend
  backend/         Flask backend API and database files
  docs/            Documentation and fix notes
  render.yaml      Render deployment config
  package.json     Root helper scripts
```

## Run locally

Open two VS Code terminals.

### Terminal 1 - Backend

```powershell
cd "YOUR_PROJECT_FOLDER"
pip install -r backend/requirements.txt
python backend/server/app.py
```

The backend runs on:

```text
http://localhost:4000
```

### Terminal 2 - Frontend

```powershell
cd "YOUR_PROJECT_FOLDER"
npm install --prefix frontend
npm run dev --prefix frontend
```

The frontend runs on:

```text
http://localhost:3000
```

## Build frontend

```powershell
npm run build --prefix frontend
```

## GitHub push

After copying these files into your GitHub repo:

```powershell
git status
git add .
git commit -m "Arrange frontend backend and apply HAMS fixes"
git push origin main
```

## Important files

- Frontend pages: `frontend/src/pages`
- Frontend API connection: `frontend/src/lib/api.ts`
- Backend API: `backend/server/app.py`
- Database files: `backend/server/data`
- Fix notes: `docs/FIXES_APPLIED.md`

## Arrangement note

The frontend `package.json` has been cleaned so backend-only Node packages are no longer installed in the frontend folder. The Flask backend uses `backend/requirements.txt`.
