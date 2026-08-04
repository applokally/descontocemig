const loginView = document.querySelector('#login-view');
const dashboard = document.querySelector('#dashboard');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const loading = document.querySelector('#loading');
const dashboardError = document.querySelector('#dashboard-error');
const listElement = document.querySelector('#submission-list');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
const downlineForm = document.querySelector('#downline-form');
const downlineDialog = document.querySelector('#downline-dialog');
const downlineEditForm = document.querySelector('#downline-edit-form');
let submissions = [];
let downlines = [];
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
        '<h3 class="files-title">Simulação de origem</h3><div class="detail-grid simulation-grid">' + simulation + '</div>' +
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

function initials(item) {
  return ((item.givenName?.[0] || '') + (item.surname?.[0] || '')).toUpperCase() || 'D';
}

function downlineMarkup(item) {
  const link = location.origin + '/' + item.slug;
  return '<tr>' +
    '<td><div class="person-cell"><span class="profile-avatar">' + escapeHtml(initials(item)) + '</span><div><strong>' + escapeHtml(item.givenName + ' ' + item.surname) + '</strong><span>' + escapeHtml(item.email) + '</span></div></div></td>' +
    '<td class="link-cell"><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' + escapeHtml(link) + '</a><button type="button" data-copy="' + escapeHtml(link) + '">Copiar link</button></td>' +
    '<td>' + escapeHtml(displayDate(item.createdAt)) + '</td>' +
    '<td><div class="row-actions"><a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">Visualizar</a><button type="button" data-edit-downline="' + escapeHtml(item.slug) + '">Editar</button><button type="button" class="danger" data-delete-downline="' + escapeHtml(item.slug) + '">Excluir</button></div></td>' +
  '</tr>';
}

async function loadDownlines() {
  if (currentSession?.role !== 'owner') return;
  const list = document.querySelector('#downline-list');
  const empty = document.querySelector('#downline-empty');
  try {
    const data = await api('/api/admin-downlines');
    downlines = data.downlines || [];
    list.innerHTML = downlines.map(downlineMarkup).join('');
    empty.hidden = downlines.length !== 0;
    document.querySelector('#downline-count').textContent = downlines.length + (downlines.length === 1 ? ' acesso' : ' acessos');
  } catch (error) {
    list.innerHTML = '<tr><td colspan="4"><p class="error">' + escapeHtml(error.message) + '</p></td></tr>';
    empty.hidden = true;
  }
}

function setView(name) {
  if (name === 'downlines' && currentSession?.role !== 'owner') name = 'accounts';
  document.querySelector('#accounts-view').hidden = name !== 'accounts';
  document.querySelector('#downlines-view').hidden = name !== 'downlines';
  document.querySelectorAll('[data-view-target]').forEach(button => button.classList.toggle('is-active', button.dataset.viewTarget === name));
  dashboard.classList.remove('is-menu-open');
  if (name === 'downlines') loadDownlines();
}

function showDashboard(session) {
  currentSession = session;
  loginView.hidden = true;
  dashboard.hidden = false;
  const owner = session.role === 'owner';
  const identity = session.name || session.email;
  document.querySelector('#admin-identity').textContent = identity;
  document.querySelector('#admin-role').textContent = owner ? 'Administrador principal' : 'Downline';
  document.querySelector('#mobile-role').textContent = owner ? 'Administrador' : 'Downline';
  document.querySelector('#profile-avatar').textContent = identity.trim().charAt(0).toUpperCase() || 'A';
  document.querySelector('#area-label').textContent = owner ? 'Visão geral da operação' : 'Área do downline';
  document.querySelector('#scope-message').textContent = owner ? 'Você visualiza todas as contas recebidas e gerencia os acessos da rede.' : 'Você visualiza somente as contas realizadas pelo seu link.';
  document.querySelector('#downlines-nav').hidden = !owner;
  const affiliateCard = document.querySelector('#affiliate-card');
  affiliateCard.hidden = owner;
  if (!owner && session.slug) {
    const link = location.origin + '/' + session.slug;
    document.querySelector('#affiliate-link').textContent = link;
    document.querySelector('#copy-affiliate-link').dataset.copy = link;
  }
  setView('accounts');
  if (owner) loadDownlines();
  loadSubmissions();
}

function showLogin() {
  currentSession = null;
  dashboard.hidden = true;
  loginView.hidden = false;
  if (downlineDialog.open) downlineDialog.close();
}

