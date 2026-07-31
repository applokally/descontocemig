import { clearSessionCookie, json, sameOrigin } from './_lib/security.js';

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
