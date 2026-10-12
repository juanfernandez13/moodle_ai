// Local visual prototype: fictional rows only, no spreadsheet reader or Moodle request.
(() => {
  'use strict';
  const get = id => document.getElementById(id);
  if (!get('student-upload-stage')) return;
  const fields = { username: 'Usuário', firstname: 'Nome', lastname: 'Sobrenome', email: 'E-mail', city: 'Cidade' };
  const fixture = [
    { id: 'ana', sourceRow: 2, username: 'ana.lima', firstname: 'Ana', lastname: 'Lima', email: 'ana.lima@exemplo.test', city: 'Recife', type1: 1 },
    { id: 'bruno', sourceRow: 3, username: 'bruno.silva', firstname: 'Bruno', lastname: 'Silva', email: '', city: 'Fortaleza', type1: 1 },
    { id: 'clara', sourceRow: 4, username: 'clara.souza', firstname: 'Clara', lastname: 'Souza', email: 'clara.souza@exemplo.test', city: 'Natal', type1: 2 },
  ];
  let rows = [], courses = [], outputs = [], plan = null, exampleLoaded = false, courseSequence = 0, dialogTrigger;
  const rowControls = new Map(), courseControls = new Map();
  const stageCopy = {
    upload: ['Cadastro em lote de alunos', 'Adicione a planilha. Confira os alunos e os cursos antes de baixar os arquivos.'],
    review: ['Conferir alunos e cursos', 'Corrija as pendências. A mesma lista será usada em cada curso de destino.'],
    done: ['CSVs de demonstração', 'Baixe um arquivo por curso. Os dados são fictícios e nenhum cadastro será enviado.'],
  };
  const setText = (element, text) => { if (element.textContent !== text) element.textContent = text; };
  const make = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
  function stage(name, focus = true) {
    for (const step of Object.keys(stageCopy)) get(`student-${step}-stage`).hidden = step !== name;
    document.querySelectorAll('[data-student-step]').forEach(item => {
      if (item.dataset.studentStep === name) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    setText(get('heading-students'), stageCopy[name][0]); setText(get('student-intro'), stageCopy[name][1]);
    if (focus) get('heading-students').focus({ preventScroll: true });
  }
  function revokeOutputUrls() { outputs.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); item.url = null; }); }
  function releaseOutputs() { revokeOutputUrls(); outputs = []; get('student-download-list').replaceChildren(); setText(get('student-download-summary'), ''); }
  function clearRows() {
    rows = []; courses = []; rowControls.clear(); courseControls.clear(); get('student-rows').replaceChildren(); get('student-course-list').replaceChildren();
    const issues = get('student-issues'); issues.replaceChildren(); delete issues.dataset.signature; issues.hidden = true;
    setText(get('student-summary'), ''); setText(get('student-course-status'), ''); releaseOutputs();
  }
  function fileError(text = '') { setText(get('student-file-error'), text); get('student-file-error').hidden = !text; get('student-plan-drop').setAttribute('aria-invalid', String(Boolean(text))); }
  function renderPlan() {
    get('student-plan-selection').hidden = !plan;
    setText(get('student-plan-name'), plan?.name || '');
    setText(get('student-plan-size'), plan ? `${Math.max(1, Math.round(plan.size / 1024))} KB${exampleLoaded ? ' · Exemplo fictício' : ''}` : '');
    get('student-analyze').disabled = !exampleLoaded;
    setText(get('student-analyze'), exampleLoaded ? 'Voltar à revisão' : 'Analisar planilha');
    setText(get('student-file-note'), exampleLoaded
      ? 'Exemplo fictício carregado. Voltar à revisão mantém seus ajustes; usar o exemplo novamente restaura os dados iniciais.'
      : 'Nesta prévia, use o exemplo para experimentar a revisão. Planilhas locais mostram apenas nome e tamanho.');
  }
  function chooseFile(files) {
    const chosen = [...files]; if (!chosen.length) return;
    if (chosen.length !== 1) { fileError('Escolha uma única planilha XLSX, XLS ou CSV.'); return; }
    if (!/\.(xlsx|xls|csv)$/i.test(chosen[0].name)) { fileError('Use uma planilha no formato XLSX, XLS ou CSV.'); return; }
    clearRows(); plan = chosen[0]; exampleLoaded = false; fileError(); renderPlan();
  }
  // Reject spreadsheet expressions without turning ordinary hyphenated names into different data.
  function unsafeCell(value) {
    const text = String(value);
    return /^[\t\r\n]/.test(text) || /^[=+@]/.test(text.trimStart()) || /^-\s*(?:\d|[A-Za-z_][\w.]*\s*[(!|]|['"\[({])/.test(text.trimStart());
  }
  function rowErrors(row) {
    const errors = {};
    const username = row.username.trim();
    if (!username) errors.username = 'Informe o usuário.';
    else if (!/^[a-z0-9][a-z0-9._-]*$/.test(row.username)) errors.username = 'Use letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços; comece com letra ou número.';
    else if (rows.some(other => other.id !== row.id && other.username.trim().toLowerCase() === username.toLowerCase())) errors.username = 'Este usuário aparece em outra linha.';
    for (const key of ['firstname', 'lastname']) if (!row[key].trim()) errors[key] = key === 'firstname' ? 'Informe o nome.' : 'Informe o sobrenome.';
    if (!row.email.trim()) errors.email = 'Informe o e-mail.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(row.email.trim())) errors.email = 'Informe um e-mail válido.';
    for (const key of Object.keys(fields)) if (unsafeCell(row[key])) errors[key] = 'Use texto simples, sem expressão de planilha no início.';
    return errors;
  }
  function courseError(course) {
    const name = course.name.trim();
    if (!name) return 'Informe o curso ou remova esta linha.';
    if (unsafeCell(course.name)) return 'Use texto simples para identificar o curso.';
    if (courses.some(other => other.id !== course.id && other.name.trim().toLowerCase() === name.toLowerCase())) return 'Este curso já está na lista.';
    return '';
  }
  function validCourses() { return courses.filter(course => !courseError(course)); }
  function updateValidation() {
    const issues = [];
    rows.forEach(row => {
      const errors = rowErrors(row);
      for (const [key, control] of Object.entries(rowControls.get(row.id) || {})) {
        const message = errors[key] || '';
        control.input.setAttribute('aria-invalid', String(Boolean(message))); setText(control.error, message); control.error.hidden = !message;
        if (message) issues.push({ message: `Linha ${row.sourceRow}, ${fields[key]}: ${message}`, input: control.input });
      }
    });
    courses.forEach(course => {
      const control = courseControls.get(course.id), message = courseError(course);
      control.input.setAttribute('aria-invalid', String(Boolean(message))); setText(control.error, message); control.error.hidden = !message;
      if (message) issues.push({ message: `Curso de destino: ${message}`, input: control.input });
    });
    if (!courses.length) issues.push({ message: 'Adicione pelo menos um curso de destino.', input: get('student-course-name') });
    const destinationCount = validCourses().length;
    const summary = `${rows.length} alunos · ${destinationCount} ${destinationCount === 1 ? 'curso de destino' : 'cursos de destino'} · ${issues.length ? `${issues.length} ${issues.length === 1 ? 'pendência' : 'pendências'}` : 'Dados conferidos no exemplo'}.`;
    setText(get('student-summary'), summary);
    setText(get('student-course-status'), destinationCount ? `${rows.length} alunos em cada curso escolhido: ${destinationCount} ${destinationCount === 1 ? 'CSV de demonstração' : 'CSVs de demonstração'}.` : 'Adicione pelo menos um curso de destino.');
    const box = get('student-issues');
    const signature = issues.map(issue => issue.message).join('\n');
    if (box.dataset.signature !== signature) {
      box.dataset.signature = signature; box.replaceChildren();
      if (issues.length) {
        box.append(make('strong', '', 'Pendências para conferir'));
        const list = make('ul');
        issues.forEach(issue => { const item = make('li'), button = make('button', 'student-issue-link', issue.message); button.type = 'button'; button.addEventListener('click', () => issue.input.focus()); item.append(button); list.append(item); });
        box.append(list);
      }
    }
    box.hidden = !issues.length; get('student-generate').disabled = Boolean(issues.length) || !rows.length;
    setText(get('student-generate'), `Gerar ${destinationCount || ''} CSV${destinationCount === 1 ? '' : 's'} de exemplo`.replace('  ', ' '));
    return issues;
  }
  function renderRows() {
    const body = get('student-rows'); body.replaceChildren(); rowControls.clear();
    rows.forEach(row => {
      const tr = make('tr'), number = make('th', 'student-row-number', String(row.sourceRow)); number.scope = 'row'; tr.append(number);
      const controls = {};
      for (const [key, label] of Object.entries(fields)) {
        const td = make('td'), input = make('input'), text = make('label', 'student-cell-label', label), error = make('p', 'student-field-error');
        input.id = `student-${row.id}-${key}`; input.value = row[key]; input.type = key === 'email' ? 'email' : 'text'; input.maxLength = key === 'email' ? 254 : 120; input.autocomplete = 'off'; input.spellcheck = false;
        input.setAttribute('aria-label', `${label}, linha ${row.sourceRow}`); text.htmlFor = input.id;
        error.id = `${input.id}-error`; error.hidden = true; input.setAttribute('aria-describedby', error.id);
        input.addEventListener('input', () => { row[key] = input.value; updateValidation(); });
        controls[key] = { input, error }; td.append(text, input, error); tr.append(td);
      }
      const td = make('td'), roles = make('fieldset', 'student-role'); roles.append(make('legend', 'sr-only', `Papel, linha ${row.sourceRow}`));
      for (const [value, label] of [[1, 'Aluno'], [2, 'Professor']]) {
        const choice = make('label', 'student-role-choice'), radio = make('input'); radio.type = 'radio'; radio.name = `student-role-${row.id}`; radio.value = String(value); radio.checked = row.type1 === value;
        radio.addEventListener('change', () => { row.type1 = value; updateValidation(); }); choice.append(radio, document.createTextNode(label)); roles.append(choice);
      }
      td.append(make('span', 'student-cell-label', 'Papel'), roles); tr.append(td); rowControls.set(row.id, controls); body.append(tr);
    });
  }
  function renderCourses() {
    const list = get('student-course-list'); list.replaceChildren(); courseControls.clear();
    delete get('student-issues').dataset.signature;
    courses.forEach((course, index) => {
      const item = make('li'), content = make('div', 'student-course-copy'), label = make('label', 'sr-only', `Curso de destino ${index + 1}`), input = make('input'), error = make('p', 'student-field-error'), remove = make('button', 'student-course-remove', 'Remover');
      input.id = `student-course-${course.id}`; input.value = course.name; input.maxLength = 120; input.autocomplete = 'off'; input.spellcheck = false; label.htmlFor = input.id; error.id = `${input.id}-error`; error.hidden = true; input.setAttribute('aria-describedby', error.id);
      input.addEventListener('input', () => { course.name = input.value; updateValidation(); });
      remove.type = 'button'; remove.setAttribute('aria-label', `Remover curso de destino ${index + 1}`);
      remove.addEventListener('click', () => { courses = courses.filter(saved => saved.id !== course.id); renderCourses(); updateValidation(); (get('student-course-list').querySelectorAll('.student-course-remove')[Math.min(index, courses.length - 1)] || get('student-course-name')).focus(); });
      content.append(label, input, error); item.append(content, remove); list.append(item); courseControls.set(course.id, { input, error });
    });
  }
  function loadExample() {
    clearRows(); rows = fixture.map(row => ({ ...row })); courses = [{ id: ++courseSequence, name: 'programacao-2026' }]; exampleLoaded = true;
    const sampleText = ['username,firstname,lastname,email,city,type1', ...rows.map(row => [row.username, row.firstname, row.lastname, row.email, row.city, row.type1].join(','))].join('\r\n');
    plan = { name: 'alunos-exemplo.csv', size: new Blob([sampleText]).size }; fileError(); renderPlan(); renderRows(); renderCourses(); updateValidation(); stage('review');
  }
  const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  function csvFor(course) {
    const headers = ['username', 'firstname', 'lastname', 'email', 'city', 'course1', 'type1'];
    return [headers.map(csvCell).join(','), ...rows.map(row => headers.map(key => csvCell(key === 'course1' ? course.name.trim() : typeof row[key] === 'string' ? row[key].trim() : row[key])).join(','))].join('\r\n') + '\r\n';
  }
  const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 55) || 'curso';
  function generate() {
    const issues = updateValidation(); if (issues.length || !rows.length) { issues[0]?.input.focus(); return; }
    releaseOutputs();
    outputs = validCourses().map((course, index) => {
      const csv = csvFor(course);
      return { course: course.name.trim(), filename: `alunos_exemplo_${index + 1}_${slug(course.name.trim())}.csv`, csv, url: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })) };
    });
    const list = get('student-download-list');
    outputs.forEach(file => {
      const item = make('li'), info = make('div', 'student-download-copy'), actions = make('div', 'student-download-actions'), download = make('button', 'primary', 'Baixar CSV'), preview = make('button', 'secondary', 'Ver envio ao Moodle');
      info.append(make('strong', '', file.course), make('span', '', file.filename), make('small', '', `${rows.length} alunos · CSV de demonstração`));
      download.type = 'button'; download.setAttribute('aria-label', `Baixar CSV de ${file.course}`);
      download.addEventListener('click', () => {
        // pagehide releases URLs; a restored page creates a fresh URL only on explicit download.
        if (!file.url) file.url = URL.createObjectURL(new Blob([file.csv], { type: 'text/csv;charset=utf-8' }));
        const link = make('a'); link.href = file.url; link.download = file.filename; document.body.append(link); link.click(); link.remove();
      });
      preview.type = 'button'; preview.setAttribute('aria-label', `Ver envio ao Moodle para ${file.course}`);
      preview.addEventListener('click', () => { dialogTrigger = preview; setText(get('student-moodle-course'), `Curso de destino: ${file.course} · ${rows.length} alunos.`); get('student-moodle-dialog').showModal(); });
      actions.append(download, preview); item.append(info, actions); list.append(item);
    });
    setText(get('student-download-summary'), `${outputs.length} ${outputs.length === 1 ? 'arquivo de exemplo' : 'arquivos de exemplo'}. Os mesmos ${rows.length} alunos em cada curso. Sem coluna de senha ou política de cadastro real.`); stage('done');
  }
  const drop = get('student-plan-drop'), fileInput = get('student-plan-input');
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { chooseFile(fileInput.files); fileInput.value = ''; });
  for (const name of ['dragenter', 'dragover']) drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('drag-over'); });
  for (const name of ['dragleave', 'drop']) drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('drag-over'); });
  drop.addEventListener('drop', event => chooseFile(event.dataTransfer.files));
  get('student-plan-remove').addEventListener('click', () => { clearRows(); plan = null; exampleLoaded = false; fileError(); renderPlan(); drop.focus(); });
  get('student-use-example').addEventListener('click', loadExample);
  get('student-analyze').addEventListener('click', () => { if (exampleLoaded) { updateValidation(); stage('review'); } });
  get('student-back').addEventListener('click', () => stage('upload'));
  get('student-edit').addEventListener('click', () => stage('review'));
  get('student-generate').addEventListener('click', generate);
  get('student-reset').addEventListener('click', () => { clearRows(); plan = null; exampleLoaded = false; get('student-course-name').value = ''; fileError(); renderPlan(); stage('upload'); });
  get('student-course-form').addEventListener('submit', event => {
    event.preventDefault(); const input = get('student-course-name'), name = input.value.trim();
    if (!name || unsafeCell(input.value)) { setText(get('student-course-status'), name ? 'Use texto simples para identificar o curso.' : 'Digite o curso que deseja adicionar.'); input.focus(); return; }
    if (courses.some(course => course.name.trim().toLowerCase() === name.toLowerCase())) { setText(get('student-course-status'), 'Este curso já está na lista.'); input.focus(); return; }
    courses.push({ id: ++courseSequence, name }); input.value = ''; renderCourses(); updateValidation(); input.focus();
  });
  for (const id of ['student-moodle-close', 'student-moodle-return']) get(id).addEventListener('click', () => get('student-moodle-dialog').close());
  get('student-moodle-dialog').addEventListener('close', () => { if (dialogTrigger?.isConnected) dialogTrigger.focus(); });
  window.addEventListener('pagehide', revokeOutputUrls);
  renderPlan(); stage('upload', false);
})();
