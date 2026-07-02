import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type EmbedType = 'candidate' | 'job' | 'skill';

type SupabaseAiGlobal = {
  ai: {
    Session: new (model: string) => {
      run: (
        text: string,
        options: { mean_pool: boolean; normalize: boolean },
      ) => Promise<Iterable<number>>;
    };
  };
};

function getEmbeddingSession(model: string) {
  const supabaseRuntime = (globalThis as typeof globalThis & { Supabase?: SupabaseAiGlobal }).Supabase;

  if (!supabaseRuntime?.ai?.Session) {
    throw new Error('Supabase AI runtime is unavailable. Deploy this function in Supabase Edge Runtime.');
  }

  return new supabaseRuntime.ai.Session(model);
}

interface EmbedRequest {
  type?: EmbedType;
  id?: string;
  text?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const tableByType: Record<EmbedType, string> = {
  candidate: 'candidates',
  job: 'jobs',
  skill: 'skills_ontology',
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { type, id, text } = (await req.json()) as EmbedRequest;

    if (!text || typeof text !== 'string') {
      return jsonResponse({ error: 'text is required' }, { status: 400 });
    }

    if ((type && !tableByType[type]) || (!type && id) || (type && !id)) {
      return jsonResponse(
        { error: 'Provide both type and id to persist an embedding, or only text to return an embedding.' },
        { status: 400 },
      );
    }

    const session = getEmbeddingSession('gte-small');
    const rawEmbedding = await session.run(text, {
      mean_pool: true,
      normalize: true,
    });
    const embedding = Array.from(rawEmbedding as Iterable<number>);

    if (!type || !id) {
      return jsonResponse({ success: true, embedding });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse(
        { error: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured to persist embeddings.' },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from(tableByType[type])
      .update({ embedding })
      .eq('id', id);

    if (error) throw error;

    return jsonResponse({
      success: true,
      embedding,
      message: `Embedding updated for ${type} ${id}`,
    });
  } catch (error) {
    console.error('Edge Function Error:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
});
