# PRD da nova versão do assistente para Moodle

**Status:** execução inicial liberada em 12/10/2026; MVP e expansão em construção. **Data-base:** 11 de outubro de 2026. **Projeto:** Moodle-AI, nome provisório.

## Decisões da execução inicial — 12/10/2026

O mantenedor pediu para iniciar execução/criação e confirmou o Moodle-AI. A [spec V01](specs/V01-course-to-mbz.md) detalha contrato e aceites; os [tickets locais](tickets/README.md) organizam o trabalho. V01-01 entrega validação/diagnósticos por CLI, seguida de exportação, laboratório e restauração. Editor e importação permanecem entregas seguintes; o bootstrap não conclui o MVP.

O primeiro contrato cobre fórum, tarefa e quiz de múltipla escolha; tipos adicionais são capacidades futuras explícitas. A persistência de projetos foi escolhida somente no navegador, com cópia portátil completa incluindo bytes e presets na versão completa. O primeiro MVP é a jornada V01–V07; [o plano ampliado](BUILDER_PIPELINE_PLAN.md) conserva imagens incorporadas, seis módulos, três tipos de questão, dois provedores reais, WebMCP, cadastro e datas como entregas da versão completa. Fora da primeira demonstração não significa removido do projeto.

Prazo, licença, hospedagem, orçamento real de IA e laboratório fixado continuam pendentes nas etapas correspondentes; não bloqueiam o bootstrap sem IA. A referência Moodle 4.1.17+ / build 20250321 já foi informada e não é prova de compatibilidade do novo exportador.

A nova aplicação ajudará professores e equipes pedagógicas a transformar um planejamento de disciplina em um curso Moodle revisado. O fluxo do MVP será importar um documento DOCX estruturado ou criar a disciplina manualmente, conferir e editar aulas e atividades, resolver pendências e baixar um pacote de backup Moodle `.mbz`.

A aplicação será voltada ao Moodle, com linguagem e modelo de dados próprios do domínio educacional. A generalidade será demonstrada com dois exemplos de planejamento de estruturas documentais distintas: um organizado por tópicos e outro por semanas, dentro dos formatos e da versão Moodle efetivamente testados.

## Problema e oportunidade

O planejamento pedagógico e a configuração de uma disciplina no Moodle são representações diferentes do mesmo trabalho. Transferir títulos, descrições, aulas, questões, anexos, datas e avaliação para a plataforma exige repetição e conferência. Uma interpretação incorreta pode produzir um curso que parece completo, mas contém atividades ausentes, arquivos associados à aula errada ou configuração de avaliação divergente.

A proposta é reduzir essa transferência manual mantendo o professor no controle do conteúdo. A IA organiza a entrada; regras de código validam a estrutura; a pessoa revisa e decide; o gerador produz o pacote. A aplicação não tratará texto extraído como conteúdo automaticamente aprovado.

## Público e contexto

| Usuário | Trabalho que precisa concluir | Necessidade principal |
| --- | --- | --- |
| Professor | Preparar ou corrigir a estrutura de sua disciplina. | Editar aulas e atividades com linguagem pedagógica, sem escrever JSON. |
| Equipe pedagógica | Conferir organização, cronograma e avaliação antes da implantação. | Encontrar pendências e verificar o conjunto da disciplina. |

O participante desenvolverá o projeto individualmente, usando subagentes para tarefas delimitadas e revisão. O prazo e as regras do hackathon ainda precisam ser incorporados ao planejamento de execução. O MVP prioriza uma jornada completa demonstrável.

## Objetivos

- Converter um planejamento suportado em uma disciplina editável, com aulas, atividades e avaliação coerentes.
- Permitir criação manual e correção de toda a estrutura contemplada no MVP.
- Mostrar pendências concretas antes da geração do pacote e levar o usuário ao campo que precisa de atenção.
- Produzir um `.mbz` que possa ser restaurado no ambiente Moodle de teste, com evidência do conteúdo preservado.
- Demonstrar o mesmo fluxo com um planejamento por tópicos e outro semanal, preservando suas diferenças de organização.

A hipótese de valor é reduzir tempo de preparação e retrabalho. A economia ainda será medida; nenhuma porcentagem ou quantidade de horas é uma promessa do produto nesta etapa.

## Escopo do MVP

O MVP contempla informações básicas da disciplina, aulas ou unidades ordenadas, fóruns, tarefas, quizzes, arquivos de tarefas, datas e categorias de avaliação. Os tipos de questão contemplados serão declarados no contrato de entrada e cobertos pelas fixtures de demonstração. A versão inicial não apresentará tipos adicionais como suportados apenas porque o gerador antigo contém código para eles.

