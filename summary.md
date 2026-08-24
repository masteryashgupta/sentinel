# Sentinel: Email Forensic Intelligence Platform

 1. Project Overview
**Sentinel** is an advanced, automated Email Forensic Intelligence Platform built to solve Smart India Hackathon (SIH) Problem Statement **26106**. Its primary goal is to empower cyber-security analysts and investigators by completely automating the tedious process of analyzing raw email files (`.eml` and `.msg`) for spoofing, phishing, business email compromise (BEC), and malicious infrastructure.

Instead of an investigator manually digging through network headers, running WHOIS lookups, and checking cryptographic signatures, Sentinel performs a deep forensic dissection in seconds, outputting an easily understandable **Fraud Score (0-100)** and automatically clustering related attacks into **Campaigns**.

---

## 2. Core Features
*   **Cryptographic Verification:** Validates SPF, DKIM, and DMARC signatures to mathematically prove if an email is spoofed or legitimate.
*   **Network Origin Tracing:** Parses the `Received` header chain to extract the earliest untrusted sender IP.
*   **Infrastructure Intelligence:** Automatically geolocates the origin IP, performs WHOIS lookups on the sender domain, and flags Tor exit nodes, VPNs, or proxy servers.
*   **AI Contextual Analysis:** Uses **Groq (Llama-3.1-8b)** or **Gemini** to read the email's subject and body, identifying psychological manipulation, urgency cues, and BEC patterns that bypass traditional rules.
*   **Campaign Correlation:** Automatically links isolated malicious emails together based on shared Indicators of Compromise (IoCs) like identical sender IPs, domains, or DKIM keys, grouping them into trackable Campaigns.
*   **Automated Threat Alerting:** Generates high-priority alerts for investigators when critical thresholds are breached (e.g., detecting highly malicious infrastructure).

---

## 3. Technology Stack

### Frontend (Client UI)
*   **Framework:** React (Vite)
*   **Routing:** React Router DOM
*   **Styling:** Tailwind CSS (with custom CSS variables for dynamic theming)
*   **Icons:** Lucide React
*   **Deployment:** GitHub Pages (`gh-pages`)

### Node.js Backend (API Gateway & Database Interface)
*   **Framework:** Node.js with Express.js
*   **File Handling:** Multer (for parsing `.eml` uploads in memory)
*   **Database Client:** `@supabase/supabase-js`
*   **Role:** Acts as the central orchestrator. It handles client requests, uploads files, routes the raw email buffer to the ML service, processes the ML results, runs campaign correlation logic, and persists all data to Supabase.
*   **Deployment:** Render (Web Service)

### Python ML Service (Forensic Engine)
*   **Framework:** Python 3.11 with FastAPI
*   **Concurrency:** `asyncio` and `ThreadPoolExecutor` for high-speed concurrent I/O (DNS lookups, WHOIS, Geolocation).
*   **Email Parsing:** Standard Python `email` library for dissecting raw bytes into headers, body, and attachments.
*   **AI/LLM Integration:** `requests` to query Groq and Gemini APIs.
*   **DNS & Network:** `dnspython` for MX/TXT record lookups.
*   **Role:** The heavy-lifting forensic engine. Takes a raw `.eml` file, completely shreds it, analyzes the pieces, asks AI for an opinion, and returns a massive JSON object representing the fraud assessment.
*   **Deployment:** Render (Web Service)

### Database
*   **Platform:** Supabase (PostgreSQL)

---

## 4. Database Schema (Supabase)

Sentinel relies on four primary PostgreSQL tables to maintain state:

### `cases`
Stores individual email investigations.
*   `id` (UUID)
*   `subject` (Text)
*   `from_address` (Text)
*   `received_at` (Timestamp)
*   `status` (Enum: open, investigating, closed)
*   `fraud_score` (Integer 0-100)
*   `analysis_results` (JSONB) - *Stores the entire deep forensic JSON returned by the ML Service.*
*   `campaign_id` (UUID, Foreign Key to campaigns)
*   `created_at` (Timestamp)

### `campaigns`
Clusters multiple `cases` together based on shared threat indicators.
*   `id` (UUID)
*   `name` (Text) - e.g., "Spoofed Domain Campaign"
*   `status` (Enum: active, mitigated, closed)
*   `indicator_type` (Text) - e.g., 'ip', 'domain', 'dkim_key'
*   `indicator_value` (Text) - The actual shared value (e.g., '192.168.1.5')
*   `case_count` (Integer) - Automatically incremented.
*   `first_seen` / `last_seen` (Timestamps)
*   `created_at` (Timestamp)

### `alerts`
High-priority notifications for analysts.
*   `id` (UUID)
*   `title` (Text)
*   `severity` (Enum: critical, high, medium, low)
*   `description` (Text)
*   `related_campaign_id` (UUID, Foreign Key)
*   `acknowledged` (Boolean)
*   `created_at` (Timestamp)

### `blacklist`
A custom threat-intel feed managed by investigators to auto-flag known bad actors.
*   `id` (UUID)
*   `type` (Enum: ip, domain, email)
*   `value` (Text)
*   `reason` (Text)
*   `active` (Boolean)
*   `created_at` (Timestamp)

---

## 5. Deployment Architecture

The platform is deployed entirely on free-tier, highly scalable cloud infrastructure:

1.  **Frontend (React/Vite) -> GitHub Pages**
    *   Served statically via GitHub Actions.
    *   The frontend uses environment variables (`VITE_API_URL`) to communicate with the Node Backend.
2.  **Node.js Backend -> Render (Web Service)**
    *   Deployed via Render's GitHub integration.
    *   Communicates securely over HTTPS with both Supabase and the Python ML Service.
    *   Contains environment variables for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ML_SERVICE_URL`.
3.  **Python ML Service -> Render (Web Service)**
    *   Deployed via Render (configured to use Python 3.11).
    *   Runs a FastAPI Uvicorn server.
    *   Contains environment variables for AI keys (`GROQ_API_KEY`, `GEMINI_API_KEY`).
4.  **Database -> Supabase**
    *   Managed serverless PostgreSQL database securely storing all relational data and JSON blobs.
