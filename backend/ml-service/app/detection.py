"""
Fraudulent Email Detection Engine
Maps to PS 26106 component: "Fraudulent Email Detection Engine"

Two-layer approach:
  1. Fast, deterministic rule-based flags (urgency cues, BEC patterns, lookalike URLs)
  2. Optional LLM classification for nuanced social-engineering language detection
     (falls back gracefully to rule-only scoring if no API key is configured —
     the platform never breaks in a demo because a key wasn't set)
"""
import os
import re
import json
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

URGENCY_PATTERNS = [
    r"\burgent(ly)?\b", r"\bimmediate(ly)?\b", r"\bact now\b", r"\bwithin 24 hours\b",
    r"\baccount (will be )?(suspend|clos|lock)", r"\bverify your account\b",
    r"\bfailure to (comply|respond)\b",
]

BEC_PATTERNS = [
    r"\bwire transfer\b", r"\bupdate(d)? (your |our )?bank (details|account)\b",
    r"\bgift card(s)?\b", r"\binvoice (attached|update|correction)\b",
    r"\bchange of (payment|account) details\b", r"\bpayroll (change|update)\b",
]

CREDENTIAL_HARVEST_PATTERNS = [
    r"\bclick (here|below) to (verify|confirm|login|log in)\b",
    r"\breset your password\b", r"\bconfirm your (identity|credentials)\b",
]

URL_PATTERN = re.compile(r"https?://[^\s<>\"']+")
SHORTENER_DOMAINS = {"bit.ly", "tinyurl.com", "t.co", "ow.ly", "is.gd"}
CORPORATE_SHORTENERS = {"c.gle", "g.co", "goo.gl", "fb.me", "amzn.to", "msft.it", "youtu.be"}


