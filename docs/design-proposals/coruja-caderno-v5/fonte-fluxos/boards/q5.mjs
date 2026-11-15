// Quadro 5 · Ajustar datas e conectar ao Moodle: o assistente de quatro passos
// 1 Entrar no Moodle · 2 Escolher o curso · 3 Novas datas · 4 Conferir, e depois o Resultado.
import { Board, LANES, RAILS, AXIS, planHeader, caption, owlImg, lock, icon, SANS, T } from "../lib.mjs";

export const meta = { file: "Q5-datas.dc.html", title: "Quadro 5 · Ajustar datas e conectar ao Moodle" };

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1600, height: 4000 });
  planHeader(b, {
    title: "Ajustar datas",
    objetivo: "mudar a abertura e os prazos de um curso que já está no Moodle.",
    quando: "durante o semestre.",
    precisa: "endereço, usuário e senha do Moodle (nos exemplos, o laboratório local http://localhost:3211).",
    owlUrl,
  });
  // the note at the top of the Datas page
  b.add({ id: "aviso_caderno", kind: "note", lane: "N", y: 64, icon: "circle-alert",
    label: "Só para cursos no Moodle", detail: "Aqui você muda as datas de um curso que já está no Moodle. As do curso em preparação ficam no Caderno." });

  // ---- Entrada e o link "Testar sem o Moodle"
  const entrada = b.add({ id: "entrada", kind: "interchange", lane: "C", align: "center", w: 300, y: 320, icon: "calendar-days",
    label: "Datas · pela fita, pelo Início ou por “E agora?”" });
  const teste = b.add({ id: "teste", kind: "screen", lane: "O", y: 320, icon: "eye",
    label: "Testar sem o Moodle", detail: "Um link no topo. Usa um curso de exemplo, marcado **É só um teste**: os mesmos passos, e nada vai para o Moodle." });

  // ---- 1 Entrar no Moodle (a mesma conexão de Alunos)
  const conectarY = Math.max(entrada.y + entrada.h, teste.y + teste.h) + 64;
  b.divider(conectarY, "Entrar no Moodle");
  const joinY = conectarY + 48;
  const verificando = b.add({ id: "verificando", kind: "system", lane: "C", align: "center", y: joinY + 48, label: "Verificando a conexão…" });
  const jaCon = b.add({ id: "ja_conectado", kind: "decision", lane: "C", align: "center", y: b.below("verificando", 56), label: "Já entrou no Moodle?" });
  const entrar = b.add({ id: "entrar", kind: "screen", lane: "C", y: b.below("ja_conectado", 72), stamp: "1", icon: "log-in",
    label: "Entrar no Moodle", detail: "**Endereço do Moodle**, **Usuário** e **Senha**. Com http (sem o s): ==Este endereço não protege a senha.== A senha não é guardada." });
  const entrando = b.add({ id: "entrando", kind: "system", lane: "C", align: "center", y: b.below("entrar", 72), label: "Entrando no Moodle…" });
  const aceitou = b.add({ id: "aceitou", kind: "decision", lane: "C", align: "center", y: b.below("entrando", 56), label: "O Moodle aceitou?" });
  const aceitouCy = aceitou.y + aceitou.h / 2;
  const errEntrar = b.add({ id: "err_entrar", kind: "error", lane: "E", w: 260, y: aceitouCy - 48,
    label: "Se não der para entrar ou a conexão acabar",
    houve: "a senha não foi aceita, o endereço não é permitido, o Moodle não respondeu ou passaram os 30 minutos.",
    guardado: "o endereço e o usuário. A senha é apagada.",
    voltar: "“Tentar de novo”, com o endereço e o usuário já preenchidos." });
  const conectado = b.add({ id: "conectado", kind: "screen", lane: "C", y: b.below("aceitou", 72), icon: "plug",
    label: "Conectado", detail: "“Conectado · Ana · localhost:3211”. **Continuar** ou **Trocar de conta**. A mesma conexão vale para Alunos." });
  const volta = b.add({ id: "volta_alunos", kind: "interchange", lane: "N", cy: conectado.y + 64, icon: "users", label: "Alunos · Quadro 4" });
  const blockBottom = Math.max(conectado.y + conectado.h, errEntrar.y + errEntrar.h, volta.y + volta.h) + 32;

  // ---- 2 Escolher o curso
  const cursoY = blockBottom + 48;
  b.divider(cursoY, "Escolher o curso");
  b.add({ id: "qual_curso", kind: "screen", lane: "C", y: cursoY + 48, stamp: "2", icon: "school",
    label: "Escolher o curso", detail: "Busque pelo nome. O curso do Caderno aparece como sugestão." });
  const lendo = b.add({ id: "lendo_datas", kind: "system", lane: "C", align: "center", y: b.below("qual_curso", 72), label: "Lendo as datas atuais…" });
  caption(b, { x: lendo.x + lendo.w + 24, y: lendo.y + 4, w: 220, align: "left", text: "Só lê. Não muda nada no Moodle." });

  // ---- 3 Novas datas: só duas perguntas
  const novasY = b.below("lendo_datas", 72);
  b.divider(novasY, "Novas datas");
  b.add({ id: "novas", kind: "screen", lane: "C", y: novasY + 48, stamp: "3", icon: "calendar-days",
    label: "Novas datas", detail: "**Quando o curso começa?** 20/10/2026. **Cada unidade dura quantos dias?** 7. Os horários ficam em “Mudar horários”." });

  // ---- 4 Conferir: antes e depois, e o botão que muda o Moodle
  const conferirY = b.below("novas", 96);
  b.divider(conferirY, "Conferir");
  b.add({ id: "preparando", kind: "system", lane: "C", align: "center", y: conferirY + 48, label: "Preparando a prévia…" });
  b.add({ id: "conferir", kind: "screen", lane: "C", y: b.below("preparando", 56), stamp: "4", icon: "eye",
    label: "Conferir", detail: "Antes e depois de cada data. Ex.: Tarefa 3 fecha 20 out, 23:59 → 27 out, 23:59. **Nada mudou ainda no Moodle.**" });
  const aplicar = b.add({ id: "aplicar", kind: "moodleAction", lane: "C", align: "center", y: b.below("conferir", 56), label: "Aplicar 24 mudanças" });
  b.add({ id: "aviso_aplicar", kind: "note", lane: "O", cy: aplicar.y + aplicar.h / 2, icon: "circle-alert",
    label: "Antes de aplicar", detail: "==Não há como desfazer pelo app.== Recarregar a página não aplica de novo." });

  // ---- Resultado
  const resultadoY = b.below("aplicar", 64);
  b.divider(resultadoY, "Resultado");
  b.add({ id: "aplicando", kind: "system", lane: "C", align: "center", y: resultadoY + 48, label: "Aplicando no Moodle…" });
  b.add({ id: "resultado", kind: "screen", lane: "C", y: b.below("aplicando", 56), stamp: "5", icon: "list-checks",
    label: "Resultado", detail: "Cada item: **Aplicado**, **Erro**, **Não aplicado** ou **Não sabemos**. “22 de 24 aplicadas.”",
    chips: ["Ver as 2 que faltaram"] });
  const incerto = b.add({ id: "incerto", kind: "decision", lane: "C", align: "center", y: b.below("resultado", 56), label: "Algum “Não sabemos”?" });
  b.add({ id: "err_incerto", kind: "error", lane: "E", cy: incerto.y + incerto.h / 2,
    label: "Se não der para saber se foi aplicado", houve: "a resposta do Moodle não chegou.", guardado: "as novas datas e o resultado.",
    voltar: "“Reler as datas”, que só lê, e conferir de novo. Aplicar de novo fica bloqueado até isso, mesmo que você saia da página." });
  const errInc = b.get("err_incerto");

  // ---- No seu Moodle
  const bandY = Math.max(b.below("incerto", 72), errInc.y + errInc.h + 40);
  b.moodleBand(bandY, 240);
  const fim = b.add({ id: "fim", kind: "end", lane: "C", align: "center", y: bandY + 72, moodle: true, label: "Datas aplicadas" });
  owlImg(b, { x: LANES.O.x, y: fim.y + 4, size: 88, url: owlUrl, speech: "As novas datas já valem para a turma.", speechW: 220 });
  b.height = bandY + 240 + 40;

  // ---- arrows
  // the test link joins the main line just above "Verificando a conexão…"; drawn first so the main line covers the shared stretch
  b.edge({ from: "teste", to: "verificando", style: "alt", fs: "b", ts: "t", via: [{ y: joinY }], join: true, label: "Usar o Moodle", labelSeg: 1, labelAt: 0.5, labelBelow: true });
  b.edge({ from: "entrada", to: "verificando" });
  b.edge({ from: "entrada", to: "teste", style: "alt", fs: "r", ts: "l", ta: entrada.h / 2 });
  b.edge({ from: "verificando", to: "ja_conectado" });
  b.edge({ from: "ja_conectado", to: "entrar", label: "não", labelAt: 0.4 });
  b.edge({ from: "ja_conectado", to: "conectado", style: "alt", fs: "r", ts: "r", ta: 40, via: [{ x: 824 }], label: "sim" });
  b.edge({ from: "entrar", to: "entrando", label: "Entrar", labelLeft: true });
  b.edge({ from: "entrando", to: "aceitou" });
  b.edge({ from: "aceitou", to: "conectado", label: "sim", labelAt: 0.4 });
  b.edge({ from: "aceitou", to: "err_entrar", style: "error", fs: "l", ts: "r", ta: aceitouCy - errEntrar.y, label: "não" });
  b.edge({ from: "conectado", to: "err_entrar", style: "error", fs: "l", fa: 40, ts: "r", ta: conectado.y + 40 - errEntrar.y, label: "se acabar" });
  b.edge({ from: "err_entrar", to: "entrar", style: "back", fs: "t", fa: 124, ts: "l", ta: 60, label: "Tentar de novo" });
  b.edge({ from: "conectado", to: "volta_alunos", style: "alt", fs: "r", fa: 64, ts: "l", label: "Veio de Alunos" });
  b.edge({ from: "conectado", to: "qual_curso", label: "Continuar", labelLeft: true, labelAt: 0.2 });
  b.edge({ from: "qual_curso", to: "lendo_datas", label: "Escolher", labelLeft: true, labelAt: 0.4 });
  b.edge({ from: "lendo_datas", to: "novas" });
  b.edge({ from: "novas", to: "preparando", label: "Ver como fica", labelLeft: true, labelAt: 0.3 });
  b.edge({ from: "preparando", to: "conferir" });
  b.edge({ from: "conferir", to: "novas", style: "loop", fs: "r", fa: 40, ts: "r", ta: 60, via: [{ x: RAILS[0] }], label: "Voltar e mudar", labelSeg: 1, labelLeft: true, labelAt: 0.3 });
  b.edge({ from: "conferir", to: "aplicar" });
  b.edge({ from: "aplicar", to: "aplicando" });
  b.edge({ from: "aplicando", to: "resultado" });
  b.edge({ from: "resultado", to: "incerto" });
  b.edge({ from: "incerto", to: "fim", label: "não", labelAt: 0.3 });
  b.edge({ from: "incerto", to: "err_incerto", style: "error", fs: "l", ts: "r", label: "sim" });
  b.edge({ from: "err_incerto", to: "lendo_datas", style: "back", fs: "t", fa: 124, ts: "l", label: "Reler as datas", labelAt: 0.12 });

  // junction dot where the test link meets the main line
  b.decor.push({ html: `<div style="position: absolute; left: ${AXIS - 4}px; top: ${joinY - 4}px; width: 8px; height: 8px; border-radius: 50%; background: ${T.action}"></div>` });

  // the gate in front of the button that changes the Moodle
  lock(b, { x: aplicar.x - 16 - 200, y: aplicar.y + 10, text: "só depois da prévia" });

  // "Entrar no Moodle" block: one connection for Alunos and Datas (painted under everything)
  const blockTop = conectarY;
  b.label({ html: `<div style="position: absolute; left: 80px; top: ${blockTop + 16}px; width: 248px; display: flex; align-items: flex-start; gap: 8px; font-family: ${SANS}; font-size: 14px; line-height: 20px; color: ${T.muted}">${icon("plug", 18, T.muted)}<span><b style="font-weight: 600; color: ${T.ink}">Entrar no Moodle</b><br>Vale para Alunos e Datas</span></div>` });
  // labels inside the block sit on its lighter ground, not on the page colour
  const baseLayout = b.layoutEdges.bind(b);
  b.layoutEdges = () => {
    baseLayout();
    for (const e of b.edges) if (e.lab && e.lab.y >= blockTop && e.lab.y + e.lab.h <= blockBottom) e.lab.bg = "transparent";
  };
  const baseHtml = b.html.bind(b);
  b.html = () => `<div style="position: absolute; left: 64px; top: ${blockTop}px; width: ${b.width - 128}px; height: ${blockBottom - blockTop}px; box-sizing: border-box; background: rgba(255, 255, 255, 0.5); border-radius: 0 0 16px 16px"></div>\n` + baseHtml();
  return b;
}
