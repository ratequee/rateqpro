import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSecretKey, requireSupabaseUrl } from "./env";

let adminClient: SupabaseClient | null = null;

export function createSupabaseAdmin(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }
  adminClient = createClient(requireSupabaseUrl(), requireSecretKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}
