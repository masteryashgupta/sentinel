import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const ML_SERVICE_URL = 'http://localhost:8000';
const FILE_PATH = '../docs/sample-emails/google-test.eml';

async function run() {
  const buf = fs.readFileSync(FILE_PATH);
  const form = new FormData();
  form.append('file', buf, 'google-test.eml');

  console.log(`Sending to ${ML_SERVICE_URL}/analyze ...`);
  
  const res = await fetch(`${ML_SERVICE_URL}/analyze`, { 
    method: 'POST', 
    body: form,
    headers: form.getHeaders()
  });
  
  if (!res.ok) {
    console.error(`HTTP Error: ${res.status} ${await res.text()}`);
    return;
  }
  
  const data = await res.json();
  
  console.log('\n=======================================');
  console.log('DEBUG BREAKDOWN FOR GOOGLE-TEST.EML');
  console.log('=======================================');
  
  console.log('\n--- SCORING ---');
  console.log(JSON.stringify(data.scoring, null, 2));

  console.log('\n--- RULE_BASED DETECTION ---');
  console.log(JSON.stringify(data.detection.rule_based, null, 2));

  console.log('\n--- LLM DETECTION ---');
  console.log(JSON.stringify(data.detection.llm, null, 2));
}

run().catch(console.error);
