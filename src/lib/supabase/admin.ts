import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerKey, hasSupabaseAdminConfig } from '@/lib/env';

// Note: This should only be used in secure backend environments (like Edge Functions or secure API routes)
// where bypassing Row Level Security is required (e.g. background processing, seeding).
export function createAdminClient() {
  if (!hasSupabaseAdminConfig()) {
    throw new Error('Supabase admin env vars are not configured.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseServerKey()!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
