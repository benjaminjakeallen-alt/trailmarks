import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PHOTOS_BUCKET = "photos";

let client: SupabaseClient | null = null;

/**
 * Server-only client using the service_role key, which bypasses RLS. This
 * app has no client-side Supabase access at all -- every request goes
 * through our own API routes -- so the privileged key never leaves the
 * server and RLS on the tables themselves stays "on, no policies" as a
 * second lock.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Throws if a Supabase response carries an error, otherwise returns data. */
export function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

/**
 * Photos live in a private bucket. Pages link to our own /p/<file> route,
 * which checks the viewer is in the photo's family before serving it.
 */
export function photoUrl(fileName: string): string {
  return `/p/${fileName}`;
}
