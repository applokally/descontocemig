import { upload } from '@vercel/blob/client';

const form = document.querySelector('#registration-form');
const steps = Array.from(document.querySelectorAll('.form-step'));
const indicators = Array.from(document.querySelectorAll('[data-step-indicator]'));
const nextButton = document.querySelector('#next-button');
const backButton = document.querySelector('#back-button');
const submitButton = document.querySelector('#submit-button');
const errorBox = document.querySelector('#form-error');
const sending = document.querySelector('#sending');
const success = document.querySelector('#success');
const progressBar = document.querySelector('#progress-bar');
const sendingStatus = document.querySelector('#sending-status');
let currentStep = 1;
const flowParams = new URLSearchParams(location.search);

const digits = value => value.replace(/\D/g, '');
const cpfInput = form.elements.cpf;
const phoneInput = form.elements.phone;

cpfInput.addEventListener('input', event => {
  const value = digits(event.target.value).slice(0, 11);
  event.target.value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  event.target.setCustomValidity('');
});

phoneInput.addEventListener('input', event => {
  const value = digits(event.target.value).slice(0, 11);
  event.target.value = value.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{4})$/, '$1-$2');
});

function validCpf(value) {
  const cpf = digits(value);
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

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = '';
}

function validateStep(stepNumber) {
  clearError();
  const panel = steps[stepNumber - 1];
  const fields = Array.from(panel.querySelectorAll('input,select'));
  if (stepNumber === 1) cpfInput.setCustomValidity(validCpf(cpfInput.value) ? '' : 'Informe um CPF válido.');
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      showError(field.name === 'consent' ? 'É necessário autorizar o tratamento dos dados para enviar o cadastro.' : 'Revise o campo destacado antes de continuar.');
      return false;
    }
  }
  return true;
}

function renderStep() {
  steps.forEach((step, index) => {
    const active = index + 1 === currentStep;
    step.hidden = !active;
    step.classList.toggle('is-active', active);
  });
  indicators.forEach((item, index) => {
    const number = index + 1;
    item.classList.toggle('is-active', number === currentStep);
    item.classList.toggle('is-complete', number < currentStep);
    item.disabled = number > currentStep;
    if (number === currentStep) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
  backButton.hidden = currentStep === 1;
  nextButton.hidden = currentStep === 3;
  submitButton.hidden = currentStep !== 3;
  clearError();
  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

nextButton.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  currentStep += 1;
  renderStep();
});

backButton.addEventListener('click', () => {
  currentStep -= 1;
  renderStep();
});

indicators.forEach((item, index) => {
  item.addEventListener('click', () => {
    const target = index + 1;
    if (target < currentStep) {
      currentStep = target;
      renderStep();
    }
  });
});

const maxSize = 10 * 1024 * 1024;
document.querySelectorAll('.upload-card input[type="file"]').forEach(input => {
  input.addEventListener('change', () => {
    const card = input.closest('.upload-card');
    const label = card.querySelector('.upload-card__file');
    const file = input.files && input.files[0];
    input.setCustomValidity('');
    if (!file) {
      card.classList.remove('has-file');
      label.textContent = 'Nenhum arquivo selecionado';
      return;
    }
    if (file.size > maxSize) {
      input.value = '';
      input.setCustomValidity('O arquivo deve ter no máximo 10 MB.');
      input.reportValidity();
      card.classList.remove('has-file');
      label.textContent = 'Arquivo acima de 10 MB';
      return;
    }
    card.classList.add('has-file');
    label.textContent = '✓ ' + file.name + ' · ' + (file.size / 1024 / 1024).toFixed(1) + ' MB';
  });
});

function holderPayload() {
  const data = new FormData(form);
  const simulation = {
    billValue: flowParams.get('valorConta') || '',
    monthlySavings: flowParams.get('economiaMensal') || '',
    annualSavings: flowParams.get('economiaAnual') || '',
    estimatedFinalValue: flowParams.get('valorFinal') || ''
  };
  return {
    givenName: String(data.get('givenName') || '').trim(),
    surname: String(data.get('surname') || '').trim(),
    nationality: String(data.get('nationality') || '').trim(),
    birthDate: String(data.get('birthDate') || ''),
    email: String(data.get('email') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    personType: String(data.get('personType') || ''),
    cpf: String(data.get('cpf') || '').trim(),
    rg: String(data.get('rg') || '').trim(),
    maritalStatus: String(data.get('maritalStatus') || ''),
    profession: String(data.get('profession') || '').trim(),
    documentType: String(data.get('documentType') || ''),
    consent: data.get('consent') === 'on',
    consultant: flowParams.get('consultor') || '',
    profile: flowParams.get('perfil') || '',
    ...simulation,
    simulation
  };
}

async function api(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options && options.headers) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir o envio.');
  return body;
}

function safeName(name) {
  const parts = name.toLowerCase().split('.');
  const ext = parts.length > 1 ? '.' + parts.pop().replace(/[^a-z0-9]/g, '') : '';
  const base = parts.join('.').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'arquivo';
  return base + ext;
}

async function uploadFile(file, kind, session) {
  const pathname = 'documents/' + session.submissionId + '/' + kind + '-' + safeName(file.name);
  return upload(pathname, file, {
    access: 'private',
    handleUploadUrl: '/api/blob-upload',
    clientPayload: JSON.stringify({ sessionToken: session.sessionToken, kind }),
    multipart: file.size > 4 * 1024 * 1024
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validateStep(3)) return;
  const front = form.elements.documentFront.files[0];
  const back = form.elements.documentBack.files[0];
  const bill = form.elements.cemigBill.files[0];
  if (!front || !back || !bill) {
    showError('Selecione os três arquivos obrigatórios antes de enviar.');
    return;
  }
  const holder = holderPayload();
  form.hidden = true;
  document.querySelector('.form-heading').hidden = true;
  document.querySelector('.stepper').hidden = true;
  sending.hidden = false;
  progressBar.style.width = '8%';
  try {
    sendingStatus.textContent = 'Validando os dados do titular…';
    const session = await api('/api/submission-session', { method: 'POST', body: JSON.stringify({ holder }) });
    progressBar.style.width = '18%';
    sendingStatus.textContent = 'Enviando a frente do documento…';
    const frontBlob = await uploadFile(front, 'document-front', session);
    progressBar.style.width = '42%';
    sendingStatus.textContent = 'Enviando o verso do documento…';
    const backBlob = await uploadFile(back, 'document-back', session);
    progressBar.style.width = '66%';
    sendingStatus.textContent = 'Enviando a conta de energia…';
    const billBlob = await uploadFile(bill, 'cemig-bill', session);
    progressBar.style.width = '88%';
    sendingStatus.textContent = 'Finalizando seu cadastro…';
    const result = await api('/api/submissions-create', {
      method: 'POST',
      body: JSON.stringify({
        holder,
        sessionToken: session.sessionToken,
        files: {
          documentFront: { ...frontBlob, originalName: front.name },
          documentBack: { ...backBlob, originalName: back.name },
          cemigBill: { ...billBlob, originalName: bill.name }
        }
      })
    });
    progressBar.style.width = '100%';
    sending.hidden = true;
    success.hidden = false;
    document.querySelector('#protocol').textContent = result.protocol;
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    sending.hidden = true;
    form.hidden = false;
    document.querySelector('.form-heading').hidden = false;
    document.querySelector('.stepper').hidden = false;
    showError(error.message || 'O envio não foi concluído. Verifique sua conexão e tente novamente.');
  }
});
