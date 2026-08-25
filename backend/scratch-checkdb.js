import { supabaseAdmin } from './src/lib/supabase.js';

async function checkDB() {
  console.log("Checking cases...");
  const { data: cases } = await supabaseAdmin.from('cases').select('id, subject, origin_ip, sender_domain');
  console.log(cases);

  console.log("Checking indicators...");
  const { data: indicators } = await supabaseAdmin.from('indicators').select('*');
  console.log(indicators);

  console.log("Checking campaigns...");
  const { data: campaigns } = await supabaseAdmin.from('campaigns').select('*');
  console.log(campaigns);

  console.log("Checking campaign_cases...");
  const { data: campaign_cases } = await supabaseAdmin.from('campaign_cases').select('*');
  console.log(campaign_cases);
}

checkDB().catch(console.error);
