// Quadro 1 · Mapa do semestre: as três ferramentas na ordem do semestre
import { Board, planHeader, caption, owlImg, lock, segSvg, T, SANS } from "../lib.mjs";

export const meta = { file: "Q1-mapa.dc.html", title: "Quadro 1 · Mapa do semestre" };

// Colunas da prancha (largura 1760, margem 64).
const W = 240;
const COL = { H: 64, A: 384, M: 896, X: 1184, D: 1456 };
const mid = (x) => x + W / 2;
const GAP = 56;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Cabeçalho de coluna: momento do semestre, ferramenta e onde estão os detalhes.
function columnHead(b, { x, y, when, tool, more }) {
  b.label({ html: `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${W}px; font-family: ${SANS}; color: ${T.ink}"><span style="font-size: 13px; line-height: 20px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: ${T.muted}">${esc(when)}</span><br><span style="font-size: 26px; line-height: 32px; font-weight: 600; letter-spacing: -0.02em; color: ${T.ink}">${esc(tool)}</span><br><span style="font-size: 14px; line-height: 20px; color: ${T.muted}">${esc(more)}</span></div>` });
}

// Fita do semestre: linha fina com pontos e chevrons. Mostra a ordem do tempo, não uma obrigação.
function ribbon(b, { y, xs }) {
  const x0 = xs[0], x1 = xs[xs.length - 1], w = x1 - x0 + 12;
  const dots = xs.map((x) => `<circle cx="${x - x0 + 6}" cy="8" r="4" style="fill: ${T.muted}; stroke: none"></circle>`).join("");
  const chevrons = xs.slice(1).map((x, i) => {
    const c = Math.round((xs[i] + x) / 2) - x0 + 6;
    return `<path d="M ${c - 4} 2 L ${c + 3} 8 L ${c - 4} 14"></path>`;
  }).join("");
  b.decor.push({ html: `<svg width="${w}" height="16" viewBox="0 0 ${w} 16" style="position: absolute; left: ${x0 - 6}px; top: ${y - 8}px; width: ${w}px; height: 16px; overflow: visible; fill: none; stroke: ${T.muted}; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round"><path d="M 6 8 L ${w - 6} 8"></path>${chevrons}${dots}</svg>` });
}

