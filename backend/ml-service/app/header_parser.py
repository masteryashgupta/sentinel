"""
Email Header & Protocol Analysis Module
Maps to PS 26106 component: "Email Header and Protocol Analysis Module"

Parses raw .eml content, validates SPF/DKIM/DMARC, and flags anomalies in
routing, forged sender fields, and relay manipulation.
"""
import re
import mailparser
from datetime import datetime
from email.utils import parsedate_to_datetime
import dns.resolver


def parse_email(raw_content: bytes | str) -> dict:
    mail = mailparser.parse_from_bytes(raw_content) if isinstance(raw_content, bytes) \
        else mailparser.parse_from_string(raw_content)

    headers = dict(mail.headers) if mail.headers else {}

    from_addr = mail.from_[0][1] if mail.from_ else None
    from_name = mail.from_[0][0] if mail.from_ else None
    return_path = headers.get("Return-Path", "").strip("<>")
    reply_to = mail.reply_to[0][1] if mail.reply_to else None
    message_id = mail.message_id
    received_chain = mail.received or []

    attachments = []
    if getattr(mail, "attachments", None):
        for att in mail.attachments:
            filename = att.get("filename") or att.get("mail_content_type") or "unnamed"
            mime_type = att.get("mail_content_type") or att.get("content-type") or "application/octet-stream"
            attachments.append({
                "filename": filename,
                "mime_type": mime_type,
            })

    dkim_sig = headers.get("DKIM-Signature") or headers.get("dkim-signature") or ""
    dkim_key = None
    if dkim_sig:
        s_match = re.search(r"\bs=([^;]+)", str(dkim_sig))
        d_match = re.search(r"\bd=([^;]+)", str(dkim_sig))
        if s_match and d_match:
            dkim_key = f"{s_match.group(1).strip()}._domainkey.{d_match.group(1).strip()}"
        elif d_match:
            dkim_key = f"selector._domainkey.{d_match.group(1).strip()}"

    return {
        "subject": mail.subject,
        "from_address": from_addr,
        "from_display_name": from_name,
        "return_path": return_path or None,
        "reply_to": reply_to,
        "message_id": message_id,
        "dkim_key": dkim_key,
        "body_text": (mail.body or "")[:20000],  # cap for storage
        "raw_headers": headers,
        "received_chain": received_chain,
        "attachments": attachments,
    }


def check_authentication(headers: dict) -> dict:
    """Parse Authentication-Results header for SPF/DKIM/DMARC verdicts."""
    auth_header = headers.get("Authentication-Results", "") or headers.get(
        "authentication-results", ""
    )
    auth_header = str(auth_header)

    def extract(mechanism: str) -> str:
        match = re.search(rf"{mechanism}=(\w+)", auth_header, re.IGNORECASE)
        return match.group(1).lower() if match else "none"

    return {
        "spf": extract("spf"),
        "dkim": extract("dkim"),
        "dmarc": extract("dmarc"),
    }


def check_relay_chain_order(received_chain: list) -> dict | None:
    """
    Check whether Received header timestamps are in chronological order
    (walking from oldest/origin to newest/destination).
    mailparser returns received_chain ordered newest-first (top to bottom).
    So reversing received_chain gives chronological hop order.
    """
    if len(received_chain) < 2:
        return None

    # Reverse so index 0 is oldest hop (origin) and -1 is newest (destination)
    chronological_chain = list(reversed(received_chain))
    parsed_timestamps = []

    for hop in chronological_chain:
        dt = None
        if isinstance(hop, dict):
            date_val = hop.get("date_utc") or hop.get("date")
            if date_val:
                try:
                    dt = datetime.fromisoformat(str(date_val))
                except Exception:
                    try:
                        dt = parsedate_to_datetime(str(date_val))
                    except Exception:
                        pass
        if not dt:
            hop_str = str(hop)
            date_str = hop_str.split(";")[-1].strip() if ";" in hop_str else hop_str.strip()
            try:
                dt = parsedate_to_datetime(date_str)
            except Exception:
                try:
                    dt = datetime.fromisoformat(date_str)
                except Exception:
                    pass

        if dt:
            parsed_timestamps.append((dt, str(hop)))

    if len(parsed_timestamps) < 2:
        return None

    for i in range(1, len(parsed_timestamps)):
        prev_dt, _ = parsed_timestamps[i - 1]
        curr_dt, _ = parsed_timestamps[i]
        if curr_dt < prev_dt:
            return {
                "type": "relay_chain_manipulation",
                "severity": "high",
                "detail": f"Received header timestamp anomaly detected: hop {i} ({curr_dt.isoformat()}) "
                          f"is earlier than preceding hop {i-1} ({prev_dt.isoformat()}). "
                          f"Strong indicator of forged relay header chain.",
            }

    return None