A importação aceitará DOCX estruturado segundo um perfil base documentado, com campos mínimos e relações entre disciplina, unidades, atividades e avaliação. O reconhecimento de organização por tópicos e por semanas será validado com exemplos de estruturas documentais distintas. Um exemplo orientará o usuário sobre o formato esperado. Um documento fora do perfil suportado poderá resultar em uma mensagem de incompatibilidade ou em pendências que exijam correção, sem anunciar suporte a qualquer DOCX.

Predefinições pedagógicas personalizáveis poderão inicializar a organização das unidades e as configurações de atividades e avaliação. Elas serão opcionais e usarão o mesmo contrato da disciplina. Aplicar uma predefinição será uma ação explícita; a aplicação não substituirá silenciosamente conteúdo já importado ou revisado.

A criação manual alimentará o mesmo modelo canônico usado pela importação. Esse modelo será a representação única da disciplina: uma aula contém uma coleção de atividades, e cada atividade tem seu tipo e uma identidade estável. Visualização, edição, validação e exportação consumirão essa mesma estrutura. Várias atividades do mesmo tipo deverão continuar visíveis e exportáveis.

### Fora da primeira demonstração

- Cadastro em lote de alunos, matrícula e envio de CSV ao Moodle.
- Alteração de datas de cursos já publicados e outras operações sobre turmas em produção.
- Publicação automática do curso ou login administrativo no Moodle.
- Portal do aluno, acompanhamento de aprendizagem ou substituição do Moodle.
- Colaboração em tempo real, organizações com permissões próprias ou cobrança.
- Compatibilidade universal com documentos, idiomas, plugins ou versões Moodle.
- Geração automática de uma disciplina inteira sem revisão humana.

As ferramentas de alunos e datas do projeto antigo ficam como referências para futuras entregas, sem integrar o caminho principal do MVP.

## Jornada proposta

1. **Começar:** escolher importar planejamento, criar manualmente ou explorar um exemplo.
2. **Preparar a entrada:** selecionar o DOCX suportado e complementos ou preencher os dados iniciais da disciplina.
3. **Interpretar:** mostrar o estado de processamento e permitir recuperação em caso de falha. Conteúdo ausente não será inventado para completar a estrutura.
4. **Editar:** navegar pelas aulas e modificar informações, atividades, questões, datas, arquivos e avaliação.
5. **Conferir:** revisar a disciplina e resolver pendências bloqueantes. Avisos terão motivo e consequência visíveis.
6. **Exportar:** gerar e baixar o `.mbz`, conferir o resumo e seguir as instruções de restauração no Moodle de teste.

## Requisitos e critérios de aceite

Todos os requisitos abaixo pertencem ao MVP proposto. O aceite verifica comportamento observável; detalhes de implementação serão definidos na arquitetura e no plano de execução.

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| R01 | Importar DOCX estruturado. | A fixture A, por tópicos, e a fixture B, semanal, chegam ao editor com os dados previstos e a organização preservada. Tipo de arquivo inválido ou estrutura não interpretável recebe mensagem útil, sem curso silenciosamente vazio. |
| R02 | Criar disciplina manualmente. | Uma pessoa cria informações básicas, aulas e atividades e chega à exportação sem chamada a um provedor de IA. |
| R03 | Usar um modelo canônico validado. | Importação e criação manual produzem o mesmo contrato. Dados incompatíveis são rejeitados ou convertidos em pendências antes de chegar aos componentes. |
| R04 | Editar visualmente a disciplina. | Nome e demais metadados contemplados, títulos, descrições, aulas, atividades, datas, questões e avaliação podem ser corrigidos sem editar JSON. |
| R05 | Preservar várias atividades por aula. | Uma fixture com dois quizzes, duas tarefas e dois fóruns na mesma aula mantém todas as atividades, contagens e configurações no editor, na conferência e no pacote restaurado. |
| R06 | Associar arquivos reais às tarefas. | O usuário vê o destino de cada arquivo, pode corrigir a associação e o conteúdo do arquivo aparece na tarefa após restauração. Um nome de arquivo sem conteúdo não conta como anexo válido. |
| R07 | Validar a estrutura e as regras do MVP. | Campos obrigatórios, ordem de datas, configuração de questões, referências de anexos e categorias de notas têm regras determinísticas documentadas. Um erro indica sua localização e como corrigi-lo. |
| R08 | Separar erros bloqueantes de avisos. | A geração fica indisponível enquanto houver erro que impeça um pacote válido. Avisos continuam visíveis na conferência e não são apresentados como conteúdo já verificado. |
| R09 | Manter avaliação consistente. | Categorias, pesos e vínculo das atividades exibidos no editor correspondem ao conteúdo restaurado. A normalização usa uma regra compartilhada entre as etapas. |
| R10 | Gerar e entregar o pacote. | O pacote possui resumo de aulas, atividades e arquivos; o download tem ação explícita. Após gerar, a pessoa consegue continuar editando e obter uma nova exportação. |
| R11 | Declarar compatibilidade e restauração. | A entrega informa a versão Moodle testada e instruções para o modo de restauração validado. O aceite registra ambiente, versão, opções e resultado com as duas fixtures. |
| R12 | Tratar falhas de interpretação e geração. | Falha de rede, resposta inválida da IA e erro do gerador resultam em mensagem compreensível e nova tentativa. Uma falha de exportação mantém o planejamento em edição. |
| R13 | Oferecer uma demonstração previsível. | As duas fixtures e seus resultados esperados permitem executar a jornada; ao menos o caminho manual ou um exemplo já estruturado funciona sem depender da disponibilidade do provedor de IA. |
| R14 | Permitir uso por teclado e em tela pequena. | A jornada principal pode ser concluída por teclado, com foco visível e rótulos de campos. Navegação, mensagens e ações de edição e exportação permanecem acessíveis em largura de 360 px. |
| R15 | Usar predefinições pedagógicas personalizáveis. | O usuário pode adaptar uma predefinição para tópicos ou semanas e suas configurações iniciais de atividades e avaliação. A aplicação mantém o contrato canônico, permite edição posterior e não exige uma predefinição para criar manualmente. |

