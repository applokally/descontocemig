import { isDownlineSessionActive } from './_lib/downlines.js';
import { json, requireAdmin } from './_lib/security.js';

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin || !(await isDownlineSessionActive(admin))) return json({ authenticated: false }, 401);
  return json({ authenticated: true, role: admin.role, email: admin.email, name: admin.name || '', slug: admin.slug || '' });
}
