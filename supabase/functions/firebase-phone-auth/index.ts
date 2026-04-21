import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Firebase token verification using Google's public keys ──

interface FirebaseClaims {
  phone_number?: string
  sub: string
  aud: string
  iss: string
  exp: number
  iat: number
}

let cachedKeys: Record<string, CryptoKey> = {}
let keysCachedAt = 0
const KEY_CACHE_TTL = 3600_000 // 1 hour

async function getGooglePublicKeys(): Promise<Record<string, CryptoKey>> {
  if (Date.now() - keysCachedAt < KEY_CACHE_TTL && Object.keys(cachedKeys).length > 0) {
    return cachedKeys
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  )
  const certs: Record<string, string> = await res.json()

  const keys: Record<string, CryptoKey> = {}
  for (const [kid, pem] of Object.entries(certs)) {
    // Convert PEM to DER
    const pemBody = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '')
    const binary = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

    const cert = await crypto.subtle.importKey(
      'spki',
      extractPublicKeyFromCert(binary),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
    keys[kid] = cert
  }

  cachedKeys = keys
  keysCachedAt = Date.now()
  return keys
}

// Extract SubjectPublicKeyInfo from an X.509 certificate DER
function extractPublicKeyFromCert(certDer: Uint8Array): ArrayBuffer {
  // Simple ASN.1 parser to find the SubjectPublicKeyInfo
  // X.509 structure: SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }
  // tbsCertificate: SEQUENCE { version, serial, sigAlgo, issuer, validity, subject, subjectPublicKeyInfo, ... }
  let offset = 0

  function readTag(): { tag: number; length: number; start: number } {
    const tag = certDer[offset++]
    let length = certDer[offset++]
    if (length & 0x80) {
      const numBytes = length & 0x7f
      length = 0
      for (let i = 0; i < numBytes; i++) {
        length = (length << 8) | certDer[offset++]
      }
    }
    return { tag, length, start: offset }
  }

  // Outer SEQUENCE
  readTag()
  // tbsCertificate SEQUENCE
  const tbs = readTag()
  const tbsStart = tbs.start

  offset = tbsStart

  // version [0] EXPLICIT (optional)
  if (certDer[offset] === 0xa0) {
    const v = readTag()
    offset = v.start + v.length
  }

  // serialNumber
  const serial = readTag()
  offset = serial.start + serial.length

  // signature AlgorithmIdentifier
  const sigAlgo = readTag()
  offset = sigAlgo.start + sigAlgo.length

  // issuer
  const issuer = readTag()
  offset = issuer.start + issuer.length

  // validity
  const validity = readTag()
  offset = validity.start + validity.length

  // subject
  const subject = readTag()
  offset = subject.start + subject.length

  // subjectPublicKeyInfo - this is what we want
  const spkiTag = readTag()
  const spkiBytes = certDer.slice(offset - (spkiTag.start - (offset - 2 - (spkiTag.length > 127 ? 2 : 1))), spkiTag.start + spkiTag.length)

  // Re-extract properly: go back to tag start
  // The tag byte + length bytes + content = full SPKI
  const spkiStart = spkiTag.start - 2 - (certDer[spkiTag.start - 2] === 0x30 ? 0 :
    (certDer[spkiTag.start - 3] === 0x30 ? 1 : 2))

  // Simpler approach: re-parse to get exact offset
  offset = tbsStart
  const fields: Array<{ start: number; end: number }> = []
  for (let i = 0; i < 6; i++) {
    if (i === 0 && certDer[offset] === 0xa0) {
      const v = readTag()
      offset = v.start + v.length
    }
    const tagStart = offset
    const f = readTag()
    offset = f.start + f.length
    fields.push({ start: tagStart, end: offset })
  }
  // Field index 5 (0-based) = subjectPublicKeyInfo after version
  // But if version is present, field count shifts. Let's just take the 6th field.
  const spki = certDer.slice(fields[5].start, fields[5].end)
  return spki.buffer.slice(spki.byteOffset, spki.byteOffset + spki.byteLength)
}