### Informações a conferir

A lista exata de campos obrigatórios e os limites de arquivo serão definidos a partir do perfil base e das fixtures antes da implementação da importação. Campos adicionais de uma predefinição pedagógica não se tornarão obrigatórios para todas as disciplinas. Os limites publicados na interface deverão corresponder aos limites reais do backend e da hospedagem escolhida.

Valores retornados pela IA passarão por validação de contrato. Parsing de JSON bem sucedido, sozinho, não será evidência de que a disciplina está pronta para gerar. Quando uma informação não puder ser extraída, a aplicação mostrará o campo ausente e permitirá preenchimento manual.

## Direção de design proposta

A interface será um espaço de trabalho para planejamento pedagógico. A hierarquia principal será disciplina, aula e atividade; o usuário verá o que está preparando e o que falta conferir. Rótulos serão escritos em português de uso comum. Termos de arquivo e Moodle aparecerão onde ajudam uma decisão, com explicação breve quando necessário.

No desktop, uma direção a prototipar é ter a lista de aulas ao lado do conteúdo editável e um painel de pendências. Em tela pequena, a mesma tarefa seguirá uma sequência linear com navegação recolhível. A conferência mostrará o conjunto da disciplina, cronograma, avaliação e destino dos arquivos.

A identidade será própria do produto, com boa leitura, estados claros e cores consistentes para atividades e mensagens. Tipografia, paleta, componentes, disposição definitiva e interações serão avaliados no protótipo com a skill frontend-design antes de virarem decisões de implementação.

Busca, conta, indicadores de progresso e outros controles só aparecerão como ações quando tiverem comportamento real. O avanço seguirá estados efetivos do processamento; porcentagens fictícias e mensagens de sucesso sem resultado verificável não serão usadas.

## Diferenças em relação ao projeto de referência

| Projeto antigo | Nova versão proposta |
| --- | --- |
| Importação centrada em um formato específico de planejamento DOCX. | Perfil base delimitado, com documentos por tópicos e por semanas demonstrados e predefinições pedagógicas personalizáveis. |
| Revisão geral depende de JSON para várias correções. | Edição visual completa do conteúdo contemplado no MVP. |
| Builder pode emitir campos singulares ou arrays, enquanto a revisão lê campos singulares. | Coleção de atividades consistente em todas as etapas. |
| Arquivos escolhidos no builder são reduzidos a nome e tamanho. | Gestão de anexos reais e associação verificável com a atividade de destino. |
| Geração liberada na revisão quando o JSON é parseável. | Validação de contrato e domínio antes da geração. |
| Gerador, alunos e datas são três áreas do mesmo produto. | Uma jornada central de preparação da disciplina para a primeira demonstração. |
| Conclusão informa download automático e oferece reinício. | Entrega explícita, resumo, continuidade de edição e instrução de restauração. |

Referências para esses comportamentos: [fluxo principal](../../CourseGen-AI/ui/app/page.tsx), [builder manual](../../CourseGen-AI/ui/app/components/BuilderStep.tsx), [revisão](../../CourseGen-AI/ui/app/components/ReviewStep.tsx), [conclusão](../../CourseGen-AI/ui/app/components/DoneStep.tsx) e [instruções do projeto antigo](../../CourseGen-AI/AGENTS.md). O projeto antigo será usado como base de conhecimento e referência técnica; esta proposta pertence à nova pasta Moodle-AI.

