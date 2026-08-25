# Sentinel

Sentinel is an email threat detection and forensic intelligence platform.  
It helps analyze suspicious emails, detect phishing/spoofing signals, trace likely origin paths, and generate investigation-ready outputs.

This repository is set up for local development.

## Quick Start

1. Set up Supabase and run `supabase/schema.sql`.
2. Start ML service:
   - `cd backend/ml-service`
   - create/activate venv, install requirements, run on port `8000`
3. Start backend:
   - `cd backend`
   - install deps, configure `.env`, run `npm run dev` on port `4000`
4. Start frontend:
   - `cd frontend`
   - install deps, configure `.env`, run `npm run dev` on port `5173`
5. Open the app at `http://localhost:5173`

## Project Overview

```
frontend/            React + Vite + Tailwind UI
backend/             Node.js + Express API (auth, cases, reports, integrations)
backend/ml-service/  Python FastAPI service (email parsing, detection, geolocation)
supabase/            PostgreSQL schema and RLS policies
```

## Features

- Email phishing and impersonation signal detection
- Header and relay path analysis
- Origin IP and domain intelligence checks
- Case-based investigation workflow
- Forensic reporting support

## How to Run Locally

Run all three services at the same time:
- ML Service (Python) on `http://localhost:8000`
- Backend API (Node.js) on `http://localhost:4000`
- Frontend (React) on `http://localhost:5173`

### 1) ML Service

```bash
cd backend/ml-service
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # optional: add GROQ_API_KEY or GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

### 2) Backend API

```bash
cd backend
npm install
cp .env.example .env
```

Add required values to `backend/.env`:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `ML_SERVICE_URL=http://localhost:8000`

Start backend:

```bash
npm run dev
```

### 3) Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Add to `frontend/.env`:
- `VITE_API_URL=http://localhost:4000`

Start frontend:

```bash
npm run dev
```

## Database Setup (Supabase)

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Copy Supabase project credentials and JWT secret into `backend/.env`.
