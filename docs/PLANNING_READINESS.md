# Prontidão do planejamento

**Atualização de 12/10/2026. Estado: execução inicial liberada.** A auditoria abaixo permanece útil para o MVP; pendências posteriores não bloqueiam o bootstrap sem IA.

O projeto tem produto, arquitetura, backlog, processo de agentes e direção visual. O mantenedor liberou o início e confirmou o Moodle-AI. A [spec V01](specs/V01-course-to-mbz.md), o [tracker local](agents/issue-tracker.md), o [domínio](agents/domain.md) e os [tickets](tickets/README.md) fecham a preparação do bootstrap. O [registro V01-01](tasks/V01-01.json) informa checks/revisões e estado real; MBZ, laboratório e editor continuam tarefas próprias.

## O que já existe

| Tema | Evidência disponível | Limite da evidência |
| --- | --- | --- |
| Produto genérico para Moodle e novo projeto | [PRD](PRD.md) e [AGENTS.md](../AGENTS.md): professores/equipes pedagógicas, pasta própria e referência separada. | Nome final, prazo do hackathon e escopo de apresentação ainda pendentes. |
| Jornada do MVP | [PRD](PRD.md), [BACKLOG.md](BACKLOG.md) e [mapa de telas](SCREEN_FLOW.md): DOCX ou criação manual → revisão/edição → validação → MBZ. | A demo local não interpreta documentos, edita todo o curso ou exporta MBZ. |
| Modelo e arquitetura | [ARCHITECTURE.md](ARCHITECTURE.md) e [spec V01](specs/V01-course-to-mbz.md): contrato inicial fechado e validação pura por CLI. | Schema/validação não comprovam bytes dos anexos, XML, sanitização HTML ou restauração. Os demais ADRs são direções do MVP. |
| Sequência e aceites | [BACKLOG.md](BACKLOG.md): V01–V07, gates S01–S04 e F01–F03 futuros. | Não há estimativa confiável sem prazo, capacidades e ambiente fechados. |
| Processo com subagentes | [PIPELINE.md](PIPELINE.md), [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md), [AGENT_LOOP.md](AGENT_LOOP.md) e [registro V01-01](tasks/V01-01.json). | Loop local, tracker, spec e tickets preparados; workflows upstream não são apresentados como executados. |
| Skills e CodeGraph | [SKILLS_AND_MCP.md](SKILLS_AND_MCP.md): skills locais, descoberta corrigida e CLI CodeGraph instalada. | Instalação não comprova execução de todos os workflows; MCP não exposto nesta sessão. CLI e leitura local continuam úteis. |
| Ambiente Moodle de referência | [Registro técnico recebido](MOODLE_REFERENCE_PLUGIN_INVENTORY.json): Moodle **4.1.17+**, build **20250321**, código de versão **2022112817.01**, origem `user_provided_notifications`; captura de 12/10/2026 com inventário de plugins. | A versão de referência já foi fornecida. Ainda falta escolher o alvo do MVP, determinar quais plugins/capacidades são necessários e reproduzir o laboratório. A captura não comprova restauração nem compatibilidade do novo exportador. |
| Design e caminhos locais | [DESIGN_BRIEF.md](DESIGN_BRIEF.md), [catálogo](../design-system.html), [prévia](design-proposals/glass-owl-v4/index.html) e [quadro de telas](screen-flow.html). | Validação da UI existente não equivale a teste do editor futuro nem a pesquisa com professores. |
| Cadastro em lote | [STUDENTS_DESIGN_REVIEW.md](STUDENTS_DESIGN_REVIEW.md): planilha → revisão de exemplo → CSV local por curso. | F01 e F03 reais continuam fora do primeiro MVP. O modal de envio apenas explica as etapas. |
| Visão ampliada do builder | [BUILDER_PIPELINE_PLAN.md](BUILDER_PIPELINE_PLAN.md) e PRD/backlog atualizados: portabilidade, provedores adicionais, WebMCP e paridade permanecem na versão completa. | Separação de escopo registrada; settings e fixtures das capacidades ampliadas dependem das specs de cada etapa. |

## Cinco gates para organizar o próximo trabalho

As sugestões abaixo são pontos de partida para discussão, não decisões aprovadas. Uma resposta já registrada pelo mantenedor em outra conversa deve ser incorporada com origem e data, evitando perguntar novamente.

