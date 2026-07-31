import { createUploadSession, json, sameOrigin, validateHolder } from './_lib/security.js';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const body = await request.json();
    validateHolder(body.holder);
    return json(createUploadSession(), 201);
  } catch (error) {
    return json({ error: error.message || 'Dados inválidos.' }, 400);
  }
}
