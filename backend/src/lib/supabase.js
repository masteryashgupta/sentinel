import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/^"|"$/g, "");
const supabaseKey = (process.env.SUPABASE_KEY || "").replace(/^"|"$/g, "");
const supabaseServiceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").replace(/^"|"$/g, "");

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[supabase] SUPABASE_URL / SUPABASE_KEY not set — DB calls will fail until .env is configured."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://dummy.supabase.co", 
  supabaseKey || "dummy"
);

export const supabaseAdmin = createClient(
  supabaseUrl || "https://dummy.supabase.co",
  supabaseServiceRole || "dummy"
);

export const createUserClient = (token) => {
  return createClient(
    supabaseUrl || "https://dummy.supabase.co",
    supabaseKey || "dummy",
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
};
