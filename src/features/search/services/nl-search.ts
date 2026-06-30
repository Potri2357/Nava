import { z } from 'zod';
import { llmClient } from '@/lib/llm/client';
import { createClient } from '@/lib/supabase/server';

const NLSearchSchema = z.object({
  semantic_query: z.string().describe('The core search intent to be embedded for vector search. E.g. "senior backend engineer with open source contributions"'),
  filters: z.object({
    min_seniority: z.number().nullable().describe('Minimum numeric seniority 1-8. E.g. senior = 4'),
    domain: z.string().nullable().describe('Specific industry domain mentioned'),
    skills: z.array(z.string()).describe('Specific hard skills explicitly requested for boolean filtering'),
  }).describe('Structured filters to apply post-retrieval or during hybrid search'),
});

const NL_SEARCH_SYSTEM_PROMPT = `
You are an expert technical recruiter AI assistant. 
Translate a natural language recruiter search query into a structured query format.
Extract the core semantic intent for vector search, and structured filters for exact matching.
`;

export async function processNaturalLanguageSearch(rawQuery: string) {
  // 1. Parse the query with LLM
  const structuredQuery = process.env.GEMINI_API_KEY
    ? await llmClient.generateStructured<z.infer<typeof NLSearchSchema>>({
        systemPrompt: NL_SEARCH_SYSTEM_PROMPT,
        userPrompt: `Query: ${rawQuery}`,
        schema: NLSearchSchema,
        schemaName: 'NLSearchQuery',
      })
    : parseSearchHeuristic(rawQuery);

  const supabase = await createClient();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      structuredQuery,
      results: [],
      warning: 'Supabase is not configured; returning parsed search intent only.',
    };
  }

  const embedRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      text: structuredQuery.semantic_query,
    }),
  });

  if (!embedRes.ok) {
    const { data, error } = await supabase
      .from('candidates')
      .select('id, full_name, raw_resume_text')
      .textSearch('search_vector', structuredQuery.semantic_query, { type: 'websearch' })
      .limit(50);

    if (error) throw error;

    return {
      structuredQuery,
      results: data,
      warning: 'Embedding service unavailable; used PostgreSQL full-text search fallback.',
    };
  }

  const embedData = await embedRes.json();
  const queryEmbedding = embedData.embedding as number[] | undefined;

  if (!queryEmbedding?.length) {
    throw new Error('Embedding service did not return an embedding array');
  }

  const { data, error } = await supabase.rpc('hybrid_search', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    query_text: structuredQuery.semantic_query,
    match_count: 50,
  });

  if (error) throw error;

  // 4. Apply structured filters (e.g. min_seniority)
  const results = data;
  
  if (structuredQuery.filters.skills.length > 0) {
    // Ideally do this in the SQL query, but doing it post-retrieval for simplicity
    // ... filtering logic
  }

  return {
    structuredQuery,
    results
  };
}

function parseSearchHeuristic(rawQuery: string): z.infer<typeof NLSearchSchema> {
  const text = rawQuery.toLowerCase();
  const skillCandidates = [
    'react', 'typescript', 'python', 'go', 'rust', 'postgresql', 'kubernetes',
    'distributed systems', 'llm', 'open source', 'backend', 'frontend',
  ];
  const skills = skillCandidates.filter((skill) => text.includes(skill));
  const min_seniority = text.includes('director')
    ? 6
    : text.includes('lead') || text.includes('staff') || text.includes('principal')
      ? 5
      : text.includes('senior')
        ? 4
        : null;
  const domain = text.includes('fintech') || text.includes('payment')
    ? 'fintech'
    : text.includes('health')
      ? 'healthtech'
      : text.includes('ai') || text.includes('llm')
        ? 'enterprise saas'
        : null;

  return {
    semantic_query: rawQuery,
    filters: {
      min_seniority,
      domain,
      skills,
    },
  };
}