def check_authorized_infrastructure(domain: str, origin_ip: str | None, ip_intel: dict | None) -> dict | None:
    """
    Check domain's SPF record via DNS and validate if originating IP/ASN is authorized.
    """
    if not domain:
        return None

    try:
        answers = dns.resolver.resolve(domain, "TXT", lifetime=4.0)
        spf_records = [str(r).strip('"') for r in answers if "v=spf1" in str(r)]
        if not spf_records:
            return {
                "type": "no_spf_policy",
                "severity": "low",
                "detail": f"Sender domain '{domain}' has no published SPF TXT record.",
            }
        spf_text = spf_records[0].lower()
    except Exception:
        return {
            "type": "no_spf_policy",
            "severity": "low",
            "detail": f"Failed to retrieve SPF TXT record for sender domain '{domain}'.",
        }

    if not origin_ip:
        return None

    # Check if origin_ip or ip_intel org matches any SPF mechanisms
    is_authorized = False
    if f"ip4:{origin_ip}" in spf_text or f"ip6:{origin_ip}" in spf_text:
        is_authorized = True
    elif origin_ip in spf_text:
        is_authorized = True
    else:
        # Heuristic check for common includes matching IP org/ISP
        org_name = ((ip_intel or {}).get("isp") or "").lower()
        includes = re.findall(r"include:([^\s]+)", spf_text)
        for inc in includes:
            inc_base = inc.split(".")[0]
            if inc_base and len(inc_base) > 3 and inc_base in org_name:
                is_authorized = True
                break

    if not is_authorized:
        return {
            "type": "unauthorized_sending_infrastructure",
            "severity": "high",
            "detail": f"Originating IP ({origin_ip}) is not declared in SPF record for domain '{domain}'.",
        }

    return None


