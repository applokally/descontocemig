import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'atl_admin';
const MAX_TEXT = 160;

export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    }
  });
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!origin || !host) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Configuração de segurança ausente.');
  return value;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function safeEqual(left, right) {
  const a = createHash('sha256').update(String(left)).digest();
  const b = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(a, b);
}

export function constantTimeEqual(left, right) {
  return safeEqual(left, right);
}

export function signToken(payload) {
  const body = encode(payload);
  const signature = createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + signature;
}

export function verifyToken(token, expectedType) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = createHmac('sha256', secret()).update(parts[0]).digest('base64url');
  if (!safeEqual(parts[1], expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (payload.type !== expectedType || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function createUploadSession() {
  const id = randomUUID();
  return {
    submissionId: id,
    sessionToken: signToken({ type: 'upload', id, exp: Date.now() + 30 * 60 * 1000 })
  };
}

export function createAdminSession(user) {
  return signToken({
    type: 'admin',
    role: user.role,
    email: user.email,
    slug: user.slug || '',
    name: user.name || '',
    exp: Date.now() + 8 * 60 * 60 * 1000
  });
}

export function sessionCookie(token) {
  return COOKIE_NAME + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800';
}

export function clearSessionCookie() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

function cookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(item => {
    const index = item.indexOf('=');
    return index < 0 ? ['', ''] : [item.slice(0, index).trim(), item.slice(index + 1).trim()];
  }));
}

export function requireAdmin(request) {
  return verifyToken(cookies(request)[COOKIE_NAME], 'admin');
}

const onlyDigits = value => String(value || '').replace(/\D/g, '');
const clean = (value, max = MAX_TEXT) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export function validCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || new Set(cpf).size === 1) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

export function validateHolder(input) {
  const holder = {
    givenName: clean(input?.givenName, 60),
    surname: clean(input?.surname, 100),
    nationality: clean(input?.nationality, 40),
    birthDate: clean(input?.birthDate, 10),
    email: clean(input?.email, 120).toLowerCase(),
    phone: clean(input?.phone, 20),
    personType: clean(input?.personType, 4),
    cpf: clean(input?.cpf, 14),
    rg: clean(input?.rg, 30),
    maritalStatus: clean(input?.maritalStatus, 30),
    profession: clean(input?.profession, 80),
    documentType: clean(input?.documentType, 10),
    consent: input?.consent === true,
    consultant: clean(input?.consultant, 80),
    profile: clean(input?.profile, 30),
    billValue: clean(input?.billValue, 20),
    monthlySavings: clean(input?.monthlySavings, 20),
    annualSavings: clean(input?.annualSavings, 20),
    estimatedFinalValue: clean(input?.estimatedFinalValue, 20)
  };

  const requiredText = ['givenName','surname','nationality','birthDate','email','phone','personType','cpf','rg','maritalStatus','profession','documentType'];
  if (requiredText.some(key => !holder[key])) throw new Error('Preencha todos os campos obrigatórios.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(holder.birthDate) || new Date(holder.birthDate + 'T12:00:00Z') > new Date()) throw new Error('Informe uma data de nascimento válida.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(holder.email)) throw new Error('Informe um e-mail válido.');
  if (onlyDigits(holder.phone).length < 10) throw new Error('Informe um celular válido.');
  if (holder.personType !== 'PF') throw new Error('O cadastro deve ser de pessoa física.');
  if (!validCpf(holder.cpf)) throw new Error('Informe um CPF válido.');
  if (!['RG','CNH'].includes(holder.documentType)) throw new Error('Selecione um documento válido.');
  if (!holder.consent) throw new Error('A autorização para tratamento dos dados é obrigatória.');
  holder.cpf = onlyDigits(holder.cpf);
  holder.phone = onlyDigits(holder.phone);
  return holder;
}

export function protocolFromId(id) {
  return 'ATL-' + id.replace(/-/g, '').slice(0, 10).toUpperCase();
}