async function verifyFirebaseToken(idToken: string, projectId: string): Promise<FirebaseClaims> {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('Invalid token format')

  const headerJson = JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  ))
  const payload: FirebaseClaims = JSON.parse(new TextDecoder().decode(
    Uint8Array.from(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  ))

  // Validate claims
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) throw new Error('Token expired')
  if (payload.iat > now + 300) throw new Error('Token issued in the future')
  if (payload.aud !== projectId) throw new Error('Invalid audience')
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid issuer')
  if (!payload.sub) throw new Error('Missing subject')

  // Verify signature
  const keys = await getGooglePublicKeys()
  const key = keys[headerJson.kid]
  if (!key) throw new Error('Unknown signing key')

  const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const signature = Uint8Array.from(
    atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0)
  )

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signatureInput)
  if (!valid) throw new Error('Invalid signature')

  return payload
}

// ── JWT signing for Supabase session ──

async function createSupabaseJwt(
  userId: string,
  jwtSecret: string,
  expiresInSeconds = 3600
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    iat: now,
    exp: now + expiresInSeconds,
  }

  const enc = new TextEncoder()
  const headerB64 = base64url(enc.encode(JSON.stringify(header)))
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)))
  const input = `${headerB64}.${payloadB64}`

  const keyData = enc.encode(jwtSecret)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(input))
  const sigB64 = base64url(new Uint8Array(sig))

  return `${input}.${sigB64}`
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const jwtSecret = Deno.env.get('JWT_SECRET')

    // Core secrets required by every mode. JWT secret is only needed when we
    // mint session tokens (signup / signin); `link` mode only updates a row.
    if (!firebaseProjectId || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: FIREBASE_PROJECT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    }

    const { firebaseIdToken, mode, linkToUserId } = await req.json()

    if (!firebaseIdToken) {
      return new Response(
        JSON.stringify({ error: 'firebaseIdToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the Firebase token
    const claims = await verifyFirebaseToken(firebaseIdToken, firebaseProjectId)
    const phoneNumber = claims.phone_number

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'No phone number in Firebase token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Link phone to existing account ──
    if (mode === 'link' && linkToUserId) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ phone: phoneNumber })
        .eq('id', linkToUserId)

      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Failed to link phone: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, phone: phoneNumber }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Sign-in / Sign-up flow ──

    // Check if a user with this phone already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('phone', phoneNumber)
      .maybeSingle()

    let userId: string

    if (existingProfile) {
      // Existing user — sign in
      userId = existingProfile.id
    } else if (mode === 'signin') {
      // Sign-in mode but no account found
      return new Response(
        JSON.stringify({ error: 'No account found for this phone number. Please sign up first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // New user — create Supabase account
      // Generate a placeholder email from the phone number for Supabase auth
      const placeholderEmail = `phone_${phoneNumber.replace(/[^0-9]/g, '')}@phone.charismachat.local`

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: placeholderEmail,
        email_confirm: true,
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: {
          auth_method: 'phone',
          phone_number: phoneNumber,
        },
      })

      if (createError) {
        // If email conflict, the user may already exist via email — try to find them
        if (createError.message?.includes('already been registered')) {
          return new Response(
            JSON.stringify({
              error: 'A user with a linked identifier already exists. Try signing in with email instead.',
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw createError
      }

      userId = newUser.user.id

      // Update the profile with the phone number
      // (profile row is auto-created by the on_auth_user_created trigger)
      // Wait briefly for the trigger to complete
      await new Promise((r) => setTimeout(r, 500))

      await supabaseAdmin
        .from('profiles')
        .update({ phone: phoneNumber })
        .eq('id', userId)
    }

    if (!jwtSecret) {
      return new Response(
        JSON.stringify({ error: 'Server not configured for phone signin/signup: JWT_SECRET is missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate Supabase JWT
    const accessToken = await createSupabaseJwt(userId, jwtSecret, 3600)
    const refreshToken = await createSupabaseJwt(userId, jwtSecret, 86400 * 30)

    // Fetch the profile for the client
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, username, name, avatar_url, phone')
      .eq('id', userId)
      .maybeSingle()

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: userId,
          phone: phoneNumber,
          ...profile,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('firebase-phone-auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