## Evidência para a demonstração

A fixture A será um planejamento por tópicos, com unidades apresentadas em seções do documento e atividades agrupadas por tema. A fixture B será um planejamento semanal, com cronograma em tabela, períodos e atividades distribuídos por semana. Ambas terão conteúdo fictício e resultados esperados definidos. A diferença incluirá estrutura documental, organização e distribuição das atividades; trocar nomes em um mesmo arquivo não será suficiente.

O conjunto deverá cobrir aulas com múltiplas atividades do mesmo tipo, questões, arquivo de tarefa, categorias de notas e uma pendência que possa ser corrigida pelo editor. Para cada fixture, o aceite comparará entrada esperada, estrutura conferida e curso restaurado. Isso comprova generalidade nesses dois casos, sem demonstrar suporte universal.

A restauração acontecerá em um Moodle de teste e em um curso novo e vazio, usando as opções validadas para o pacote. A versão exata e os tipos de questão suportados serão registrados antes de anunciar compatibilidade. O README antigo e o AGENTS relatam uma referência Moodle 4.1; esse histórico orienta a investigação, mas não substitui o aceite da nova versão.

## Métricas a medir

| Métrica | Como medir | Situação inicial |
| --- | --- | --- |
| Tempo até uma disciplina restaurada e conferida. | Cronometrar o mesmo exemplo pelo fluxo manual no Moodle e pelo novo produto, incluindo correções. | Sem linha de base; medir antes de apresentar economia. |
| Correções necessárias após interpretação. | Contar campos e atividades corrigidos e registrar a causa, separando os resultados dos planejamentos por tópicos e semanal. | Definir o conjunto de avaliação com as fixtures A e B. |
| Fidelidade da exportação. | Comparar unidades, atividades, questões, anexos, cronograma e avaliação com o resultado esperado após restauração de cada fixture. | Aceite exige ausência de perdas em ambos os exemplos suportados. |
| Conclusão da jornada sem ajuda. | Observar professor ou integrante de equipe pedagógica executar a tarefa e registrar bloqueios. | Validar acesso a participantes e quantidade possível. |
| Recuperação de falhas. | Executar cenários definidos de falha e verificar preservação da edição e possibilidade de tentar novamente. | Cobertura prevista nos critérios de aceite. |

Metas comerciais, custo por disciplina e desempenho em documentos grandes serão definidos após as primeiras medições. Os exemplos de teste não devem ser apresentados como resultados de uso real por professores.

## Riscos e tratamento

| Risco | Consequência | Tratamento proposto |
| --- | --- | --- |
| Variação de documentos e interpretação da IA. | Estrutura incompleta ou conteúdo incorreto. | Perfil base delimitado, contrato validado, exemplos esperados e revisão humana. |
| Divergência entre editor, validação e exportador. | A conferência mostra um curso diferente do pacote. | Modelo canônico, regras compartilhadas e aceite por restauração. |
| Anexos associados por nome ambíguo. | Arquivo na atividade errada. | Mostrar a associação e exigir destino resolvido antes de gerar. |
| Compatibilidade Moodle assumida. | Pacote gerado que não restaura como esperado. | Registrar a versão alvo e executar restauração real das fixtures. |
| Indisponibilidade ou custo do provedor de IA. | Importação interrompida durante a demonstração. | Criação manual e exemplo estruturado disponíveis; medir custo antes de projetar escala. |
| Dados pessoais em documentos. | Exposição ao compartilhar exemplos ou enviar conteúdo ao provedor. | Fixtures fictícias ou anonimizadas; informar no fluxo quando houver processamento externo. |
| Escopo maior que a capacidade de execução individual. | Jornada incompleta na apresentação. | Concentrar trabalho no fluxo até MBZ; reavaliar entregas quando prazo e regras forem conhecidos. |

## Decisões para iniciar a implementação

O público confirmado é professor e equipe pedagógica; preparar disciplinas para Moodle é o escopo do produto. O novo projeto terá pasta própria. Nome definitivo, identidade visual, campos do perfil base, opções das predefinições pedagógicas, versão Moodle alvo, tipos de questão, limites de arquivo, hospedagem e prazo permanecem decisões a fechar.

A primeira entrega será o protótipo da jornada e o contrato da disciplina, acompanhados das duas fixtures. A implementação do MVP será considerada concluída quando os requisitos de aceite passarem e os dois exemplos puderem ser restaurados e conferidos no ambiente registrado. Funcionalidades futuras serão planejadas depois desse resultado.
