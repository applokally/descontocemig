import { authenticateDownline } from './_lib/downlines.js';
import { constantTimeEqual, createAdminSession, json, sameOrigin, sessionCookie } from './_lib/security.js';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const configuredPassword = String(process.env.ADMIN_PASSWORD || '');
    let user = null;

    if (configuredEmail && configuredPassword && constantTimeEqual(email, configuredEmail) && constantTimeEqual(password, configuredPassword)) {
      user = { role: 'owner', email, name: 'Administrador principal', slug: '' };
    } else {
      const downline = await authenticateDownline(email, password);
      if (downline) user = { role: 'downline', email: downline.email, name: downline.givenName + ' ' + downline.surname, slug: downline.slug };
    }

    if (!user) return json({ error: 'E-mail ou senha inválidos.' }, 401);
    return json({ ok: true, role: user.role, email: user.email }, 200, { 'Set-Cookie': sessionCookie(createAdminSession(user)) });
  } catch {
    return json({ error: 'Não foi possível autenticar.' }, 400);
  }
}
