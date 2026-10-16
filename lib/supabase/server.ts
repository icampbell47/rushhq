import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. It bypasses row level security, so it must only ever
 * run on the server, behind requireAdmin()/requireBrother() or a public action
 * that validates its input. The "server-only" import turns an accidental
 * client-side import into a build error.
 */
export function createAdminSupabaseClient() {
  const env = getServerEnv();
  return createSupabaseClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
