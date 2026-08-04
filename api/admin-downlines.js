import { createDownline, deleteDownline, listDownlines, updateDownline } from './_lib/downlines.js';
import { json, requireAdmin, sameOrigin } from './_lib/security.js';

function requireOwner(request) {
  const admin = requireAdmin(request);
  if (!admin) return { error: 'Sessão expirada.', status: 401 };
  if (admin.role !== 'owner') {
    return { error: 'Acesso restrito ao administrador principal.', status: 403 };
  }
  return { admin };
}

function isValidationError(message) {
  return /^(Informe|A senha|Este link|Este e-mail|Downline não encontrado)/.test(message);
}

function errorResponse(error, action) {
  const message = error instanceof Error ? error.message : '';
  const validationError = isValidationError(message);
  if (!validationError) console.error('Falha ao ' + action + ' downline:', error);
  const status = message === 'Downline não encontrado.' ? 404 : validationError ? 400 : 500;
  return json({ error: validationError ? message : 'Não foi possível ' + action + ' o downline.' }, status);
}

export async function GET(request) {
  const session = requireOwner(request);
  if (!session.admin) return json({ error: session.error }, session.status);

  try {
    return json({ downlines: await listDownlines() });
  } catch (error) {
    console.error('Falha ao listar downlines:', error);
    return json({ error: 'Não foi possível carregar os downlines.' }, 500);
  }
}

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  const session = requireOwner(request);
  if (!session.admin) return json({ error: session.error }, session.status);

  try {
    const input = await request.json();
    const downline = await createDownline(input);
    return json({ downline }, 201);
  } catch (error) {
    return errorResponse(error, 'criar');
  }
}

export async function PATCH(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  const session = requireOwner(request);
  if (!session.admin) return json({ error: session.error }, session.status);

  try {
    const input = await request.json();
    const downline = await updateDownline(input.slug, input);
    return json({ downline });
  } catch (error) {
    return errorResponse(error, 'atualizar');
  }
}

export async function DELETE(request) {
  if (!sameOrigin(request)) return json({ error: 'Origem não autorizada.' }, 403);
  const session = requireOwner(request);
  if (!session.admin) return json({ error: session.error }, session.status);

  try {
    const slug = new URL(request.url).searchParams.get('slug');
    const downline = await deleteDownline(slug);
    return json({ downline });
  } catch (error) {
    return errorResponse(error, 'excluir');
  }
}
