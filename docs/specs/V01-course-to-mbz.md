# V01 — Rascunho sintético até backup Moodle

Data: 12/10/2026. Implementação local liberada pelo mantenedor nesta conversa. Primeira etapa do MVP; não representa a versão completa.

## Problema e comportamento esperado

Antes de integrar IA e editor, precisamos comprovar que um rascunho único preserva seções, atividades e referências durante validação e exportação. Uma entrada inválida deve indicar o campo e impedir o pacote; um documento JSON parseável não é suficiente.

O primeiro ticket entrega uma ferramenta local executável: JSON fictício → contrato e regras → resumo ou pendências. O segundo entrega JSON válido → MBZ verificável. Restauração é uma prova separada indispensável para declarar compatibilidade.

Fontes: [PRD](../PRD.md), [arquitetura](../ARCHITECTURE.md), [backlog](../BACKLOG.md), [plano ampliado](../BUILDER_PIPELINE_PLAN.md) e [prontidão](../PLANNING_READINESS.md). Esta spec detalha V01; não substitui R01–R15 nem conclui V02–V07.

## Decisões da execução inicial

- Tracker local em Markdown e registros JSON do `project-loop`; um arquivo por ticket. Nenhuma integração externa é necessária.
- O domínio é TypeScript puro e portável para o navegador. A CLI Node é o primeiro consumidor de `validateDraft`; filesystem fica fora do domínio. A aplicação Next continua a arquitetura prevista e será inicializada no ticket do editor, sem criar uma API independente.
- Dependências locais fixadas e lockfile. Node 24; TypeScript compatível com o linter escolhido. O teste de aceitação atravessa `validateDraft` e a CLI, sem testar funções internas.
- Curso com fórum, tarefa e quiz de múltipla escolha. Tipos adicionais entram por extensão explícita e fixtures, sem anúncios de suporte pela existência do legado.
- Alvo de investigação do exportador: referência Moodle 4.1.17+, build 20250321. A captura é evidência de inventário; compatibilidade permanece não validada até laboratório e restauração. A seleção e fixação dos plugins/imagens pertence ao ticket de laboratório.
- Texto é texto simples neste contrato inicial. Aceitar uma string não torna HTML seguro para renderização; uma futura UI precisa de escape/sanitização conforme S02.

## Contrato compartilhado de entrada

Todas as estruturas são estritas: campo desconhecido é erro localizado; não remover silenciosamente `filePath`, credenciais ou metadados internos. Não preencher defaults pedagógicos nem modificar a entrada.

| Estrutura | Campos |
| --- | --- |
| CourseDraft | `schemaVersion: 1`, `id`, `revision` inteiro >= 0, `metadata`, `sections`, `attachments`, `gradebook` opcional |
| metadata | `fullName`, `shortName`, `summary`, `organization: topics ou weeks`, `startDate` opcional |
| Section | `id`, `title`, `summary`, `activities` |
| Activity comum | `id`, `type`, `title`, `description`, `attachmentIds`, `schedule` opcional |
| schedule | `opensAt` e/ou `closesAt`, timestamps ISO 8601 com Z ou offset; abertura <= fechamento |
| forum | Activity + `type: forum`, `settings.discussionMode: general ou single` |
| assignment | Activity + `type: assignment`, `settings.maxGrade` > 0, `settings.submissionMode: file, text ou both` |
| quiz | Activity + `type: quiz`, `settings.maxGrade` > 0, `settings.attempts` inteiro 0–100 (0 = ilimitado), `settings.shuffleQuestions` booleano e `questions` |
| Question | `id`, `type: multiple-choice`, `statement`, `options`, `feedback` |
| Option | `id`, `text`, `fraction` entre 0 e 1, `feedback`; questão inicial é de resposta única: exatamente uma fração 1 e todas as demais 0 |
| AttachmentRef | `id`, `name`, `size` inteiro >= 0, `mediaType`; só metadados, nunca caminho físico |
| gradebook | `categories` |
| GradeCategory | `id`, `name`, `weight` > 0 e <= 100, `activityIds`; cada atividade avaliável pertence a no máximo uma categoria |

A coleção de anexos na raiz contém metadados; atividades apontam por `attachmentIds`. Isso concretiza a associação por ID descrita na arquitetura e evita cópias divergentes dos mesmos metadados. Não comprova disponibilidade dos bytes; a exportação deve resolver cada referência e conferir os bytes no servidor.

IDs têm de 1 a 128 caracteres ASCII alfanuméricos, hífen ou sublinhado, começando por alfanumérico. IDs são únicos no rascunho entre curso, seções, atividades, questões, opções, anexos e categorias. Reordenar listas não altera IDs nem vínculos. Títulos, nomes e `mediaType` têm 1–200 caracteres e não podem ser somente espaços. Resumos, descrições e feedback podem ser vazios, até 50.000 caracteres. Enunciados e textos das opções são obrigatórios, não brancos, até 50.000 caracteres. `startDate` tem o mesmo formato ISO com timezone do schedule. Nenhuma normalização silenciosa.

Limites iniciais de contrato: 1–200 seções; 0–200 atividades por seção; 1–200 questões por quiz; 2–20 opções por questão; 0–500 anexos; até 100 categorias; até 500 referências em cada lista de IDs. São limites locais do contrato inicial, não limites de upload ou de uma hospedagem ainda inexistente. CLI aceita JSON regular de até 1 MiB e não resolve os anexos.

