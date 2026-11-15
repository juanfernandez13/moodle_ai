/**
 * Só quizzes: para qual seção do curso que já existe cada arquivo vai. A tela mostra o destino de cada arquivo e o
 * servidor usa a mesma regra para montar o pacote, então ela mora aqui, sem dependência de servidor nem de tela.
 */

// "Quiz 3", "quiz_3", "Questionário-3": só o número que vem depois da palavra vale (o "4." de "4. Prova" é ordem do documento).
const QUIZ_NUMBER = /(?:quiz|question[áa]rio)[\s_-]*(\d+)/i;
// Mesmo teto do contrato (targetNumber).
const LAST_SECTION = 200;
const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

export function quizNumberOf(name: string): number | null {
  const match = QUIZ_NUMBER.exec(name.normalize("NFC"));
  if (!match) return null;
  const number = Number.parseInt(match[1]!, 10);
  return number <= LAST_SECTION ? number : null;
}

/**
 * A seção de destino de cada arquivo, da menor para a maior. O número no nome sempre vale; os arquivos sem número
 * ocupam as primeiras seções livres, em ordem do nome. Dois arquivos com o mesmo número ficam os dois.
 */
export function assignTargets<T extends { name: string }>(
  files: readonly T[],
): { file: T; target: number }[] {
  const numbered = files.map((file) => ({
    file,
    number: quizNumberOf(file.name),
  }));
  const taken = new Set(
    numbered.flatMap((item) => (item.number === null ? [] : [item.number])),
  );
  const result: { file: T; target: number }[] = [];
  for (const item of numbered)
    if (item.number !== null)
      result.push({ file: item.file, target: item.number });
  let next = 1;
  const loose = numbered
    .filter((item) => item.number === null)
    .sort((a, b) => collator.compare(a.file.name, b.file.name));
  for (const item of loose) {
    while (taken.has(next)) next++;
    taken.add(next);
    result.push({ file: item.file, target: next++ });
  }
  return result.sort(
    (a, b) =>
      a.target - b.target || collator.compare(a.file.name, b.file.name),
  );
}

/** "Quiz_3.docx" vira "Quiz 3". */
export function titleFromFileName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/\.[^.]+$/, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
