import { get } from '@vercel/blob';
import { isDownlineSessionActive, normalizeSlug } from './_lib/downlines.js';
import { requireAdmin } from './_lib/security.js';

async function canAccess(admin, pathname) {
  if (admin.role === 'owner') return true;
  const submissionId = pathname.split('/')[1] || '';
  if (!submissionId) return false;
  const manifest = await get('manifests/' + submissionId + '.json', { access: 'private' });
  if (!manifest || manifest.statusCode !== 200) return false;
  const data = await new Response(manifest.stream).json();
  return normalizeSlug(data.affiliateSlug || data.holder?.consultant) === admin.slug;
}

export async function GET(request) {
  const admin = requireAdmin(request);
  if (!admin || !(await isDownlineSessionActive(admin))) return new Response('Sessão expirada.', { status: 401 });
  const url = new URL(request.url);
  const pathname = url.searchParams.get('pathname') || '';
  const requestedName = (url.searchParams.get('name') || 'arquivo').replace(/[^a-zA-Z0-9 ._()À-ÿ-]/g, '').slice(0, 160);
  if (!pathname.startsWith('documents/') || pathname.includes('..')) return new Response('Arquivo inválido.', { status: 400 });
  if (!(await canAccess(admin, pathname))) return new Response('Acesso negado.', { status: 403 });
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return new Response('Arquivo não encontrado.', { status: 404 });
  return new Response(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType || 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="' + requestedName + '"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
