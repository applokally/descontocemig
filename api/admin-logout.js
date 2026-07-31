import { clearSessionCookie, json, sameOrigin } from './_lib/security.js';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
