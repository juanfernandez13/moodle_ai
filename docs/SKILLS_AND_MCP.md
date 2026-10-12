# Skills e MCP do Moodle AI

O projeto tem 14 skills externas copiadas localmente para Codex: 13 de Matt Pocock e uma `frontend-design` do repositório Anthropic. CodeGraph 1.6.2 está instalado como dependência de desenvolvimento e configurado como MCP local. O servidor respondeu ao protocolo MCP em uma verificação direta do processo, mas a ferramenta ainda não está disponível nesta sessão Codex.

Skills orientam o processo do agente. MCP disponibiliza ferramentas executáveis. Instalação, configuração, conexão, indexação e uso são estados distintos; a presença dos arquivos não comprova a execução de uma skill nem a conexão do MCP ao chat.

## Descoberta no Codex corrigida — 12/10/2026

Este chat usa `C:/Users/juanp/Projetos/Moodle` como diretório de trabalho, enquanto as skills foram instaladas na subpasta `Moodle-AI/.agents/skills`. A descoberta local do Codex percorre o diretório atual e seus ancestrais aplicáveis, sem procurar skills automaticamente em todos os projetos filhos. [Documentação oficial](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills).

Foi criado um vínculo de diretório Windows (junction) de `Moodle/.agents/skills` para `Moodle/Moodle-AI/.agents/skills`. O conteúdo continua em um único lugar, dentro do novo projeto. Nenhuma skill global foi instalada ou atualizada nesta correção, e a referência `CourseGen-AI` não foi alterada.

Verificações reais: `npx.cmd --yes skills list --agent codex --json` listou as 14 skills externas e `project-loop`. Em seguida, o próprio Codex respondeu a `skills/list`, com `forceReload: true`, reconhecendo as 15 skills com `enabled: true` e `errors: []`, tanto para a raiz `Moodle` quanto para `Moodle-AI`. Essa consulta foi executada em um processo local de diagnóstico, sem iniciar turno de modelo; ela comprova descoberta e carregamento, não a atualização visual do seletor do aplicativo já aberto.

As skills ficam disponíveis no próximo turno. É possível chamar `$frontend-design`, `$to-spec`, `$tdd` ou `$project-loop` pelo nome. Se o seletor aberto mantiver a lista antiga, reabra o Codex, conforme a orientação oficial. A configuração de descoberta das skills não altera o estado de conexão do MCP CodeGraph descrito abaixo.

## Skills copiadas para o projeto

