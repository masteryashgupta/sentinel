import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  
  const res = await db.query('SELECT id, subject, fraud_score, classifier_notes, header_anomalies FROM cases ORDER BY created_at DESC LIMIT 1');
  if (res.rows.length === 0) {
    console.log("No cases found");
    return;
  }
  
  const latestCase = res.rows[0];
  console.log(`Case ID: ${latestCase.id}`);
  console.log(`Subject: ${latestCase.subject}`);
  console.log(`Score: ${latestCase.fraud_score}`);
  
  console.log('\n=======================================');
  console.log('DEBUG BREAKDOWN FROM DATABASE');
  console.log('=======================================');
  
  console.log('\n--- RULE_BASED DETECTION ---');
  console.log(JSON.stringify(latestCase.classifier_notes?.rule_based, null, 2));

  console.log('\n--- LLM DETECTION ---');
  console.log(JSON.stringify(latestCase.classifier_notes?.llm, null, 2));
  
  console.log('\n--- HEADER ANOMALIES ---');
  console.log(JSON.stringify(latestCase.header_anomalies, null, 2));
  
  await db.end();
}

run().catch(console.error);