| Ordem | Gate | Decisão ou artefato necessário | Sugestão inicial delimitada | Quando exige conclusão |
| --- | --- | --- | --- | --- |
| G01 | Objetivo e fronteira da entrega | Início autorizado e MVP/versão completa separados. Data/duração, regulamento e avaliação continuam pendentes. | V01–V07 como primeira jornada; expansão preservada. Reservar tempo para restauração e apresentação quando prazo for conhecido. | Prazo antes de estimativa; autorização de início já satisfeita. |
| G02 | Alvo Moodle e capacidades | Usar a referência já capturada **4.1.17+ / build 20250321** para decidir o alvo do MVP; selecionar formato de curso, módulos, plugins e tipos de questão necessários no inventário recebido; preparar laboratório reproduzível e modo de restauração. | Começar por um alvo e capacidades testáveis: fórum, tarefa e quiz. Fechar o primeiro tipo de questão com a fixture; ampliar após o aceite. Não solicitar novamente a versão fornecida nem tratar a captura do ambiente como teste do exportador. | Alvo e capacidades antes de fechar schema/exportador; restauração antes de afirmar compatibilidade. |
| G03 | Entrada e expectativas independentes | Perfil DOCX por tópicos e semanal, campos mínimos, tratamento de tabelas, leitura a partir de trecho, complementos/anexos e limites. Dois documentos representativos com conteúdo fictício ou anonimizado e resultados esperados escritos antes da implementação. | Usar dois documentos realmente diferentes, ao menos um com duas tarefas, dois quizzes e dois fóruns na mesma seção. Delimitar formatos e limites numéricos após analisar os exemplos e a hospedagem. | Antes de implementar importação e anunciar suporte. |
| G04 | Execução, IA e retenção | Provedor/modelo inicial, política de credenciais, custo máximo por operação e orçamento de demonstração, tempo/cancelamento, hospedagem e recursos temporários. Especificar persistência do rascunho e dos bytes dos anexos. | Fake determinístico e caminho manual para repetibilidade. Uma integração real isolada inicialmente; segunda integração conforme o escopo conciliado. Credenciais no servidor, retenção transitória explícita e projetos locais conforme a decisão final registrada. | Antes de integração real/hospedagem pública; o fake permite a primeira fatia local. |
| G05 | Primeira fatia pronta para agentes | Tracker/domínio locais, spec V01-01 e contrato fixados; propriedade/checks/revisões registrados no task JSON. | Bootstrap valida rascunhos e prepara o restante V01; MBZ e laboratório possuem tickets dependentes próprios. | Satisfeito para V01-01; próxima fatia fecha seu contrato antes de delegar. |

O limite de arquivo precisa ser o mesmo na interface e no backend. Tipo de questão, imagens incorporadas, organização semanal e regras de notas não entram como suporte apenas por existirem no código de referência. Se uma capacidade ficar para depois, atualizar o PRD, backlog, perfil de compatibilidade e roteiro da demo para dizer a mesma coisa.

## Conciliação de escopo registrada e detalhes posteriores

Para este mapa e para a primeira entrega, a autoridade de escopo é [PRD](PRD.md) + [BACKLOG.md](BACKLOG.md) + [PIPELINE.md](PIPELINE.md). O [plano ampliado](BUILDER_PIPELINE_PLAN.md) registra uma visão de versão completa e decisões possivelmente originadas em outro contexto; ele próprio pede reconciliação antes da implementação.

| Diferença observada | Tratamento antes de implementar |
| --- | --- |
| MVP exclui alunos/datas reais; plano ampliado os inclui na versão completa. | Distinguir primeiro MVP de versão completa com dependências e aceite. Demo de alunos não muda F01/F03 automaticamente. |
| MVP delimita fórum/tarefa/quiz; expansão inclui seis módulos e mais recursos pedagógicos. | Publicar uma matriz por etapa e declarar tipos/configurações. Não usar “paridade” para prometer capacidades ainda sem fixture/restauração. |
| Backlog V03 trata draft JSON; expansão propõe cópia portátil com bytes e presets. | Definir o que V03 preserva, identificar anexos ausentes e decidir em qual etapa a cópia completa entra. |
| Arquitetura parte de um provedor real e fake; expansão exige dois reais e WebMCP. | Separar primeira demonstração e extensões. Ambos devem consumir o mesmo contrato e validação, sem novos modelos de curso. |
| A captura técnica registra 4.1.17+ e o inventário de plugins; a descrição antes obsoleta do plano ampliado foi atualizada nesta revisão. | Preservar a distinção entre ambiente informado, alvo escolhido, laboratório reproduzido e restauração comprovada. Não solicitar novamente a informação já recebida. |
| Vocabulário genérico convive com referências de perfil específico no plano ampliado. | Manter defaults genéricos e perfis específicos opcionais. Revisar a redação pública para descrever Moodle sem vincular a instituição. |

Os documentos não devem chamar proposta de “aprovada” sem registrar a decisão. A nova liberação de execução/criação pelo mantenedor revoga o bloqueio anterior; o bootstrap segue sua spec delimitada. Datas/licença/IA/laboratório permanecem decisões posteriores explícitas.

## O que falta comprovar antes de uma demonstração funcional

1. **Fidelidade:** duas fixtures percorrem o fluxo completo, com resultado esperado independente, múltiplas atividades e anexos preservados no Moodle restaurado. XML válido e download não bastam.
2. **Recuperação e revisão:** falhas de IA/geração preservam entrada e rascunho; cada erro leva ao campo; editar invalida a validação anterior. A demo de arquivos atual não exercita essas regras de curso.
3. **Operação previsível:** instalação limpa, fake sem chave, caminho manual, orçamento/limites reais e roteiro de contingência. Gates S01–S04 concluídos antes de disponibilização pública.
4. **Uso observado:** professor ou pessoa da equipe pedagógica executa tarefas realistas sem condução, incluindo erro e retorno; registrar bloqueios. A inspeção do agente serve como avaliação inicial, sem taxa de sucesso de usuários nem promessa de economia.

## Próxima entrega de execução

V01-01 inicia bootstrap/validação conforme a spec. A próxima fatia V01-02 fecha o contrato do exportador, adapta o core de referência e produz MBZ verificável. V01-03 resolve o ambiente do laboratório; V01-04 comprova restauração. Não é necessário solicitar novamente autorização para implementação local nem a versão Moodle já recebida.

O commit solicitado pelo usuário deve registrar o planejamento e o protótipo no estado verificado, sem segredos, arquivos pessoais ou artefatos de dependências. Ele marca um candidato revisável; não significa que o produto foi implementado, que o plano está integralmente aprovado ou que houve deploy.
