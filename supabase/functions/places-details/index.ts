// Supabase Edge Function: places-details
// Returns coordinates + formatted address for a place_id.
// Deploy with:  supabase functions deploy places-details
// Required secret: GOOGLE_MAPS_KEY

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
  if (!req.headers.get('authorization')) return json({ error: 'unauthorized' }, 401);
  if (!GOOGLE_KEY) return json({ error: 'server_not_configured' }, 500);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  const placeId = typeof body.placeId === 'string' ? body.placeId : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';
  if (!placeId) return json({ error: 'missing_place_id' }, 400);

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'geometry,name,formatted_address');
  if (sessionToken) url.searchParams.set('sessiontoken', sessionToken);
  url.searchParams.set('key', GOOGLE_KEY);

  try {
    const resp = await fetch(url.toString());
    const data = await resp.json();
    if (data.status !== 'OK') {
      return json({ error: 'google_error', status: data.status }, 502);
    }
    const r = data.result;
    return json({
      placeId,
      name: r.name ?? '',
      address: r.formatted_address ?? '',
      latitude: r.geometry?.location?.lat ?? 0,
      longitude: r.geometry?.location?.lng ?? 0,
    });
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