def detect_header_anomalies(parsed: dict, auth: dict, origin_ip: str | None = None, ip_intel: dict | None = None) -> list[dict]:
    """
    Rule-based anomaly detection across sender fields and relay chain.
    Each finding maps directly to a PS-listed indicator.
    """
    anomalies = []

    from_addr = (parsed.get("from_address") or "").lower()
    return_path = (parsed.get("return_path") or "").lower()
    reply_to = (parsed.get("reply_to") or "").lower()

    from_domain = from_addr.split("@")[-1] if "@" in from_addr else ""
    return_domain = return_path.split("@")[-1] if "@" in return_path else ""
    reply_domain = reply_to.split("@")[-1] if "@" in reply_to else ""

    if return_domain and from_domain and return_domain != from_domain:
        if return_domain.endswith("." + from_domain):
            anomalies.append({
                "type": "return_path_mismatch",
                "severity": "low",
                "detail": f"Return-Path domain ({return_domain}) is a subdomain of From domain ({from_domain}). "
                          f"VERP bounce subdomain — expected for bulk senders.",
            })
        else:
            anomalies.append({
                "type": "return_path_mismatch",
                "severity": "high",
                "detail": f"Return-Path domain ({return_domain}) does not match From domain ({from_domain}). "
                          f"Common spoofing signal.",
            })


    if reply_domain and from_domain and reply_domain != from_domain:
        anomalies.append({
            "type": "reply_to_mismatch",
            "severity": "medium",
            "detail": f"Reply-To domain ({reply_domain}) differs from From domain ({from_domain}). "
                      f"Often used to redirect victim replies to attacker-controlled infrastructure.",
        })

    if auth["spf"] not in ("pass",):
        anomalies.append({
            "type": "spf_fail",
            "severity": "high" if auth["spf"] == "fail" else "medium",
            "detail": f"SPF check result: {auth['spf']}. Sending server not authorized for this domain.",
        })

    if auth["dkim"] not in ("pass",):
        anomalies.append({
            "type": "dkim_fail",
            "severity": "high" if auth["dkim"] == "fail" else "medium",
            "detail": f"DKIM check result: {auth['dkim']}. Message integrity/signature could not be verified.",
        })

    if auth["dmarc"] not in ("pass",):
        anomalies.append({
            "type": "dmarc_fail",
            "severity": "high" if auth["dmarc"] == "fail" else "medium",
            "detail": f"DMARC check result: {auth['dmarc']}. Domain policy alignment failed.",
        })

    received_chain = parsed.get("received_chain") or []
    if len(received_chain) == 0:
        anomalies.append({
            "type": "missing_relay_chain",
            "severity": "medium",
            "detail": "No Received headers found — unusual for legitimately routed mail, "
                      "may indicate direct injection or a stripped/forged header set.",
        })

    display_name = (parsed.get("from_display_name") or "").lower()
    brand_keywords = ["bank", "support", "security", "admin", "paypal", "microsoft", "google", "official"]
    if any(kw in display_name for kw in brand_keywords) and from_domain:
        # crude free-mail lookalike check
        free_mail_domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com"]
        if from_domain in free_mail_domains:
            anomalies.append({
                "type": "brand_display_name_freemail",
                "severity": "high",
                "detail": f"Display name '{parsed.get('from_display_name')}' impersonates an "
                          f"institutional identity but sends from a free consumer mail domain "
                          f"({from_domain}).",
            })

    attachments = parsed.get("attachments") or []
    suspicious_exts = (".exe", ".scr", ".js", ".vbs", ".jar", ".bat", ".cmd", ".ps1", ".hta", ".wsf")
    for att in attachments:
        fname = (att.get("filename") or "").lower()
        has_suspicious_ext = any(fname.endswith(ext) for ext in suspicious_exts)
        has_double_ext = bool(re.search(r"\.[a-z0-9]{2,4}\.(exe|scr|js|vbs|jar|bat|cmd|ps1|hta|wsf)$", fname))
        if has_suspicious_ext or has_double_ext:
            anomalies.append({
                "type": "suspicious_attachment",
                "severity": "high",
                "detail": f"Attachment '{att.get('filename')}' uses an executable or suspicious file extension/double-extension.",
            })

    relay_order_anomaly = check_relay_chain_order(received_chain)
    if relay_order_anomaly:
        anomalies.append(relay_order_anomaly)

    infra_anomaly = check_authorized_infrastructure(from_domain, origin_ip, ip_intel)
    if infra_anomaly:
        anomalies.append(infra_anomaly)

    return anomalies


from datetime import datetime


def check_relay_chain_order(received_chain: list) -> dict | None:
    """
    Check whether Received header timestamps are in chronological order
    (walking from oldest/origin to newest/destination).
    mailparser returns received_chain ordered newest-first (top to bottom).
    So reversing received_chain gives chronological hop order.
    """
    if len(received_chain) < 2:
        return None

    # Reverse so index 0 is oldest hop (origin) and -1 is newest (destination)
    chronological_chain = list(reversed(received_chain))
    parsed_timestamps = []

    for hop in chronological_chain:
        dt = None
        if isinstance(hop, dict):
            date_val = hop.get("date_utc") or hop.get("date")
            if date_val:
                try:
                    dt = datetime.fromisoformat(str(date_val))
                except Exception:
                    try:
                        dt = parsedate_to_datetime(str(date_val))
                    except Exception:
                        pass
        if not dt:
            hop_str = str(hop)
            date_str = hop_str.split(";")[-1].strip() if ";" in hop_str else hop_str.strip()
            try:
                dt = parsedate_to_datetime(date_str)
            except Exception:
                try:
                    dt = datetime.fromisoformat(date_str)
                except Exception:
                    pass

        if dt:
            parsed_timestamps.append((dt, str(hop)))

    if len(parsed_timestamps) < 2:
        return None

    for i in range(1, len(parsed_timestamps)):
        prev_dt, _ = parsed_timestamps[i - 1]
        curr_dt, _ = parsed_timestamps[i]
        if curr_dt < prev_dt:
            return {
                "type": "relay_chain_manipulation",
                "severity": "high",
                "detail": f"Received header timestamp anomaly detected: hop {i} ({curr_dt.isoformat()}) "
                          f"is earlier than preceding hop {i-1} ({prev_dt.isoformat()}). "
                          f"Strong indicator of forged relay header chain.",
            }

    return None