def detect_obfuscated_urls(urls: list[str]) -> list[dict]:
    """Flag URLs using link shorteners or raw IP addresses."""
    findings = []
    ip_url_pattern = re.compile(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
    
    seen_domains = set()
    seen_ips = set()
    
    for url in urls:
        domain_match = re.search(r"https?://([^/]+)", url)
        if not domain_match:
            continue
        domain = domain_match.group(1).lower().split(":")[0]

        if domain in CORPORATE_SHORTENERS:
            continue

        if domain in SHORTENER_DOMAINS:
            if domain not in seen_domains:
                findings.append({
                    "type": "obfuscated_url",
                    "severity": "medium",
                    "detail": f"URL '{url}' uses known link-shortener domain ({domain}) to obscure destination.",
                    "url": url,
                })
                seen_domains.add(domain)
        elif ip_url_pattern.match(url):
            if domain not in seen_ips:
                findings.append({
                    "type": "obfuscated_url",
                    "severity": "high",
                    "detail": f"URL '{url}' uses direct IP address instead of domain name.",
                    "url": url,
                })
                seen_ips.add(domain)
    return findings


def rule_based_score(subject: str, body: str) -> dict:
    text = f"{subject or ''} {body or ''}".lower()
    flags = []

    def scan(patterns, label, weight):
        hits = [p for p in patterns if re.search(p, text, re.IGNORECASE)]
        if hits:
            flags.append({"category": label, "weight": weight, "matched_patterns": len(hits)})
        return len(hits)

    urgency_hits = scan(URGENCY_PATTERNS, "urgency_language", 15)
    bec_hits = scan(BEC_PATTERNS, "business_email_compromise", 30)
    cred_hits = scan(CREDENTIAL_HARVEST_PATTERNS, "credential_harvesting", 25)

    urls = URL_PATTERN.findall(body or "")
    
    suspicious_urls = []
    seen_suspicious_domains = set()
    for u in urls:
        if _looks_like_lookalike(u):
            domain_match = re.search(r"https?://([^/]+)", u)
            domain = domain_match.group(1).lower().split(":")[0] if domain_match else u
            if domain not in seen_suspicious_domains:
                suspicious_urls.append(u)
                seen_suspicious_domains.add(domain)

    if suspicious_urls:
        flags.append({"category": "suspicious_urls", "weight": 20, "urls": suspicious_urls[:5]})

    obfuscated_url_findings = detect_obfuscated_urls(urls)
    if obfuscated_url_findings:
        flags.append({"category": "obfuscated_urls", "weight": 20, "findings": obfuscated_url_findings})

    score = min(100, urgency_hits * 15 + bec_hits * 30 + cred_hits * 25 + len(suspicious_urls) * 20 + len(obfuscated_url_findings) * 20)

    return {
        "rule_score": score,
        "flags": flags,
        "urls_found": urls[:10],
        "obfuscated_url_findings": obfuscated_url_findings,
    }


def _looks_like_lookalike(url: str) -> bool:
    """Very cheap lookalike-domain heuristic: brand keyword + non-brand TLD/domain."""
    known_brands = ["paypal", "microsoft", "google", "amazon", "apple", "bankofamerica", "chase"]
    allowed_suffixes = [
        "googleapis.com", "googleusercontent.com", "gstatic.com", "googlevideo.com",
        "microsoftonline.com", "live.com", "office.com"
    ]
    
    domain_match = re.search(r"https?://([^/]+)", url)
    if not domain_match:
        return False
    domain = domain_match.group(1).lower().split(":")[0]
    
    for suffix in allowed_suffixes:
        if domain == suffix or domain.endswith("." + suffix):
            return False

    for brand in known_brands:
        if brand in domain and not domain.endswith(f"{brand}.com"):
            return True
    # digit-for-letter substitution check e.g. paypa1.com
    if re.search(r"[a-z]+\d[a-z]*\.(com|net|org)", domain):
        return True
    return False


def llm_classify(subject: str, body: str, auth: dict) -> dict | None:
    """Optional LLM pass for nuanced classification. Returns None if no key configured."""
    spf = auth.get("spf", "unknown")
    dkim = auth.get("dkim", "unknown")
    dmarc = auth.get("dmarc", "unknown")

    prompt = (
        "You are a cybersecurity analyst. Classify this email as one of: "
        "legitimate, suspicious, impersonation, phishing, business_email_compromise. "
        "Also list up to 3 short phrases (verbatim, under 8 words) that most influenced your decision, "
        "and give a confidence score 0-100.\n\n"
        f"Subject: {subject}\n\nBody:\n{(body or '')[:3000]}\n\n"
        f"Authentication results for this email: SPF={spf}, DKIM={dkim}, DMARC={dmarc}. "
        "A message that passes all three checks is cryptographically verified as coming from an "
        "authorized server for its claimed domain — weigh this heavily when assessing impersonation risk, "
        "since impersonation typically requires spoofing that these checks would catch.\n\n"
        "Respond ONLY as JSON: "
        '{"category": "...", "confidence": 0, "flagged_phrases": ["...", "..."], "reasoning": "..."}'
    )

    if GROQ_API_KEY:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "qwen/qwen3.6-27b",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 4096,
                },
                timeout=45,
            )
            content = resp.json()["choices"][0]["message"]["content"]
            return _safe_json_parse(content)
        except Exception as e:
            return {"error": str(e)}

    if GEMINI_API_KEY:
        try:
            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15,
            )
            content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return _safe_json_parse(content)
        except Exception as e:
            return {"error": str(e)}

    return None  # no key configured — caller falls back to rule-only scoring


def _safe_json_parse(text: str) -> dict:
    # Strip <think>...</think> blocks (often added by reasoning models) even if unclosed
    text = re.sub(r"<think>.*?(</think>|$)", "", text, flags=re.DOTALL).strip()
    
    text = re.sub(r"^```json\s*|\s*```$", "", text.strip())
    try:
        return json.loads(text)
    except Exception:
        # If it's still not valid JSON, strip markdown bold asterisks to make it cleaner plain text
        clean_text = text.replace("**", "")
        return {"raw_response": clean_text}


