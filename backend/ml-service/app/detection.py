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
SHORTENER_DOMAINS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd"}


def detect_obfuscated_urls(urls: list[str]) -> list[dict]:
    """Flag URLs using link shorteners or raw IP addresses."""
    findings = []
    ip_url_pattern = re.compile(r"https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
    for url in urls:
        domain_match = re.search(r"https?://([^/]+)", url)
        if not domain_match:
            continue
        domain = domain_match.group(1).lower().split(":")[0]

        if domain in SHORTENER_DOMAINS:
            findings.append({
                "type": "obfuscated_url",
                "severity": "medium",
                "detail": f"URL '{url}' uses known link-shortener domain ({domain}) to obscure destination.",
                "url": url,
            })
        elif ip_url_pattern.match(url):
            findings.append({
                "type": "obfuscated_url",
                "severity": "high",
                "detail": f"URL '{url}' uses direct IP address instead of domain name.",
                "url": url,
            })
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
    suspicious_urls = [u for u in urls if _looks_like_lookalike(u)]
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
    domain_match = re.search(r"https?://([^/]+)", url)
    if not domain_match:
        return False
    domain = domain_match.group(1).lower()
    for brand in known_brands:
        if brand in domain and not domain.endswith(f"{brand}.com"):
            return True
    # digit-for-letter substitution check e.g. paypa1.com
    if re.search(r"[a-z]+\d[a-z]*\.(com|net|org)", domain):
        return True
    return False


def llm_classify(subject: str, body: str) -> dict | None:
    """Optional LLM pass for nuanced classification. Returns None if no key configured."""
    prompt = (
        "You are a cybersecurity analyst. Classify this email as one of: "
        "legitimate, suspicious, impersonation, phishing, business_email_compromise. "
        "Also list up to 3 short phrases (verbatim, under 8 words) that most influenced your decision, "
        "and give a confidence score 0-100.\n\n"
        f"Subject: {subject}\n\nBody:\n{(body or '')[:3000]}\n\n"
        "Respond ONLY as JSON: "
        '{"category": "...", "confidence": 0, "flagged_phrases": ["...", "..."], "reasoning": "..."}'
    )

    if GROQ_API_KEY:
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                },
                timeout=15,
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
    text = text.strip()
    text = re.sub(r"^```json\s*|\s*```$", "", text.strip())
    try:
        return json.loads(text)
    except Exception:
        return {"raw_response": text}


def aggregate_score(rule_result: dict, llm_result: dict | None,
                      header_anomalies: list, domain_intel: dict,
                      ip_intel: dict) -> dict:
    """
    Combine all signals into one explainable fraud score.
    Transparent weighting — every contributing factor is listed, not a black box.
    """
    score = rule_result["rule_score"] * 0.4  # rules contribute up to 40 pts

    if llm_result and "confidence" in llm_result:
        score += llm_result["confidence"] * 0.4  # LLM contributes up to 40 pts
    else:
        # no LLM available — redistribute weight to rules so score isn't artificially low
        score = rule_result["rule_score"] * 0.7

    high_sev_headers = [a for a in header_anomalies if a.get("severity") == "high"]
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
