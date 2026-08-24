import fs from 'fs';

const BASE = 'http://localhost:4000';
const SAMPLE_DIR = '../docs/sample-emails';
const SAMPLES = ['google-test.eml', 'phishing-sample-1.eml', 'bec-sample-1.eml'];

async function analyzeEml(filename) {
  const buf = fs.readFileSync(`${SAMPLE_DIR}/${filename}`);
  const blob = new Blob([buf], { type: 'message/rfc822' });
  const form = new FormData();
  form.append('email', blob, filename);
  const res = await fetch(`${BASE}/api/cases/analyze`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${filename}: ${await res.text()}`);
  return res.json();
}

async function run() {
  console.log(`\n─── Analysis Results ───`);
  for (const sample of SAMPLES) {
    try {
      const result = await analyzeEml(sample);
      const score = result.analysis?.scoring?.fraud_score ?? result.scoring?.fraud_score;
      const category = result.analysis?.scoring?.category ?? result.scoring?.category;
      const anomalies = result.analysis?.header_anomalies ?? result.header_anomalies ?? [];
      
      console.log(`\nSample: ${sample}`);
      console.log(`  Score: ${score}/100`);
      console.log(`  Category: ${category}`);
      console.log(`  Anomalies: ${anomalies.length}`);
      for (const a of anomalies) {
          console.log(`    - [${a.severity.toUpperCase()}] ${a.type}: ${a.detail}`);
      }
    } catch (e) {
      console.log(`  ❌ ${sample}: FAILED — ${e.message}`);
    }
  }
}

run().catch(console.error);