def llm_summarize_report(report_data: dict) -> dict | None:
    """Uses LLM to summarize the case details and explain the risk factors."""
    prompt = (
        "You are a senior cybersecurity analyst reviewing a forensic email report. "
        "Summarize the findings in 2-3 concise paragraphs, intended for another security analyst. "
        "Highlight the most critical anomalies, explain the likely attack vector (e.g., BEC, phishing, credential harvesting), "
        "and give a final verdict on why this email was flagged with its current score.\n\n"
        f"Report Data:\n{json.dumps(report_data, indent=2)}\n\n"
        "Respond ONLY as JSON: "
        '{"summary": "Your detailed 2-3 paragraph summary here..."}'
    )

    if GROQ_API_KEY:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "qwen/qwen3.6-27b",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 4096,
                },
                timeout=45,
            )
            if resp.status_code != 200:
                return {"error": f"Groq API Error ({resp.status_code}): {resp.text}"}
            content = resp.json()["choices"][0]["message"]["content"]
            return _safe_json_parse(content)
        except Exception as e:
            return {"error": f"Groq internal error: {str(e)}"}

    if GEMINI_API_KEY:
        try:
            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15,
            )
            if resp.status_code != 200:
                return {"error": f"Gemini API Error ({resp.status_code}): {resp.text}"}
            content = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return _safe_json_parse(content)
        except Exception as e:
            return {"error": f"Gemini internal error: {str(e)}"}

    return {"error": "No LLM API key configured"}


def aggregate_score(rule_result: dict, llm_result: dict | None,
                      header_anomalies: list, domain_intel: dict,
                      ip_intel: dict, auth: dict) -> dict:
    """
    Combine all signals into one explainable fraud score.
    Transparent weighting — every contributing factor is listed, not a black box.
    """
    score = rule_result["rule_score"] * 0.4  # rules contribute up to 40 pts

    high_sev_headers = [a for a in header_anomalies if a.get("severity") == "high"]

    if llm_result and "confidence" in llm_result:
        llm_points = llm_result["confidence"] * 0.4
        
        # Trust hierarchy: cryptographic verification outranks LLM text analysis.
        # If fully authenticated, rule-clean, and no high-severity headers, cap LLM influence.
        fully_auth = auth.get("spf") == "pass" and auth.get("dkim") == "pass" and auth.get("dmarc") == "pass"
        if fully_auth and len(high_sev_headers) == 0 and rule_result["rule_score"] <= 10:
            llm_points = min(llm_points, 15)  # Cap LLM contribution to 15 points
            
        score += llm_points
    else:
        # no LLM available — redistribute weight to rules so score isn't artificially low
        score = rule_result["rule_score"] * 0.7

    score += min(20, len(high_sev_headers) * 7)  # header anomalies contribute up to 20 pts

    if domain_intel.get("is_newly_registered"):
        score += 10
    if ip_intel.get("is_likely_proxy_or_hosting"):
        score += 5

    score = min(100, round(score, 1))

    rule_categories = [f.get("category") for f in rule_result.get("flags", [])]
    has_brand_freemail = any(a.get("type") == "brand_display_name_freemail" for a in header_anomalies)

    if "business_email_compromise" in rule_categories and score >= 40:
        category = "business_email_compromise"
    elif has_brand_freemail and score < 75:
        category = "impersonated"
    elif score >= 75:
        category = "phishing"
    elif score >= 50:
        category = "suspicious"
    elif score >= 25:
        category = "impersonation_risk"
    else:
        category = "legitimate"

    return {
        "fraud_score": score,
        "category": category,
        "contributing_factors": {
            "rule_based": rule_result["rule_score"],
            "llm_confidence": llm_result.get("confidence") if llm_result else None,
            "high_severity_header_anomalies": len(high_sev_headers),
            "newly_registered_domain": domain_intel.get("is_newly_registered", False),
            "likely_proxy_or_hosting_origin": ip_intel.get("is_likely_proxy_or_hosting", False),
        },
    }