// Amostra de seta para a legenda curta no pé do quadro (gerada na hora de desenhar, para os marcadores terem ids únicos).
function keyArrow(b, { x, y, len = 56, style }) {
  b.decor.push({ get html() { return segSvg({ x, y }, { x: x + len, y }, style, true); } });
}

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1760, height: 2000 });
  planHeader(b, {
    title: "Mapa do semestre",
    objetivo: "ver de relance as três ferramentas, onde ficam seus cursos e o que acontece no seu Moodle.",
    quando: "na primeira visita, ou para achar o quadro com os detalhes.",
    precisa: "só saber em que momento do semestre você está.",
    owlUrl,
  });
  owlImg(b, { x: 1216, y: 92, size: 96, url: owlUrl, speech: "Por onde vamos começar?", speechW: 200 });

  // ---- Fita do semestre
  const headY = 292;
  columnHead(b, { x: COL.H, y: headY, when: "Hoje", tool: "Início", more: "Você começa aqui" });
  columnHead(b, { x: COL.A, y: headY, when: "Antes das aulas", tool: "Preparar curso", more: "Detalhes nos quadros 2 e 3" });
  columnHead(b, { x: COL.M, y: headY, when: "Na matrícula", tool: "Alunos", more: "Detalhes no quadro 4" });
  columnHead(b, { x: COL.D, y: headY, when: "Durante o semestre", tool: "Datas", more: "Detalhes no quadro 5" });
  const R = 386;
  ribbon(b, { y: R, xs: [COL.A + 6, COL.M + 6, COL.D + 6] });

  // Três saídas do Início, uma por ferramenta, em arcos encaixados logo abaixo da fita.
  const t3 = R + 48, t2 = t3 + 44, t1 = t2 + 44;
  const y1 = t1 + 40;

  // ---- Linha 1
  const hoje = b.add({ id: "hoje", kind: "screen", x: COL.H, y: y1, w: W, icon: "house",
    label: "O que você quer fazer hoje?", detail: "Três escolhas, na ordem do semestre, e o atalho Continuar de onde parou · editado ontem às 18:20.",
    chips: ["Preparar um curso", "Matricular alunos", "Ajustar datas"] });
  const comecar = b.add({ id: "comecar", kind: "screen", x: COL.A, y: y1, w: W, icon: "route",
    label: "Criar disciplina", detail: "Importar arquivos (a Matriz, tarefas e quizzes) ou Criar manualmente. Passos: Arquivos, Revisão e Baixar." });
  const planilha = b.add({ id: "planilha", kind: "screen", x: COL.M, y: y1, w: W, icon: "file-spreadsheet",
    label: "Cadastrar alunos", detail: "Enviar planilha ou Preencher à mão, com as colunas Nome completo, E-mail, CPF e Curso. Repetidos ficam marcados." });
  const qual = b.add({ id: "qual_curso", kind: "screen", x: COL.D, y: y1, w: W, icon: "school",
    label: "Qual curso no Moodle?", detail: "Busque entre os cursos do Moodle conectado, feitos aqui ou não. O curso do Caderno aparece como sugestão; você confirma." });

  // ---- Linha 2
  const y2 = Math.max(comecar.y + comecar.h, planilha.y + planilha.h, qual.y + qual.h) + GAP;
  const encontramos = b.add({ id: "encontramos", kind: "screen", x: COL.A, y: y2, w: W, icon: "eye",
    label: "O que encontramos", detail: "“Encontramos 8 unidades e 14 atividades.” Você confere antes de virar curso. Sempre abre como curso novo." });
  const lote = b.add({ id: "cursos_lote", kind: "screen", x: COL.M, y: y2, w: W, icon: "graduation-cap",
    label: "Em quais cursos?", detail: "Todos os alunos entram em todos os cursos escolhidos: “32 alunos em 2 cursos: 2 arquivos”." });
  const planeje = b.add({ id: "planeje", kind: "screen", x: COL.D, y: y2, w: W, icon: "calendar-days",
    label: "Novas datas", detail: "Só duas perguntas: Quando o curso começa? Cada unidade dura quantos dias?" });

  // ---- Linha 3
  const y3 = Math.max(encontramos.y + encontramos.h + GAP, lote.y + lote.h + GAP, planeje.y + planeje.h + GAP, hoje.y + hoje.h + 80);
  const seus = b.add({ id: "seus_cursos", kind: "screen", x: COL.H, y: y3, w: W, icon: "folder-open",
    label: "Seus cursos", detail: "Guardados neste navegador, o mais recente primeiro. Cada um mostra o estado: Rascunho, Conferido, Arquivo baixado ou No Moodle (você confirmou)." });
  const caderno = b.add({ id: "caderno", kind: "screen", x: COL.A, y: y3, w: W, icon: "notebook-pen",
    label: "Caderno do curso", detail: "Monte unidades, atividades, notas e arquivos. As pendências ficam na margem. Salvo neste navegador há 1 minuto." });
  const entAlunos = b.add({ id: "entregar_alunos", kind: "screen", x: COL.M, y: y3, w: W, icon: "send",
    label: "Baixar ou enviar", detail: "Baixar um arquivo por curso termina aqui, sem o Moodle. Ou envie direto ao Moodle." });
  const antes = b.add({ id: "antes_depois", kind: "screen", x: COL.D, y: y3, w: W, icon: "list-checks",
    label: "Conferir", detail: "Antes e depois de cada data. “Nada mudou ainda no Moodle.”" });

  // A ponte compartilhada por Alunos e Datas
  const conectar = b.add({ id: "conectar", kind: "interchange", x: COL.X, y: y3 + 96, w: W, icon: "plug",
    label: "Entrar no Moodle" });
  const capConY = conectar.y + conectar.h + 14;
  caption(b, { x: COL.X + 72, y: capConY, w: W - 72, align: "left",
    text: "A mesma conexão para Alunos e Datas. A senha nunca é guardada. Depois, você volta de onde veio. Detalhes no quadro 5." });

  // ---- Linha 4
  const y4 = Math.max(caderno.y + caderno.h, entAlunos.y + entAlunos.h, antes.y + antes.h, conectar.y + conectar.h + 8) + GAP;
  const entregar = b.add({ id: "entregar", kind: "screen", x: COL.A, y: y4, w: W, icon: "list-checks",
    label: "Conferir e baixar", detail: "Boletim do curso, Baixar curso (.mbz) e os passos para levar ao Moodle." });
  // A prévia de Alunos: o botão que muda o Moodle só vem depois dela.
  const previa = b.add({ id: "previa_alunos", kind: "screen", x: COL.M, y: y4, w: W, icon: "eye",
    label: "Ver o que o Moodle vai fazer", detail: "Para cada aluno: se será criado ou atualizado, e em quais cursos. “Nada foi alterado ainda.”" });

  // ---- Linha 5: os dois botões que mudam o Moodle, logo acima da faixa
  const y5 = previa.y + previa.h + GAP;
  const confirmar = b.add({ id: "confirmar", kind: "moodleAction", x: COL.M, y: y5, w: W, label: "Confirmar cadastro" });
  const aplicar = b.add({ id: "aplicar", kind: "moodleAction", x: COL.D, y: y5, w: W, label: "Aplicar 24 mudanças" });

  // ---- No seu Moodle
  const doorY = Math.max(entregar.y + entregar.h, confirmar.y + confirmar.h, aplicar.y + aplicar.h, capConY + 104) + 72;
  const inBand = doorY + 56;
  const restaurar = b.add({ id: "restaurar", kind: "outside", x: COL.A, y: inBand, w: 300,
    label: "Restaurar no Moodle", detail: "Você faz no Moodle: crie um curso vazio, abra Restaurar e envie o .mbz. O app não vê essa parte." });
  const alunosFim = b.add({ id: "alunos_fim", kind: "end", moodle: true, x: mid(COL.M) - 60, y: inBand, label: "Turma cadastrada" });
  const datasFim = b.add({ id: "datas_fim", kind: "end", moodle: true, x: mid(COL.D) - 60, y: inBand, label: "Datas aplicadas" });
  const capEndY = inBand + 120 + 20;
  caption(b, { x: COL.M, y: capEndY, w: W, text: "Resultado por aluno: Criado, Atualizado, Erro ou Não sabemos." });
  caption(b, { x: COL.D, y: capEndY, w: W, text: "“22 de 24 aplicadas.” Não há como desfazer pelo app." });
  const bandH = Math.max(restaurar.y + restaurar.h, capEndY + 42) + 32 - doorY;
  b.moodleBand(doorY, bandH);

  // ---- Legenda curta
  const keyY = doorY + bandH + 40;
  const keys = [
    ["main", "caminho principal"],
    ["alt", "outra escolha"],
    ["loop", "volte quando quiser"],
    ["moodle", "vai para o seu Moodle"],
  ];
  keys.forEach(([style, text], i) => {
    const x = 64 + i * 280;
    keyArrow(b, { x, y: keyY + 10, style });
    caption(b, { x: x + 72, y: keyY, w: 196, align: "left", text });
  });
  caption(b, { x: 64 + 4 * 280, y: keyY, w: 512, align: "left", text: "Todos os símbolos estão no quadro **Como ler os quadros**." });
  caption(b, { x: 64 + 4 * 280, y: keyY + 20, w: 512, align: "left", text: "Se algo der errado, veja o quadro 6." });
  b.height = keyY + 40 + 40;

  // ---- Setas
  // Início: uma saída para cada ferramenta (arcos encaixados, sem cruzar)
  b.edge({ from: "hoje", to: "comecar", fs: "t", fa: 200, ts: "t", ta: 120, via: [{ y: t1 }], label: "Preparar um curso", labelSeg: 1 });
  b.edge({ from: "hoje", to: "planilha", fs: "t", fa: 128, ts: "t", ta: 120, via: [{ y: t2 }], label: "Matricular alunos", labelSeg: 1, labelAt: 0.9 });
  b.edge({ from: "hoje", to: "qual_curso", fs: "t", fa: 56, ts: "t", ta: 120, via: [{ y: t3 }], label: "Ajustar datas", labelSeg: 1, labelAt: 0.95 });
  b.edge({ from: "hoje", to: "seus_cursos", style: "alt", label: "Continuar" });
  b.edge({ from: "seus_cursos", to: "caderno", style: "alt", fs: "r", fa: 40, ts: "l", ta: 40, label: "Abrir" });

  // Preparar curso
  b.edge({ from: "comecar", to: "encontramos", label: "Enviar para análise", labelLeft: true });
  b.edge({ from: "comecar", to: "caderno", style: "alt", fs: "r", fa: comecar.h - 32, ts: "r", ta: 24, via: [{ x: 690 }], label: "Criar manualmente", labelSeg: 1 });
  b.edge({ from: "encontramos", to: "caderno", label: "Abrir como novo curso", labelLeft: true });
  b.edge({ from: "caderno", to: "entregar", label: "Conferir o curso", labelLeft: true });
  b.edge({ from: "entregar", to: "caderno", style: "loop", fs: "r", fa: 40, ts: "r", ta: 80, via: [{ x: 790 }], label: "Continuar editando", labelSeg: 1, labelLeft: true, labelAt: 0.12 });
  b.edge({ from: "entregar", to: "restaurar", style: "moodle", ts: "t", ta: mid(COL.A) - COL.A, label: "Baixar curso (.mbz)", labelLeft: true, labelAt: 0.3 });
  // O rótulo fica acima da faixa, no fundo do quadro, e não sobre o laranja.
  b.edge({ from: "restaurar", to: "planilha", style: "alt", fs: "r", fa: 36, ts: "l", ta: 40, via: [{ x: 864 }], label: "Matricular os alunos", labelSeg: 1, labelLeft: true, ly: doorY - 48 });

  // Alunos
  b.edge({ from: "planilha", to: "cursos_lote" });
  b.edge({ from: "cursos_lote", to: "entregar_alunos" });
  b.edge({ from: "entregar_alunos", to: "conectar", fs: "r", fa: 40, ts: "t", ta: 150, label: "Enviar ao Moodle", labelSeg: 0 });
  b.edge({ from: "conectar", to: "previa_alunos", fs: "b", fa: 60, ts: "r", ta: 40, label: "Conectado", labelSeg: 1 });
  b.edge({ from: "previa_alunos", to: "confirmar" });
  b.edge({ from: "confirmar", to: "alunos_fim", style: "moodle" });

  // Datas: entra no Moodle e volta para escolher o curso
  b.edge({ from: "qual_curso", to: "conectar", style: "alt", fs: "l", fa: 40, ts: "t", ta: 200, label: "Entrar no Moodle", labelSeg: 1, labelLeft: true, labelAt: 0.12 });
  b.edge({ from: "conectar", to: "qual_curso", style: "alt", fs: "t", fa: 220, ts: "l", ta: 120 });
  b.edge({ from: "qual_curso", to: "planeje", label: "Escolher o curso", labelLeft: true });
  b.edge({ from: "planeje", to: "antes_depois", label: "Ver como fica", labelLeft: true });
  b.edge({ from: "antes_depois", to: "aplicar" });
  b.edge({ from: "aplicar", to: "datas_fim", style: "moodle" });

  // O portão do download: só abre sem pendências
  lock(b, { x: mid(COL.A) + 12, y: entregar.y + entregar.h + 24 });
  return b;
}
