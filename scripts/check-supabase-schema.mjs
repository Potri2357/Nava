const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and publishable/anon key.");
  process.exit(1);
}

const tables = ["jobs", "candidates", "scores", "feedback", "skills_ontology"];
const results = [];

for (const table of tables) {
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const body = await response.text();
    results.push({ table, ok: response.ok, status: response.status, body });
  } catch (error) {
    results.push({
      table,
      ok: false,
      status: "network",
      body: error instanceof Error ? error.message : "Network request failed",
    });
  }
}

for (const result of results) {
  console.log(`${result.ok ? "OK" : "MISSING"} ${result.table} (${result.status})`);
  if (!result.ok) console.log(result.body);
}

if (results.some((result) => !result.ok)) {
  console.error("\nApply supabase/setup/apply_schema.sql in the Supabase SQL editor or run npm run db:push after linking the project.");
  process.exit(1);
}
