import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aiykmnzqhyztjslbcgbo.supabase.co"
const supabaseKey = "sb_publishable_8e6VessR9bNZzvinQT4OPA_9y8ySWbK"

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;