# Pipeline de desenvolvimento do Moodle AI

**Estado atual: planejamento.** A implementação da aplicação não está liberada. A orientação do usuário é fechar o pipeline antes de iniciar código. O HTML existente é uma referência visual; sua revisão no navegador e aprovação ainda estão pendentes.

Este documento é a visão de entrada do processo. [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) define responsabilidades e verificações; [AGENT_LOOP.md](AGENT_LOOP.md) descreve o registro de tarefas e suas transições. A [skill local project-loop](../.agents/skills/project-loop/SKILL.md) orienta a coordenação pelo host, sem executar agentes automaticamente.

## Preparação antes de desenvolver

| Etapa | Trabalho e skills | Artefato para revisar | Condição para avançar |
| --- | --- | --- | --- |
| 1. Configurar o processo | `setup-matt-pocock-skills`: escolher acompanhamento de tarefas e localização dos documentos de domínio. | `docs/agents/issue-tracker.md` e `docs/agents/domain.md`, conforme o fluxo da skill. | Configuração apresentada ao usuário e confirmada. Nenhum tracker externo é criado por inferência. |
| 2. Fechar produto | `grill-with-docs` e `domain-modeling`: resolver decisões que mudam escopo, linguagem e comportamento. | PRD revisado, glossário e decisões registradas. | Público, duas estruturas DOCX, compatibilidade Moodle e limites do MVP definidos. |
| 3. Especificar a primeira entrega | `to-spec` e `codebase-design`: definir comportamento observável, interfaces públicas, falhas e alternativas. | Especificação da primeira fatia e ADRs pertinentes. | Contratos compartilhados e pontos de teste apresentados e acordados. |
| 4. Aprovar a direção visual | `frontend-design`: avaliar o catálogo e a jornada de edição. | `design-system.html` e `DESIGN_BRIEF.md`. | Decisões de design registradas; notas no HTML são locais, sem envio automático ao chat. |
| 5. Dividir o trabalho | `to-tickets`: derivar entregas pequenas demonstráveis. | Tickets no acompanhamento escolhido e contratos de tarefa. | Aceites, dependências, verificações e responsável por cada caminho definidos. |
| 6. Autorizar a primeira execução | Integrador apresenta a tarefa pronta e suas decisões. | Contrato da fatia selecionada, sem checks fictícios. | Usuário libera o início da implementação. A instrução atual mantém esta etapa pendente. |

As skills já estão instaladas. Esses workflows de preparação ainda não foram executados integralmente. Os documentos atuais são propostas; nomes e datas de arquivos não constituem aprovação.

```mermaid
flowchart TD
    P[Configurar processo e fechar produto] --> S[Especificação, contratos e arquitetura]
    S --> V[Revisar direção visual]
    V --> T[Tickets e dependências]
    T --> H{Usuário liberou implementação?}
    H -->|Ainda não| PEND[Manter planejamento]
    H -->|Sim| C[Guardião prepara contexto da tarefa]
    C --> O[Integrador delimita responsáveis e arquivos]
    O --> E[Executor implementa uma fatia]
    E --> K[Verificar candidato identificado]
    K -->|Passou| R[Revisão independente de especificação e qualidade]
    K -->|Falhou| F{Corrigir ou replanejar}
    R --> D{Aceites e qualidade satisfeitos?}
    D -->|Não| F
    F -->|Até duas correções| E
    F -->|Limite ou contrato inválido| C
    D -->|Sim| I[Integrar o candidato e registrar evidências]
    I --> N[Selecionar próxima tarefa pronta]
    N --> C
```

## Contrato de cada tarefa

Antes de delegar, o integrador registra:

- Objetivo demonstrável, requisitos de origem e exclusões.
- Contexto com arquivos, decisões, dúvidas e estado do CodeGraph.
- Entradas, saídas, invariantes e erros da interface compartilhada.
- Dependências satisfeitas e um responsável de escrita por caminho.
- Aceites observáveis e verificações adequadas à mudança.
- Revisão do candidato: commit quando disponível ou digest de um snapshot dos arquivos.
- Dois relatórios separados, de especificação e qualidade, ligados ao mesmo candidato.
- Até duas correções por tarefa; diagnóstico e replanejamento quando o limite é atingido.

O registro segue [o template local](../.agents/skills/project-loop/assets/task.json). O helper valida campos e transições; o integrador confere as evidências reais. Ele não comprova que um comando passou, que dependências foram satisfeitas ou que os arquivos de fato respeitaram a propriedade registrada.

## Papéis e capacidade

O agente principal integra. O guardião reúne contexto; executores entregam tarefas prontas; revisores avaliam sem alterar o candidato. Há até três subagentes simultâneos nesta sessão. Papéis são atribuídos conforme a tarefa, sem manter cinco agentes permanentes.

Revisão de especificação verifica cada aceite. Revisão de qualidade verifica contratos, erros, limites entre módulos e testes. O executor não aprova sua própria entrega. Os dois relatórios precisam de contextos separados; podem ocorrer em sequência para respeitar a capacidade disponível.

Mudar o candidato invalida checks e aprovações ligados ao conteúdo anterior. Integrar não significa publicar, fazer deploy ou operar Moodle real.

## Verificações por entrega

| Entrega | Evidência necessária |
| --- | --- |
| Planejamento e documentação | Coerência de requisitos, links, diagramas, decisões e limites. Não criar testes artificiais para texto. |
| Domínio e exportação | TDD nas interfaces públicas acordadas; casos independentes da implementação e referências XML válidas. |
| API, IA e anexos | Contratos com serviço simulado, entradas inválidas, limites, timeout e limpeza em falha parcial. |
| Interface | Navegador: edição, erros, teclado e tela estreita; checks de código aplicáveis à fatia. |
| Integração da aplicação | Typecheck, lint, testes relevantes e build, depois de definidos na inicialização do app. |
| Liberação pública | Gates S01–S04 do backlog e restauração dos dois exemplos no Moodle de teste registrado. |

A futura automação de CI repetirá os checks definidos para a aplicação. Ainda não há pipeline de CI nem scripts de build/typecheck/lint do app. A aprovação do plano vem antes de criar essa implementação.

## CodeGraph e fontes de contexto

CodeGraph MCP 1.6.2 foi instalado e seu servidor foi testado diretamente. O Codex desta sessão ainda não expõe a ferramenta; a configuração local precisa ser carregada num projeto confiável. A CLI local atende consultas quando houver código indexado. Detalhes e evidências estão em [SKILLS_AND_MCP.md](SKILLS_AND_MCP.md).

O índice inicial não possui símbolos da aplicação. O guardião lê o PRD e os ADRs para intenção do produto e usa o grafo para estrutura do código existente. Resultados vazios ou desatualizados pedem inspeção local e registro da limitação. Compatibilidade Moodle depende de restauração testada.

## Próxima decisão

A proposta é acompanhar este início com arquivos Markdown locais e um único glossário de domínio. Essa escolha ainda precisa ser confirmada no fluxo de `setup-matt-pocock-skills`. Em seguida, revisar as dúvidas do PRD e selecionar o comportamento mínimo da primeira fatia. Até a liberação explícita do usuário, agentes trabalham somente no planejamento e na revisão dos artefatos existentes.