def check_authorized_infrastructure(domain: str, origin_ip: str | None, ip_intel: dict | None) -> dict | None:
    """
    Check domain's SPF record via DNS and validate if originating IP/ASN is authorized,
    recursively resolving include: mechanisms to avoid false positives.
    """
    if not domain:
        return None

    try:
        answers = dns.resolver.resolve(domain, "TXT", lifetime=4.0)
        spf_records = [str(r).strip('"') for r in answers if "v=spf1" in str(r)]
        if not spf_records:
            return {
                "type": "no_spf_policy",
                "severity": "low",
                "detail": f"Sender domain '{domain}' has no published SPF TXT record.",
            }
        top_spf_text = spf_records[0].lower()
    except Exception:
        return {
            "type": "no_spf_policy",
            "severity": "low",
            "detail": f"Failed to retrieve SPF TXT record for sender domain '{domain}'.",
        }

    if not origin_ip:
        return None

    def check_spf_recursive(current_domain: str, target_ip: str, depth: int = 0) -> bool | None:
        if depth > 5:
            return None
        try:
            ans = dns.resolver.resolve(current_domain, "TXT", lifetime=4.0)
            recs = [str(r).strip('"') for r in ans if "v=spf1" in str(r)]
            if not recs:
                return False
            text = recs[0].lower()
            
            import ipaddress
            
            # Extract all ip4 and ip6 mechanisms
            ip4_nets = re.findall(r"ip4:([^\s]+)", text)
            ip6_nets = re.findall(r"ip6:([^\s]+)", text)
            
            try:
                target_addr = ipaddress.ip_address(target_ip)
                for net in ip4_nets + ip6_nets:
                    try:
                        # Some mechanisms might just be an IP without a subnet mask, ip_network handles both if strict=False
                        if target_addr in ipaddress.ip_network(net, strict=False):
                            return True
                    except ValueError:
                        pass
            except ValueError:
                pass
                
            if f"ip4:{target_ip}" in text or f"ip6:{target_ip}" in text or target_ip in text:
                return True
                
            includes = re.findall(r"include:([^\s]+)", text)

            for inc in includes:
                res = check_spf_recursive(inc, target_ip, depth + 1)
                if res is True:
                    return True
                if res is None:
                    return None
                    
            redirect_match = re.search(r"redirect=([^\s]+)", text)
            if redirect_match:
                redirect_target = redirect_match.group(1)
                return check_spf_recursive(redirect_target, target_ip, depth + 1)
                
            return False
        except Exception:
            return None

    is_authorized = check_spf_recursive(domain, origin_ip)

    # Heuristic check for common includes matching IP org/ISP as a fallback
    if is_authorized is False:
        org_name = ((ip_intel or {}).get("isp") or "").lower()
        includes = re.findall(r"include:([^\s]+)", top_spf_text)
        for inc in includes:
            inc_base = inc.split(".")[0]
            if inc_base and len(inc_base) > 3 and inc_base in org_name:
                is_authorized = True
                break

    if is_authorized is None:
        return {
            "type": "unauthorized_sending_infrastructure",
            "severity": "low",
            "detail": f"Could not fully resolve SPF include chain for '{domain}' (timeout or max depth reached). Cannot confirm if IP {origin_ip} is authorized.",
        }
    elif not is_authorized:
        return {
            "type": "unauthorized_sending_infrastructure",
            "severity": "high",
            "detail": f"Originating IP ({origin_ip}) is not declared in SPF record for domain '{domain}'.",
        }

    return None



def extract_earliest_untrusted_ip(received_chain: list) -> str | None:
    """
    Walk the Received: chain from the bottom (earliest hop, closest to origin)
    and return the first public IP found. Skips private/internal ranges.
    """
    private_prefixes = ("10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2",
                         "172.30.", "172.31.", "192.168.", "127.")
    ip_pattern = re.compile(r"\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?")

    # mailparser's received_chain is ordered newest-first typically; reverse to walk oldest-first
    for hop in reversed(received_chain):
        hop_str = str(hop)
        match = ip_pattern.search(hop_str)
        if match:
            ip = match.group(1)
            if not ip.startswith(private_prefixes):
                return ip
    return None
