import { json, requireAdmin } from './_lib/security.js';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin) return json({ authenticated: false }, 401);
  return json({ authenticated: true, email: admin.email });
}
