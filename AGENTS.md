# Moodle AI

Nova aplicação genérica de preparação de cursos Moodle. Leia `docs/PRD.md` para comportamento, `docs/ARCHITECTURE.md` para modelo e decisões e `docs/BACKLOG.md` para a entrega em execução. A pasta `../CourseGen-AI` é referência; não a altere como parte deste projeto.

Estado atual: planejamento do pipeline. O usuário pediu para não iniciar código da aplicação. Leia `docs/PIPELINE.md`; não crie scaffold nem implemente funcionalidades até nova liberação explícita. Revisão dos artefatos existentes e planejamento podem avançar.

## Regras de implementação

- Use um contrato versionado de curso, com seções e coleções de atividades. Edição, revisão, validação e exportação consomem o mesmo contrato.
- Mantenha IDs estáveis por seção, atividade e anexo. Reordenar conteúdo não muda a associação de arquivos.
- Separe perfil de importação, preset pedagógico e perfil de compatibilidade Moodle. Convenções específicas de um documento não pertencem ao comportamento genérico.
- Valide entradas HTTP, dados importados e respostas da IA em runtime. JSON parseável e casts TypeScript não comprovam um curso válido.
- O cliente envia referências de anexos. Caminhos físicos, credenciais e recursos do filesystem pertencem ao servidor.
- Não descarte atividades não suportadas. Retorne problema localizado e bloqueie a exportação dessa combinação.
- Prefira módulos com interfaces pequenas que concentrem comportamento e erros. Introduza abstração quando houver variação concreta, como IA real/simulada e armazenamento de arquivos.
- Preserve builders XML puros, referências Moodle consistentes e limpeza de cada recurso temporário criado, inclusive em falha parcial.
- Não registre chaves, conteúdo pessoal ou documentos completos nos logs. Use exemplos fictícios nos testes e na demonstração.

## Trabalho em paralelo

O integrador define contrato e arquivos de responsabilidade antes de delegar. Cada agente entrega uma fatia com comportamento e aceites definidos; não crie contratos concorrentes nem altere arquivos de outro agente sem coordenação. Leia `docs/AGENT_WORKFLOW.md`.

Para executar uma pipeline com guardião, orquestrador, executores e revisão independente, use a skill local `.agents/skills/project-loop/SKILL.md` e leia `docs/AGENT_LOOP.md`. Seu helper registra estado e exige evidências; o host executa os agentes. Leia o roteamento da skill para combinar Matt Pocock, `frontend-design` e Impeccable opcional sem criar direções visuais concorrentes.

As skills locais estão em `.agents/skills`; fontes, papéis e estado do MCP estão em `docs/SKILLS_AND_MCP.md`. Leia a skill correspondente antes de aplicá-la. Instalação não comprova execução do workflow; respeite os gatilhos de invocação de cada skill.

## Verificação

Teste comportamento nas interfaces públicas. Use TDD para regras de domínio, contratos críticos e exportação; não escreva testes que apenas repetem a implementação. Mudança XML pede regressão das referências afetadas. Alterações de UI pedem verificação no navegador, incluindo erro, teclado e tela estreita.

Os scripts de typecheck, lint, teste e build serão definidos na inicialização da aplicação. Execute os checks relevantes e registre os resultados reais. Não declare compatibilidade Moodle sem restauração no ambiente de teste documentado. Operações sobre cursos publicados e usuários reais ficam fora do primeiro MVP.

## Entrega

Informe comportamento final, arquivos alterados, validação e limitações. Não publique, crie issues externas, instale ferramentas globais ou faça operações sobre Moodle real por inferência de uma tarefa local. Não inclua dados de usuários, `.env`, backups ou chaves no controle de versão.

<!-- CODEGRAPH_START -->
## CodeGraph

CodeGraph 1.6.2 está instalado localmente. Use `codegraph_explore`, quando o MCP estiver conectado, para símbolos, dependências e impacto antes de mudanças abrangentes. Passe a raiz correta em `projectPath` quando houver mais de um projeto.

Para usar a instalação local pela CLI: `npm exec --offline -- codegraph explore "<símbolo ou pergunta>"`. Confira `npm run codegraph:status` e os avisos de atualidade. O servidor MCP acompanha mudanças enquanto está em execução; fora da sessão, use `npm exec --offline -- codegraph sync` antes de consultar mudanças recentes.

Sem índice ou sem resultados, use inspeção local e registre a limitação. Documentação e diagramas de arquitetura continuam sendo lidos diretamente. Não invente símbolos nem trate o grafo como comprovação de correção do código.
<!-- CODEGRAPH_END -->
