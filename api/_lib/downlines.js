import { get, list, put } from '@vercel/blob';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'downlines/';

const clean = (value, max = 120) =>
  String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export function normalizeSlug(value) {
  return clean(value, 80)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function publicRecord(record) {
  return {
    slug: record.slug,
    givenName: record.givenName,
    surname: record.surname,
    email: record.email,
    createdAt: record.createdAt
  };
}

export async function readDownline(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const result = await get(PREFIX + normalized + '.json', { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

export async function listDownlines() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const records = (await Promise.all(blobs.map(async blob => {
    const result = await get(blob.pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).json();
  }))).filter(Boolean);
  return records.sort((a, b) => a.givenName.localeCompare(b.givenName, 'pt-BR'));
}

export async function authenticateDownline(email, password) {
  const normalizedEmail = clean(email, 120).toLowerCase();
  if (!normalizedEmail || !password) return null;
  const record = (await listDownlines()).find(item => item.email === normalizedEmail);
  if (!record) return null;
  const actual = scryptSync(String(password), record.passwordSalt, 64);
  const expected = Buffer.from(record.passwordHash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return publicRecord(record);
}

export async function createDownline(input) {
  const givenName = clean(input?.givenName, 60);
  const surname = clean(input?.surname, 100);
  const email = clean(input?.email, 120).toLowerCase();
  const password = String(input?.password || '');
  const slug = normalizeSlug(input?.slug || givenName + '-' + surname);
  if (!givenName || !surname || !slug) throw new Error('Informe nome e sobrenome válidos.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (password.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  if (await readDownline(slug)) throw new Error('Este link já pertence a outro downline.');
  const existing = (await listDownlines()).find(item => item.email === email);
  if (existing) throw new Error('Este e-mail já está cadastrado.');

  const passwordSalt = randomBytes(16).toString('hex');
  const record = {
    slug,
    givenName,
    surname,
    email,
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
    createdAt: new Date().toISOString()
  };

  await put(PREFIX + slug + '.json', JSON.stringify(record), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  return publicRecord(record);
}

export const toPublicDownline = publicRecord;
