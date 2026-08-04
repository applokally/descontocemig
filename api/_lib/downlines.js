import { del, get, list, put } from '@vercel/blob';
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
    createdAt: record.createdAt,
    updatedAt: record.updatedAt || ''
  };
}

function validateIdentity(input, fallback = {}) {
  const givenName = clean(input?.givenName ?? fallback.givenName, 60);
  const surname = clean(input?.surname ?? fallback.surname, 100);
  const email = clean(input?.email ?? fallback.email, 120).toLowerCase();
  if (!givenName || !surname) throw new Error('Informe nome e sobrenome válidos.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Informe um e-mail válido.');
  return { givenName, surname, email };
}

function passwordData(password) {
  const value = String(password || '');
  if (value.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  const passwordSalt = randomBytes(16).toString('hex');
  return {
    passwordSalt,
    passwordHash: scryptSync(value, passwordSalt, 64).toString('hex')
  };
}

export async function readDownline(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const result = await get(PREFIX + normalized + '.json', { access: 'private' });
  if (!result || result.statusCode !== 200) return null;
  return new Response(result.stream).json();
}

export async function isDownlineSessionActive(session) {
  if (!session) return false;
  if (session.role === 'owner') return true;
  if (session.role !== 'downline') return false;
  const record = await readDownline(session.slug);
  return Boolean(record && record.email === clean(session.email, 120).toLowerCase());
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
  if (!record || !record.passwordSalt || !record.passwordHash) return null;
  const actual = scryptSync(String(password), record.passwordSalt, 64);
  const expected = Buffer.from(record.passwordHash, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return publicRecord(record);
}

export async function createDownline(input) {
  const { givenName, surname, email } = validateIdentity(input);
  const password = String(input?.password || '');
  const slug = normalizeSlug(input?.slug || givenName + '-' + surname);
  if (!slug) throw new Error('Informe nome e sobrenome válidos.');
  if (await readDownline(slug)) throw new Error('Este link já pertence a outro downline.');
  const existing = (await listDownlines()).find(item => item.email === email);
  if (existing) throw new Error('Este e-mail já está cadastrado.');

  const record = {
    slug,
    givenName,
    surname,
    email,
    ...passwordData(password),
    createdAt: new Date().toISOString(),
    updatedAt: ''
  };

  await put(PREFIX + slug + '.json', JSON.stringify(record), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  return publicRecord(record);
}

export async function updateDownline(slug, input) {
  const normalized = normalizeSlug(slug);
  const current = await readDownline(normalized);
  if (!current) throw new Error('Downline não encontrado.');

  const { givenName, surname, email } = validateIdentity(input, current);
  const existing = (await listDownlines()).find(item => item.email === email && item.slug !== normalized);
  if (existing) throw new Error('Este e-mail já está cadastrado.');

  const record = {
    ...current,
    slug: normalized,
    givenName,
    surname,
    email,
    updatedAt: new Date().toISOString()
  };

  const password = String(input?.password || '');
  if (password) Object.assign(record, passwordData(password));

  await put(PREFIX + normalized + '.json', JSON.stringify(record), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true
  });
  return publicRecord(record);
}

export async function deleteDownline(slug) {
  const normalized = normalizeSlug(slug);
  const current = await readDownline(normalized);
  if (!current) throw new Error('Downline não encontrado.');
  await del(PREFIX + normalized + '.json');
  return publicRecord(current);
}

export const toPublicDownline = publicRecord;
