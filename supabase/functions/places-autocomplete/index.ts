// Supabase Edge Function: places-autocomplete
// Proxies Google Places Autocomplete so the API key never ships with the client.
// Deploy with:  supabase functions deploy places-autocomplete
// Required secret: GOOGLE_MAPS_KEY  (via `supabase secrets set GOOGLE_MAPS_KEY=...`)

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Require an Authorization header (Supabase Auth JWT).
  if (!req.headers.get('authorization')) {
    return json({ error: 'unauthorized' }, 401);
  }

  if (!GOOGLE_KEY) return json({ error: 'server_not_configured' }, 500);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';

  if (!query) return json({ suggestions: [] });

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', query);
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);
  url.searchParams.set('key', GOOGLE_KEY);

  try {
    const resp = await fetch(url.toString());
    const data = await resp.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return json({ error: 'google_error', status: data.status }, 502);
    }
    const suggestions = (data.predictions ?? []).map((p: any) => ({
      placeId: p.place_id,
      description: p.description,
      primary: p.structured_formatting?.main_text ?? p.description,
      secondary: p.structured_formatting?.secondary_text ?? '',
    }));
    return json({ suggestions });
  } catch (e) {
    return json({ error: 'upstream_failure', detail: String(e) }, 502);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
