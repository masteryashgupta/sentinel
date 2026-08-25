# Sentinel — AI Email Threat Detection, GeoLocation & Forensic Intelligence Platform

Built for SIH 2026 — PS 26106 (AICTE, Cyber Security Cell)

Detects phishing/spoofed/impersonated emails, traces their transmission path, geolocates probable origin, and generates forensic reports for investigators.

**Note:** This repository is currently configured for **local development and execution only**. All cloud deployment configurations have been removed to ensure complete control over the local environment and data isolation.

## Architecture & Features

```
frontend/            React + Vite + Tailwind (Premium Dark Mode UI)
backend/             Node/Express (Orchestration, Auth, Gmail OAuth, Cases)
backend/ml-service/  Python FastAPI (Parsing, NLP, Geolocation)
supabase/            PostgreSQL with strict Row-Level Security (RLS)
```

**Key Security & Design Implementations:**
- **Zero-Trust Database Access:** Operations are enforced via JWT token-scoped Supabase clients. Row-Level Security (RLS) is active on all tables, ensuring strict data isolation per user.
- **Gmail OAuth Flow:** Integrated secure Gmail connection capabilities to seamlessly import and analyze live inbox data.
- **Premium UI/UX:** A state-of-the-art dark mode aesthetic featuring glassmorphism, modern typography (Inter/Outfit), and interactive micro-animations.

---

## 1. Local Setup

You must run three separate local servers (Frontend, Backend, and ML Service) concurrently.

### ML Service (Python)
```bash
cd backend/ml-service
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add GROQ_API_KEY or GEMINI_API_KEY (optional)
uvicorn app.main:app --reload --port 8000
```

### Backend API (Node)
```bash
cd backend
npm install
cp .env.example .env            
# Add the following to your .env:
# SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY
# SUPABASE_JWT_SECRET
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
# ML_SERVICE_URL=http://localhost:8000
npm run dev                     # runs on port 4000
```

### Frontend (React)
```bash
cd frontend
npm install
cp .env.example .env            
# Add the following to your .env:
# VITE_API_URL=http://localhost:4000
npm run dev                     # runs on port 5173
```

---

## 2. Database Setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Open the SQL editor, paste the contents of `supabase/schema.sql`, and run it. This will build the tables and enable RLS policies.
3. Copy your Project URL, `anon` public key, `service_role` key, and JWT Secret into `backend/.env`.

---

## 3. What Each Module Does (Maps to PS 26106 Key Components)

| PS Component | Implementation |
|---|---|
| Fraudulent Email Detection Engine | `ml-service/app/detection.py` — LLM classification + rule-based BEC/phishing flags |
| Email Header & Protocol Analysis | `ml-service/app/header_parser.py` — SPF/DKIM/DMARC, Return-Path/Reply-To mismatch, relay-chain anomalies |
| Origin Traceability & Location | `ml-service/app/geolocation.py` — IP extraction, geolocation, WHOIS domain-age |
| Identity Correlation & Attribution | `backend/src/lib/campaigns.js` — shared-attribute clustering into campaigns |
| Alerting, Dashboard, Forensic Reporting | `frontend/src/pages/*` + `backend/src/routes/reports.js` |

---

## 4. Honest Scope (Say this in your pitch)

- VPN/Tor/botnet detection uses free-tier IP-org heuristics, not commercial threat-intel (Maxmind/GreyNoise). We flag "likely hosting/proxy," not confirmed anonymization infra.
- Attribution output is an **investigative lead**, not a legal identification — final attribution needs subpoena power and telecom/ISP cooperation we don't have.
- The LLM classifier is a strong first pass; for production use, it'd need fine-tuning on a larger labeled BEC corpus than what's publicly available.
