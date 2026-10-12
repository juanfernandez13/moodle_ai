// Local prototype only: real file names, packaged example blocks, no document parser.
(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const groups = { matrix: [], tasks: [], quizzes: [] };
  const extensions = { matrix: /\.docx$/i, quizzes: /\.docx$/i, tasks: /\.(docx?|pdf|xlsx?|pptx?)$/i };
  const labels = { matrix: 'documento de planejamento', tasks: 'tarefas', quizzes: 'quizzes' };
  const fileIcons = {
    word: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h6',
    pdf: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6m-12 9 4-7 4 7m-6-2h4',
    sheet: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 6h18M3 15h18M9 3v18',
    slides: 'M4 3h16v14H4V3Zm3 10 3-3 3 2 4-5M12 17v4m-4 0h8',
  };
  let exampleBlocks = null;
  let readingStart = 0;
  let documentRevision = 0;
  function error(group, message = '') {
    const element = get(`${group}-error`);
    element.textContent = message; element.hidden = !message;
    get(`${group}-drop`).setAttribute('aria-invalid', String(Boolean(message)));
  }
  const size = value => value < 1048576 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  function renderReading() {
    get('reading-scope').hidden = !groups.matrix.length;
    get('reading-summary').textContent = readingStart && exampleBlocks ? exampleBlocks[readingStart].title : 'Início do documento';
    get('choose-reading-start').disabled = !exampleBlocks;
    get('choose-reading-start').setAttribute('aria-describedby', 'reading-note');
    get('reset-reading-start').hidden = !readingStart;
    get('reading-note').textContent = !exampleBlocks
      ? 'Nesta prévia, use “Usar exemplo” para experimentar a escolha de trechos.'
      : readingStart ? 'Este trecho e todo o conteúdo abaixo serão incluídos.' : 'Todo o documento será incluído.';
  }
  function resetDocument() { exampleBlocks = null; readingStart = 0; documentRevision++; }
  function fileType(file) {
    const extension = file.name.split('.').pop().toUpperCase();
    const kind = /^XLS/.test(extension) ? 'sheet' : /^PPT/.test(extension) ? 'slides' : extension === 'PDF' ? 'pdf' : 'word';
    return { extension, kind };
  }
  function makeFileIcon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('uploaded-file-icon');
    path.setAttribute('d', fileIcons[kind]); svg.append(path); return svg;
  }
  function renderSummary(group, removed = false) {
    const count = groups[group].length, summary = get(`${group}-selection`);
    const countText = `${count} ${count === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}`;
    summary.textContent = removed ? `Arquivo removido. ${countText}.` : count ? countText : '';
  }
  function render(group, removed = false) {
    const list = get(`${group}-list`); list.replaceChildren(); list.hidden = !groups[group].length;
    renderSummary(group, removed);
    get(`${group}-drop`).classList.toggle('has-file', Boolean(groups[group].length));
    if (group === 'matrix') {
      get('matrix-drop').querySelector('.drop-title').textContent = groups.matrix.length ? 'Trocar documento' : 'Escolher documento';
      get('matrix-drop').setAttribute('aria-label', groups.matrix.length ? 'Trocar documento de planejamento' : 'Escolher documento de planejamento'); renderReading();
    }
    groups[group].forEach((file, index) => {
      const { extension, kind } = fileType(file);
      const li = document.createElement('li'), details = document.createElement('span'), name = document.createElement('span'), metadata = document.createElement('span'), badge = document.createElement('span'), meta = document.createElement('small'), remove = document.createElement('button');
      li.className = 'uploaded-file'; details.className = 'uploaded-file-details'; metadata.className = 'uploaded-file-metadata';
      name.className = 'upload-name'; name.textContent = file.name;
      badge.className = 'file-extension'; badge.textContent = extension; badge.setAttribute('aria-hidden', 'true'); meta.textContent = size(file.size);
      remove.type = 'button'; remove.className = 'remove-material'; remove.setAttribute('aria-label', `Remover ${file.name} de ${labels[group]}`);
      remove.title = 'Remover arquivo';
      remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-x"/></svg>';
      remove.addEventListener('click', () => {
        groups[group].splice(index, 1); if (group === 'matrix') resetDocument();
        render(group, true); error(group);
        const remaining = list.querySelectorAll('.remove-material');
        (remaining[Math.min(index, remaining.length - 1)] || get(`${group}-drop`)).focus();
        get('file-demo-status').textContent = '';
      });
      metadata.append(badge, meta); details.append(name, metadata);
      li.append(makeFileIcon(kind), details, remove); list.append(li);
    });
  }
  function receive(group, files) {
    const items = [...files]; if (!items.length) return;
    if (group === 'matrix' && items.length !== 1) { error(group, 'Escolha um único documento DOCX.'); return; }
    if (items.some(file => !extensions[group].test(file.name))) { error(group, group === 'tasks' ? 'Use DOC, DOCX, PDF, XLS, XLSX, PPT ou PPTX para tarefas.' : 'Escolha um arquivo no formato DOCX.'); return; }
    if (items.some(file => file.size === 0)) { error(group, 'O arquivo está vazio. Escolha um arquivo com conteúdo.'); return; }
    if (group === 'matrix') { resetDocument(); groups.matrix = items; }
    else for (const file of items) if (!groups[group].some(saved => saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified)) groups[group].push(file);
    error(group); render(group); get('file-demo-status').textContent = '';
  }
  for (const group of Object.keys(groups)) {
    const drop = get(`${group}-drop`), input = get(`${group}-input`);
    const summary = document.createElement('p');
    summary.id = `${group}-selection`; summary.className = 'file-selection-summary';
    summary.setAttribute('role', 'status'); summary.setAttribute('aria-live', 'polite'); summary.setAttribute('aria-atomic', 'true');
    summary.setAttribute('aria-label', `Seleção de ${labels[group]}`);
    get(`${group}-list`).before(summary);
    drop.setAttribute('aria-describedby', `${drop.getAttribute('aria-describedby')} ${summary.id}`);
    const area = drop.closest('.upload-group');
    drop.addEventListener('click', () => input.click()); input.addEventListener('change', () => { receive(group, input.files); input.value = ''; });
    for (const name of ['dragenter', 'dragover']) area.addEventListener(name, event => { event.preventDefault(); area.classList.add('drag-over'); });
    for (const name of ['dragleave', 'drop']) area.addEventListener(name, event => { event.preventDefault(); area.classList.remove('drag-over'); });
    area.addEventListener('drop', event => receive(group, event.dataTransfer.files));
  }
  for (const name of ['dragover', 'drop']) window.addEventListener(name, event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
  get('load-file-examples').addEventListener('click', async () => {
    const button = get('load-file-examples'), revision = documentRevision; button.disabled = true; button.textContent = 'Carregando…';
    try {
      const [documentResponse, blocksResponse] = await Promise.all([fetch('samples/planejamento-exemplo.docx'), fetch('samples/planejamento-exemplo.json')]);
      if (!documentResponse.ok || !blocksResponse.ok) throw new Error('Example unavailable');
      const [blob, blocks] = await Promise.all([documentResponse.blob(), blocksResponse.json()]);
      if (revision !== documentRevision) return;
      receive('matrix', [new File([blob], 'planejamento-exemplo.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', lastModified: 0 })]);
      exampleBlocks = blocks; renderReading();
      get('file-demo-status').textContent = 'Documento de exemplo carregado. Experimente escolher onde a leitura começa.';
    } catch { get('file-demo-status').textContent = 'Não foi possível abrir o exemplo. Tente novamente ou escolha um documento.'; }
    finally { button.disabled = false; button.textContent = 'Usar exemplo'; }
  });
  function highlightSelection() {
    const selected = Number(get('reading-blocks').querySelector(':checked').value);
    get('reading-blocks').querySelectorAll('label').forEach((label, index) => label.classList.toggle('excluded', index < selected));
    get('selection-summary').textContent = selected
      ? `${selected} ${selected === 1 ? 'trecho anterior ficará de fora' : 'trechos anteriores ficarão de fora'}. Confira se há informações do curso que você precisa manter.`
      : 'Todo o documento será incluído.';
  }
  get('choose-reading-start').addEventListener('click', () => {
    if (!exampleBlocks) return;
    const list = get('reading-blocks'); list.replaceChildren();
    const legend = document.createElement('legend'); legend.className = 'sr-only'; legend.textContent = 'Primeiro trecho da leitura'; list.append(legend);
    exampleBlocks.forEach((block, index) => {
      const label = document.createElement('label'); label.className = 'reading-block choice';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'reading-start'; radio.value = String(index); radio.checked = index === readingStart;
      const content = document.createElement('span'), title = document.createElement('strong'), text = document.createElement('small');
      title.textContent = block.title; text.textContent = block.text;
      content.append(title, text); label.append(radio, content); list.append(label);
    });
    highlightSelection(); get('reading-dialog').showModal(); list.querySelector(':checked').focus();
  });
  get('reading-blocks').addEventListener('change', highlightSelection);
  get('confirm-reading').addEventListener('click', () => { readingStart = Number(get('reading-blocks').querySelector(':checked').value); renderReading(); get('reading-dialog').close(); });
  for (const id of ['close-reading', 'cancel-reading']) get(id).addEventListener('click', () => get('reading-dialog').close());
  get('reading-dialog').addEventListener('close', () => get('choose-reading-start').focus());
  get('reset-reading-start').addEventListener('click', () => { readingStart = 0; renderReading(); get('choose-reading-start').focus(); });
  get('start-processing').addEventListener('click', () => {
    if (!groups.matrix.length) { error('matrix', 'Escolha o documento de planejamento ou use o exemplo.'); get('matrix-drop').focus(); return; }
    openPreview({ title: 'Confira os arquivos', description: 'Os arquivos estão selecionados. Esta prévia não lê o conteúdo com IA nem gera um curso.', icon: '#i-book', settings: true, rows: [
      ['Documento de planejamento', groups.matrix[0].name], ['Ler a partir de', get('reading-summary').textContent],
      ['Questões de quizzes', groups.quizzes.length ? groups.quizzes.map(file => file.name).join(', ') : 'Nenhum documento'],
      ['Anexos de tarefas', groups.tasks.length ? groups.tasks.map(file => file.name).join(', ') : 'Nenhum anexo'],
    ] });
  });
})();
