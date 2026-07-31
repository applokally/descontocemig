import { handleUpload } from '@vercel/blob/client';
import { json, verifyToken } from './_lib/security.js';

const kinds = {
  'document-front': ['image/jpeg','image/png','image/webp'],
  'document-back': ['image/jpeg','image/png','image/webp'],
  'cemig-bill': ['application/pdf','image/jpeg','image/png','image/webp']
};

export default async function handler(request) {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const body = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload;
        try { payload = JSON.parse(clientPayload || '{}'); } catch { throw new Error('Sessão de envio inválida.'); }
        const session = verifyToken(payload.sessionToken, 'upload');
        if (!session || !kinds[payload.kind]) throw new Error('Sessão de envio inválida ou expirada.');
        const prefix = 'documents/' + session.id + '/' + payload.kind + '-';
        if (!pathname.startsWith(prefix) || pathname.includes('..')) throw new Error('Caminho de arquivo inválido.');
        return {
          allowedContentTypes: kinds[payload.kind],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ id: session.id, kind: payload.kind })
        };
      },
      onUploadCompleted: async () => {}
    });
    return json(result);
  } catch (error) {
    return json({ error: error.message || 'Não foi possível enviar o arquivo.' }, 400);
  }
}
