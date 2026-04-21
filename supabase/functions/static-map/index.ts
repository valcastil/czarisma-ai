// Supabase Edge Function: static-map
// Proxies Google Static Maps PNGs so the API key never ships with the client.
// The client calls /functions/v1/static-map?lat=..&lng=..&w=400&h=220&z=15
// Deploy with:  supabase functions deploy static-map
// Required secret: GOOGLE_MAPS_KEY

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_MAPS_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!GOOGLE_KEY) return new Response('server_not_configured', { status: 500 });

  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get('lat') ?? '');
  const lng = parseFloat(url.searchParams.get('lng') ?? '');
  const w = Math.min(640, Math.max(64, parseInt(url.searchParams.get('w') ?? '400', 10)));
  const h = Math.min(640, Math.max(64, parseInt(url.searchParams.get('h') ?? '220', 10)));
  const z = Math.min(20, Math.max(1, parseInt(url.searchParams.get('z') ?? '15', 10)));

  if (!isFinite(lat) || !isFinite(lng)) {
    return new Response('invalid_coordinates', { status: 400 });
  }

  const google = new URL('https://maps.googleapis.com/maps/api/staticmap');
  google.searchParams.set('center', `${lat},${lng}`);
  google.searchParams.set('zoom', String(z));
  google.searchParams.set('size', `${w}x${h}`);
  google.searchParams.set('markers', `color:red|${lat},${lng}`);
  google.searchParams.set('key', GOOGLE_KEY);

  const resp = await fetch(google.toString());
  const body = await resp.arrayBuffer();
  return new Response(body, {
    status: resp.status,
    headers: {
      ...corsHeaders,
      'content-type': resp.headers.get('content-type') ?? 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  });
});
