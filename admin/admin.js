const loginView = document.querySelector('#login-view');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const loading = document.querySelector('#loading');
const dashboardError = document.querySelector('#dashboard-error');
const listElement = document.querySelector('#submission-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
let submissions = [];

async function api(url, options) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : (options?.headers || {})
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
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function detail(label, value) {
  return '<div class="detail"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || '—') + '</strong></div>';
}

function fileLink(file, label) {
  const url = '/api/admin-file?pathname=' + encodeURIComponent(file.pathname) + '&name=' + encodeURIComponent(file.originalName || label);
  const size = file.size ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : '';
  return '<a class="file-button" href="' + url + '"><span>↓ ' + escapeHtml(label) + '<small>' + escapeHtml(file.originalName || '') + ' · ' + size + '</small></span><span>Baixar</span></a>';
}

function render(items) {
  document.querySelector('#result-count').textContent = items.length + (items.length === 1 ? ' cadastro' : ' cadastros');
  emptyState.hidden = items.length !== 0;
  listElement.innerHTML = items.map(item => {
    const h = item.holder || {};
    return '<article class="submission">' +
      '<button class="submission__summary" type="button" aria-expanded="false">' +
        '<span class="submission__person"><strong>' + escapeHtml(h.givenName + ' ' + h.surname) + '</strong><span>' + escapeHtml(h.email) + '</span></span>' +
        '<span>' + escapeHtml(displayDate(item.createdAt)) + '</span>' +
        '<span class="submission__protocol">' + escapeHtml(item.protocol) + '<small>Protocolo</small></span>' +
        '<span class="status">Novo</span><span class="chevron">⌄</span>' +
      '</button>' +
      '<div class="submission__details">' +
        '<div class="detail-grid">' +
          detail('Nome completo', h.givenName + ' ' + h.surname) +
          detail('CPF', displayCpf(h.cpf)) +
          detail('RG', h.rg) +
          detail('Nascimento', h.birthDate ? h.birthDate.split('-').reverse().join('/') : '') +
          detail('Celular', displayPhone(h.phone)) +
          detail('E-mail', h.email) +
          detail('Nacionalidade', h.nationality) +
          detail('Estado civil', h.maritalStatus) +
          detail('Profissão', h.profession) +
          detail('Documento', h.documentType) +
          detail('Consultor', h.consultant || 'Não informado') +
          detail('Recebido em', displayDate(item.createdAt)) +
        '</div>' +
        '<h3 class="files-title">Documentos protegidos</h3>' +
        '<div class="files">' +
          fileLink(item.files.documentFront, 'Frente do documento') +
          fileLink(item.files.documentBack, 'Verso do documento') +
          fileLink(item.files.cemigBill, 'Conta CEMIG') +
        '</div>' +
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

function showDashboard(email) {
  loginView.hidden = true;
  dashboard.hidden = false;
  document.querySelector('#admin-email').textContent = email;
  loadSubmissions();
}

function showLogin() {
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
    const data = await api('/api/admin-login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(loginForm))) });
    loginForm.reset();
    showDashboard(data.email);
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar com segurança';
  }
});

document.querySelector('#logout-button').addEventListener('click', async () => {
  await api('/api/admin-logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

document.querySelector('#refresh-button').addEventListener('click', loadSubmissions);

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = submissions.filter(item => {
    const text = [item.protocol, item.holder?.givenName, item.holder?.surname, item.holder?.cpf, item.holder?.email, item.holder?.phone].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.includes(query);
  });
  render(filtered);
});

api('/api/admin-session').then(data => showDashboard(data.email)).catch(() => showLogin());
