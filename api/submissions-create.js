import { head, put } from '@vercel/blob';
import { json, protocolFromId, sameOrigin, validateHolder, verifyToken } from './_lib/security.js';

const expected = {
  documentFront: { kind: 'document-front', types: ['image/jpeg','image/png','image/webp'] },
  documentBack: { kind: 'document-back', types: ['image/jpeg','image/png','image/webp'] },
  cemigBill: { kind: 'energy-bill', types: ['application/pdf','image/jpeg','image/png','image/webp'] }
};

function safeOriginalName(value) {
  return String(value || 'arquivo').replace(/[^a-zA-Z0-9 ._()À-ÿ-]/g, '').slice(0, 160);
}

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const body = await request.json();
    const session = verifyToken(body.sessionToken, 'upload');
    if (!session) throw new Error('Sua sessão expirou. Tente enviar novamente.');
    const holder = validateHolder(body.holder);
    const files = {};

    for (const [key, rule] of Object.entries(expected)) {
      const sent = body.files?.[key];
      const pathname = String(sent?.pathname || '');
      const prefix = 'documents/' + session.id + '/' + rule.kind + '-';
      if (!pathname.startsWith(prefix) || pathname.includes('..')) throw new Error('Arquivo obrigatório ausente ou inválido.');
      const metadata = await head(pathname);
      if (!metadata || metadata.size > 10 * 1024 * 1024 || !rule.types.includes(metadata.contentType)) throw new Error('Um dos arquivos enviados não é válido.');
      files[key] = {
        pathname: metadata.pathname,
        contentType: metadata.contentType,
        size: metadata.size,
        uploadedAt: metadata.uploadedAt,
        originalName: safeOriginalName(sent.originalName)
      };
    }

    const createdAt = new Date().toISOString();
    const affiliateSlug = String(holder.consultant || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    const manifest = {
      id: session.id,
      protocol: protocolFromId(session.id),
      status: 'new',
      createdAt,
      holder,
      affiliateSlug,
      files,
      source: 'energy.atlservicos.com.br/cadastrar_conta'
    };

    await put('manifests/' + session.id + '.json', JSON.stringify(manifest), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false
    });

    return json({ ok: true, protocol: manifest.protocol }, 201);
  } catch (error) {
    return json({ error: error.message || 'Não foi possível concluir o cadastro.' }, 400);
  }
}
