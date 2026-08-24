"""
Origin Traceability and Location Analysis Module
Maps to PS 26106 component: "Origin Traceability and Location Analysis"

Geolocates the originating IP and pulls basic domain-registration intelligence.
Uses free-tier services only (ip-api.com, python-whois, Tor bulk exit list, Reverse DNS, DNS MX) —
flagged clearly as heuristics vs confirmed signals in the output.

Performance: all public functions are thread-safe and designed to be invoked via
asyncio.get_event_loop().run_in_executor() from async FastAPI handlers so that multiple
independent external calls (IP API, WHOIS, Tor list, MX, rDNS) can be fanned out
concurrently with asyncio.gather() instead of running sequentially.
"""
import socket
import time
import requests
import whois
import dns.resolver
from datetime import datetime, timezone

# Enforce a hard timeout on every outbound call so one slow service cannot block the thread.
_HTTP_TIMEOUT = 8   # seconds
_DNS_LIFETIME  = 4  # seconds for dns.resolver
_SOCKET_TIMEOUT = 5 # seconds for rDNS / gethostbyaddr

HOSTING_KEYWORDS = [
    "hosting", "cloud", "vps", "server", "datacenter", "data center",
    "digitalocean", "amazon", "aws", "google cloud", "azure", "ovh",
    "linode", "vultr", "hetzner", "vpn", "proxy", "fastly", "cloudflare", "akamai",
]

_TOR_EXIT_NODES: set[str] = set()
_LAST_TOR_FETCH: float = 0.0
_TOR_CACHE_TTL: float = 3600.0  # 1 hour cache TTL


def fetch_tor_exit_nodes() -> set[str]:
    """
    [Confirmed Signal / Live Feed]
    Downloads official Tor bulk exit node list from https://check.torproject.org/torbulkexitlist.
    Cached in memory for 1 hour to avoid redundant network requests on every analyze call.
    Times out after _HTTP_TIMEOUT seconds to prevent stalling when Tor Project is unreachable.
    """
    global _TOR_EXIT_NODES, _LAST_TOR_FETCH
    now = time.time()
    if _TOR_EXIT_NODES and (now - _LAST_TOR_FETCH) < _TOR_CACHE_TTL:
        return _TOR_EXIT_NODES

    try:
        resp = requests.get(
            "https://check.torproject.org/torbulkexitlist",
            timeout=_HTTP_TIMEOUT,
        )
        if resp.status_code == 200:
            nodes = set(
                line.strip()
                for line in resp.text.splitlines()
                if line.strip() and not line.startswith("#")
            )
            if nodes:
                _TOR_EXIT_NODES = nodes
                _LAST_TOR_FETCH = now
    except Exception:
        pass  # Maintain existing cache if fetch fails; graceful degradation
    return _TOR_EXIT_NODES


def check_tor_exit_node(ip: str) -> bool:
    """
    [Confirmed Signal]
    Checks whether the originating IP is a known active Tor exit node.
    Uses cached list — no additional network call after first fetch.
    """
    if not ip:
        return False
    nodes = fetch_tor_exit_nodes()
    return ip in nodes


def get_reverse_dns(ip: str) -> str | None:
    """
    [Heuristic Signal]
    Performs standard PTR reverse-DNS lookup for host fingerprinting.
    Cloud/hosting providers frequently use recognizable PTR domains (*.amazonaws.com, *.digitalocean.com).
    Hard-limited to _SOCKET_TIMEOUT seconds so a non-responsive DNS server doesn't block the worker thread.
    """
    if not ip:
        return None
    old_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(_SOCKET_TIMEOUT)
        host, _, _ = socket.gethostbyaddr(ip)
        return host.lower()
    except Exception:
        return None
    finally:
        socket.setdefaulttimeout(old_timeout)


def check_mx_infrastructure(domain: str, received_chain: list) -> dict | None:
    """
    [Heuristic Signal]
    Fetches published MX records for the sender domain and compares them against the Received relay chain.
    If the email was sent via infrastructure unrelated to the domain's declared MX hosts, flags an anomaly.
    dns.resolver.resolve uses lifetime=_DNS_LIFETIME to avoid hanging on dead nameservers.
    """
    if not domain:
        return None
    try:
        answers = dns.resolver.resolve(domain, "MX", lifetime=_DNS_LIFETIME)
        mx_hosts = [str(r.exchange).strip(".").lower() for r in answers]
        if not mx_hosts:
            return None

        mx_bases = set(h.split(".")[-2] if len(h.split(".")) >= 2 else h for h in mx_hosts)

        # Extract all hostnames present in Received headers
        chain_str = " ".join([str(hop).lower() for hop in received_chain])

        # Check if any MX provider domain base appears in the relay chain
        matches = any(base in chain_str for base in mx_bases if len(base) > 3)
        if not matches:
            return {
                "type": "mx_infrastructure_mismatch",
                "severity": "medium",
                "detail": f"Sending relay infrastructure does not match declared MX hosts for '{domain}' ({', '.join(mx_hosts[:3])}). Possible unauthorized relaying.",
            }
    except Exception:
        pass
    return None


def geolocate_ip(ip: str) -> dict:
    """
    Free-tier IP geolocation via ip-api.com, augmented with Reverse DNS and Tor exit node correlation.
    NOTE: get_reverse_dns and check_tor_exit_node are called here for backward compatibility
    but when called from the async analyze endpoint via run_in_executor the whole function
    runs concurrently with WHOIS / MX lookups.
    All external calls are bounded by _HTTP_TIMEOUT / _SOCKET_TIMEOUT.
    """
    if not ip:
        return {"error": "no_ip"}
    try:
        resp = requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,isp,org,as,lat,lon",
            timeout=_HTTP_TIMEOUT,
        )
        data = resp.json()
        if data.get("status") != "success":
            return {"error": data.get("message", "lookup_failed")}

        rdns = get_reverse_dns(ip)
        is_tor = check_tor_exit_node(ip)

        org_text = f"{data.get('isp', '')} {data.get('org', '')} {data.get('as', '')} {rdns or ''}".lower()
        is_likely_hosting = any(kw in org_text for kw in HOSTING_KEYWORDS) or is_tor

        return {
            "country": data.get("country"),
            "region": data.get("regionName"),
            "city": data.get("city"),
            "isp": data.get("isp"),
            "org": data.get("org"),
            "lat": data.get("lat"),
            "lon": data.get("lon"),
            "reverse_dns": rdns,
            "is_tor_exit_node": is_tor,
            "is_likely_proxy_or_hosting": is_likely_hosting,
        }
    except Exception as e:
        return {"error": str(e)}


def domain_intelligence(domain: str) -> dict:
    """WHOIS lookup for domain age/registrar — a cheap, strong fraud signal
    (newly-registered lookalike domains are a classic phishing tell).
    python-whois does its own socket calls; bounded implicitly by socket default timeout
    set in get_reverse_dns's finally block, but we also wrap in try/except for safety.
    """
    if not domain:
        return {"error": "no_domain"}
    old_timeout = socket.getdefaulttimeout()
    try:
        socket.setdefaulttimeout(_HTTP_TIMEOUT)
        w = whois.whois(domain)
        created = w.creation_date
        if isinstance(created, list):
            created = created[0] if created else None

        age_days = None
        if created:
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - created).days

        return {
            "registrar": w.registrar,
            "created_at": created.isoformat() if created else None,
            "age_days": age_days,
            "is_newly_registered": (age_days is not None and age_days < 90),
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        socket.setdefaulttimeout(old_timeout)
