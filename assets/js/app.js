import { askAssistant } from './api-client.js';
import { validate } from './validation.js';

const topics = [
  { value: 'Inteligencia artificial', label: 'Inteligencia artificial', glyph: 'IA' },
  { value: 'Redes', label: 'Redes', glyph: 'NET' },
  { value: 'Programación', label: 'Programación', glyph: '{ }' },
  { value: 'Bases de datos', label: 'Bases de datos', glyph: 'DB' },
  { value: 'Internet de las cosas (IoT)', label: 'Internet de las cosas', glyph: 'IoT' }
];

const levels = [
  ['Básico', 'Lenguaje claro y ejemplos'],
  ['Intermedio', 'Conceptos y terminología'],
  ['Avanzado', 'Profundidad técnica']
];

const $ = (selector) => document.querySelector(selector);
const deck = $('#deck');
const flipStage = $('#flip-stage');
const isSmallScreen = window.matchMedia('(max-width: 900px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let data = { integracion: 'http' };
let answerCopyText = '';
let typingRun = 0;

$('#topics').innerHTML = topics.map((topic) => `
  <label class="tile">
    <input class="r" type="radio" name="topic" value="${topic.value}">
    <span class="t"><span class="g">${topic.glyph}</span><span class="n">${topic.label}</span></span>
  </label>
`).join('');

$('#levels').innerHTML = levels.map(([name, description], index) => {
  const bars = [0, 1, 2].map((bar) => `<i${bar <= index ? ' class="on"' : ''}></i>`).join('');
  return `
    <label title="${description}">
      <input class="r" type="radio" name="level" value="${name}">
      <span class="lv"><span class="bars">${bars}</span>${name}</span>
    </label>
  `;
}).join('');

function selected(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

function escapeText(value = '') {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}

function syncData() {
  data.tema = selected('topic');
  data.nivel = selected('level');
  data.integracion = selected('integracion') || 'http';
  data.pregunta = $('#pregunta').value;
}

function renderSummary() {
  const question = data.pregunta
    ? `${data.pregunta.slice(0, 32)}${data.pregunta.length > 32 ? '…' : ''}`
    : 'Sin escribir';

  $('#selection-trail').innerHTML = `
    <span>Área: <b>${escapeText(data.tema || 'Sin seleccionar')}</b></span>
    <span>Nivel: <b>${escapeText(data.nivel || 'Sin seleccionar')}</b></span>
    <span title="${escapeText(data.pregunta || '')}">Pregunta: <b>${escapeText(question)}</b></span>
    <span>Método: <b>${data.integracion === 'nativo' ? 'Nodo OpenAI' : data.integracion === 'http' ? 'HTTP Request' : 'Sin seleccionar'}</b></span>
  `;

  $('#summary').textContent = `${data.tema || 'Selecciona un tema'} · ${data.nivel || 'elige un nivel'} · ${data.integracion === 'nativo' ? 'Nodo OpenAI' : 'HTTP Request'}`;
}

function updateProgress() {
  const completed = data.pregunta.trim() ? 4 : data.nivel ? 2 : data.tema ? 1 : 0;
  const percentage = Math.max(25, completed * 25);
  $('#progress-bar').style.width = `${percentage}%`;
  $('#progress-label').textContent = `${Math.min(4, Math.max(1, completed + 1))} de 4`;
}

function setView(view) {
  deck.dataset.view = view;
  if (view === 'question') {
    $('#pregunta').focus();
  }
}

function updateFromControls() {
  syncData();
  renderSummary();
  updateProgress();
  $('#question-error').textContent = '';
  $('#error-alert').textContent = '';
}

document.querySelectorAll('input[name="topic"], input[name="level"], input[name="integracion"]')
  .forEach((input) => input.addEventListener('change', updateFromControls));

$('#pregunta').addEventListener('input', () => {
  data.pregunta = $('#pregunta').value;
  $('#count').textContent = `${$('#pregunta').value.length} / 1000`;
  $('#question-error').textContent = '';
  renderSummary();
  updateProgress();
});

$('#continue-button').addEventListener('click', () => {
  syncData();
  if (!data.tema || !data.nivel || !data.integracion) {
    $('#error-alert').textContent = 'Selecciona un tema, un nivel y una ruta para continuar.';
    return;
  }
  setView('question');
});

$('#back-button').addEventListener('click', () => {
  setView('choose');
});

function showLoading() {
  answerCopyText = '';
  typingRun += 1;
  $('#answer-text').innerHTML = `
    <div class="skeleton" style="width: 88%"></div>
    <div class="skeleton" style="width: 74%"></div>
    <div class="skeleton" style="width: 82%"></div>
    <div class="skeleton" style="width: 50%"></div>
    <p class="waiting">El asistente está redactando…</p>
  `;
}

function tokenizeAnswer(text) {
  const tokens = [];
  let cursor = 0;

  while (cursor < text.length) {
    const opening = text.indexOf('**', cursor);
    if (opening === -1) {
      tokens.push({ bold: false, text: text.slice(cursor) });
      break;
    }

    const closing = text.indexOf('**', opening + 2);
    if (closing === -1) {
      tokens.push({ bold: false, text: text.slice(cursor) });
      break;
    }

    if (opening > cursor) tokens.push({ bold: false, text: text.slice(cursor, opening) });
    tokens.push({ bold: true, text: text.slice(opening + 2, closing) });
    cursor = closing + 2;
  }

  return tokens;
}

function renderAnswer(text, level) {
  const output = $('#answer-text');
  const tokens = tokenizeAnswer(String(text ?? ''));
  output.replaceChildren();
  const nodes = tokens.map((token) => {
    const node = document.createElement(token.bold ? 'strong' : 'span');
    output.append(node);
    return { node, text: token.text };
  });
  const run = ++typingRun;

  answerCopyText = tokens.map((token) => token.text).join('');
  $('#answer-stamp-level').textContent = level;
  $('#answer-stamp').classList.add('is-visible');
  $('#answer-text').scrollTop = 0;

  if (reducedMotion) {
    nodes.forEach(({ node, text: value }) => { node.textContent = value; });
    return;
  }

  let tokenIndex = 0;
  let characterIndex = 0;
  const write = () => {
    if (run !== typingRun) return;
    if (tokenIndex >= nodes.length) return;

    const current = nodes[tokenIndex];
    characterIndex += 1;
    current.node.textContent = current.text.slice(0, characterIndex);
    output.scrollTop = output.scrollHeight;

    if (characterIndex >= current.text.length) {
      tokenIndex += 1;
      characterIndex = 0;
    }
    window.requestAnimationFrame(write);
  };
  write();
}

$('#question-card').addEventListener('submit', async (event) => {
  event.preventDefault();
  syncData();

  const result = validate(data);
  if (Object.keys(result.errors).length) {
    $('#question-error').textContent = result.errors.pregunta || 'Completa los datos de la consulta.';
    return;
  }

  data = result.data;
  const submitButton = $('#submit-button');
  submitButton.disabled = true;
  submitButton.textContent = 'Consultando…';
  $('#error-alert').textContent = '';
  $('#answer-meta').innerHTML = `
    <span>${escapeText(data.tema)}</span>
    <span>${escapeText(data.nivel)}</span>
    <span>${data.integracion === 'nativo' ? 'Nodo OpenAI' : 'HTTP Request'}</span>
  `;
  $('#answer-stamp-level').textContent = data.nivel;
  $('#answer-stamp').classList.remove('is-visible');
  showLoading();
  flipStage.classList.add('is-flipped');
  if (isSmallScreen.matches) setView('answer');

  try {
    const response = await askAssistant(data);
    renderAnswer(response.respuesta, data.nivel);
  } catch (error) {
    typingRun += 1;
    answerCopyText = error.message;
    $('#answer-text').textContent = error.message;
    $('#error-alert').textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Consultar al asistente';
    renderSummary();
  }
});

$('#new-button').addEventListener('click', () => {
  data = { integracion: 'http' };
  $('#pregunta').value = '';
  $('#count').textContent = '0 / 1000';
  $('#answer-meta').innerHTML = '';
  $('#answer-stamp').classList.remove('is-visible');
  answerCopyText = '';
  typingRun += 1;
  $('#answer-text').textContent = 'Tu explicación aparecerá aquí.';
  $('input[name="topic"]').checked = false;
  $('input[name="level"]').checked = false;
  document.querySelector('input[name="integracion"][value="http"]').checked = true;
  flipStage.classList.remove('is-flipped');
  updateFromControls();
  setView(isSmallScreen.matches ? 'choose' : 'question');
});

$('#copy-button').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(answerCopyText || $('#answer-text').textContent);
    $('#copy-button').textContent = 'Respuesta copiada';
    window.setTimeout(() => { $('#copy-button').textContent = 'Copiar respuesta'; }, 1600);
  } catch {
    $('#error-alert').textContent = 'No se pudo copiar la respuesta.';
  }
});

isSmallScreen.addEventListener?.('change', ({ matches }) => {
  setView(matches ? 'choose' : 'question');
});

syncData();
renderSummary();
updateProgress();
setView(isSmallScreen.matches ? 'choose' : 'question');
