# Sentinel — AI Email Threat Detection, GeoLocation & Forensic Intelligence Platform

Built for SIH 2026 — PS 26106 (AICTE, Cyber Security Cell)

Detects phishing/spoofed/impersonated emails, traces their transmission path,
geolocates probable origin, and generates forensic reports for investigators.

## Live Links

- **Frontend**: `https://masteryashgupta.github.io/sentinel`
- **Backend API**: `https://sentinel-backend-c48y.onrender.com`
- **ML Service**: `https://sentinel-ml-service.onrender.com`

## Architecture

```
frontend/          React + Vite + Tailwind  → deploy to GitHub Pages
backend/            Node/Express (orchestration, auth, cases)  → deploy to Railway
backend/ml-service/  Python FastAPI (parsing, NLP, geolocation) → deploy to Railway (2nd service)
supabase/            SQL schema for Postgres
```

Data flow:

```
Browser → GitHub Pages (frontend)
               │  REST
               ▼
         Railway: Node backend  ──REST──▶  Railway: Python ml-service
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

### Frontend → GitHub Pages
- This is fully automated via GitHub Actions (`.github/workflows/deploy-frontend.yml`).
- Every push to the `main` branch automatically builds the React app and deploys it.
- **Base path**: Configured in `vite.config.js` to `/sentinel/`.
- **SPA Routing**: Handled seamlessly by copying `index.html` to `404.html` during the build step.

### Backend → Railway (Node Service)
- Connect repository to Railway dashboard.
- **Root Directory**: `backend/`
- Build command: `npm install` (Auto-detected)
- Start command: `npm start` (Auto-detected)
- Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ML_SERVICE_URL` (the ML service's Railway URL).

### ML service → Railway (Python Service)
- Connect repository to Railway dashboard.
- **Root Directory**: `backend/ml-service/`
- Build command: `pip install -r requirements.txt` (Auto-detected)
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Read directly from the `Procfile` included in the repo).
- Env vars: `GROQ_API_KEY` (or `GEMINI_API_KEY`) — optional, falls back to rule-based scoring if absent.

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
