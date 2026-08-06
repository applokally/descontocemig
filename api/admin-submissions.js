import { del, get, list } from '@vercel/blob';
import { isDownlineSessionActive, normalizeSlug } from './_lib/downlines.js';
import { json, requireAdmin, sameOrigin } from './_lib/security.js';

async function readManifest(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

function belongsTo(submission, slug) {
  return normalizeSlug(submission.affiliateSlug || submission.holder?.consultant) === slug;
}

function isValidSubmissionId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,120}$/.test(value);
}

function documentPathnames(manifest, submissionId) {
  const prefix = 'documents/' + submissionId + '/';
  return Object.values(manifest.files || {})
    .map(file => file?.pathname)
    .filter(pathname =>
      typeof pathname === 'string' &&
      pathname.startsWith(prefix) &&
      !pathname.includes('..')
    );
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

export async function DELETE(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);

  const admin = requireAdmin(request);
  if (!admin || !(await isDownlineSessionActive(admin))) {
    return json({ error: 'Sessão expirada.' }, 401);
  }
  if (admin.role !== 'owner') {
    return json({ error: 'Acesso restrito ao administrador principal.' }, 403);
  }

  const submissionId = new URL(request.url).searchParams.get('id')?.trim();
  if (!isValidSubmissionId(submissionId)) {
    return json({ error: 'Cadastro inválido.' }, 400);
  }

  const manifestPath = 'manifests/' + submissionId + '.json';
  try {
    const manifest = await readManifest(manifestPath);
    if (!manifest) return json({ error: 'Cadastro não encontrado.' }, 404);
    if (manifest.id && manifest.id !== submissionId) {
      return json({ error: 'Cadastro inválido.' }, 409);
    }

    const pathnames = [...new Set([...documentPathnames(manifest, submissionId), manifestPath])];
    await del(pathnames);
    return json({ ok: true, id: submissionId });
  } catch (error) {
    console.error('Falha ao excluir cadastro:', error);
    return json({ error: 'Não foi possível excluir o cadastro.' }, 500);
  }
}
