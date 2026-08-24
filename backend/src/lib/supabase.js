import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/^"|"$/g, "");
const supabaseKey = (process.env.SUPABASE_KEY || "").replace(/^"|"$/g, "");

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[supabase] SUPABASE_URL / SUPABASE_KEY not set — DB calls will fail until .env is configured."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
