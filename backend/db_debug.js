import { Client } from 'pg';

const DB_URL = 'postgresql://postgres.acjmkftgqnawtutqmnzm:BaGpvtL3!sm8FZt@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  
  const res = await db.query('SELECT id, subject, fraud_score, analysis FROM cases ORDER BY created_at DESC LIMIT 1');
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
  
  const analysis = latestCase.analysis;
  
  console.log('\n--- SCORING ---');
  console.log(JSON.stringify(analysis.scoring, null, 2));

  console.log('\n--- RULE_BASED DETECTION ---');
  console.log(JSON.stringify(analysis.detection?.rule_based, null, 2));

  console.log('\n--- LLM DETECTION ---');
  console.log(JSON.stringify(analysis.detection?.llm, null, 2));
  
  await db.end();
}

run().catch(console.error);
