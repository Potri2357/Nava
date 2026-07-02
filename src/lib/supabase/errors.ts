export function getSupabaseErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : fallback;

  if (
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  ) {
    return "Supabase schema is not applied yet. Run `npx supabase login`, `npx supabase link --project-ref uovyxpapwhodeiwhykcv`, then `npm run db:push`; or paste `supabase/setup/apply_schema.sql` into the Supabase SQL editor.";
  }

  if (message.includes("permission denied") || message.includes("row-level security")) {
    return "Supabase rejected the write because RLS policies are not applied for this app flow. Apply supabase/migrations/20260630000005_rls_policies.sql or add SUPABASE_SERVICE_ROLE_KEY.";
  }

  return message;
}

export function isRecoverableSupabaseSetupError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "";

  return (
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("fetch failed") ||
    message.includes("ECONNRESET")
  );
}
