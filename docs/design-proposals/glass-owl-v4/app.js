// Local preview states. Only packaged example assets are fetched.
const $ = (id) => document.getElementById(id);
const tabs = [...document.querySelectorAll('[role="tab"]')];
let currentMode = 'files';
let courseMode = 'files';

function selectMode(mode) {
  if (mode === 'return') mode = courseMode;
  if (mode === 'students' && currentMode !== 'students') courseMode = currentMode;
  currentMode = mode;
  document.documentElement.dataset.view = mode;
  document.querySelectorAll('.main-card').forEach(panel => { panel.hidden = panel.id !== `panel-${mode}`; });
  tabs.forEach(item => {
    const selected = item.dataset.mode === mode;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  document.querySelector('.entry-bar').hidden = mode === 'students' || mode === 'json';
  document.querySelector('main > .main-slot > .journey').hidden = mode === 'students';
  const studentsControl = document.querySelector('.header-action--students');
  if (mode === 'students') studentsControl.setAttribute('aria-current', 'page');
  else studentsControl.removeAttribute('aria-current');
}
document.querySelectorAll('[data-open-mode]').forEach(button => button.addEventListener('click', () => {
  selectMode(button.dataset.openMode);
  $(`panel-${currentMode}`).focus();
}));
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMode(tab.dataset.mode));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectMode(tabs[next].dataset.mode);
    tabs[next].focus();
  });
});

function setError(id, message = '') {
  const element = $(id);
  element.textContent = message;
  element.hidden = !message;
}
function openPreview({ title, description, icon, rows, json, settings = false }) {
  $('review-settings').hidden = !settings;
  $('preview-title').textContent = title;
  $('preview-description').textContent = description;
  $('preview-icon').setAttribute('href', icon);
  $('preview-body').replaceChildren();
  if (rows) {
    const list = document.createElement('ul');
    list.className = 'preview-list';
    rows.forEach(([label, value]) => {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = label;
      item.append(heading, document.createTextNode(value));
      list.append(item);
    });
    $('preview-body').append(list);
  }
  if (json !== undefined) {
    const code = document.createElement('pre');
    code.className = 'preview-code';
    code.textContent = JSON.stringify(json, null, 2);
    $('preview-body').append(code);
  }
  $('preview-dialog').showModal();
}
const example = { title: 'Introdução à sustentabilidade', sections: [{ title: 'Nosso primeiro encontro', activities: [{ title: 'Boas-vindas', type: 'page', content: 'Vamos conhecer o curso e nossos objetivos.' }] }] };
$('load-example').addEventListener('click', () => { $('json-input').value = JSON.stringify(example, null, 2); setError('json-error'); $('json-input').focus(); });
$('json-input').addEventListener('input', () => setError('json-error'));
$('review-json').addEventListener('click', () => {
  if (!$('json-input').value.trim()) { setError('json-error', 'Cole seu JSON ou use o exemplo para explorar.'); $('json-input').focus(); return; }
  let parsed;
  try { parsed = JSON.parse($('json-input').value); }
  catch { setError('json-error', 'O JSON tem um erro de sintaxe. Confira aspas, chaves e vírgulas.'); $('json-input').focus(); return; }
  setError('json-error');
  openPreview({ title: 'Confira o JSON', description: 'O texto é um JSON válido. Nesta prévia, o conteúdo ainda não é convertido em curso.', icon: '#i-code', json: parsed });
});
for (const id of ['manual-title', 'manual-topic']) {
  $(id).addEventListener('input', () => $(id).setCustomValidity(''));
}
$('manual-form').addEventListener('submit', event => {
  event.preventDefault();
  for (const id of ['manual-title', 'manual-topic']) {
    if (!$(id).value.trim()) {
      $(id).setCustomValidity(id === 'manual-title' ? 'Digite o nome do curso.' : 'Digite o nome do primeiro tópico.');
      $(id).reportValidity(); $(id).focus(); return;
    }
  }
  openPreview({ title: 'Confira o início do curso', description: 'Demonstração do formulário. O curso ainda não será criado.', icon: '#i-book', settings: true, rows: [['Nome do curso', $('manual-title').value.trim()], ['Primeiro tópico', $('manual-topic').value.trim()]] });
});
for (const id of ['close-dialog', 'dialog-return']) $(id).addEventListener('click', () => $('preview-dialog').close());
$('preview-dialog').addEventListener('click', (event) => {
  const bounds = $('preview-dialog').getBoundingClientRect();
  if (event.target === $('preview-dialog') && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) $('preview-dialog').close();
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function updateMotion() {
  const paused = reducedMotion.matches || document.documentElement.dataset.scene !== 'field';
  document.documentElement.dataset.motion = paused ? 'paused' : 'running';
  window.dispatchEvent(new CustomEvent('owl-motion', { detail: { paused } }));
}
reducedMotion.addEventListener('change', updateMotion);
updateMotion();

const prototypeThemeKey = 'moodle-ai-design-v4-theme';
let prototypeTheme = 'dark';
let prototypeScene = 'field';
try { const stored = localStorage.getItem(prototypeThemeKey); if (stored === 'light' || stored === 'dark') prototypeTheme = stored; } catch { /* Preview also works without storage. */ }
function applyTheme(theme, informParent = false) {
  prototypeTheme = theme;
  document.documentElement.dataset.theme = theme;
  const dark = theme === 'dark';
  const control = $('theme-toggle');
  control.setAttribute('aria-pressed', String(dark));
  control.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  control.title = control.getAttribute('aria-label');
  control.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#14241c' : '#eef6f1';
  try { localStorage.setItem(prototypeThemeKey, theme); } catch { /* Local persistence is optional. */ }
  window.dispatchEvent(new CustomEvent('owl-theme', { detail: { theme } }));
  if (informParent && window.parent !== window) window.parent.postMessage({ type: 'moodle-ai-design-theme', theme }, '*');
}
$('theme-toggle').addEventListener('click', () => applyTheme(prototypeTheme === 'dark' ? 'light' : 'dark', true));
window.addEventListener('message', (event) => {
  if (window.parent === window || event.source !== window.parent || event.data?.type !== 'moodle-ai-design-theme') return;
  if (event.data.theme === 'light' || event.data.theme === 'dark') applyTheme(event.data.theme);
});
$('scene-toggle').addEventListener('click', () => {
  prototypeScene = prototypeScene === 'field' ? 'none' : 'field';
  document.documentElement.dataset.scene = prototypeScene;
  $('scene-toggle').setAttribute('aria-pressed', String(prototypeScene === 'field'));
  $('scene-toggle').setAttribute('aria-label', prototypeScene === 'field' ? 'Ocultar fundo' : 'Mostrar fundo');
  $('scene-toggle').title = $('scene-toggle').getAttribute('aria-label');
  updateMotion();
  window.dispatchEvent(new CustomEvent('owl-background', { detail: { scene: prototypeScene } }));
});
applyTheme(prototypeTheme);
