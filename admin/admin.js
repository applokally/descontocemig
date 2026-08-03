const loginView = document.querySelector('#login-view');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const loading = document.querySelector('#loading');
const dashboardError = document.querySelector('#dashboard-error');
const listElement = document.querySelector('#submission-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
const downlinePanel = document.querySelector('#downline-panel');
const downlineForm = document.querySelector('#downline-form');
let submissions = [];
let currentSession = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : (options.headers || {})
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'Não foi possível concluir a operação.');
    error.status = response.status;
    throw error;
  }
  return body;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[character]);
}

function displayCpf(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function displayPhone(value) {
  const phone = String(value || '').replace(/\D/g, '');
  return phone.length === 11 ? phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : phone;
}

function displayDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function displayMoney(value) {
  const number = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
}

function detail(label, value) {
  return '<div class="detail"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || '—') + '</strong></div>';
}

function fileLink(file, label) {
  if (!file || !file.pathname) return '';
  const url = '/api/admin-file?pathname=' + encodeURIComponent(file.pathname) + '&name=' + encodeURIComponent(file.originalName || label);
  const size = file.size ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : '';
  return '<a class="file-button" href="' + url + '"><span>↓ ' + escapeHtml(label) + '<small>' + escapeHtml(file.originalName || '') + (size ? ' · ' + size : '') + '</small></span><span>Baixar</span></a>';
}

function render(items) {
  document.querySelector('#result-count').textContent = items.length + (items.length === 1 ? ' cadastro' : ' cadastros');
  emptyState.hidden = items.length !== 0;
  listElement.innerHTML = items.map(item => {
    const h = item.holder || {};
    const files = item.files || {};
    const fullName = [h.givenName, h.surname].filter(Boolean).join(' ');
    const simulationData = h.simulation || h;
    const simulation = [
      detail('Perfil simulado', h.profile),
      detail('Valor da conta', displayMoney(simulationData.billValue)),
      detail('Economia mensal', displayMoney(simulationData.monthlySavings)),
      detail('Economia anual', displayMoney(simulationData.annualSavings)),
      detail('Conta estimada', displayMoney(simulationData.estimatedFinalValue))
    ].join('');
    const documents = [
      fileLink(files.documentFront, 'Frente do documento'),
      fileLink(files.documentBack, 'Verso do documento'),
      fileLink(files.cemigBill || files.energyBill, 'Conta de energia')
    ].filter(Boolean).join('');
    return '<article class="submission">' +
      '<button class="submission__summary" type="button" aria-expanded="false">' +
        '<span class="submission__person"><strong>' + escapeHtml(fullName || 'Cadastro sem nome') + '</strong><span>' + escapeHtml(h.email) + '</span></span>' +
        '<span>' + escapeHtml(displayDate(item.createdAt)) + '</span>' +
        '<span class="submission__protocol">' + escapeHtml(item.protocol) + '<small>Protocolo</small></span>' +
        '<span class="status">Novo</span><span class="chevron">⌄</span>' +
      '</button>' +
      '<div class="submission__details">' +
        '<div class="detail-grid">' +
          detail('Nome completo', fullName) +
          detail('CPF', displayCpf(h.cpf)) +
          detail('RG', h.rg) +
          detail('Nascimento', h.birthDate ? h.birthDate.split('-').reverse().join('/') : '') +
          detail('Celular', displayPhone(h.phone)) +
          detail('E-mail', h.email) +
          detail('Nacionalidade', h.nationality) +
          detail('Estado civil', h.maritalStatus) +
          detail('Profissão', h.profession) +
          detail('Documento', h.documentType) +
          detail('Downline / link', item.affiliateSlug || h.consultant || 'Direto') +
          detail('Recebido em', displayDate(item.createdAt)) +
        '</div>' +
        (simulation ? '<h3 class="files-title">Simulação de origem</h3><div class="detail-grid simulation-grid">' + simulation + '</div>' : '') +
        '<h3 class="files-title">Documentos protegidos</h3>' +
        '<div class="files">' + documents + '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  document.querySelectorAll('.submission__summary').forEach(button => {
    button.addEventListener('click', () => {
      const article = button.closest('.submission');
      const open = article.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
    });
  });
}

function updateMetrics() {
  const today = new Date().toDateString();
  document.querySelector('#total-count').textContent = submissions.length;
  document.querySelector('#today-count').textContent = submissions.filter(item => new Date(item.createdAt).toDateString() === today).length;
  document.querySelector('#document-count').textContent = submissions.reduce((total, item) => total + Object.keys(item.files || {}).length, 0);
}

async function loadSubmissions() {
  loading.hidden = false;
  dashboardError.hidden = true;
  emptyState.hidden = true;
  listElement.innerHTML = '';
  try {
    const data = await api('/api/admin-submissions');
    submissions = data.submissions || [];
    updateMetrics();
    render(submissions);
  } catch (error) {
    if (error.status === 401) return showLogin();
    dashboardError.textContent = error.message;
    dashboardError.hidden = false;
  } finally {
    loading.hidden = true;
  }
}

function downlineMarkup(item) {
  const link = location.origin + '/' + item.slug;
  return '<article class="downline-row"><div><strong>' + escapeHtml(item.givenName + ' ' + item.surname) + '</strong><span>' + escapeHtml(item.email) + '</span><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' + escapeHtml(link) + '</a></div><button type="button" data-copy="' + escapeHtml(link) + '">Copiar link</button></article>';
}

async function loadDownlines() {
  if (currentSession?.role !== 'owner') return;
  const list = document.querySelector('#downline-list');
  try {
    const data = await api('/api/admin-downlines');
    list.innerHTML = (data.downlines || []).map(downlineMarkup).join('') || '<p class="muted">Nenhum downline cadastrado.</p>';
  } catch (error) {
    list.innerHTML = '<p class="error">' + escapeHtml(error.message) + '</p>';
  }
}

function showDashboard(session) {
  currentSession = session;
  loginView.hidden = true;
  dashboard.hidden = false;
  const owner = session.role === 'owner';
  document.querySelector('#admin-identity').textContent = session.name || session.email;
  document.querySelector('#admin-role').textContent = owner ? 'Administrador principal' : 'Downline';
  document.querySelector('#area-label').textContent = owner ? 'Visão geral da operação' : 'Área do downline';
  document.querySelector('#scope-message').textContent = owner ? 'Você visualiza todos os cadastros e gerencia os acessos da rede.' : 'Você visualiza somente os cadastros realizados pelo seu link.';
  downlinePanel.hidden = !owner;
  const affiliateCard = document.querySelector('#affiliate-card');
  affiliateCard.hidden = owner;
  if (!owner && session.slug) {
    const link = location.origin + '/' + session.slug;
    document.querySelector('#affiliate-link').textContent = link;
    document.querySelector('#copy-affiliate-link').dataset.copy = link;
  }
  if (owner) loadDownlines();
  loadSubmissions();
}

function showLogin() {
  currentSession = null;
  dashboard.hidden = true;
  loginView.hidden = false;
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.hidden = true;
  const button = loginForm.querySelector('button');
  button.disabled = true;
  button.textContent = 'Entrando…';
  try {
    await api('/api/admin-login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    const session = await api('/api/admin-session');
    loginForm.reset();
    showDashboard(session);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar com segurança';
  }
});

downlineForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = downlineForm.querySelector('button');
  const errorElement = document.querySelector('#downline-error');
  const successElement = document.querySelector('#downline-success');
  errorElement.hidden = true;
  successElement.hidden = true;
  button.disabled = true;
  button.textContent = 'Criando…';
  try {
    const data = await api('/api/admin-downlines', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(downlineForm))) });
    const link = location.origin + '/' + data.downline.slug;
    successElement.innerHTML = 'Downline criado. Link exclusivo: <a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' + escapeHtml(link) + '</a>';
    successElement.hidden = false;
    downlineForm.reset();
    await loadDownlines();
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Criar downline';
  }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = 'Copiado!';
  } catch {
    button.textContent = 'Copie pelo link';
  }
  setTimeout(() => { button.textContent = original; }, 1600);
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await api('/api/admin-logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

document.querySelector('#refresh-button').addEventListener('click', () => {
  loadSubmissions();
  loadDownlines();
});

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = submissions.filter(item => {
    const text = [item.protocol, item.affiliateSlug, item.holder?.givenName, item.holder?.surname, item.holder?.cpf, item.holder?.email, item.holder?.phone].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.includes(query);
  });
  render(filtered);
});

api('/api/admin-session').then(showDashboard).catch(showLogin);
