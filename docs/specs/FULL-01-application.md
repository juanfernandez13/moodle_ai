# FULL-01 — Aplicação local integrada

Autorização de 12/10/2026: implementar o Moodle-AI e testar, com resultado próximo ou melhor que https://ifmoodle.vercel.app/. Produto e direção visual continuam PRD/ARCHITECTURE/BUILDER_PIPELINE_PLAN/DESIGN_BRIEF. O original é referência somente leitura. Não há autorização inferida para operar cursos/pessoas reais ou publicar.

## Contrato coordenado

CourseDraft mantém schemaVersion 1 e os campos já existentes. Esta extensão é aditiva: arquivos v1 anteriores continuam válidos sem normalização. Campos/opções novos são estritos e validados; versões desconhecidas falham. O contrato de V01-01 continua registrado como histórico.

- Módulos: forum, assignment, quiz, chat, wiki, glossary.
- chat.settings: sessionAt opcional (ISO com fuso), repeat none/daily/weekly, keepDays inteiro 0–3650.
- wiki.settings: mode collaborative/individual, firstPageTitle não vazio.
- glossary.settings: allowDuplicates, requireApproval, entriesPerPage inteiro 1–100. glossary.entries: id, concept, definition, definitionBlocks opcional.
- Questões: multiple-choice (contrato existente), matching com pairs [{id,statement,answer}], essay com settings {responseFormat: editor/plain, responseRequired:boolean, responseLines:inteiro5–50, attachments:inteiro0–10}. Todas têm id/statement/feedback e maxMark positivo opcional (ausente significa peso unitário declarado no perfil Moodle).
- Question admite statementBlocks/feedbackBlocks opcionais; alternativas textBlocks/feedbackBlocks; matching.pairs statementBlocks opcionais.
- Conteúdo ordenado: ContentBlock = {id,kind:text,text} | {id,kind:image,attachmentId,alt} | {id,kind:table,rows:TableCell[][]}. TableCell = {blocks:(bloco text ou image)[]}. Máximo 500 blocos, 100 linhas, 20 colunas e 100 blocos/célula. Não existe HTML arbitrário no contrato. Imagens apontam para anexos declarados; IDs de todos os blocos/pares/entradas são globalmente únicos. Alt pode ser vazio quando decorativo, até 2000 caracteres.
- metadata.summaryBlocks, section.summaryBlocks, activity.descriptionBlocks opcionais substituem a apresentação de sua string correspondente quando presentes; conteúdo não é emitido duas vezes. Campos de texto simples permanecem editáveis. As ocorrências de imagens permanecem distintas mesmo quando usam os mesmos bytes.
- Metadata opcional: teacher {name,email opcional,qualification opcional}, workloadHours inteiro positivo, semester, className. Presets institucionais são explícitos e portáteis; o importador/exportador não os aplica automaticamente.
- Categorias de notas referenciam somente assignment/quiz; nenhuma categoria/atividade é inventada pelo exportador. Anexos comuns e todas as imagens são resolvidos por ID.

## Interfaces compartilhadas

exportCourse(input:unknown,{profileId:'moodle-4.1-core-v1',resolveAttachment(id):Promise<Uint8Array|null>,signal?}) retorna {ok:true,revision,profileId,artifact:{filename,mediaType:'application/gzip',bytes,sha256},warnings} ou {ok:false,issues}. Limites:16MiB/arquivo,64MiB total de anexos,96MiB pacote expandido. Sem filesystem/temporários. Perfil informa restauração pendente até evidência real. Rota POST /api/export recebe multipart draft(JSON), anexos em file:<id>; retorna bytes ou {issues} com HTTP422.

POST /api/import: multipart files + profile (docx-topicos-v1/docx-semanal-v1), provider (offline/openai/gemini), apiKey/model opcionais. Aceita DOCX/PDF/TXT e complementos com limite publicado; retorna {ok:true,draft,assets:[{id,name,mediaType,base64}],sources:[{id,name,mediaType,base64}],issues,preview,provenance} ou {ok:false,issues,preview?}. Importação é proposta revisável; não altera o projeto anterior em falha. Offline interpreta somente perfis delimitados, nunca substitui documento arbitrário por exemplo. PDF escaneado exige diagnóstico. Conteúdo extraído é exibido por componentes seguros, sem HTML ativo.

POST /api/interpret: JSON {text,profile,provider,apiKey?,model?}, mesma validação/resultados da importação. Chaves só em memória, omitidas dos logs/arquivos/projetos. Adapters reais testados com HTTP simulado; avaliação real depende de chave/orçamento. Nenhuma troca automática de provider.

Projeto portátil .moodleai: ZIP com manifest versionado, draft, presets/fontes/anexos e SHA256. Validar paths/versão/quantidade/tamanho/hashes antes de substituir estado. IndexedDB salva atomicamente com revisão esperada e bytes; conflito de outra aba não sobrescreve. UI diferencia salvo no navegador de cópia portátil. WebMCP opcional reutiliza comandos por ID/expectedRevision e propostas explícitas, com fallback manual.

## Aceites do candidato local

| ID | Evidência exigida |
| --- | --- |
| F1 | Instalação limpa/typecheck/lint/testes/build; exemplo sem IA; ferramentas anteriores mantidas. |
| F2 | Editor cria/edita/reordena seis módulos e três questões, múltiplas por seção, metadados/datas/notas/anexos/conteúdo rico; validação leva ao campo e impede exportar erros. |
| F3 | Salvar/reabrir e portátil preservam bytes/presets/fontes/IDs; corrupção/limites/conflito preservam versão anterior. |
| F4 | Duas estruturas DOCX reconhecidas e texto/PDF suportado têm diagnóstico/preview/proposta; mídias e ocorrências preservadas. Dois providers reais e offline compartilham validação e falhas controladas. |
| F5 | MBZ preserva seis atividades da fixture inicial, seis módulos, três questões, notas/datas/arquivos/ocorrências; XMLs/referências/hashes e erros/cancelamento/concorrência testados. |
| F6 | Alunos e datas têm modelos próprios, revisão/prévia vinculada/CSV ou plano explícito, invalidação após edição e sem reenvio em montagem. Adaptadores reais ficam indisponíveis até laboratório validado. |
| F7 | UI testada no navegador: criar/importar/revisar/baixar, erros, teclado, 360px, temas e movimento reduzido; identidade existente preservada. WebMCP compartilha comandos e trata revisão obsoleta. |
| F8 | Dois revisores independentes inspecionam mesmo candidato; cópia/integridade no destino registrada. Capacidades sem restauração ou sem chamada real são declaradas sem afirmação de paridade comprovada. |

Laboratório/restauração são trabalho autorizado separado a tentar nesta execução. Daemon/versões/plugins e credenciais são dependências reais; falha ambiental não justifica paralisar desenvolvimento local nem declarar compatibilidade. Versão de referência 4.1.17+ /20250321 já informada. Licença/publicação permanecem decisão do mantenedor.
