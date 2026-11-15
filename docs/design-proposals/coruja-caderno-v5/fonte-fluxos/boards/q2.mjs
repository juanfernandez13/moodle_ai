// Quadro 2 · Jornada principal: do planejamento ao curso no Moodle
import { Board, LANES, RAILS, AXIS, planHeader, caption, owlImg, lock, T } from "../lib.mjs";

export const meta = { file: "Q2-jornada.dc.html", title: "Quadro 2 · Do planejamento ao curso no Moodle" };

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1600, height: 4000 });
  planHeader(b, {
    title: "Do planejamento ao curso no Moodle",
    objetivo: "no fim, você terá o arquivo do curso pronto para restaurar no Moodle.",
    quando: "antes das aulas.",
    precisa: "a Matriz da disciplina (um arquivo .docx, .pdf ou .txt) e, se tiver, os arquivos de tarefas e quizzes.",
    owlUrl,
  });

  // ---- Arquivos (passo 1 da trilha: 1 Arquivos · 2 Revisão · 3 Baixar)
  b.divider(320, "Arquivos");
  const inicio = b.add({ id: "inicio", kind: "interchange", lane: "C", y: 352, label: "Início · Preparar um curso", icon: "house" });
  const comecar = b.add({ id: "comecar", kind: "screen", lane: "C", y: b.below("inicio", 64), stamp: "1", icon: "route",
    label: "Criar disciplina", detail: "Duas escolhas no topo. Passos: 1 Arquivos · 2 Revisão · 3 Baixar. No rodapé: Importar JSON e Copiar prompt.",
    chips: ["Importar arquivos", "Criar manualmente"] });
  const zero = b.add({ id: "zero", kind: "screen", lane: "O", y: comecar.y, stamp: "1a", icon: "hand",
    label: "Criar manualmente", detail: "Nome do curso e a primeira unidade. Não precisa de IA." });
  const outras = b.add({ id: "outras", kind: "screen", lane: "O", y: b.below("zero", 56), stamp: "1b", icon: "code-xml",
    label: "Importar JSON", detail: "Cole a resposta de outra IA. Copiar prompt leva as instruções. Ver exemplo fica aqui dentro." });
  const enviar = b.add({ id: "enviar", kind: "screen", lane: "C", y: Math.max(b.below("comecar", 88), outras.y + 24), stamp: "2", icon: "file-up",
    label: "Importar arquivos", detail: "**Matriz**: um arquivo só, em Enviar arquivo. **Tarefas** e **Quizzes**: arraste vários. **Inteligência artificial**: Gemini · chave do servidor, ou Adicionar chave…" });
  b.add({ id: "aviso_ia", kind: "note", lane: "N", y: enviar.y, icon: "circle-alert",
    label: "Sobre a IA", detail: "A Matriz vai para a IA escolhida. A chave adicionada fica só nesta aba." });
  const lendo = b.add({ id: "lendo", kind: "system", lane: "C", align: "center", y: b.below("enviar", 72), label: "Analisando os arquivos…" });
  const leu = b.add({ id: "leu", kind: "decision", lane: "C", align: "center", y: b.below("lendo", 56), label: "Deu para ler a Matriz?" });
  b.add({ id: "err_leitura", kind: "error", lane: "E", cy: leu.y + leu.h / 2,
    label: "Se não der para ler", houve: "o PDF é uma foto das páginas, o formato não foi reconhecido ou a IA não respondeu.",
    guardado: "seus arquivos e escolhas. Nenhum curso muda.", voltar: "tentar de novo ou criar manualmente." });
  const err1 = b.get("err_leitura");
  const encontramos = b.add({ id: "encontramos", kind: "screen", lane: "C", y: Math.max(b.below("leu", 72), err1.y + err1.h + 24), stamp: "3", icon: "eye",
    label: "O que encontramos", detail: "“Encontramos 8 semanas e 14 atividades.” Semanas ou tópicos vêm do documento; dá para mudar no Caderno. ==A Semana 3 não tem datas==",
    chips: ["Abrir como novo curso", "Voltar e ajustar"] });

  // ---- Revisão
  const montarY = b.below("encontramos", 64);
  b.divider(montarY, "Revisão");
  const caderno = b.add({ id: "caderno", kind: "screen", lane: "C", y: montarY + 48, h: 148, stamp: "4", icon: "notebook-pen",
    label: "Caderno do curso", detail: "Monte unidades, atividades, notas e arquivos. Fica salvo neste navegador, mesmo com pendências." });
  b.add({ id: "q3", kind: "interchange", lane: "O", y: caderno.y, label: "Detalhes no Quadro 3", icon: "arrow-right" });

  // Conferir o curso fica na Revisão: sem divisor próprio
  const conferirY = b.below("caderno", 72);
  const conferir = b.add({ id: "conferir", kind: "screen", lane: "C", y: conferirY + 48, stamp: "5", icon: "list-checks",
    label: "Conferir o curso", detail: "Boletim: unidades, atividades, arquivos, datas (horário de Brasília) e notas. Avisos à vista, sem bloquear. Conferido às 14:32." });
  const falta = b.add({ id: "falta", kind: "decision", lane: "C", align: "center", y: b.below("conferir", 56), label: "Falta resolver alguma pendência?" });

  // ---- Baixar
  const baixarY = b.below("falta", 96);
  b.divider(baixarY, "Baixar");
  const gerando = b.add({ id: "gerando", kind: "system", lane: "C", align: "center", y: baixarY + 48, label: "Gerando o arquivo do curso…" });
  const gerou = b.add({ id: "gerou", kind: "decision", lane: "C", align: "center", y: b.below("gerando", 56), label: "O arquivo ficou pronto?" });
  b.add({ id: "err_gerar", kind: "error", lane: "E", cy: gerou.y + gerou.h / 2,
    label: "Se não der para gerar", houve: "o gerador falhou.", guardado: "o curso e a conferência, do jeito que estavam.", voltar: "tentar de novo." });
  const err2 = b.get("err_gerar");
  const pronto = b.add({ id: "pronto", kind: "screen", lane: "C", y: Math.max(b.below("gerou", 72), err2.y + err2.h + 24), stamp: "6", icon: "circle-check",
    label: "Seu curso está pronto!", detail: "8 semanas · 14 atividades · 5 arquivos. Testado no Moodle 4.1 (laboratório). O download só acontece com o seu clique." });
  owlImg(b, { x: LANES.O.x, y: pronto.y - 8, size: 88, url: owlUrl, speech: "Agora é só levar ao Moodle.", speechW: 196 });

  // Como levar ao Moodle ainda é o passo Baixar: sem divisor próprio
  const levarY = b.below("pronto", 96);
  const levar = b.add({ id: "levar", kind: "screen", lane: "C", y: levarY + 48, stamp: "7", icon: "school",
    label: "Como levar ao Moodle", detail: "1. Crie um curso novo e vazio. 2. Abra Restaurar. 3. Envie o arquivo .mbz. 4. Confira o curso restaurado.",
    chips: ["Copiar estes passos"] });
  const agora = b.add({ id: "agora", kind: "screen", lane: "C", y: b.below("levar", 72), stamp: "8", icon: "route",
    label: "E agora?", detail: "O último arquivo continua disponível. Se o curso mudar, ele fica marcado como versão anterior.",
    chips: ["Matricular os alunos", "Ajustar as datas", "Continuar editando"] });
  b.add({ id: "alunos", kind: "interchange", lane: "N", y: agora.y + 40, label: "Alunos · Quadro 4", icon: "users" });
  b.add({ id: "datas", kind: "interchange", lane: "N", y: agora.y + 108, label: "Datas · Quadro 5", icon: "calendar-days" });

  // ---- No seu Moodle
  const bandY = b.below("agora", 80);
  b.moodleBand(bandY, 260);
  const restaurar = b.add({ id: "restaurar", kind: "outside", lane: "C", y: bandY + 64,
    label: "Restaurar no Moodle", detail: "Você faz no Moodle: curso vazio, Restaurar, enviar o .mbz. O app não vê essa parte e nunca diz “publicado”." });
  b.add({ id: "no_moodle", kind: "end", lane: "O", align: "center", cy: restaurar.y + restaurar.h / 2, moodle: true, label: "No Moodle" });
  const end = b.get("no_moodle");
  caption(b, { x: LANES.O.x, y: end.y + end.h + 16, w: LANES.O.w, text: "Quando você marca “Já restaurei”, o curso aparece como No Moodle (você confirmou)." });
  b.height = bandY + 260 + 40;

  // ---- arrows
  b.edge({ from: "inicio", to: "comecar" });
  b.edge({ from: "comecar", to: "enviar", label: "Importar arquivos", labelLeft: true });
  b.edge({ from: "comecar", to: "zero", style: "alt", fs: "r", fa: 40, ts: "l", ta: 40 });
  b.edge({ from: "comecar", to: "outras", style: "alt", fs: "r", fa: comecar.h - 28, ts: "l", ta: 40, via: [{ x: 824 }] });
  b.edge({ from: "zero", to: "caderno", style: "alt", fs: "r", fa: 40, ts: "t", ta: 300, via: [{ x: RAILS[3] }, { y: caderno.y - 32 }], label: "Criar disciplina", labelSeg: 1, labelLeft: true });
  b.edge({ from: "outras", to: "lendo", style: "alt", fs: "b", ts: "r", label: "Importar", labelSeg: 0 });
  b.edge({ from: "enviar", to: "lendo", label: "Enviar para análise", labelLeft: true });
  b.edge({ from: "lendo", to: "leu" });
  b.edge({ from: "leu", to: "encontramos", label: "sim", labelAt: 0.4 });
  b.edge({ from: "leu", to: "err_leitura", style: "error", fs: "l", ts: "r", label: "não" });
  b.edge({ from: "err_leitura", to: "enviar", style: "back", fs: "t", ts: "l", ta: 48, label: "Tentar de novo" });
  b.edge({ from: "err_leitura", to: "caderno", style: "back", fs: "b", ts: "l", ta: 48, label: "Criar manualmente" });
  b.edge({ from: "encontramos", to: "caderno", label: "Abrir como novo curso", labelLeft: true });
  b.edge({ from: "caderno", to: "q3", style: "alt", fs: "r", fa: 26, ts: "l" });
  b.edge({ from: "caderno", to: "conferir", label: "Conferir o curso", labelLeft: true });
  b.edge({ from: "conferir", to: "falta" });
  b.edge({ from: "falta", to: "caderno", style: "loop", fs: "r", ts: "r", ta: 120, via: [{ x: RAILS[0] }], label: "sim: resolver", labelSeg: 0 });
  b.edge({ from: "falta", to: "gerando", label: "não", labelAt: 0.3 });
  b.edge({ from: "gerando", to: "gerou" });
  b.edge({ from: "gerou", to: "pronto", label: "sim", labelAt: 0.4 });
  b.edge({ from: "gerou", to: "err_gerar", style: "error", fs: "l", ts: "r", label: "não" });
  b.edge({ from: "err_gerar", to: "gerando", style: "back", fs: "t", ts: "l", label: "Tentar de novo" });
  b.edge({ from: "pronto", to: "levar", label: "Baixar curso (.mbz)", labelLeft: true });
  b.edge({ from: "levar", to: "agora" });
  b.edge({ from: "levar", to: "restaurar", style: "moodle", fs: "l", fa: 40, ts: "l", ta: 40, via: [{ x: 384 }], label: "No Moodle", labelSeg: 1, labelLeft: true });
  b.edge({ from: "agora", to: "caderno", style: "loop", fs: "r", fa: 24, ts: "r", ta: 84, via: [{ x: RAILS[1] }], label: "Continuar editando", labelSeg: 1 });
  b.edge({ from: "agora", to: "alunos", style: "alt", fs: "r", fa: 66, ts: "l" });
  b.edge({ from: "agora", to: "datas", style: "alt", fs: "r", fa: 134, ts: "l" });
  b.edge({ from: "restaurar", to: "no_moodle", fs: "r", ts: "l", label: "Já restaurei" });

  // the gate on the way to the file
    lock(b, { x: AXIS - 14 - 196, y: baixarY - 54 });
  return b;
}
