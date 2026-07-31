import { get, list } from '@vercel/blob';
import { json, requireAdmin } from './_lib/security.js';

async function readManifest(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

export async function GET(request) {
  if (!requireAdmin(request)) return json({ error: 'Sessão expirada.' }, 401);
  try {
    const { blobs } = await list({ prefix: 'manifests/', limit: 1000 });
    const submissions = (await Promise.all(blobs.map(blob => readManifest(blob.pathname)))).filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return json({ submissions });
  } catch {
    return json({ error: 'Não foi possível carregar os cadastros.' }, 500);
  }
}
