// Quadro 6 · Nenhum erro sem saída: todos os "Se…" da jornada, lidos como uma tabela.
// Uma linha por erro: a etiqueta à esquerda, uma volta curta e vermelha com o botão,
// e a pílula da tela de volta com o número do quadro. À direita, a regra de cada momento.
import { Board, planHeader, caption, owlImg, T } from "../lib.mjs";

export const meta = { file: "Q6-erros.dc.html", title: "Quadro 6 · Nenhum erro sem saída" };

// Colunas da tabela
const CARD = { x: 64, w: 440 };   // a etiqueta "Se…"
const PILL = { x: 744, w: 400 };  // a tela de volta (ponte)
const NOTE = { x: 1184, w: 352 }; // a regra do momento
const ROW_GAP = 28;               // entre linhas do mesmo momento
const GROUP_GAP = 64;             // da última linha até o divisor seguinte
const FIRST = 32;                 // do divisor até a primeira linha
const FORK = 40;                  // meia distância entre duas pílulas na mesma linha

export function build({ owlUrl }) {
  const b = new Board({ file: meta.file, title: meta.title, width: 1600, height: 4000 });
  planHeader(b, {
    title: "Nenhum erro sem saída",
    objetivo: "ver, para cada erro, o que houve, o que fica guardado e para onde você volta.",
    quando: "quando algo der errado, ou para conferir que todo erro tem uma volta.",
    precisa: "saber em que tela o erro apareceu. Cada linha diz o botão e o quadro com os detalhes.",
    owlUrl,
  });
  owlImg(b, { x: 1184, y: 84, size: 88, url: owlUrl, speech: "Achou o erro? Siga a seta vermelha até a tela de volta.", speechW: 252 });

  // Cabeçalho das colunas
  const headY = 296;
  const head = { size: 14, weight: 500, color: T.muted, align: "left" };
  caption(b, { ...head, x: CARD.x, y: headY, w: CARD.w, text: "O erro: o que houve, o que fica guardado e como voltar" });
  caption(b, { ...head, x: CARD.x + CARD.w, y: headY, w: PILL.x - CARD.x - CARD.w, text: "O botão", align: "center" });
  caption(b, { ...head, x: PILL.x, y: headY, w: PILL.w, text: "A tela de volta e o quadro com os detalhes" });
  caption(b, { ...head, x: NOTE.x, y: headY, w: NOTE.w, text: "A regra de cada momento" });

  let cursor = 0;
  let bottom = 0;

  // Um momento: divisor, nota com a regra e as linhas de erro.
  const group = (dividerY, title, rule, rows) => {
    b.divider(dividerY, title);
    cursor = dividerY + FIRST;
    const first = cursor;
    const note = b.add({ id: rule.id, kind: "note", x: NOTE.x, w: NOTE.w, y: first, icon: "circle-check", label: rule.label, detail: rule.detail });
    bottom = note.y + note.h;
    for (const r of rows) row(r);
    cursor = Math.max(cursor - ROW_GAP, note.y + note.h);
    return cursor + GROUP_GAP;
  };

  // Uma linha: etiqueta + uma ou duas voltas até as pílulas.
  const row = ({ id, label, houve, guardado, voltar, back }) => {
    const card = b.add({ id, kind: "error", x: CARD.x, w: CARD.w, y: cursor, label, houve, guardado, voltar });
    const cy = card.y + card.h / 2;
    back.forEach((t, i) => {
      const off = back.length === 1 ? 0 : (i === 0 ? -FORK : FORK);
      const pid = `${id}_volta${back.length > 1 ? i + 1 : ""}`;
      b.add({ id: pid, kind: "interchange", x: PILL.x, w: PILL.w, cy: cy + off, label: t.to, icon: t.icon });
      b.edge({ from: id, to: pid, style: "back", fs: "r", fa: card.h / 2 + off, ts: "l", label: t.button });
    });
    cursor = card.y + card.h + ROW_GAP;
    bottom = Math.max(bottom, card.y + card.h);
  };

  // ---- Ao começar
  let next = group(376, "Ao começar",
    { id: "regra_comecar", label: "Nada vira curso sem você", detail: "Importar sempre cria um curso novo, e só quando você escolhe **Abrir como novo curso**. Seus cursos não mudam." },
    [
      { id: "x1", label: "Se o arquivo não puder ser usado",
        houve: "o arquivo passa de 10 MB, são mais de 10 arquivos ou mais de 20 MB no total, ou ele não é .docx, .pdf nem .txt.",
        guardado: "os outros arquivos e as suas escolhas.",
        voltar: "**Trocar o arquivo**. O aviso aparece no próprio arquivo.",
        back: [{ button: "Trocar o arquivo", to: "Importar arquivos · Quadro 2", icon: "file-up" }] },
      { id: "x2", label: "Se o PDF for uma foto das páginas",
        houve: "não há texto para ler.",
        guardado: "os arquivos e as escolhas. Nenhum curso muda.",
        voltar: "**Enviar o .docx** ou **Criar manualmente**, a saída segura para o Caderno do curso.",
        back: [{ button: "Enviar o .docx", to: "Importar arquivos · Quadro 2", icon: "file-up" }] },
      { id: "x3", label: "Se não encontrarmos as unidades",
        houve: "a IA não achou semanas nem tópicos na Matriz.",
        guardado: "os arquivos e as escolhas.",
        voltar: "**Trocar a Matriz** ou **Criar manualmente**.",
        back: [{ button: "Trocar a Matriz", to: "Importar arquivos · Quadro 2", icon: "file-up" }] },
      { id: "x4", label: "Se a leitura com IA falhar",
        houve: "a IA não respondeu, respondeu algo que não dá para usar, ou a chave não foi aceita.",
        guardado: "os arquivos e as escolhas. A chave continua só nesta aba.",
        voltar: "**Tentar de novo**, com a mesma IA (o app nunca troca sozinho), **Adicionar chave…** ou **Criar manualmente**.",
        back: [{ button: "Tentar de novo", to: "Analisando os arquivos… · Quadro 2", icon: "hourglass" }] },
      { id: "x5", label: "Se a resposta da outra IA vier fora do formato",
        houve: "o texto colado não está no formato esperado.",
        guardado: "o texto colado.",
        voltar: "**Colar de novo**. Dica: “Peça para a IA responder só com o bloco de código.”",
        back: [{ button: "Colar de novo", to: "Importar JSON · Quadro 2", icon: "copy" }] },
      { id: "x6", label: "Se a cópia do computador não abrir",
        houve: "o arquivo .moodleai está danificado ou não é do Moodle IA, ou esse curso já está em Seus cursos.",
        guardado: "Seus cursos, sem nenhuma mudança.",
        voltar: "**Escolher outro arquivo**, **Abrir o que já está guardado** ou **Guardar como outro curso**.",
        back: [{ button: "Escolher outro arquivo", to: "Seus cursos · Quadro 1", icon: "folder-open" }] },
    ]);

  // ---- No caderno
  next = group(next, "No caderno",
    { id: "regra_caderno", label: "Nada é sobrescrito em silêncio", detail: "O curso fica salvo neste navegador mesmo com pendências. Quando há duas versões, você escolhe." },
    [
      { id: "x7", label: "Se não der para salvar neste navegador",
        houve: "o navegador está cheio, em modo privado ou com o armazenamento bloqueado.",
        guardado: "o curso aberto na tela, enquanto ela estiver aberta.",
        voltar: "**Guardar cópia no computador**. No Início aparece: “Este navegador não está guardando cursos. Ao terminar, guarde uma cópia no computador.”",
        back: [{ button: "Guardar cópia no computador", to: "Caderno do curso · Quadro 3", icon: "notebook-pen" }] },
      { id: "x8", label: "Se o curso mudar em outra aba",
        houve: "outra aba salvou uma versão mais nova deste curso.",
        guardado: "a sua versão, até você escolher.",
        voltar: "**Abrir versão mais nova** ou **Guardar a minha como cópia**.",
        back: [{ button: "Abrir versão mais nova", to: "Caderno do curso · Quadro 3", icon: "notebook-pen" }] },
      { id: "x9", label: "Se você mudar o curso depois de conferir",
        houve: "a conferência das 14:32 vale só para o curso como estava naquela hora.",
        guardado: "tudo. O último arquivo continua, marcado como “versão anterior”.",
        voltar: "**Conferir de novo**.",
        back: [{ button: "Conferir de novo", to: "Conferir o curso · Quadro 2", icon: "list-checks" }] },
    ]);

  // ---- Ao gerar e levar ao Moodle
  next = group(next, "Ao gerar e levar ao Moodle",
    { id: "regra_gerar", label: "O curso no caderno não muda", detail: "Gerar de novo não perde nada. O download só acontece com o seu clique, e o app nunca diz “publicado”." },
    [
      { id: "x10", label: "Se não der para gerar o arquivo",
        houve: "o gerador falhou.",
        guardado: "o curso e a conferência, do jeito que estavam.",
        voltar: "**Tentar de novo**. Cancelar também não muda nada.",
        back: [{ button: "Tentar de novo", to: "Gerando o arquivo do curso… · Quadro 2", icon: "hourglass" }] },
      { id: "x11", label: "Se a restauração no Moodle der erro",
        houve: "o Moodle não restaurou o curso. O motivo mais comum é restaurar num curso que já tinha conteúdo. O app não vê essa parte.",
        guardado: "o arquivo .mbz e o curso no caderno.",
        voltar: "**Usar curso vazio**: no Moodle, restaure o mesmo arquivo num curso novo e vazio.",
        back: [{ button: "Usar curso vazio", to: "Como levar ao Moodle · Quadro 2", icon: "school" }] },
    ]);

  // ---- Com o Moodle, em Alunos e Datas
  next = group(next, "Com o Moodle, em Alunos e Datas",
    { id: "regra_moodle", label: "Nada muda no Moodle sem prévia", detail: "Cada envio pede uma prévia nova e o seu clique. Nada é reenviado ao recarregar a página." },
    [
      { id: "x12", label: "Se não der para entrar ou a conexão acabar",
        houve: "senha não aceita, endereço não permitido, o Moodle não respondeu ou passaram os 30 minutos.",
        guardado: "o endereço, o usuário, a lista de Alunos e as novas datas. A senha é apagada e as prévias abertas são descartadas.",
        voltar: "**Tentar de novo**, com o endereço e o usuário já preenchidos.",
        back: [{ button: "Tentar de novo", to: "Entrar no Moodle · Quadro 5", icon: "log-in" }] },
      { id: "x13", label: "Se você mudar algo depois da prévia",
        houve: "os alunos, os cursos, as opções ou as novas datas mudaram, a prévia expirou ou o endereço do Moodle mudou.",
        guardado: "tudo o que você editou. Nada mudou no Moodle.",
        voltar: "**Nova prévia**, em Alunos, ou **Ver como fica**, em Datas.",
        back: [
          { button: "Nova prévia", to: "Ver o que o Moodle vai fazer · Quadro 4", icon: "users" },
          { button: "Ver como fica", to: "Conferir · Quadro 5", icon: "calendar-days" },
        ] },
      { id: "x14", label: "Se não soubermos se o Moodle terminou",
        houve: "a resposta não chegou depois do envio.",
        guardado: "a lista de Alunos ou as novas datas, e o resultado.",
        voltar: "**Conferir no Moodle** (em Datas, **Reler as datas**). Enviar ou aplicar de novo fica bloqueado até você conferir, mesmo que saia da página.",
        back: [
          { button: "Conferir no Moodle", to: "Ver o que o Moodle vai fazer · Quadro 4", icon: "users" },
          { button: "Reler as datas", to: "Lendo as datas atuais… · Quadro 5", icon: "calendar-days" },
        ] },
    ]);

  b.height = bottom + 40;
  return b;
}
