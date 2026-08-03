import { createDownline, listDownlines } from './_lib/downlines.js';
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
  return /^(Informe|A senha|Este link|Este e-mail)/.test(message);
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
    const message = error instanceof Error ? error.message : '';
    const validationError = isValidationError(message);
    if (!validationError) console.error('Falha ao criar downline:', error);
    return json(
      { error: validationError ? message : 'Não foi possível criar o downline.' },
      validationError ? 400 : 500
    );
  }
}