function openDownlineEditor(slug) {
  const item = downlines.find(downline => downline.slug === slug);
  if (!item) return;
  downlineEditForm.elements.slug.value = item.slug;
  downlineEditForm.elements.givenName.value = item.givenName;
  downlineEditForm.elements.surname.value = item.surname;
  downlineEditForm.elements.email.value = item.email;
  downlineEditForm.elements.password.value = '';
  document.querySelector('#dialog-title').textContent = item.givenName + ' ' + item.surname;
  document.querySelector('#dialog-link').textContent = location.origin + '/' + item.slug;
  document.querySelector('#dialog-error').hidden = true;
  downlineDialog.showModal();
}

function showDownlineNotice(message) {
  const element = document.querySelector('#downline-success');
  element.textContent = message;
  element.hidden = false;
  window.setTimeout(() => { element.hidden = true; }, 4500);
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
  errorElement.hidden = true;
  document.querySelector('#downline-success').hidden = true;
  button.disabled = true;
  button.textContent = 'Criando…';
  try {
    const data = await api('/api/admin-downlines', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(downlineForm))) });
    showDownlineNotice('Downline criado: ' + location.origin + '/' + data.downline.slug);
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

downlineEditForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = downlineEditForm.querySelector('.primary');
  const errorElement = document.querySelector('#dialog-error');
  errorElement.hidden = true;
  button.disabled = true;
  button.textContent = 'Salvando…';
  try {
    const payload = Object.fromEntries(new FormData(downlineEditForm));
    await api('/api/admin-downlines', { method: 'PATCH', body: JSON.stringify(payload) });
    downlineDialog.close();
    showDownlineNotice(payload.password ? 'Dados e nova senha salvos.' : 'Dados do downline atualizados.');
    await loadDownlines();
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = 'Salvar alterações';
  }
});

document.addEventListener('click', async event => {
  const navigation = event.target.closest('[data-view-target]');
  if (navigation) return setView(navigation.dataset.viewTarget);

  const copyButton = event.target.closest('[data-copy]');
  if (copyButton) {
    const original = copyButton.textContent;
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copy);
      copyButton.textContent = 'Copiado!';
    } catch {
      copyButton.textContent = 'Copie pelo link';
    }
    window.setTimeout(() => { copyButton.textContent = original; }, 1600);
    return;
  }

  const editButton = event.target.closest('[data-edit-downline]');
  if (editButton) return openDownlineEditor(editButton.dataset.editDownline);

  const deleteButton = event.target.closest('[data-delete-downline]');
  if (deleteButton) {
    const item = downlines.find(downline => downline.slug === deleteButton.dataset.deleteDownline);
    if (!item || !window.confirm('Excluir o acesso de ' + item.givenName + ' ' + item.surname + '? As contas já recebidas serão preservadas.')) return;
    deleteButton.disabled = true;
    try {
      await api('/api/admin-downlines?slug=' + encodeURIComponent(item.slug), { method: 'DELETE' });
      showDownlineNotice('Acesso excluído. As contas recebidas foram preservadas.');
      await loadDownlines();
    } catch (error) {
      window.alert(error.message);
      deleteButton.disabled = false;
    }
  }
});

document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => downlineDialog.close()));
downlineDialog.addEventListener('click', event => { if (event.target === downlineDialog) downlineDialog.close(); });
document.querySelector('#sidebar-open').addEventListener('click', () => dashboard.classList.add('is-menu-open'));
document.querySelector('#sidebar-close').addEventListener('click', () => dashboard.classList.remove('is-menu-open'));
document.querySelector('#sidebar-backdrop').addEventListener('click', () => dashboard.classList.remove('is-menu-open'));

document.querySelector('#logout-button').addEventListener('click', async () => {
  await api('/api/admin-logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

document.querySelector('#refresh-button').addEventListener('click', loadSubmissions);
document.querySelector('#refresh-downlines').addEventListener('click', loadDownlines);

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const filtered = submissions.filter(item => {
    const text = [item.protocol, item.affiliateSlug, item.holder?.givenName, item.holder?.surname, item.holder?.cpf, item.holder?.email, item.holder?.phone].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return text.includes(query);
  });
  render(filtered);
});

api('/api/admin-session').then(showDashboard).catch(showLogin);
