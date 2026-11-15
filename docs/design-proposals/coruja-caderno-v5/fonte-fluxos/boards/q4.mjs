// Quadro 4 · Alunos: cadastrar a turma em lote
import { Board, LANES, RAILS, AXIS, planHeader, caption, lock, T } from "../lib.mjs";

export const meta = { file: "Q4-alunos.dc.html", title: "Quadro 4 · Cadastrar alunos em lote" };

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1600, height: 4000 });
  planHeader(b, {
    title: "Cadastrar alunos em lote",
    objetivo: "cadastrar a turma no Moodle, por planilha ou à mão.",
    quando: "na matrícula, em qualquer curso que já está no Moodle.",
    precisa: "a planilha da turma ou os nomes para digitar. O acesso ao Moodle só é preciso para enviar direto.",
    owlUrl,
  });

  // ---- Alunos (passos: 1 Alunos · 2 Conferir · 3 Enviar). No topo: Enviar planilha | Preencher à mão
  b.divider(320, "Alunos");
  const entrada = b.add({ id: "entrada", kind: "interchange", lane: "C", align: "center", w: 280, y: 352, label: "Alunos · na matrícula", icon: "users" });
  caption(b, { x: LANES.E.x, y: entrada.y - 6, w: 320, align: "right",
    text: "Abre pela fita, pelo Início ou por “E agora?”." });
  const planilha = b.add({ id: "planilha", kind: "screen", lane: "C", y: b.below("entrada", 64), stamp: "1", icon: "file-spreadsheet",
    label: "Enviar planilha", detail: "Colunas: Nome completo, E-mail, CPF e Curso. Arquivo .xlsx, .xls ou .csv, até 8 MB.",
    chips: ["Escolher planilha", "Baixar modelo"] });
  b.add({ id: "manual", kind: "screen", lane: "O", y: planilha.y, stamp: "1b", icon: "hand",
    label: "Preencher à mão", detail: "Uma linha por aluno, com as mesmas colunas. Sem planilha." });
  b.add({ id: "so_janela", kind: "note", lane: "N", y: planilha.y, icon: "lock",
    label: "Só nesta janela", detail: "A lista fica só nesta janela do navegador. Não vai para Seus cursos." });
  const colunas = b.add({ id: "colunas_ok", kind: "decision", lane: "C", align: "center", y: b.below("planilha", 56), label: "Reconhecemos as colunas?" });
  const mapear = b.add({ id: "mapear", kind: "screen", lane: "E", cy: colunas.y + colunas.h / 2, stamp: "1a", icon: "table-2",
    label: "Diga o que é cada coluna", detail: "As 4 primeiras linhas e um seletor por coluna: “Coluna B: Nome completo”." });

  // ---- Conferir
  const conferirY = Math.max(b.below("colunas_ok", 56), mapear.y + mapear.h + 48);
  b.divider(conferirY, "Conferir");
  const confira = b.add({ id: "confira", kind: "screen", lane: "C", y: conferirY + 48, stamp: "2", icon: "list-checks",
    label: "Confira os alunos", detail: "Tabela editável e paginada. Cada pendência aparece na própria célula e na lista: “Linha 12: e-mail sem @”. Repetidos ficam marcados: ==Maria Silva aparece 2 vezes==",
    chips: ["Criar contas novas", "Atualizar contas existentes"] });
  b.add({ id: "tem_erro", kind: "decision", lane: "C", align: "center", y: b.below("confira", 56), label: "Falta resolver alguma pendência?" });

  // Os cursos ainda são o passo Conferir: sem divisor próprio
  const cursosY = b.below("tem_erro", 96);
  lock(b, { x: AXIS - 14 - 196, y: cursosY - 54 });
  b.add({ id: "cursos", kind: "screen", lane: "C", y: cursosY + 48, stamp: "3", icon: "graduation-cap",
    label: "Em quais cursos matricular?", detail: "Todos os alunos entram em todos os cursos escolhidos, com a conta à vista: “32 alunos em 2 cursos: 2 arquivos”. O curso aberto no Caderno aparece como sugestão, e você confirma. Mudar os cursos não apaga nada: os arquivos já baixados ficam marcados ==refazer==" });

  // ---- Enviar
  const entregarY = b.below("cursos", 64);
  b.divider(entregarY, "Enviar");
  const como = b.add({ id: "como", kind: "decision", lane: "C", align: "center", y: entregarY + 48, label: "Como você quer entregar?" });
  caption(b, { x: LANES.E.x, y: como.y + 34, w: 320, align: "right",
    text: "Na tela, as duas saídas têm o mesmo peso. Aqui o envio segue reto só porque tem mais passos." });
  b.add({ id: "baixar", kind: "screen", lane: "O", y: como.y + como.h / 2 + 44, stamp: "4a", icon: "download",
    label: "Baixar um arquivo por curso", detail: "Um botão por curso: “Baixar CSV de Introdução à programação”. Cada download só acontece com o seu clique." });
  const baixado = b.add({ id: "baixado", kind: "end", lane: "O", align: "center", y: b.below("baixar", 56), label: "Arquivos baixados" });
  caption(b, { x: LANES.O.x, y: baixado.y + baixado.h + 14, w: LANES.O.w, text: "Termina aqui, sem conectar ao Moodle." });
  // Prévia starts below the download branch; Conectar sits halfway down to it.
  const previaY = Math.max(b.below("como", 240), baixado.y + baixado.h + 72);
  const conectar = b.add({ id: "conectar", kind: "interchange", lane: "C", align: "center", w: 320, stamp: "4b", icon: "plug",
    cy: Math.round((como.y + como.h + previaY + 48) / 2), label: "Entrar no Moodle · Quadro 5" });
  caption(b, { x: LANES.E.x, y: conectar.y - 6, w: 320, align: "right",
    text: "Se você já entrou no Moodle, passa direto. Se não, entra e volta para cá." });

  // A prévia ainda é o passo Enviar: sem divisor próprio
  const previa = b.add({ id: "previa", kind: "screen", lane: "C", y: previaY + 48, stamp: "5", icon: "eye",
    label: "Ver o que o Moodle vai fazer", detail: "Enquanto prepara: “Preparando a prévia…”. Para cada aluno: se será criado ou atualizado, e em quais cursos. **Nada foi alterado ainda.** A prévia vale para um só envio e expira. Mudou a lista, os cursos, as opções ou o Moodle? ==Veja a prévia de novo==" });
  const confirmar = b.add({ id: "confirmar", kind: "moodleAction", lane: "C", align: "center", y: b.below("previa", 56), label: "Confirmar cadastro de 32 alunos" });
  caption(b, { x: LANES.O.x, y: confirmar.y + 4, w: 340, align: "left", text: "Nada é enviado ao abrir ou recarregar a página." });
  b.add({ id: "enviando", kind: "system", lane: "C", align: "center", y: b.below("confirmar", 48), label: "Enviando ao Moodle…" });

  // ---- Resultado
  const resultadoY = b.below("enviando", 64);
  b.divider(resultadoY, "Resultado");
  b.add({ id: "resultado", kind: "screen", lane: "C", y: resultadoY + 48, stamp: "6", icon: "clipboard-list",
    label: "Resultado por aluno", detail: "Cada aluno aparece como Criado, Atualizado, Erro ou Não sabemos. Resumo: “30 criados · 2 com erro”. A lista tem paginação própria, separada da prévia." });
  const incerto = b.add({ id: "incerto", kind: "decision", lane: "C", align: "center", y: b.below("resultado", 56), label: "Algum “Não sabemos”?" });
  b.add({ id: "err_incerto", kind: "error", lane: "E", cy: incerto.y + incerto.h / 2,
    label: "Se não soubermos se terminou", houve: "o Moodle não respondeu depois do envio.",
    guardado: "a lista, os cursos e o resultado.", voltar: "“Conferir no Moodle”. Enviar de novo fica bloqueado até você conferir, mesmo que saia da página." });
  const err = b.get("err_incerto");

  // ---- No seu Moodle
  const bandY = Math.max(b.below("incerto", 72), err.y + err.h + 40);
  const fim = b.add({ id: "fim", kind: "end", lane: "C", align: "center", moodle: true, y: bandY + 64, label: "Turma cadastrada" });
  const datas = b.add({ id: "datas", kind: "interchange", lane: "N", y: fim.y + fim.h + 24, label: "Datas · Quadro 5", icon: "calendar-days" });
  caption(b, { x: LANES.E.x, y: fim.y + fim.h / 2 - 20, w: 400, align: "right", text: "Quem aparece como Criado ou Atualizado já está no seu Moodle. Quem teve erro pode ir num novo lote." });
  const bandH = datas.y + datas.h + 40 - bandY;
  b.moodleBand(bandY, bandH);
  b.height = bandY + bandH + 40;

  // ---- arrows
  b.edge({ from: "entrada", to: "planilha", label: "Enviar planilha", labelLeft: true });
  b.edge({ from: "entrada", to: "manual", style: "alt", fs: "r", ts: "t", label: "Preencher à mão" });
  b.edge({ from: "planilha", to: "colunas_ok" });
  b.edge({ from: "colunas_ok", to: "confira", label: "sim", labelAt: 0.4 });
  b.edge({ from: "colunas_ok", to: "mapear", style: "alt", fs: "l", ts: "r", label: "não" });
  b.edge({ from: "mapear", to: "confira", style: "alt", fs: "b", ts: "l", ta: 24, label: "Pronto", labelSeg: 0, labelAt: 0.65 });
  b.edge({ from: "manual", to: "confira", style: "alt", fs: "b", ts: "r", ta: 24, label: "Pronto", labelSeg: 0, labelAt: 0.65 });
  b.edge({ from: "confira", to: "tem_erro" });
  b.edge({ from: "tem_erro", to: "confira", style: "loop", fs: "r", ts: "r", ta: 88, via: [{ x: RAILS[0] }], label: "sim: resolver na tabela", labelSeg: 0 });
  b.edge({ from: "tem_erro", to: "cursos", label: "não", labelAt: 0.3 });
  b.edge({ from: "cursos", to: "como" });
  b.edge({ from: "como", to: "baixar", style: "alt", fs: "r", ts: "t", label: "Baixar arquivos" });
  b.edge({ from: "baixar", to: "baixado", style: "alt" });
  b.edge({ from: "como", to: "conectar", label: "Enviar ao Moodle", labelLeft: true, labelAt: 0.4 });
  b.edge({ from: "conectar", to: "previa", label: "Conectado", labelLeft: true });
  b.edge({ from: "previa", to: "confira", style: "loop", fs: "r", fa: 40, ts: "r", ta: 56, via: [{ x: RAILS[1] }], label: "Voltar e mudar", labelSeg: 0 });
  b.edge({ from: "previa", to: "confirmar" });
  b.edge({ from: "confirmar", to: "enviando" });
  b.edge({ from: "enviando", to: "resultado" });
  b.edge({ from: "resultado", to: "incerto" });
  b.edge({ from: "incerto", to: "fim", label: "não", labelAt: 0.3 });
  b.edge({ from: "incerto", to: "err_incerto", style: "error", fs: "l", ts: "r", label: "sim" });
  b.edge({ from: "err_incerto", to: "previa", style: "back", fs: "t", ts: "l", ta: 100, label: "Conferir no Moodle" });
  b.edge({ from: "fim", to: "entrada", style: "loop", fs: "r", ts: "t", via: [{ x: RAILS[3] }, { y: 336 }], label: "Fazer outro lote", labelSeg: 0 });
  b.edge({ from: "fim", to: "datas", style: "alt", fs: "b", ts: "l", label: "Ajustar as datas" });

  // Labels inside the Moodle band sit on the band colour, not on the page colour.
  const layout = b.layoutEdges.bind(b);
  b.layoutEdges = () => { layout(); for (const e of b.edges) if (e.lab && e.lab.y > bandY) e.lab.bg = T.moodleSoft; };
  return b;
}
