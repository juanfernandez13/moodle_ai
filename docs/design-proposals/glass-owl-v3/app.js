// Exploration of local interface states; no network requests or application services.
const $ = (id) => document.getElementById(id);
const tabs = [...document.querySelectorAll('[role="tab"]')];
let selectedDocument = null;
let materials = [];

function selectMode(tab) {
  tabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(item.getAttribute('aria-controls')).hidden = !selected;
  });
  const options = {
    files: { title: 'Seu material', description: 'Transforme seu documento em um ponto de partida.', action: 'Enviar arquivos', icon: '#i-upload' },
    json: { title: 'JSON manual', description: 'Já tem uma estrutura? Comece por ela.', action: 'Escrever JSON', icon: '#i-code' },
    students: { title: 'Seus alunos', description: 'Organize quem vai aprender com você.', action: 'Preparar turma', icon: '#i-users' },
  };
  const alternatives = Object.keys(options).filter((mode) => mode !== tab.dataset.mode);
  document.querySelectorAll('[data-side-slot]').forEach((card, index) => {
    const mode = alternatives[index];
    const option = options[mode];
    card.querySelector('.side-icon use').setAttribute('href', option.icon);
    card.querySelector('h2').textContent = option.title;
    card.querySelector('p').textContent = option.description;
    const button = card.querySelector('button');
    button.dataset.openMode = mode;
    button.replaceChildren(document.createTextNode(option.action), button.querySelector('svg'));
  });
}
document.querySelectorAll('[data-open-mode]').forEach((button) => button.addEventListener('click', () => {
  const tab = tabs.find((item) => item.dataset.mode === button.dataset.openMode);
  selectMode(tab);
  $(tab.getAttribute('aria-controls')).focus();
}));
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectMode(tab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectMode(tabs[next]);
    tabs[next].focus();
  });
});

