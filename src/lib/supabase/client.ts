import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicKey, hasSupabaseBrowserConfig } from '@/lib/env';

export function createClient() {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error('Supabase browser env vars are not configured.');
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey()!
  );
}
