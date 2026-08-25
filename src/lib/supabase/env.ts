export const SUPABASE_ATTACHMENTS_BUCKET = "attachments";

/**
 * New Supabase projects expose a publishable key (`sb_publishable_...`)
 * instead of the legacy JWT `anon` key. Both names are accepted.
 */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Server-only key for Storage and other privileged APIs.
 * New projects: `SUPABASE_SECRET_KEY` (`sb_secret_...`).
 * Legacy: `SUPABASE_SERVICE_ROLE_KEY`.
 */
export function getSupabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseSecretKey());
}

export function requireSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  return url;
}

export function requireSecretKey(): string {
  const key = getSupabaseSecretKey();
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Copy the secret key from Supabase → Project Settings → API Keys.",
    );
  }
  return key;
}
