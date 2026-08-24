# Sentinel — AI Email Threat Detection, GeoLocation & Forensic Intelligence Platform

Built for SIH 2026 — PS 26106 (AICTE, Cyber Security Cell)

Detects phishing/spoofed/impersonated emails, traces their transmission path,
geolocates probable origin, and generates forensic reports for investigators.

## Architecture

```
frontend/          React + Vite + Tailwind  → deploy to Vercel
backend/            Node/Express (orchestration, auth, cases)  → deploy to Render
backend/ml-service/  Python FastAPI (parsing, NLP, geolocation) → deploy to Render (2nd service)
supabase/            SQL schema for Postgres
```

Data flow:

```
Browser → Vercel (frontend)
              │  REST
              ▼
        Render: Node backend  ──REST──▶  Render: Python ml-service
              │                                │
              ▼                                ▼
         Supabase Postgres            mailparser / SPF-DKIM-DMARC /
         (cases, indicators,          IP geolocation / WHOIS /
          alerts, campaigns)          LLM classification
```

## 1. Local setup

### ml-service (Python)
```bash
cd backend/ml-service
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add GROQ_API_KEY or GEMINI_API_KEY (optional)
uvicorn app.main:app --reload --port 8000
```

### backend (Node)
```bash
cd backend
npm install
cp .env.example .env            # add SUPABASE_URL, SUPABASE_KEY, ML_SERVICE_URL
npm run dev                     # runs on port 4000
```

### frontend (React)
```bash
cd frontend
npm install
cp .env.example .env            # add VITE_API_URL=http://localhost:4000
npm run dev                     # runs on port 5173
```

## 2. Database setup (Supabase)

1. Create a project at supabase.com (free tier)
2. Open the SQL editor, paste the contents of `supabase/schema.sql`, run it
3. Copy your Project URL + `anon` public key into `backend/.env`

## 3. Deployment

### Frontend → Vercel
- Import the repo, set **Root Directory** to `frontend`
- Framework preset: Vite
- Env var: `VITE_API_URL` = your Render backend URL
- Deploy — free Hobby tier, zero config beyond that

### Backend → Render (Web Service #1)
- New Web Service, **Root Directory**: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ML_SERVICE_URL` (the ml-service's Render URL)
- Free tier is fine for the demo

### ML service → Render (Web Service #2)
- New Web Service, **Root Directory**: `backend/ml-service`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars: `GROQ_API_KEY` (or `GEMINI_API_KEY`) — optional, falls back to rule-based scoring if absent

### Keep both Render services warm
Render's free tier spins down after 15 min idle (~30-50s cold start). Use a free
uptime pinger (cron-job.org, UptimeRobot, or similar) hitting these every 10 minutes:
- `https://<your-backend>.onrender.com/api/health`
- `https://<your-ml-service>.onrender.com/health`

## 4. What each module does (maps to PS 26106 key components)

| PS Component | Implementation |
|---|---|
| Fraudulent Email Detection Engine | `ml-service/app/detection.py` — LLM classification + rule-based BEC/phishing flags |
| Email Header & Protocol Analysis | `ml-service/app/header_parser.py` — SPF/DKIM/DMARC, Return-Path/Reply-To mismatch, relay-chain anomalies |
| Origin Traceability & Location | `ml-service/app/geolocation.py` — IP extraction, geolocation, WHOIS domain-age |
| Identity Correlation & Attribution | `backend/src/lib/campaigns.js` — shared-attribute clustering into campaigns |
| Alerting, Dashboard, Forensic Reporting | `frontend/src/pages/*` + `backend/src/routes/reports.js` |

## 5. Honest scope (say this in your pitch)

- VPN/Tor/botnet detection uses free-tier IP-org heuristics, not commercial threat-intel
  (Maxmind/GreyNoise). We flag "likely hosting/proxy," not confirmed anonymization infra.
- Attribution output is an **investigative lead**, not a legal identification —
  final attribution needs subpoena power and telecom/ISP cooperation we don't have.
- The LLM classifier is a strong first pass; for production use it'd need fine-tuning
  on a larger labeled BEC corpus than what's publicly available.