Regras determinísticas: rejeitar IDs duplicados; referência de anexo inexistente ou repetida na mesma atividade; categoria com referência ausente, repetida, já usada por outra categoria ou apontando para fórum; categorias vazias ou soma de pesos diferente de 100 (tolerância 0,000001). Gradebook ausente é permitido e não inventa notas/categorias. JSON contendo versão desconhecida ou atividade desconhecida é rejeitado sem truncamento.

## Interface de validação

`validateDraft(input: unknown)` retorna:

- válido: `{ valid: true, draft: CourseDraft, issues: [] }`, com cópia validada; entrada não é alterada;
- inválido: `{ valid: false, issues: ValidationIssue[] }`, sem publicar entrada bruta;
- issue: `code`, `path`, `severity: error`, `message` em português. Exemplos de caminho: `sections[0].activities[1].title` e `attachments[0].filePath`.

O domínio não acessa rede, arquivo, Moodle, chaves ou relógio. Validação bem sucedida confirma o contrato e as regras acima; não é aprovação pedagógica, sanitização HTML, bytes resolvidos ou compatibilidade Moodle.

## Comportamento da CLI

`npm run validate:draft -- <arquivo.json>` lê um arquivo local explícito, chama o mesmo domínio e publica JSON compacto com `valid`, `issues` e, no sucesso, revisão e contagens de seções/atividades/anexos. Não imprime conteúdo integral, valores desconhecidos ou mensagens do sistema que incluam a entrada.

- saída 0: contrato válido;
- saída 1: JSON inválido, versão/estrutura/regra inválida;
- saída 2: uso incorreto, arquivo ilegível/não regular ou excesso de 1 MiB.

`npm run demo` executa uma fixture sintética válida. A CLI não escreve MBZ, não persiste projetos e não confirma existência de arquivos anexados.

## Aceites do ticket V01-01 (bootstrap e validação)

| ID | Aceite verificável |
| --- | --- |
| A1 | `npm ci`, typecheck, lint, testes e build passam em ambiente Node 24; ferramentas de design/CodeGraph existentes são preservadas. |
| A2 | CLI retorna 0 e contagens independentes esperadas para fixture com uma seção e seis atividades (dois fóruns, duas tarefas e dois quizzes), sem IA. |
| A3 | Três fixtures inválidas independentes (versão desconhecida, ID duplicado, campo interno/caminho físico) retornam saída 1 e problema localizado; entrada não é reescrita. |
| A4 | Reordenação preserva IDs/vínculos; referências ausentes, questões inconsistentes, datas invertidas e gradebook inválido são rejeitados em testes pelo contrato público. |
| A5 | CLI trata JSON malformado, argumento ausente, arquivo ilegível, diretório e excesso de tamanho com saídas previstas; dados desconhecidos não aparecem nas mensagens. |
| A6 | Build compilado executa a mesma fixture com resultado equivalente; não precisa de chave externa. |
| A7 | Spec, tickets e documentos centrais distinguem primeiro MVP e versão completa; autorização de início está registrada, sem promessa de editor/MBZ já prontos. |
| A8 | Duas revisões independentes (spec e qualidade) e evidências de checks referem-se ao mesmo digest; manifesto registra hashes por arquivo para conferir a preservação do candidato na integração. A comprovação da cópia ocorre no registro de integração, após aceitação. |

TDD no contrato: cada comportamento crítico tem teste falhando antes da implementação e resultado passando depois. Testes observam resultados e caminhos, nunca a estrutura privada do schema. Falha por import ainda ausente comprova apenas o primeiro ciclo; demais ciclos devem falhar pela regra ainda não implementada.

## Aceites de V01 após os demais tickets

Draft válido gera MBZ sem IA; três entradas inválidas não geram pacote. Descompactação, XML, IDs, referências, ordem das seis atividades e hashes de anexos são verificados. Conteúdo não suportado bloqueia claramente a combinação; nenhum `array[0]` ou descarte silencioso.

Exportador recebe draft validado, perfil declarado e resolver de anexos por ID, verifica novamente capacidades/recursos e concentra temporários com limpeza em falha parcial. O contrato exato de `exportCourse` será fixado no ticket V01-02 após inventário do core; o ticket não fica pronto só por ter esta spec.

Curso sintético é restaurado em curso novo/vazio no laboratório fixado; snapshot semântico e conferência UI comparam conteúdo, notas, datas e bytes com expectativas independentes. Sem essa evidência, V01 pode comprovar integridade local do pacote, mas não compatibilidade nem liberar V07.

## Sequência e exclusões

[Tickets](../tickets/README.md): V01-01 → V01-02 → V01-04; V01-03 (laboratório) pode preparar-se em paralelo, e bloqueia V01-04. V02-01 (editor) depende do exportador; amplia o contrato somente por mudança coordenada.

Este início não implementa importação DOCX/PDF, IA real, WebMCP, IndexedDB, cópia portátil, cadastro ou datas de turmas existentes. Essas capacidades permanecem entregas do projeto completo no plano ampliado, sem obrigação de caber no bootstrap. Nenhum deploy ou Moodle real entra na execução local.
