import dns.resolver
import re
import ipaddress

def check_spf_recursive(current_domain: str, target_ip: str, depth: int = 0) -> bool | None:
    indent = "  " * depth
    print(f"{indent}[Depth {depth}] Resolving SPF for domain: {current_domain}")
    
    if depth > 5:
        print(f"{indent}-> Max depth exceeded, aborting.")
        return None
        
    try:
        ans = dns.resolver.resolve(current_domain, "TXT", lifetime=4.0)
        recs = [str(r).strip('"') for r in ans if "v=spf1" in str(r)]
        if not recs:
            print(f"{indent}-> No v=spf1 record found.")
            return False
            
        text = recs[0].lower()
        print(f"{indent}-> SPF Record found: {text}")
        
        ip4_nets = re.findall(r"ip4:([^\s]+)", text)
        ip6_nets = re.findall(r"ip6:([^\s]+)", text)
        
        if ip4_nets or ip6_nets:
            print(f"{indent}-> Extracted CIDRs: {ip4_nets + ip6_nets}")
        else:
            print(f"{indent}-> No CIDRs extracted.")
            
        try:
            target_addr = ipaddress.ip_address(target_ip)
            for net in ip4_nets + ip6_nets:
                try:
                    if target_addr in ipaddress.ip_network(net, strict=False):
                        print(f"{indent}-> MATCH FOUND! {target_ip} is inside {net}")
                        return True
                except ValueError:
                    pass
        except ValueError:
            pass
            
        if f"ip4:{target_ip}" in text or f"ip6:{target_ip}" in text or target_ip in text:
            print(f"{indent}-> MATCH FOUND via direct string match.")
            return True
            
        includes = re.findall(r"include:([^\s]+)", text)
        if includes:
            print(f"{indent}-> Found includes: {includes}")
        else:
            print(f"{indent}-> No includes found.")

        for inc in includes:
            print(f"{indent}-> Following include: {inc}")
            res = check_spf_recursive(inc, target_ip, depth + 1)
            if res is True:
                return True
            if res is None:
                return None
                
        redirect_match = re.search(r"redirect=([^\s]+)", text)
        if redirect_match:
            redirect_target = redirect_match.group(1)
            print(f"{indent}-> Following redirect: {redirect_target}")
            return check_spf_recursive(redirect_target, target_ip, depth + 1)
            
        print(f"{indent}-> No matches in this branch, returning False.")
        return False
        
    except Exception as e:
        print(f"{indent}-> Error resolving {current_domain}: {str(e)}")
        return None

print("=== STARTING RECURSIVE SPF TRACE ===")
result = check_spf_recursive("gmail.com", "209.85.220.41")
print(f"=== FINAL RESULT: {result} ===")
