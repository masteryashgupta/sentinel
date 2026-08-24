-- Sentinel: AI Email Threat Detection & Forensic Intelligence Platform
-- Run this in the Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- Every analyzed email = one "case"
create table if not exists cases (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  filename text,
  subject text,
  from_address text,
  from_display_name text,
  return_path text,
  reply_to text,
  message_id text,
  raw_headers jsonb,
  body_text text,

  -- classification output
  category text,               -- legit | suspicious | impersonated | phishing | fraud
  fraud_score numeric,         -- 0-100 aggregated confidence
  classifier_notes jsonb,      -- flagged phrases, model used, etc.

  -- header/protocol forensics
  spf_result text,
  dkim_result text,
  dmarc_result text,
  header_anomalies jsonb,      -- array of {type, detail}

  -- origin traceability
  origin_ip text,
  origin_country text,
  origin_region text,
  origin_city text,
  origin_isp text,
  origin_lat numeric,
  origin_lon numeric,
  is_likely_proxy_or_hosting boolean default false,
  sender_domain text,
  domain_created_at date,
  domain_registrar text,
  attachments jsonb,           -- extracted attachments info [{filename, mime_type}]
  attribution_category text,   -- likely_spoofed_domain | likely_compromised_account | likely_anonymized_infrastructure | unattributed
  matches_known_bad_indicator boolean default false,
  retention_days int default 90, -- configurable per-case data retention window (days)

  status text default 'open',  -- open | reviewed | escalated | closed
  reviewed_by text
);

-- Real-time high-risk threat alerts
create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  message text not null,
  created_at timestamptz default now(),
  acknowledged boolean default false
);

-- Known-indicator blacklist managed by analysts
create table if not exists known_bad_indicators (
  id uuid primary key default uuid_generate_v4(),
  type text not null,          -- ip | domain | dkim_key | url
  value text not null,
  source text,                 -- analyst notes / intel feed name
  added_at timestamptz default now()
);

-- Indicators extracted per case, used for campaign clustering
create table if not exists indicators (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  type text not null,          -- ip | domain | dkim_key | url | phone
  value text not null,
  created_at timestamptz default now()
);

create index if not exists idx_indicators_value on indicators(type, value);

-- Campaigns = clusters of cases sharing indicators
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text,
  shared_indicator_type text,
  shared_indicator_value text,
  case_count int default 0
);

create table if not exists campaign_cases (
  campaign_id uuid references campaigns(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  primary key (campaign_id, case_id)
);

-- Audit log for chain-of-custody
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  case_id uuid references cases(id) on delete cascade,
  action text not null,
  actor text,
  created_at timestamptz default now(),
  details jsonb
);

-- Basic RLS: open for hackathon demo purposes (tighten before any real deployment)
alter table cases enable row level security;
alter table alerts enable row level security;
alter table known_bad_indicators enable row level security;
alter table indicators enable row level security;
alter table campaigns enable row level security;
alter table campaign_cases enable row level security;
alter table audit_log enable row level security;

create policy "allow all - demo" on cases for all using (true) with check (true);
create policy "allow all - demo" on alerts for all using (true) with check (true);
create policy "allow all - demo" on known_bad_indicators for all using (true) with check (true);
create policy "allow all - demo" on indicators for all using (true) with check (true);
create policy "allow all - demo" on campaigns for all using (true) with check (true);
create policy "allow all - demo" on campaign_cases for all using (true) with check (true);
create policy "allow all - demo" on audit_log for all using (true) with check (true);
