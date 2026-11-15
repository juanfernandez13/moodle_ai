// Quadro 3 · O caderno do curso e as pendências
import { Board, LANES, RAILS, AXIS, planHeader, caption, owlImg, T } from "../lib.mjs";

export const meta = { file: "Q3-caderno.dc.html", title: "Quadro 3 · O caderno do curso e as pendências" };

// Outras saídas, mais à direita que LANES.O: o vão até o caminho fica com 160 px,
// e o rótulo mais longo ("Arquivos do curso") cabe nele sem tocar nos cartões nem
// nos carimbos 1a/1b/1c. Nenhum trilho de volta passa na altura destes cartões.
const O = { x: 944, w: 272 };
const GAP = 864; // meio do vão entre o caminho e as outras saídas

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1600, height: 4000 });
  planHeader(b, {
    title: "O caderno do curso e as pendências",
    objetivo: "deixar o curso como você vai dar a disciplina, sem nada faltando.",
    quando: "depois de abrir um curso.",
    precisa: "os arquivos de tarefas e imagens, se houver.",
    owlUrl,
  });

  // ---- Montar
  b.divider(320, "Montar");
  const entrada = b.add({ id: "entrada", kind: "interchange", lane: "C", y: 352, label: "Curso aberto · Quadro 2", icon: "log-in" });
  caption(b, { x: 816, y: entrada.y - 4, w: 360, align: "left",
    text: "Você chega aqui por “Abrir como novo curso” ou “Criar curso” (Quadro 2), pelo curso de exemplo ou por Seus cursos. Abre na última página que você editou." });

  const C0 = 496;
  // Alto de propósito: os dois erros saem do lado esquerdo dele, cada um com a sua volta.
  const caderno = b.add({ id: "caderno", kind: "screen", lane: "C", y: C0, h: 344, stamp: "1", icon: "notebook-pen",
    label: "Caderno do curso",
    detail: "Página aberta no centro e pendências na margem direita (no celular, num painel embaixo, com a contagem). No topo: “Salvo neste navegador há 1 minuto” · “Cópia no computador: nenhuma ainda” · Mais ações. **Sumário:**",
    chips: ["Sobre a disciplina", "Unidades: Tópico 1, Tópico 2…", "Notas e pesos", "Arquivos do curso"] });

  // erros, na margem esquerda
  const errSalvar = b.add({ id: "err_salvar", kind: "error", lane: "E", y: C0 + 4,
    label: "Se não der para salvar neste navegador",
    houve: "o navegador está sem espaço, numa janela anônima ou não deixa salvar.",
    guardado: "o curso que está na tela, enquanto você não fechar a página.",
    voltar: "“Guardar cópia no computador”." });
  const errAba = b.add({ id: "err_aba", kind: "error", lane: "E", y: errSalvar.y + errSalvar.h + 24,
    label: "Se o curso mudar em outra aba",
    houve: "você mexeu no mesmo curso em outra aba às 14:10.",
    guardado: "a versão desta aba, até você escolher. Nenhuma das duas some sem aviso.",
    voltar: "“Abrir versão mais nova” ou “Guardar a minha como cópia”." });

  // h fixo onde a medida do gerador erra: sobra no texto longo e falta na pilha de
  // chips. Os valores vêm da página renderizada, com uns 20 px de folga embaixo.
  // outras saídas do caderno
  const menu = b.add({ id: "menu", kind: "screen", x: O.x, w: O.w, y: C0, stamp: "1a", icon: "ellipsis", h: 208,
    label: "Mais ações do curso",
    detail: "Guardar cópia no computador (.moodleai) · Reimportar o planejamento: mostra o que muda e guarda uma cópia antes · Duplicar · Trocar de curso (este fica em Seus cursos) · Exportar dados (avançado)." });
  const notas = b.add({ id: "notas", kind: "screen", x: O.x, w: O.w, y: b.below("menu", 24), stamp: "1b", icon: "table-2", h: 188,
    label: "Notas e pesos",
    detail: "Categorias com pesos e a soma à vista: “Total: 100%”. Uma categoria nova nasce vazia e sem peso. “Usar um modelo de ensino” mostra o que muda e só aplica quando você confirma." });
  const sugestoes = b.add({ id: "sugestoes", kind: "screen", lane: "N", y: C0, stamp: "1d", icon: "messages-square", h: 364,
    label: "Sugestões do assistente",
    detail: "Opcional, com o assistente do navegador. “Um assistente sugeriu 3 mudanças”, cada uma com o antes e o depois: “Unidade 2 › Fórum: título antigo → novo”. Se o curso mudou no meio: “O curso mudou. Peça novas sugestões.”",
    chips: ["Aplicar as mudanças", "Recusar"] });

  const unidade = b.add({ id: "unidade", kind: "screen", lane: "C", y: b.below("caderno", 100), stamp: "2", icon: "book-open",
    label: "Abra uma unidade",
    detail: "Título, resumo e datas da unidade. Todas as atividades numa lista só, sem trocar de página. Mover e remover a unidade ficam aqui; remover mostra “Desfazer” por 10 segundos." });
  const arquivos = b.add({ id: "arquivos", kind: "screen", x: O.x, w: O.w, y: Math.max(b.below("notas", 24), unidade.y), stamp: "1c", icon: "folder-open", h: 208,
    label: "Arquivos do curso",
    detail: "Cada arquivo mostra para onde vai: “enunciado.pdf → Unidade 2 › Tarefa 1 · trocar”. Um arquivo citado no planejamento, mas não enviado, vira pendência. Embaixo, dobrado: “De onde veio cada parte”." });

  const tipo = b.add({ id: "tipo", kind: "screen", lane: "C", y: b.below("unidade", 72), stamp: "3", icon: "plus",
    label: "Que atividade?", h: 344,
    detail: "Cada tipo com ícone, nome e uma frase. Uma unidade pode ter várias atividades do mesmo tipo.",
    chips: ["Fórum · conversa da turma", "Tarefa · entrega de trabalho", "Quiz · questões com nota", "Chat · conversa ao vivo", "Wiki · texto escrito em grupo", "Glossário · lista de termos"] });

  const atividade = b.add({ id: "atividade", kind: "screen", lane: "C", y: b.below("tipo", 72), stamp: "4", icon: "file-text",
    label: "Atividade aberta", h: 292,
    detail: "Cabeçalho “Unidade 2 › Tarefa 1”, com mover e remover a atividade. Cada texto se edita num lugar só. Datas no horário de Brasília (“20 out, 23:59”). **Abas:**",
    chips: ["Conteúdo", "Datas e configurações", "Questões (só no Quiz)", "Arquivos anexados"] });
  const questoes = b.add({ id: "questoes", kind: "screen", x: O.x, w: O.w, y: atividade.y, stamp: "4a", icon: "clipboard-list",
    label: "Questões do quiz",
    detail: "Todas as questões em cartões, uma aberta por vez, com o tipo e o peso à vista: Múltipla escolha · Associação · Discursiva. Dá para reordenar e duplicar; remover mostra “Desfazer”." });
  const anexar = b.add({ id: "anexar", kind: "action", x: O.x, y: b.below("questoes", 24), icon: "paperclip", label: "Anexar arquivo" });
  caption(b, { x: O.x, y: anexar.y + anexar.h + 12, w: O.w, align: "left",
    text: "Dentro da própria atividade, sem ir até Arquivos do curso. O arquivo já nasce com o destino certo." });

  const pendencias = b.add({ id: "pendencias", kind: "screen", lane: "C", y: b.below("atividade", 88), stamp: "5", icon: "circle-alert", h: 208,
    label: "Para resolver antes de baixar (3)",
    detail: "Todas as pendências numa lista só. Cada item diz onde está e o que fazer: “Unidade 2 › Quiz ‘Revisão’ › Questão 3: marque a resposta certa”. Com pendências, o curso continua salvo; só não dá para baixar. Abaixo, ==Para\u00a0ficar\u00a0de\u00a0olho\u00a0(1)==: o motivo e o que acontece. Esse aviso não impede de baixar." });
  const campo = b.add({ id: "campo", kind: "screen", lane: "C", y: b.below("pendencias", 72), stamp: "6", icon: "map-pin", h: 188,
    label: "Pendência ao lado do campo",
    detail: "“Ir até lá” abre a unidade, a aba e o campo certos. O aviso vermelho fica ao lado do campo, não no topo da página. Resolvida, a pendência ganha um risco e sai da lista. **Para\u00a0navegar:** Pendência 1 de 3 · Anterior · Próxima · Voltar à lista." });
  const falta = b.add({ id: "aindafalta", kind: "decision", lane: "C", align: "center", y: b.below("campo", 56), label: "Ainda falta alguma pendência?" });

  // ---- Conferir
  const conferirY = b.below("aindafalta", 96);
  b.divider(conferirY, "Conferir");
  const conferir = b.add({ id: "conferir", kind: "interchange", lane: "C", y: conferirY + 48, label: "Conferir o curso · Quadro 2", icon: "list-checks" });
  caption(b, { x: LANES.C.x, y: conferir.y + conferir.h + 16, w: LANES.C.w,
    text: "O botão “Conferir o curso” fica em destaque. O caminho continua no Quadro 2." });
  owlImg(b, { x: O.x, y: conferir.y - 8, size: 88, url: owlUrl, speech: "Tudo certo para conferir.", speechW: 196 });
  b.height = conferir.y + conferir.h + 16 + 40 + 40; // legenda de 2 linhas + 40 de margem

  // ---- arrows
  b.edge({ from: "entrada", to: "caderno" });
  // erros e voltas
  b.edge({ from: "caderno", to: "err_salvar", style: "error", fs: "l", fa: 48, ts: "r", ta: 44 });
  b.edge({ from: "err_salvar", to: "caderno", style: "back", fs: "t", fa: 100, ts: "t", ta: 46, via: [{ y: C0 - 32 }], label: "Guardar cópia no computador" });
  b.edge({ from: "caderno", to: "err_aba", style: "error", fs: "l", fa: errAba.y + 32 - C0, ts: "r", ta: 32 });
  b.edge({ from: "err_aba", to: "caderno", style: "back", fs: "r", fa: caderno.y + caderno.h + 44 - errAba.y, ts: "b", ta: 36,
    label: "Abrir versão mais nova", labelSeg: 0, labelBelow: true, lx: 352 });
  // saídas laterais
  b.edge({ from: "caderno", to: "menu", style: "alt", fs: "r", fa: 30, ts: "l", ta: 30, label: "Mais ações" });
  b.edge({ from: "caderno", to: "notas", style: "alt", fs: "r", fa: notas.y + 30 - C0, ts: "l", ta: 30, label: "Notas e pesos" });
  b.edge({ from: "caderno", to: "arquivos", style: "alt", fs: "r", fa: caderno.h - 30, ts: "l", ta: 40, via: [{ x: GAP }], label: "Arquivos do curso", labelSeg: 0, lx: GAP - 70 });
  b.edge({ from: "sugestoes", to: "caderno", style: "alt", fs: "t", ts: "t", ta: 276, via: [{ y: C0 - 32 }], label: "Aplicar as mudanças" });
  // caminho
  b.edge({ from: "caderno", to: "unidade", label: "Abrir unidade" });
  b.edge({ from: "unidade", to: "tipo", label: "+ Atividade", labelLeft: true });
  b.edge({ from: "tipo", to: "atividade", label: "Criar", labelLeft: true });
  b.edge({ from: "atividade", to: "questoes", style: "alt", fs: "r", fa: 40, ts: "l", ta: 40, label: "Questões" });
  b.edge({ from: "atividade", to: "anexar", style: "alt", fs: "r", fa: anexar.y + anexar.h / 2 - atividade.y, ts: "l" });
  b.edge({ from: "atividade", to: "pendencias", label: "Ver o que falta", labelLeft: true });
  b.edge({ from: "pendencias", to: "campo", label: "Ir até lá", labelLeft: true });
  b.edge({ from: "campo", to: "aindafalta" });
  b.edge({ from: "aindafalta", to: "campo", style: "loop", fs: "r", ts: "r", ta: 60, via: [{ x: RAILS[0] }], label: "sim: Próxima", labelSeg: 0 });
  b.edge({ from: "aindafalta", to: "conferir", label: "não", labelAt: 0.3 });
  return b;
}
