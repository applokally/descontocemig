import { get, list } from '@vercel/blob';
import { isDownlineSessionActive, normalizeSlug } from './_lib/downlines.js';
import { json, requireAdmin } from './_lib/security.js';

async function readManifest(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

function belongsTo(submission, slug) {
  return normalizeSlug(submission.affiliateSlug || submission.holder?.consultant) === slug;
}

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin || !(await isDownlineSessionActive(admin))) return json({ error: 'Sessão expirada.' }, 401);
  try {
    const { blobs } = await list({ prefix: 'manifests/', limit: 1000 });
    let submissions = (await Promise.all(blobs.map(blob => readManifest(blob.pathname)))).filter(Boolean);
    if (admin.role === 'downline') submissions = submissions.filter(item => belongsTo(item, admin.slug));
    submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ submissions });
  } catch {
    return json({ error: 'Não foi possível carregar os cadastros.' }, 500);
  }
}
