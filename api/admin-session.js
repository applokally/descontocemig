import { json, requireAdmin } from './_lib/security.js';

export default async function handler(request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido.' }, 405);
  const admin = requireAdmin(request);
  if (!admin) return json({ authenticated: false }, 401);
  return json({ authenticated: true, email: admin.email });
}
