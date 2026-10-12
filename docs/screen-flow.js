(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const statusNames = { demo: 'Demo', planned: 'Planejado', future: 'Futuro' };
  const base = {
    C01: ['Arquivos do curso', 'files', 'Documento, tarefas e quizzes ficam visíveis juntos.', 'DOCX de planejamento; tarefas e quizzes opcionais.', 'Escolher arquivos, exemplo, criação manual, JSON ou prompt.', 'Formato inválido: explicar o grupo aceito e manter os outros arquivos.', 'Remover ou trocar um arquivo preserva os outros grupos.'],
    C02: ['Início da leitura', 'reading', 'Escolher o trecho que começa o planejamento.', 'Documento com trechos disponíveis.', 'Escolher um trecho ou o documento inteiro e confirmar.', 'Arquivo local ainda não tem trechos extraídos na demo.', 'Cancelar retorna a C01 sem alterar a seleção anterior.'],
    C03: ['Criar manualmente', 'manual', 'Começar pelo nome do curso e pelo primeiro tópico.', 'Sem arquivo de planejamento.', 'Preencher os campos obrigatórios e conferir.', 'Nome ou primeiro tópico vazio: manter os campos e pedir correção.', 'Retornar à entrada preserva os campos nesta página.'],
    C04: ['Importar JSON', 'json', 'Trazer uma estrutura preparada fora da aplicação.', 'Texto JSON colado ou exemplo.', 'Conferir a resposta e continuar.', 'Texto vazio ou sintaxe inválida: explicar e focar o texto.', 'Corrigir sem apagar o conteúdo; voltar a C01.'],
    C05: ['Copiar prompt', 'prompt', 'Usar outra IA e trazer sua resposta para importar.', 'Prompt ilustrativo disponível na entrada.', 'Copiar, usar na outra IA e colar a resposta em C04.', 'Se a cópia automática falhar, abrir o texto para cópia manual.', 'Fechar devolve o foco ao botão de origem.'],
    C06: ['Interpretar planejamento', 'processing', 'Leitura e IA produzem uma proposta de curso recuperável.', 'Planejamento e complementos aceitos.', 'Interpretar, validar e abrir o rascunho no editor.', 'Falha de leitura, rede ou IA mantém a entrada e permite repetir.', 'Ajustar C01 ou continuar manualmente por C03.'],
    C07: ['Editor do curso', 'editor', 'Editar aulas, atividades, questões, anexos, notas e datas.', 'CourseDraft validado, com IDs estáveis e origem.', 'Editar, resolver pendências e conferir a revisão atual.', 'Edição invalida a validação anterior; problema leva ao campo correto.', 'Voltar preserva curso, anexos, ordem e vínculos.'],
    C08: ['Conferência e pendências', 'review', 'Conferir antes de seguir para a entrega.', 'Entrada atual ou revisão do rascunho.', 'Revisar o resumo e voltar ao que precisa de ajuste.', 'Problemas permanecem visíveis e localizados.', 'Voltar devolve o foco e mantém os dados pertinentes.'],
    C09: ['Gerar pacote', 'processing', 'Gerar um pacote da revisão validada.', 'Revisão identificada, sem erro bloqueante.', 'Acompanhar a geração e abrir a entrega.', 'Falha mantém o rascunho e os anexos, oferecendo nova tentativa.', 'Retornar à conferência sem apagar a edição.'],
    C10: ['Entrega do curso', 'download', 'Baixar o MBZ e consultar como restaurá-lo.', 'Artefato pronto e perfil de compatibilidade testado.', 'Baixar explicitamente e conferir instruções de restauração.', 'Compatibilidade exige restauração no laboratório definido.', 'Continuar editando em C07; editar exige nova validação.'],
    A01: ['Planilha de alunos', 'sheet', 'Começar o cadastro em lote, separado do curso.', 'XLSX, XLS, CSV ou planilha de exemplo.', 'Usar o exemplo para experimentar a revisão.', 'Arquivo real mostra só nome e tamanho nesta demo.', 'Voltar ao curso recupera o modo anterior.'],
    A02: ['Revisar alunos e cursos', 'students', 'Conferir cada pessoa e escolher os cursos de destino.', 'Lista fictícia editável, com uma pendência inicial.', 'Corrigir os dados e gerar um CSV por curso.', 'Campos inválidos, usuários duplicados ou nenhum curso bloqueiam a geração.', 'Voltar à planilha mantém o exemplo editado.'],
    A03: ['CSVs por curso', 'csv', 'Todos os alunos entram em cada curso escolhido.', 'Lista fictícia validada e ao menos um curso.', 'Baixar cada CSV local, editar o lote ou reiniciar.', 'Arquivos são exemplos locais, sem matrícula no Moodle.', 'Editar mantém os dados; escolher outra planilha reinicia o lote.'],
    A04: ['Envio ao Moodle', 'moodle', 'Modal que explica a integração futura.', 'Curso escolhido na lista de CSVs.', 'Ler: conectar, simular, conferir e confirmar.', 'A demo não autentica, não simula no servidor e não envia cadastros.', 'Fechar ou Escape retorna ao controle que abriu o modal.'],
    D01: ['Planejar datas de turmas', 'dates', 'Alterar datas de cursos já publicados.', 'Turmas de destino e mudanças propostas.', 'Preparar o plano e simular alterações.', 'Entrada inválida mantém as escolhas para correção.', 'Ajustar o plano invalida qualquer prévia anterior.'],
    D02: ['Conferir antes e depois', 'compare', 'Revisar mudanças antes de aplicá-las.', 'Prévia vinculada à revisão atual do plano.', 'Conferir cada turma e confirmar a prévia atual.', 'Prévia desatualizada exige nova simulação.', 'Ajustar retorna a D01 preservando o plano.'],
    D03: ['Resultado por turma', 'results', 'Ver aplicado, falhou ou resultado desconhecido por turma.', 'Operação confirmada sobre a prévia atual.', 'Conferir os resultados por turma.', 'Se o resultado for desconhecido, conferir o Moodle antes de repetir.', 'Voltar a D01 com o estado conhecido; evitar repetição cega.']
  };
  const n = (id, x, y, status, override = {}) => ({ id, x, y, status, title: base[id][0], kind: base[id][1], summary: base[id][2], input: base[id][3], action: base[id][4], error: base[id][5], back: base[id][6], ...override });
  const e = (from, to, label, kind = '', route = null) => ({ from, to, label, kind, route });
  const maps = {
    course: {
      summary: 'Jornada proposta do MVP. Editor, interpretação e entrega ainda precisam ser implementados.',
      nodes: [n('C01',40,40,'planned'),n('C06',370,40,'planned'),n('C07',700,40,'planned'),n('C08',1030,40,'planned',{ summary:'Conferir o curso completo e localizar pendências.', action:'Se houver erro, abrir o campo em C07; sem bloqueio, gerar C09.', error:'Erro bloqueante impede exportação. Avisos continuam visíveis.' }),n('C02',40,340,'planned'),n('C03',370,340,'planned',{action:'Criar um CourseDraft e continuar no editor C07.'}),n('C04',700,340,'planned',{action:'Validar versão e contrato do curso antes de abrir C07.',error:'JSON parseável não basta; contrato inválido mantém o texto.'}),n('C09',1030,340,'planned'),n('C05',700,640,'planned',{input:'Prompt derivado do contrato versionado e dos perfis reais.'}),n('C10',1030,640,'planned')],
      edges: [e('C01','C06','Interpretar DOCX'),e('C06','C07','Proposta recuperável'),e('C07','C08','Conferir'),e('C08','C09','Sem erro bloqueante'),e('C09','C10','Pacote pronto'),e('C01','C02','Onde ler'),e('C02','C01','Confirmar / cancelar','return'),e('C01','C03','Criar manualmente','',[[169,266],[169,298],[499,298],[499,340]]),e('C03','C07','Dados mínimos válidos','',[[628,453],[672,453],[672,153],[700,153]]),e('C01','C04','Importar JSON','',[[298,244],[682,244],[682,453],[700,453]]),e('C01','C05','Copiar prompt','',[[55,266],[55,758],[700,758]]),e('C05','C04','Trazer resposta'),e('C04','C07','Contrato validado'),e('C08','C07','Corrigir campo','return'),e('C09','C08','Falha: repetir','return'),e('C10','C07','Continuar editando','return',[[1030,826],[977,826],[977,196],[958,196]])]
    },
    demo: {
      summary: 'O que funciona localmente hoje. C08 confere metadados e dados iniciais; não há editor ou MBZ.',
      nodes: [n('C01',40,40,'demo',{action:'Selecionar arquivos ou usar DOCX e trechos preparados do exemplo.',error:'Arquivos reais têm metadados; não há parser genérico ou leitura com IA.'}),n('C08',1030,40,'demo',{summary:'Modal limitado: arquivos, dados iniciais ou JSON formatado.',input:'DOCX selecionado, nome e tópico preenchidos ou JSON sintaticamente válido.',action:'Conferir metadados, organização e início do curso; voltar e ajustar.',error:'Não valida o contrato de curso nem gera MBZ.'}),n('C02',40,340,'demo'),n('C03',370,340,'demo'),n('C04',700,340,'demo',{action:'Validar só a sintaxe com JSON.parse e abrir o modal C08.',error:'Qualquer valor JSON sintaticamente válido pode abrir C08; contrato não validado.'}),n('C05',700,640,'demo')],
      edges: [e('C01','C08','Conferir arquivos','',[[298,94],[1030,94]]),e('C01','C02','Exemplo: onde ler'),e('C02','C01','Confirmar / cancelar','return'),e('C01','C03','Criar manualmente','',[[169,266],[169,298],[499,298],[499,340]]),e('C01','C04','Importar JSON','',[[298,223],[673,223],[673,420],[700,420]]),e('C01','C05','Copiar prompt','',[[55,266],[55,754],[700,754]]),e('C03','C08','Dados preenchidos','',[[628,430],[981,430],[981,210],[1030,210]]),e('C04','C08','Sintaxe válida','',[[958,470],[1000,470],[1000,240],[1030,240]]),e('C05','C04','Trazer resposta'),e('C08','C01','Fechar: origem mantida','return',[[1030,152],[298,152]])]
    },
    students: {
      summary: 'Cadastro em lote demonstrável com lista fictícia. Interpretar planilhas reais e enviar ao Moodle são futuros.',
      nodes: [n('A01',40,80,'demo'),n('A02',370,80,'demo'),n('A03',700,80,'demo'),n('A04',1030,80,'demo'),n('C01',40,440,'demo',{summary:'A área de curso continua separada do cadastro de alunos.',input:'Modo de curso atual: arquivos, manual ou JSON.',action:'Abrir Alunos no cabeçalho.',error:'Entrar em Alunos não significa abandonar os dados do curso.',back:'Voltar ao curso restaura o modo anterior.'})],
      edges: [e('A01','A02','Usar exemplo'),e('A02','A03','Dados + cursos válidos'),e('A03','A04','Ver envio ao Moodle'),e('A02','A01','Voltar: manter lista','return',[[499,306],[499,354],[169,354],[169,306]]),e('A03','A02','Editar: manter dados','return',[[829,306],[829,394],[628,394],[628,306]]),e('A04','A03','Fechar / Escape','return',[[1159,306],[1159,354],[829,354],[829,306]]),e('C01','A01','Alunos'),e('A01','C01','Voltar ao curso','return')]
    },
    dates: {
      summary: 'Fluxo futuro para turmas publicadas. É diferente da data inicial do curso mostrada na demo.',
      nodes: [n('D01',40,110,'future'),n('D02',430,110,'future'),n('D03',820,110,'future')],
      edges: [e('D01','D02','Simular alterações','future'),e('D02','D03','Confirmar prévia atual','future'),e('D02','D01','Ajustar: invalidar prévia','return',[[559,336],[559,420],[169,420],[169,336]]),e('D03','D01','Conferir Moodle antes de repetir','return',[[949,336],[949,476],[94,476],[94,336]])]
    }
  };
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const box = (title, text = '', emphasis = false) => `<div class="wire-box${emphasis ? ' emphasis' : ''}"><strong>${title}</strong>${text ? `<small>${text}</small>` : ''}</div>`;
  const top = title => `<div class="wire-top"><span class="wire-dot"></span>${title}<span class="wire-tabs">Alunos · Tema</span></div>`;
  function wire(kind) {
    const views = {
      files: top('Arquivos do curso') + box('Documento de planejamento','Selecionar DOCX',true) + `<div class="wire-columns">${box('Tarefas','Arquivos opcionais')}${box('Quizzes','Arquivos opcionais')}</div>`,
      reading: top('Onde começar a ler?') + box('Introdução ao curso') + box('Unidade 1 · Primeiros passos','Começar neste trecho',true) + '<span class="wire-action">Confirmar trecho</span>',
      manual: top('Criar manualmente') + '<div class="wire-input">Nome do curso</div><div class="wire-input">Primeiro tópico</div><span class="wire-action">Conferir dados</span>',
      json: top('Importar JSON') + '<div class="wire-code">{\n  "title": "Meu curso",\n  "sections": […]\n}</div><span class="wire-action">Conferir estrutura</span>',
      prompt: top('Prompt para outra IA') + '<div class="wire-row"></div><div class="wire-row"></div><div class="wire-row short"></div><span class="wire-action">Copiar prompt</span>',
      processing: top('Processando') + box('Entrada mantida','Acompanhar esta operação') + '<div class="wire-progress"></div><div class="wire-row short"></div>',
      editor: top('Editor do curso') + `<div class="wire-columns">${box('Unidade 1','Aula · Tarefa · Quiz')}${box('Conteúdo da aula','Editar texto e anexos',true)}</div><span class="wire-action">Conferir curso</span>`,
      review: top('Conferir e ajustar') + box('Resumo da entrada','Organização · Início do curso') + '<div class="wire-error">Pendências localizadas na revisão planejada</div><span class="wire-action">Voltar e ajustar</span>',
      download: top('Seu curso está pronto') + box('meu-curso.mbz','Instruções de restauração',true) + '<span class="wire-action">Baixar curso</span>',
      sheet: top('Planilha de alunos') + box('Selecionar XLSX, XLS ou CSV','Arquivo real: nome e tamanho') + '<span class="wire-action">Usar exemplo</span>',
      students: top('Revisar lista e cursos') + '<div class="wire-table"><span class="th">Usuário</span><span class="th">Nome</span><span class="th">E-mail</span><span>ana.lima</span><span>Ana Lima</span><span>ana@…</span><span>bruno.silva</span><span>Bruno Silva</span><span>Corrigir e-mail</span><span>clara.souza</span><span>Clara Souza</span><span>clara@…</span></div><div class="wire-error">Corrija os campos antes de gerar</div>',
      csv: top('CSVs por curso') + box('programacao-2026.csv','Todos os alunos neste curso',true) + '<span class="wire-action">Baixar CSV</span>',
      moodle: top('Como será o envio') + box('Conectar → simular','Conferir → confirmar') + '<div class="wire-error">Modal explicativo. Sem envio real.</div>',
      dates: top('Planejar datas') + '<div class="wire-input">Escolher turmas</div><div class="wire-input">Nova data inicial</div><span class="wire-action">Simular alterações</span>',
      compare: top('Conferir alterações') + `<div class="wire-columns">${box('Antes','10/03 · Turma A')}${box('Depois','17/03 · Turma A',true)}</div><span class="wire-action">Confirmar prévia</span>`,
      results: top('Resultado por turma') + box('Turma A · Aplicado') + box('Turma B · Conferir estado','Resultado desconhecido')
    };
    return views[kind] || '';
  }
  let currentMap = 'course', selected = 'C01', zoom = 1, panX = 0, panY = 0, drag = null, detailOrigin = null;
  let minimumZoom = .35;
  const maximumZoom = 1.6;
  const viewport = $('viewport'), canvas = $('canvas'), workspace = document.querySelector('.workspace');
  const compact = () => matchMedia('(max-width:720px)').matches;
  const clamp = value => Math.min(maximumZoom,Math.max(minimumZoom,value));
  function transform() {
    canvas.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
    $('zoom-value').value = `${Math.round(zoom * 100)}%`;
    $('zoom-out').disabled = zoom <= minimumZoom;
    $('zoom-in').disabled = zoom >= maximumZoom;
  }
  function bounds() {
    const nodes = maps[currentMap].nodes;
    return { width: Math.max(...nodes.map(node => node.x + 258)) + 40, height: Math.max(...nodes.map(node => node.y + 226)) + 60 };
  }
  function fit(announce = false) {
    const {width,height} = bounds();
    const available = viewport.getBoundingClientRect();
    if (available.width <= 30 || available.height <= 72) return;
    const target = Math.min((available.width - 30) / width,(available.height - 72) / height,1);
    minimumZoom = Math.min(.35,target);
    zoom = clamp(target);
    panX = Math.max(14,(available.width - width * zoom) / 2);
    panY = Math.max(12,(available.height - 70 - height * zoom) / 2);
    transform();
    if (announce) $('map-status').textContent = 'Mapa completo enquadrado. Aumente o zoom ou abra a Lista para ler os detalhes.';
  }
  function changeZoom(value) {
    const old = zoom, next = clamp(value), rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2, centerY = rect.height / 2;
    panX = centerX - (centerX - panX) * next / old;
    panY = centerY - (centerY - panY) * next / old;
    zoom = next; transform();
  }
  function drawEdges() {
    const {nodes,edges} = maps[currentMap], {width,height} = bounds();
    const svg = $('connections'); svg.setAttribute('width',width); svg.setAttribute('height',height);
    svg.innerHTML = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7a947f"/></marker></defs>' + edges.map(edge => {
      const from = nodes.find(node => node.id === edge.from), to = nodes.find(node => node.id === edge.to);
      let points = edge.route;
      if (!points) {
        const horizontal = from.y === to.y;
        if (horizontal) {
          const right = to.x > from.x;
          const y = from.y + (edge.kind === 'return' ? 167 : 106);
          points = [[from.x + (right ? 258 : 0),y],[to.x + (right ? 0 : 258),y]];
        } else {
          const down = to.y > from.y, xOffset = edge.kind === 'return' ? 185 : 91;
          points = [[from.x + xOffset,from.y + (down ? 226 : 0)],[to.x + xOffset,to.y + (down ? 0 : 226)]];
        }
      }
      const pair = points.length === 2 ? points : points.slice(Math.max(0,Math.floor((points.length - 2) / 2)),Math.floor((points.length - 2) / 2) + 2);
      const midX = (pair[0][0] + pair[1][0]) / 2, midY = (pair[0][1] + pair[1][1]) / 2;
      const path = points.map((point,index) => `${index ? 'L' : 'M'}${point[0]},${point[1]}`).join(' ');
      const lines = [];
      for (const word of edge.label.split(' ')) {
        if (!lines.length || `${lines[lines.length - 1]} ${word}`.length > (points.length === 2 && pair[0][1] === pair[1][1] ? 12 : 32)) lines.push(word);
        else lines[lines.length - 1] += ` ${word}`;
      }
      const label = lines.map((line,index) => `<tspan x="${midX}" dy="${index ? 14 : 0}">${escape(line)}</tspan>`).join('');
      return `<path class="connector ${edge.kind}" d="${path}" marker-end="url(#arrow)"/><text class="edge-label" x="${midX}" y="${midY - 9 - (lines.length - 1) * 14}" text-anchor="middle">${label}</text>`;
    }).join('');
  }
  function render() {
    const map = maps[currentMap]; $('map-summary').textContent = map.summary;
    $('map-panel').setAttribute('aria-labelledby',`tab-${currentMap}`);
    document.querySelectorAll('[data-map]').forEach(tab => { const active = tab.dataset.map === currentMap; tab.setAttribute('aria-selected',active); tab.tabIndex = active ? 0 : -1; });
    const {width,height} = bounds(); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    $('screens').innerHTML = map.nodes.map(node => `<button class="screen-card${node.id === selected ? ' selected' : ''}" style="left:${node.x}px;top:${node.y}px" data-screen="${node.id}" aria-pressed="${node.id === selected}" aria-label="${node.id}. ${escape(node.title)}. ${statusNames[node.status]}. Ver detalhes."><span class="card-label"><span class="screen-code">${node.id}</span><span class="status ${node.status}">${statusNames[node.status]}</span></span><span class="card-title">${escape(node.title)}</span><span class="wireframe" aria-hidden="true">${wire(node.kind)}</span><span class="card-foot">${node.id === 'C08' && currentMap === 'demo' ? 'Modal de metadados · sem editor ou MBZ' : node.id === 'A04' ? 'Explicação local · operação real futura' : 'Selecione para ver entrada, ação e retorno'}</span></button>`).join('');
    $('screen-list').innerHTML = `<p class="m-0 mb-[14px] text-sm leading-[1.5] text-[var(--muted)]">${escape(map.summary)} Escolha uma tela para consultar os detalhes e seus próximos passos.</p>` + map.nodes.map(node => `<button class="list-card block w-full mb-[10px] min-h-[44px] rounded-xl border border-solid border-[var(--line)] bg-white px-4 py-[14px] text-left hover:border-[#7b9c81] aria-pressed:border-[#588364] aria-pressed:bg-[#eff5ec] ${node.id === selected ? ' selected' : ''}" data-screen="${node.id}" aria-pressed="${node.id === selected}"><span class="flex items-center justify-between gap-[10px]"><span>${node.id}</span><span class="status ${node.status}">${statusNames[node.status]}</span></span><strong class="my-[6px] block text-[17px]">${escape(node.title)}</strong><span class="m-0 block text-[13px] leading-[1.5] text-[var(--muted)]">${escape(node.summary)}</span><span class="mt-2 block text-xs text-[var(--green)]">${escape(map.edges.filter(edge => edge.from === node.id).map(edge => `${edge.label}: ${edge.to}`).join('; ') || 'Consulte o retorno nos detalhes.')}</span></button>`).join('');
    drawEdges(); showDetails(false); requestAnimationFrame(() => fit());
  }
  function setDetails(open, restoreFocus = false) {
    if (open && $('screen-details').hidden) detailOrigin = document.activeElement;
    $('screen-details').hidden = !open; workspace.classList.toggle('details-hidden',!open);
    workspace.classList.toggle('details-open',open);
    $('toggle-details').setAttribute('aria-expanded',open);
    if (!open && restoreFocus) {
      const originIsUsable = detailOrigin?.isConnected && detailOrigin.tabIndex >= 0
        && !detailOrigin.matches(':disabled') && !detailOrigin.closest('[hidden],[inert]')
        && detailOrigin.getClientRects().length > 0 && getComputedStyle(detailOrigin).visibility === 'visible';
      (originIsUsable ? detailOrigin : $('toggle-details')).focus();
    }
  }
  function showDetails(open = true) {
    const node = maps[currentMap].nodes.find(item => item.id === selected);
    $('detail-id').textContent = node.id; $('detail-title').textContent = node.title;
    $('detail-status').textContent = statusNames[node.status]; $('detail-status').className = `status m-0 mb-[13px] inline-block ${node.status}`;
    $('detail-summary').textContent = node.summary;
    $('detail-fields').innerHTML = [['Entrada',node.input],['Ação principal',node.action],['Erro e recuperação',node.error],['Voltar ou fechar',node.back]].map(([label,text]) => `<dt class="mt-[15px] mb-1 text-xs font-[650] text-[#627866] first:mt-0">${label}</dt><dd class="m-0 text-[13px] leading-[1.55]">${escape(text)}</dd>`).join('');
    $('detail-next').innerHTML = maps[currentMap].edges.filter(edge => edge.from === selected).map(edge => `<button class="detail-transition mt-[6px] w-full min-h-[44px] rounded-xl border border-solid border-[var(--line)] bg-white px-[10px] py-[9px] text-left text-xs leading-[1.4] hover:border-[#7b9c81]" data-next="${edge.to}">${escape(edge.label)}<strong class="mt-[3px] block text-[var(--green)]">${edge.to} · ${escape(maps[currentMap].nodes.find(item => item.id === edge.to).title)}</strong></button>`).join('');
    document.querySelectorAll('[data-screen]').forEach(card => { const active = card.dataset.screen === selected; card.classList.toggle('selected',active); card.setAttribute('aria-pressed',active); });
    if (open) {
      setDetails(true);
      if (compact()) { $('detail-title').setAttribute('tabindex','-1'); $('detail-title').focus(); }
    }
  }
  function selectScreen(id, announce = true) {
    selected = id; showDetails();
    if (announce) $('map-status').textContent = `${id}. ${maps[currentMap].nodes.find(node => node.id === id).title}. Detalhes abertos.`;
  }
  document.querySelector('.map-tabs').addEventListener('click',event => {
    const tab = event.target.closest('[data-map]'); if (!tab) return;
    currentMap = tab.dataset.map; selected = maps[currentMap].nodes[0].id; setDetails(!compact()); render();
  });
  document.querySelector('.map-tabs').addEventListener('keydown',event => {
    const tabs = [...document.querySelectorAll('[data-map]')], index = tabs.indexOf(event.target);
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
  workspace.addEventListener('click',event => {
    const card = event.target.closest('[data-screen]'); if (card) selectScreen(card.dataset.screen);
    const next = event.target.closest('[data-next]'); if (next) { selectScreen(next.dataset.next); $('detail-title').setAttribute('tabindex','-1'); $('detail-title').focus(); }
  });
  $('toggle-details').addEventListener('click',() => { const open = $('screen-details').hidden; setDetails(open); if (open && compact()) { $('detail-title').setAttribute('tabindex','-1'); $('detail-title').focus(); } });
  $('close-details').addEventListener('click',() => setDetails(false,true));
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && !$('screen-details').hidden) { setDetails(false,true); return; }
  });
  function setView(list) {
    workspace.classList.toggle('list-mode',list); $('screen-list').hidden = !list;
    $('list-view').setAttribute('aria-pressed',list); $('board-view').setAttribute('aria-pressed',!list);
    if (compact()) setDetails(false);
    if (!list) requestAnimationFrame(() => fit());
  }
  $('list-view').addEventListener('click',() => setView(true)); $('board-view').addEventListener('click',() => setView(false));
  $('fit').addEventListener('click',() => fit(true)); $('zoom-in').addEventListener('click',() => changeZoom(zoom + .1)); $('zoom-out').addEventListener('click',() => changeZoom(zoom - .1));
  viewport.addEventListener('pointerdown',event => {
    if (event.target.closest('button,a') || event.button !== 0) return;
    drag = { pointer:event.pointerId, x:event.clientX, y:event.clientY, originX:panX, originY:panY };
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove',event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    panX = drag.originX + event.clientX - drag.x; panY = drag.originY + event.clientY - drag.y; transform();
  });
  function stopDrag(event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    drag = null; viewport.classList.remove('dragging');
  }
  viewport.addEventListener('pointerup',stopDrag); viewport.addEventListener('pointercancel',stopDrag);
  $('screens').addEventListener('focusin',event => {
    const card = event.target.closest('[data-screen]'); if (!card) return;
    const node = maps[currentMap].nodes.find(item => item.id === card.dataset.screen), rect = viewport.getBoundingClientRect();
    const left = node.x * zoom + panX, top = node.y * zoom + panY;
    if (left < 5 || top < 5 || left + 258 * zoom > rect.width - 5 || top + 226 * zoom > rect.height - 90) {
      panX = (rect.width - 258 * zoom) / 2 - node.x * zoom;
      panY = (rect.height - 80 - 226 * zoom) / 2 - node.y * zoom; transform();
    }
  });
  viewport.addEventListener('keydown',event => {
    if (event.target !== viewport) return;
    const moves = {ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};
    if (moves[event.key]) { event.preventDefault(); panX += moves[event.key][0]; panY += moves[event.key][1]; transform(); }
    else if (['+','=','-','0'].includes(event.key)) { event.preventDefault(); if (event.key === '0') fit(true); else changeZoom(zoom + (event.key === '-' ? -.1 : .1)); }
  });
  new ResizeObserver(() => { if (!workspace.classList.contains('list-mode')) fit(); }).observe(viewport);
  matchMedia('(max-width:720px)').addEventListener('change',() => {
    const closing = compact();
    const restoreFocus = closing && $('screen-details').contains(document.activeElement);
    setDetails(!closing,restoreFocus);
  });
  setDetails(!compact()); render();
})();
