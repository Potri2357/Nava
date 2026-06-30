import { createBrowserClient } from '@supabase/ssr';
import { hasSupabaseBrowserConfig } from '@/lib/env';

export function createClient() {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error('Supabase browser env vars are not configured.');
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
