import { get } from '@vercel/blob';
import { requireAdmin } from './_lib/security.js';

export async function GET(request) {
  if (!requireAdmin(request)) return new Response('Sessão expirada.', { status: 401 });
  const url = new URL(request.url);
  const pathname = url.searchParams.get('pathname') || '';
  const requestedName = (url.searchParams.get('name') || 'arquivo').replace(/[^a-zA-Z0-9 ._()À-ÿ-]/g, '').slice(0, 160);
  if (!pathname.startsWith('documents/') || pathname.includes('..')) return new Response('Arquivo inválido.', { status: 400 });
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