As fontes são [mattpocock/skills](https://github.com/mattpocock/skills) e [anthropics/skills](https://github.com/anthropics/skills). Os arquivos ficam em `.agents/skills/`, sem instalação global. [skills-lock.json](../skills-lock.json) registra fonte, caminho de origem e hash de cada uma das 14 cópias externas.

| Skill e arquivo local | Papel no trabalho |
|---|---|
| [setup-matt-pocock-skills](../.agents/skills/setup-matt-pocock-skills/SKILL.md) | Configurar tracker de trabalho, convenções e localização de glossário/ADRs |
| [grill-with-docs](../.agents/skills/grill-with-docs/SKILL.md) | Combinar perguntas de planejamento com registro de domínio e decisões |
| [grilling](../.agents/skills/grilling/SKILL.md) | Testar hipóteses e esclarecer decisões em rodadas de perguntas |
| [domain-modeling](../.agents/skills/domain-modeling/SKILL.md) | Definir termos de domínio, casos limite, glossário e ADRs |
| [codebase-design](../.agents/skills/codebase-design/SKILL.md) | Projetar módulos com interface pequena e pontos reais de substituição |
| [to-spec](../.agents/skills/to-spec/SKILL.md) | Sintetizar a conversa numa especificação no tracker configurado |
| [to-tickets](../.agents/skills/to-tickets/SKILL.md) | Dividir especificação em fatias verticais e registrar dependências |
| [tdd](../.agents/skills/tdd/SKILL.md) | Implementar comportamento pelo ciclo red → green, com testes nas interfaces públicas acordadas; refatoração fica na revisão |
| [code-review](../.agents/skills/code-review/SKILL.md) | Revisar mudanças contra padrões do projeto e contra a especificação |
| [prototype](../.agents/skills/prototype/SKILL.md) | Explorar uma pergunta de estado, lógica ou direção de interface |
| [implement](../.agents/skills/implement/SKILL.md) | Implementar um trabalho delimitado por especificação ou ticket |
| [implement-spec](../.agents/skills/implement-spec/SKILL.md) | Coordenar implementação de uma especificação por tickets dependentes |
| [writing-for-agents](../.agents/skills/writing-for-agents/SKILL.md) | Escrever instruções e referências que agentes conseguem aplicar |
| [frontend-design](../.agents/skills/frontend-design/SKILL.md) | Definir identidade visual, tipografia, composição e escolhas de UI |

Os nomes atuais deste conjunto são `to-spec` e `to-tickets`. Prompts devem usar esses nomes e ler o `SKILL.md` local, que corresponde à cópia instalada.

Também há uma [skill local project-loop](../.agents/skills/project-loop/SKILL.md) presente na pasta. Ela não está entre as 14 cópias registradas em `skills-lock.json`. Sua autoria e execução não foram verificadas nesta instalação; foi preservada, sem atribuí-la ao comando `npx skills` deste trabalho.

## Comandos de instalação e conferência

Executar a partir da raiz `Moodle-AI`, em PowerShell no Windows:

```powershell
npx.cmd --yes skills add mattpocock/skills --skill setup-matt-pocock-skills grill-with-docs grilling domain-modeling codebase-design to-spec to-tickets tdd code-review prototype implement implement-spec writing-for-agents --agent codex --copy --yes

npx.cmd --yes skills add anthropics/skills --skill frontend-design --agent codex --copy --yes

npx.cmd --yes skills list --agent codex --json
```

A conferência da instalação externa retornou 14 skills com escopo `project`. Novas skills locais podem aumentar a listagem; a contagem das cópias externas desta instalação é a registrada no lock. `--copy` materializa as skills no projeto. Reexecutar a instalação pode atualizar o conteúdo das fontes; confira o diff e os hashes antes de aceitar uma atualização.

## Configuração de trabalho — execução inicial de 12/10/2026

O início autorizado usa o `project-loop` local, [tracker Markdown](agents/issue-tracker.md), [domínio único](agents/domain.md), [spec V01](specs/V01-course-to-mbz.md) e [tickets](tickets/README.md). A configuração é local e não cria issues externas. O setup e workflows upstream descritos abaixo continuam opções e não são apresentados como executados. Na consulta desta execução, CodeGraph MCP não estava exposto e a CLI `status` não conseguiu abrir o banco; foi usada inspeção local.

`setup-matt-pocock-skills` está instalado, mas seu fluxo de configuração não foi executado. A própria skill pede configuração do tracker e dos documentos de domínio antes dos seus fluxos upstream. Na preparação anterior não havia esses arquivos; a execução atual gerou `docs/agents/issue-tracker.md` e `docs/agents/domain.md` pelo loop local, sem alegar execução do setup upstream.

O setup suporta tracker local em Markdown, além de serviços externos. Ele explora o projeto, apresenta as escolhas e produz configuração após confirmação prevista no próprio workflow. A instalação não escolheu um serviço externo nem criou issues.

Os documentos [PRD](PRD.md), [arquitetura](ARCHITECTURE.md) e [backlog](BACKLOG.md) são propostas de produto e execução. Eles não são apresentados como resultado de uma execução formal de `to-spec`, `to-tickets` ou TDD. A orientação de `codebase-design` foi usada nas decisões de módulos; isso não significa que o pipeline inteiro das skills tenha rodado.

Exemplos de próximos prompts explícitos, executados uma etapa por vez:

```text
Use setup-matt-pocock-skills para configurar este projeto, considerando tracker local em Markdown e domínio único. Apresente a configuração prevista pelo workflow antes de gravá-la.

Após o setup, use to-spec para sintetizar a primeira fatia V01 a partir do PRD, da arquitetura e do backlog. Defina os pontos de teste e os aceites verificáveis.

Use to-tickets para dividir a especificação aprovada em fatias verticais com dependências, usando o tracker configurado.

Use prototype e frontend-design para avaliar a jornada de planejamento Moodle e a direção de interface, com dados fictícios e estados de erro.

Use implement-spec para executar a especificação aprovada e seus tickets, com TDD nos contratos e regras críticas e code-review ao final.
```

O agente deve ler cada skill antes de aplicá-la e respeitar o escopo autorizado para a tarefa. As regras de delegação, integração e revisão do projeto estão em [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md).

## CodeGraph instalado e configuração local

Fonte do projeto: [colbymchenry/codegraph](https://github.com/colbymchenry/codegraph). O pacote npm `@colbymchenry/codegraph` está fixado em `1.6.2` como `devDependency` no [package.json](../package.json), com a mesma versão no [package-lock.json](../package-lock.json) e no pacote instalado em `node_modules`.

A instalação local foi concluída. O comando equivalente para instalar essa versão é:

```powershell
npm.cmd install --save-dev --save-exact @colbymchenry/codegraph@1.6.2
```

O installer foi executado com estes argumentos:

```powershell
npm.cmd exec -- codegraph install --target=codex --location=local --yes --no-permissions
```

Ele criou [a configuração MCP do projeto](../.codex/config.toml) e um bloco CodeGraph em [AGENTS.md](../AGENTS.md). A configuração foi ajustada para chamar o Node por caminho absoluto, executar o `npm-shim.js` instalado localmente por caminho absoluto e usar `Moodle-AI` como `cwd`. Não foi escrita configuração global.

| Configuração efetiva | Valor ou papel |
|---|---|
| Servidor | `mcp_servers.codegraph` |
| Transporte | Processo local STDIO: `serve --mcp` |
| `command` | Caminho absoluto do Node desta máquina |
| Primeiro argumento | Caminho absoluto de `node_modules/@colbymchenry/codegraph/npm-shim.js` |
| `cwd` | Raiz absoluta do projeto Moodle-AI |
| `CODEGRAPH_TELEMETRY` | `0` |
| `CODEGRAPH_NO_DOWNLOAD` | `1` |

Ao clonar em outra máquina ou mover a pasta, atualize `command`, o caminho do shim e `cwd` em `.codex/config.toml`. Instale as dependências locais antes de iniciar o servidor. O uso de `CODEGRAPH_NO_DOWNLOAD=1` mantém o caminho de execução dependente da instalação local disponível.

## Evidência inicial e alcance do índice

| Verificação concluída | Resultado observado |
|---|---|
| Inicialização `codegraph init . --yes` | Índice criado na raiz Moodle-AI |
| Estado inicial do índice | 13 arquivos indexados, 0 nós, 0 arestas; estado inicial atualizado |
| Probe STDIO `initialize` | Protocolo `2024-11-05`; servidor identificado como `codegraph`, versão `1.6.2` |
| Probe STDIO `tools/list` | Ferramenta `codegraph_explore` anunciada |
| Probe STDIO `tools/call` para `CourseDraft` | Sem código correspondente na nova raiz, coerente com a ausência de implementação do app |
| Ferramentas expostas a este chat | CodeGraph ainda não disponível |

Esses resultados verificam o pacote, o servidor e sua resposta MCP. O probe foi uma chamada direta ao processo; ele não comprova que o Codex carregou o servidor nesta sessão.

O índice inicial contém arquivos de configuração/skills e não possui símbolos ou caminhos de chamada do aplicativo. Ele não é um grafo da arquitetura proposta e não inclui o projeto legado. Os diagramas em [ARCHITECTURE.md](ARCHITECTURE.md) são modelos de planejamento. Consultas sobre implementação se tornam úteis quando houver código e o índice estiver sincronizado com ele.

Os números acima são evidência da inicialização, não uma declaração permanente de atualidade. Novos documentos, skills ou código podem gerar pendências; consulte `status` e sincronize antes de confiar numa consulta de impacto.

Após a preparação do pipeline, uma sincronização pela CLI encontrou 15 arquivos, 33 nós e 159 arestas, com índice atualizado. Os dois arquivos JavaScript são o helper e os testes já presentes em `.agents/skills/project-loop/scripts/`; não são implementação do aplicativo Moodle. A consulta `codegraph explore phaseGates --max-files 1` retornou essa função, seu contexto e o impacto de chamadas. Isso comprova uma consulta ao grafo local do controle de tarefas, sem declarar conexão MCP ao chat ou validação dos testes do helper.

## Conectar ao Codex e verificar as ferramentas

A configuração `.codex/config.toml` de projeto é carregada em projetos confiáveis. A documentação oficial também descreve consulta aos servidores com `/mcp` e reinício do servidor após configuração no cliente. [OpenAI Docs sobre MCP](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

Nesta instalação, não houve confirmação de confiança ou carregamento ativo de `Moodle-AI`, e `codex mcp get codegraph` não encontrou o servidor no contexto verificado. A existência do arquivo local não deve ser anunciada como conexão ativa.

1. Abra a pasta `Moodle-AI` como projeto no Codex e confirme a confiança pelo fluxo do cliente.
2. Reabra o projeto ou reinicie o Codex para carregar a configuração local na nova sessão. Confira os caminhos absolutos caso a pasta tenha mudado.
3. Use `/mcp` no cliente compatível e confira se `codegraph` está conectado e se `codegraph_explore` foi disponibilizado. Na CLI, consulte também `codex mcp list` e `codex mcp get codegraph`.
4. Confirme raiz e atualidade do índice. Faça uma consulta a um símbolo realmente implementado e inspecione a resposta antes de tratar o grafo como evidência.

Se a ferramenta não aparecer, registre essa condição e use a CLI ou inspeção local. Um resultado vazio para `CourseDraft` antes da implementação é esperado e não demonstra falha de conexão por si só.

## Scripts locais e fallback pela CLI

O [package.json](../package.json) contém apenas os scripts CodeGraph nesta etapa; scripts do app serão definidos na sua inicialização.

| Script | Comando definido |
|---|---|
| `codegraph:init` | `codegraph init .` |
| `codegraph:status` | `codegraph status` |
| `codegraph:serve` | `codegraph serve --mcp` |

Executar na raiz do novo projeto:

```powershell
npm.cmd run codegraph:init -- --yes
npm.cmd run codegraph:status
npm.cmd exec -- codegraph sync
npm.cmd exec -- codegraph explore "CourseDraft"
```

`npm.cmd run codegraph:serve` inicia o processo STDIO. Quando o MCP estiver conectado, o próprio Codex inicia esse processo pela configuração; não é necessário manter um segundo servidor manual apenas para usar as ferramentas do chat.

O fallback `npm exec -- codegraph explore "CourseDraft"` permite consultas locais enquanto o MCP não estiver exposto. Execute na raiz correta e confira o índice antes da consulta. Para reabrir o ambiente de ferramentas num clone com `package-lock.json`, use `npm.cmd ci`; isso restaura as dependências do projeto, não instala nem implementa o aplicativo Moodle.
