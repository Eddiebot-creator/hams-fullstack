<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2a4cc2d4-a70a-4142-b08c-bc13b3295a99

## Run Locally

**Prerequisites:**  Node.js and Python


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend and database

Install the Flask dependency:

`pip install -r requirements.txt`

Start the SQLite-backed Flask API in one terminal:

`npm run api`

Start the frontend in another terminal:

`npm run dev`

The API runs on `http://localhost:4000` and stores data in `server/data/hams.sqlite`. Demo login details use `{role}@example.com` with password `password`, for example `student@example.com`.