function setError(id, message = '') {
  const element = $(id);
  element.textContent = message;
  element.hidden = !message;
}
function updateFile() {
  const hasFile = Boolean(selectedDocument);
  $('dropzone').classList.toggle('has-file', hasFile);
  $('drop-title').textContent = hasFile ? selectedDocument.name : 'Solte seu documento aqui';
  $('drop-description').textContent = hasFile ? 'Documento escolhido. Clique para trocar.' : 'ou clique para escolher um arquivo';
  $('file-meta').hidden = !hasFile;
  if (hasFile) $('file-size').textContent = selectedDocument.size < 1048576
    ? `${Math.max(1, Math.round(selectedDocument.size / 1024))} KB`
    : `${(selectedDocument.size / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}
function receiveDocument(files) {
  if (!files?.length) return;
  if (files.length > 1) { setError('file-error', 'Escolha um documento principal. Os demais podem entrar como materiais de apoio.'); return; }
  if (!/\.docx$/i.test(files[0].name)) { setError('file-error', 'Escolha um documento no formato .docx.'); return; }
  selectedDocument = files[0];
  setError('file-error');
  updateFile();
}
$('dropzone').addEventListener('click', () => $('document-input').click());
$('document-input').addEventListener('change', (event) => { receiveDocument(event.target.files); event.target.value = ''; });
$('remove-file').addEventListener('click', () => { selectedDocument = null; setError('file-error'); updateFile(); $('dropzone').focus(); });
for (const eventName of ['dragenter', 'dragover']) $('dropzone').addEventListener(eventName, (event) => { event.preventDefault(); $('dropzone').classList.add('drag-over'); });
for (const eventName of ['dragleave', 'drop']) $('dropzone').addEventListener(eventName, (event) => { event.preventDefault(); $('dropzone').classList.remove('drag-over'); });
$('dropzone').addEventListener('drop', (event) => receiveDocument(event.dataTransfer.files));
window.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
window.addEventListener('drop', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });

function updateMaterials() {
  $('materials-list').replaceChildren();
  $('materials-list').hidden = materials.length === 0;
  materials.forEach((file, index) => {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'material-name';
    name.textContent = file.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-material';
    remove.setAttribute('aria-label', `Remover ${file.name}`);
    // The icon is a constant. File names are always assigned through textContent.
    remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-x"/></svg>';
    remove.addEventListener('click', () => {
      materials.splice(index, 1);
      updateMaterials();
      const nextButton = $('materials-list').querySelectorAll('button')[Math.min(index, materials.length - 1)];
      (nextButton || $('add-materials')).focus();
    });
    item.append(name, remove);
    $('materials-list').append(item);
  });
}
$('add-materials').addEventListener('click', () => $('materials-input').click());
$('materials-input').addEventListener('change', (event) => { materials.push(...event.target.files); updateMaterials(); event.target.value = ''; });

function openPreview({ title, description, icon, rows, json }) {
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
$('start-processing').addEventListener('click', () => {
  if (!selectedDocument) { setError('file-error', 'Escolha seu documento para começar.'); $('dropzone').focus(); return; }
  openPreview({
    title: 'Da ideia ao curso.',
    description: 'Esta prévia mostra o fluxo proposto. Neste protótipo, o documento não é enviado nem processado.',
    icon: '#i-book',
    rows: [
      ['Seu documento', selectedDocument.name],
      ['Materiais de apoio', materials.length ? `${materials.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo adicional'],
      ['Próximo passo na aplicação', 'Organizar o conteúdo e abrir a revisão antes de exportar para Moodle.'],
    ],
  });
});
const example = { title: 'Introdução à sustentabilidade', sections: [{ title: 'Nosso primeiro encontro', activities: [{ title: 'Boas-vindas', type: 'page', content: 'Vamos conhecer o curso e nossos objetivos.' }] }] };
$('load-example').addEventListener('click', () => { $('json-input').value = JSON.stringify(example, null, 2); setError('json-error'); $('json-input').focus(); });
$('json-input').addEventListener('input', () => setError('json-error'));
$('review-json').addEventListener('click', () => {
  if (!$('json-input').value.trim()) { setError('json-error', 'Cole seu JSON ou use o exemplo para explorar.'); $('json-input').focus(); return; }
  let parsed;
  try { parsed = JSON.parse($('json-input').value); }
  catch { setError('json-error', 'O JSON tem um erro de sintaxe. Confira aspas, chaves e vírgulas.'); $('json-input').focus(); return; }
  setError('json-error');
  openPreview({ title: 'Vamos conferir a estrutura.', description: 'A sintaxe do JSON está correta. Esta prévia não valida o contrato do curso nem gera um pacote Moodle.', icon: '#i-code', json: parsed });
});
$('student-form').addEventListener('submit', (event) => {
  event.preventDefault();
  openPreview({ title: 'Confira os dados do aluno.', description: 'Demonstração do cadastro. Estes dados ficam nesta página; nenhum aluno será cadastrado no Moodle.', icon: '#i-users', rows: [['Nome completo', $('student-name').value.trim()], ['E-mail', $('student-email').value.trim()]] });
});
for (const id of ['close-dialog', 'dialog-return']) $(id).addEventListener('click', () => $('preview-dialog').close());
$('preview-dialog').addEventListener('click', (event) => {
  const bounds = $('preview-dialog').getBoundingClientRect();
  if (event.target === $('preview-dialog') && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) $('preview-dialog').close();
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let manualPause = false;
function updateMotion() {
  const paused = reducedMotion.matches || manualPause;
  const control = $('motion-toggle');
  control.setAttribute('aria-pressed', String(paused));
  control.setAttribute('aria-label', reducedMotion.matches ? 'Animação pausada pela preferência de movimento reduzido' : paused ? 'Ativar animação' : 'Pausar animação');
  control.querySelector('span').textContent = paused ? 'Animação pausada' : 'Pausar animação';
  control.title = control.getAttribute('aria-label');
  control.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
  control.disabled = reducedMotion.matches;
  window.dispatchEvent(new CustomEvent('owl-motion', { detail: { paused } }));
}
$('motion-toggle').addEventListener('click', () => { manualPause = !manualPause; updateMotion(); });
reducedMotion.addEventListener('change', updateMotion);
updateMotion();

const prototypeThemeKey = 'moodle-ai-design-v3-theme';
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
  prototypeScene = prototypeScene === 'field' ? 'dots' : 'field';
  document.documentElement.dataset.scene = prototypeScene;
  $('scene-toggle').setAttribute('aria-pressed', String(prototypeScene === 'field'));
  $('scene-toggle').setAttribute('aria-label', prototypeScene === 'field' ? 'Mostrar fundo pontilhado' : 'Mostrar campo ao entardecer');
  $('scene-toggle').title = $('scene-toggle').getAttribute('aria-label');
  window.dispatchEvent(new CustomEvent('owl-background', { detail: { scene: prototypeScene } }));
});
applyTheme(prototypeTheme);
