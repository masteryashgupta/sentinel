import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app import header_parser, geolocation, detection

load_dotenv()

app = FastAPI(title="Sentinel ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the Node backend's URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dedicated thread pool for all blocking external calls (requests, WHOIS, socket/DNS).
# max_workers=10 supports concurrency for the external lookups without spawning
# unlimited threads; each /analyze fires at most 3-4 blocking tasks.
_IO_EXECUTOR = ThreadPoolExecutor(max_workers=10, thread_name_prefix="sentinel-io")


from app.detection import GROQ_API_KEY, GEMINI_API_KEY

@app.get("/")
def root():
    return {"status": "ok", "service": "sentinel-ml-service"}

@app.get("/health")
def health():
    ai_status = "online" if (GROQ_API_KEY or GEMINI_API_KEY) else "offline"
    return {
        "status": "ok", 
        "service": "sentinel-ml-service",
        "ai_engine": ai_status
    }


@app.post("/analyze")
async def analyze_email(file: UploadFile = File(...)):
    """
    Full forensic analysis pipeline for a single .eml file.
    Runs all PS 26106 key components and returns one unified result object.

    Performance: all independent external I/O (IP geolocation, WHOIS, MX DNS,
    SPF DNS, Tor exit-node check) now runs concurrently via asyncio.gather()
    using a shared ThreadPoolExecutor, so total wall-clock time ≈ slowest
    single lookup instead of the sum of all lookups.
    """
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    loop = asyncio.get_event_loop()

    def _run(fn, *args):
        """Helper: schedule a synchronous blocking function in the IO thread pool."""
        return loop.run_in_executor(_IO_EXECUTOR, fn, *args)

    # ── Step 1: Pure CPU — parse raw headers (no I/O, run inline) ──────────────
    parsed = header_parser.parse_email(raw_bytes)
    auth   = header_parser.check_authentication(parsed["raw_headers"])

    # Extract derived values needed for later steps
    origin_ip = header_parser.extract_earliest_untrusted_ip(parsed["received_chain"])

    from_domain = ""
    if parsed.get("from_address") and "@" in parsed["from_address"]:
        from_domain = parsed["from_address"].split("@")[-1]

    # ── Step 2: Concurrent I/O fan-out ─────────────────────────────────────────
    # The four external calls are fully independent of each other:
    #   • IP geolocation (ip-api.com HTTP + rDNS socket + Tor cache check)
    #   • WHOIS (socket/TCP to WHOIS servers)
    #   • MX record DNS lookup (dns.resolver)
    # All run in parallel, bounded by individual timeouts inside each function.
    geo_future    = _run(geolocation.geolocate_ip,          origin_ip)  if origin_ip   else None
    whois_future  = _run(geolocation.domain_intelligence,   from_domain) if from_domain else None
    mx_future     = _run(geolocation.check_mx_infrastructure, from_domain, parsed["received_chain"]) if from_domain else None

    async def _noop_dict():
        return {}

    async def _noop_none():
        return None

    # Resolve all concurrent futures together
    gathered = await asyncio.gather(
        geo_future   if geo_future   else _noop_dict(),
        whois_future if whois_future else _noop_dict(),
        mx_future    if mx_future    else _noop_none(),
        return_exceptions=True,
    )

    ip_intel      = gathered[0] if not isinstance(gathered[0], Exception) else {}
    domain_intel  = gathered[1] if not isinstance(gathered[1], Exception) else {}
    mx_anomaly    = gathered[2] if not isinstance(gathered[2], Exception) else None

    # ── Step 3: Header anomaly detection (CPU + already-cached SPF DNS) ────────
    # check_authorized_infrastructure does one DNS TXT lookup (4 s lifetime);
    # run it in executor too so it doesn't block the event loop.
    anomalies_future = _run(
        header_parser.detect_header_anomalies, parsed, auth, origin_ip, ip_intel
    )
    anomalies = await anomalies_future
    if mx_anomaly:
        if auth.get("spf") == "pass":
            mx_anomaly["severity"] = "low"
        anomalies.append(mx_anomaly)

    # ── Step 4: Rule-based + LLM scoring (pure CPU/regex — run inline) ─────────
    rule_result = detection.rule_based_score(parsed.get("subject"), parsed.get("body_text"))
    llm_result  = detection.llm_classify(parsed.get("subject"), parsed.get("body_text"), auth)

    # ── Step 5: Aggregate into one explainable score ───────────────────────────
    scoring = detection.aggregate_score(rule_result, llm_result, anomalies, domain_intel, ip_intel, auth)

    # ── Step 6: Extract correlation indicators ─────────────────────────────────
    indicators = []
    if origin_ip:
        indicators.append({"type": "ip",     "value": origin_ip})
    if from_domain:
        indicators.append({"type": "domain", "value": from_domain})
    if parsed.get("dkim_key"):
        indicators.append({"type": "dkim_key", "value": parsed["dkim_key"]})
    for url in rule_result.get("urls_found", []):
        indicators.append({"type": "url", "value": url})

    return {
        "email": {
            "subject":          parsed.get("subject"),
            "from_address":     parsed.get("from_address"),
            "from_display_name":parsed.get("from_display_name"),
            "return_path":      parsed.get("return_path"),
            "reply_to":         parsed.get("reply_to"),
            "message_id":       parsed.get("message_id"),
            "sender_domain":    from_domain,
            "attachments":      parsed.get("attachments", []),
        },
        "authentication":    auth,
        "header_anomalies":  anomalies,
        "origin": {
            "ip": origin_ip,
            **ip_intel,
        },
        "domain_intelligence": domain_intel,
        "detection": {
            "rule_based": rule_result,
            "llm":        llm_result,
        },
        "scoring":    scoring,
        "indicators": indicators,
    }
