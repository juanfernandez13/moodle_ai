// Legenda · Como ler os quadros: uma amostra de cada forma e de cada seta
import { Board, planHeader, caption, lock, segSvg, T, SANS } from "../lib.mjs";

export const meta = { file: "Legenda.dc.html", title: "Como ler os quadros" };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TEXT_W = 208;
// Altura aproximada de um texto de 14 px (20 px por linha) numa coluna de TEXT_W.
const textH = (s, w = TEXT_W) => Math.ceil((String(s).replace(/\*\*/g, "").length * 7.3) / w) * 20;

function heading(b, { x, y, text }) {
  b.label({ html: `<div style="position: absolute; left: ${x}px; top: ${y}px; height: 20px; font-family: ${SANS}; font-size: 13px; line-height: 20px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: ${T.muted}">${esc(text)}</div>` });
}

// Uma amostra de forma com a explicação ao lado, centrada na altura da amostra.
function sample(b, node, text, { textX }) {
  const n = b.add(node);
  const h = textH(text);
  caption(b, { x: textX, y: Math.round(n.y + Math.max(0, (n.h - h) / 2)), w: TEXT_W, align: "left", text });
  return { n, bottom: n.y + Math.max(n.h, h) };
}

// Amostra de seta (gerada na hora de desenhar, para os marcadores terem ids únicos).
function arrowSample(b, { x, y, len, style }) {
  b.decor.push({ get html() { return segSvg({ x, y }, { x: x + len, y }, style, true); } });
}

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1600, height: 1000 });
  planHeader(b, {
    title: "Como ler os quadros",
    objetivo: "reconhecer cada forma e cada seta dos quadros 1 a 6.",
    quando: "antes de ler os outros quadros, ou quando bater a dúvida.",
    precisa: "nada. Cada forma quer dizer sempre a mesma coisa, em todos os quadros.",
    owlUrl, w: 900,
  });

  // ---- Setas (ao lado da ficha)
  const SX = 1012;
  heading(b, { x: SX, y: 64, text: "Setas" });
  const arrows = [
    ["main", "**Seta verde grossa**: o caminho principal."],
    ["alt", "**Seta cinza**: outra escolha."],
    ["error", "**Tracejada vermelha**: algo deu errado."],
    ["back", "**Vermelha contínua**: como voltar."],
    ["loop", "**Pontilhada**: volte quando quiser."],
    ["moodle", "**Tracejada laranja**: vai para o seu Moodle."],
  ];
  arrows.forEach(([style, text], i) => {
    const y = 96 + i * 28;
    arrowSample(b, { x: SX, y: y + 10, len: 96, style });
    caption(b, { x: SX + 116, y, w: 1536 - SX - 116, align: "left", text });
  });

  // ---- Cartões
  b.divider(304, "Cartões");
  const C1 = 76, C2 = 568, C3 = 1060, GAP = 20, top = 332;
  const tx = (c) => c + 260;

  // Coluna 1: tela e erro (o erro sempre tem volta)
  const tela = sample(b, { id: "tela", kind: "screen", x: C1, y: top, w: 240, stamp: "1", icon: "list-checks",
    label: "Conferir o curso", detail: "Boletim do curso, antes de baixar. ==Semana 3 sem datas==" },
    "**Cartão**: uma tela onde você faz algo. O número dá a ordem dos passos; 1a e 1b são desvios do passo 1. Em amarelo, “Para ficar de olho”: avisa, mas não impede.", { textX: tx(C1) });
  const erro = sample(b, { id: "erro", kind: "error", x: C1, y: tela.bottom + 56, w: 240,
    label: "Se não der para gerar", houve: "o arquivo do curso não ficou pronto.", guardado: "o curso e a conferência.", voltar: "tentar de novo." },
    "**Cartão vermelho**: se der errado. Diz o que houve, o que fica guardado e como voltar. Sempre tem volta.", { textX: tx(C1) });

  // Coluna 2: pergunta, Moodle IA trabalhando, pronto, cadeado
  const pergunta = sample(b, { id: "pergunta", kind: "decision", x: C2, y: top, w: 240, label: "Deu para ler?" },
    "**Losango**: uma pergunta. Cada saída diz a resposta, como sim ou não.", { textX: tx(C2) });
  const sistema = sample(b, { id: "sistema", kind: "system", x: C2, y: pergunta.bottom + GAP, w: 240, label: "Analisando os arquivos…" },
    "**Cápsula tracejada**: o Moodle IA está trabalhando. Você só espera.", { textX: tx(C2) });
  const pronto = sample(b, { id: "pronto", kind: "end", x: C2 + 68, y: sistema.bottom + GAP, w: 104, h: 104, label: "Pronto" },
    "**Círculo verde**: pronto. O caminho termina aqui.", { textX: tx(C2) });
  const lockY = pronto.bottom + GAP + 4;
  lock(b, { x: C2 + 22, y: lockY });
  caption(b, { x: tx(C2), y: lockY + 4, w: TEXT_W, align: "left", text: "**Cadeado**: a passagem só abre quando não há pendências." });

  // Coluna 3: ponte, botões e nota
  const ponte = sample(b, { id: "ponte", kind: "interchange", x: C3, y: top, w: 240, icon: "users", label: "Alunos · Quadro 4" },
    "**Ponte**: um passo compartilhado ou a continuação em outro quadro.", { textX: tx(C3) });
  const botao = sample(b, { id: "botao", kind: "action", x: C3, y: ponte.bottom + GAP, label: "Criar disciplina" },
    "**Botão verde**: um botão do app. Não mexe no Moodle.", { textX: tx(C3) });
  const muda = sample(b, { id: "muda", kind: "moodleAction", x: C3 + 4, y: botao.bottom + GAP, w: 232, label: "Aplicar 24 mudanças" },
    "**Botão com borda laranja e escudo**: muda o Moodle. Sempre vem depois de uma prévia.", { textX: tx(C3) });
  const nota = sample(b, { id: "nota", kind: "note", x: C3, y: muda.bottom + GAP, w: 240, icon: "circle-alert",
    label: "Sobre a IA", detail: "A Matriz vai para a IA escolhida." },
    "**Cartão azul**: bom saber. Não pede nada de você.", { textX: tx(C3) });

  // ---- No seu Moodle
  const gridBottom = Math.max(erro.bottom, lockY + 28, nota.bottom);
  const bandY = gridBottom + 48;
  const inBand = bandY + 52;
  const fora = sample(b, { id: "fora", kind: "outside", x: C1, y: inBand, w: 240,
    label: "Restaurar no Moodle", detail: "Você faz isso no Moodle." },
    "**Cartão com faixa laranja**: você faz no Moodle, fora do app.", { textX: tx(C1) });
  const noMoodle = sample(b, { id: "no_moodle", kind: "end", moodle: true, x: C2 + 68, y: inBand + 8, w: 104, h: 104, label: "No Moodle" },
    "**Círculo com aro laranja**: pronto, no seu Moodle.", { textX: tx(C2) });
  caption(b, { x: C3, y: inBand + 24, w: 1536 - C3, align: "left",
    text: "**Faixa laranja**: daqui para baixo é no seu Moodle. O que só você faz lá, como restaurar o curso, o app não vê. Por isso nunca diz “publicado”." });
  const bandH = Math.max(fora.bottom, noMoodle.bottom + 8) + 32 - bandY;
  b.moodleBand(bandY, bandH);
  b.height = bandY + bandH + 40;

  // O erro sempre tem volta: a seta sai dele para a tela que funciona.
  b.edge({ from: "erro", to: "tela", style: "back", fs: "t", ts: "b", label: "Tentar de novo" });
  return b;
}
