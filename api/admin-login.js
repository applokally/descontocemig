import { constantTimeEqual, createAdminSession, json, sameOrigin, sessionCookie } from './_lib/security.js';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const body = await request.json();
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || '');
    if (!configuredEmail || !configuredPassword) return json({ error: 'Acesso administrativo ainda não configurado.' }, 503);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!constantTimeEqual(email, configuredEmail) || !constantTimeEqual(password, configuredPassword)) return json({ error: 'E-mail ou senha inválidos.' }, 401);
    return json({ ok: true, email }, 200, { 'Set-Cookie': sessionCookie(createAdminSession(email)) });
  } catch {
    return json({ error: 'Não foi possível autenticar.' }, 400);
  }
}
