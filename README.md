# Moodle AI

Aplicação local para preparar cursos: documentos ou criação manual → proposta revisável → editor → validação → backup Moodle .mbz. Projetos portáteis .moodleai preservam fontes, bytes dos anexos, IDs e presets.

Nunca acessar, usar ou testar o Moodle do IFCE. A referência pública https://ifmoodle.vercel.app/ orienta somente a interface. Testes Moodle usam exclusivamente localhost:3211 com cursos, contas e arquivos fictícios. CourseGen-AI permanece referência somente leitura. [FULL-01](docs/tasks/FULL-01.json) é a autoridade do aceite da aplicação; [C01](docs/tasks/C01.json) registra o contrato integrado.

## Executar

Node **24** e npm. Dependências fixadas no lockfile. Manual, exemplos e perfis offline não precisam de chave.

```powershell
npm ci
npm run dev
```

Abrir http://127.0.0.1:3210. Dados, conteúdo, configurações e questões são divididos em painéis; uma questão/bloco/verbete por vez e tabelas paginadas evitam páginas longas. Tema claro/escuro, fundo opcional e navegação móvel mantêm acesso às ferramentas.

A coruja procedural 3D aparece junto ao título da entrada. A biblioteca Three.js é local e tem licença/fonte documentadas; o cenário é controlado separadamente por Fundo. Movimento reduzido, invisibilidade e pausa suspendem a animação; falha de WebGL conserva uma imagem acessível.

O cenário interativo usa geometria 3D em WebGL: colinas em profundidade, vegetação, árvores, céu e partículas, com iluminação clara/escura e reação ao ponteiro. O formulário permanece imóvel. Fundo desliga a cena; aba oculta, ausência de viewport e movimento reduzido suspendem a animação. As fotos locais ficam como fallback. Coruja e cenário usam Three.js local, sem carregamento externo.

O frontend está separado por área em `src/client/features/{course,students,dates,moodle}`: componentes de apresentação, hooks de fluxo, tipos e helpers. As páginas de `app` apenas montam esses módulos. Os formulários de atividade ficam em `src/client/components/activity-editors`. Veja o [mapa do código](docs/CODE_MAP.md).

O card de Alunos aproveita a largura disponível no desktop, até um workspace de 1760 px. A tabela mantém edição e paginação; em telas estreitas, sua rolagem horizontal fica contida no próprio painel.

```powershell
npm run check
npm run demo
npm run validate:draft -- tests/fixtures/course-valid.json
npm run build
npm start
```

check executa typecheck, lint sem warnings, testes Node, build Next e build da CLI. demo valida a fixture anterior sem IA; não inicia a web. CLI: 0 válido, 1 JSON/contrato inválido, 2 uso/arquivo/limite de 1 MiB, sem imprimir conteúdo pessoal bruto.

## Curso e persistência

Seis módulos: fórum, tarefa, quiz, chat, wiki e glossário; várias atividades do mesmo tipo na unidade. Questões: múltipla escolha, associação e resposta discursiva. Reordenação conserva IDs e referências. Metadados, datas, notas, anexos, texto, imagens e tabelas são editáveis. Conteúdo não executa HTML. Presets são explícitos, sem convenções institucionais silenciosas.

Conferência fica vinculada à revisão atual; edição invalida o aceite, pendências levam ao campo/questão e impedem gerar pacote inválido. IndexedDB salva com transação e revisão esperada; outra aba não sobrescreve versão nova silenciosamente. A cópia portátil valida versão, paths, quantidade, limites e hashes antes de substituir o projeto. Exportar somente JSON não incorpora bytes.

Cada projeto tem identidade própria, independente dos IDs do curso importado. Dois documentos com IDs internos iguais podem ser salvos separadamente. Arquivos portáteis anteriores continuam legíveis; a migração do armazenamento mantém o registro anterior. Formulários apresentam horários em UTC sem alterar timestamps originais até a edição.

WebMCP é opcional: consultas/validação/propostas usam os mesmos comandos por ID e revisão; propostas exigem revisão na interface. A edição manual funciona sem essa API.

## Documentos e IA

DOCX por tópicos e semanal usam perfis delimitados: Disciplina:, Código:, Tópico 1:/Semana 1:, Tarefa: e configurações explícitas. A prévia mostra origem e pendências antes de aplicar. Documento fora do perfil recebe diagnóstico, sem virar exemplo. TXT/PDF com texto recebem revisão; PDF escaneado ou com imagens não preserváveis é bloqueado com diagnóstico, sem OCR/conversão silenciosa. Transformações DOCX não suportadas também exigem revisão.

Fixtures fictícias: tests/fixtures/import/topicos-com-imagens.docx, semanas-em-tabela.docx e docs/examples/planejamento-completo.docx. O último contém nove atividades numa unidade, dois fóruns, duas tarefas, dois quizzes e três tipos de questão. Regenerar com node scripts/create-full-planning.mjs.

OpenAI e Gemini têm adaptadores HTTP reais, formato estruturado e validação comum. Testes cobrem sucesso, resposta inválida/parcial, erro, timeout, limites e cancelamento com transporte simulado. Não foi feita chamada paga com chave real. Chave/modelo são explícitos, transitórios em memória, fora de logs/projetos/arquivos. Nenhuma troca automática de provedor.

| Operação | Limites |
| --- | --- |
| Importação | 10 arquivos, 10 MiB/arquivo, 20 MiB total; 300 mil caracteres, 200 páginas PDF, 500 assets |
| Exportação | 16 MiB/anexo, 64 MiB total, 96 MiB expandido |
| Portátil | 25 MiB compactados, 64 MiB expandidos |
| Alunos | 8 MiB por CSV/XLS/XLSX, 10 mil linhas |

Bytes reais do corpo são limitados mesmo sem Content-Length.

As rotas de importação e interpretação exigem origem correspondente à aplicação e o Content-Type correto, antes de ler documentos ou utilizar uma chave de provedor.

## Alunos e datas

Alunos: CSV/XLS/XLSX → selecionar planilha/mapear colunas → editar/revisar duplicados → prévia vinculada ao hash → CSV. Valores originais e identidade das linhas são mantidos; fórmulas e valores que executariam fórmula em CSV recebem diagnóstico e não são alterados silenciosamente.

Datas: cronograma explícito → alvos/restrições atuais → antes/depois → plano vinculado ao hash. Condições que não são datas são preservadas. Edição invalida a prévia; montar/reabrir uma página nunca envia uma operação.

O formulário de conexão recebe a URL base Moodle **HTTP ou HTTPS**, inclusive em subdiretório, junto de usuário e senha. `MOODLE_URL` fornece apenas um endereço inicial opcional. Cada sessão em memória, com TTL e cookie opaco httpOnly, fica vinculada à instalação escolhida; credenciais/cookies/sesskey nunca vão para projetos ou downloads. A conexão usa os formulários web Moodle, não exige token REST. Login por SSO e formulários de versões/plugins diferentes podem não ser suportados.

O transporte valida URL e respostas DNS, fixa o IP aprovado na conexão e restringe redirecionamentos à instalação informada. Endereços internos e reservados são recusados; a exceção local de desenvolvimento é **http://localhost:3211/**. O status distingue disponibilidade do adaptador de compatibilidade comprovada. Somente esse laboratório, com perfil **moodle-4.1.17-lab-ops-v1**, possui a validação documentada. Não foram realizados testes em Moodle externo ou institucional.

```powershell
$env:MOODLE_URL='http://localhost:3211'
$env:MOODLE_CAPABILITY_PROFILE='moodle-4.1.17-lab-ops-v1'
npm run dev
```

Cadastro mostra opções/defaults Moodle efetivos antes da confirmação, com resultado por linha. Datas relêem o curso, recusam deriva, preservam outros campos e conferem o resultado. Prévia é consumida uma vez; timeout após envio retorna estado desconhecido, sem retry cego. Aplicação parcial é explícita; reinício do servidor exige novo login.

## Compatibilidade e evidências

Perfil moodle-4.1-core-v1 restaurado no **Moodle 4.1.17 (Build: 20250317)** local: nove atividades, quatro questões, seis ocorrências de imagens, notas/datas/referências e hashes dos bytes preservados. Dois DOCX também foram restaurados. Outras versões/plugins, inclusive 4.1.17+ /20250321, não foram comprovados. [Laboratório](docs/lab/README.md) documenta fontes/imagens fixadas, comandos, snapshots e correções.

Glossário exige informação de usuário ativa somente para seu conteúdo editorial. O aviso aparece antes de baixar; users.xml está vazio, autoria é anônima, sem contas/matrículas/submissões. Contagens após restauração: usuários 2→2 e inscrições 0→0. Esses snapshots antecedem os testes separados de cadastro/datas.

## Planejamento e Git

[PRD](docs/PRD.md), [arquitetura](docs/ARCHITECTURE.md), [design](docs/DESIGN_BRIEF.md), [plano ampliado](docs/BUILDER_PIPELINE_PLAN.md), [backlog](docs/BACKLOG.md) e [tickets](docs/tickets/README.md) preservam requisitos/histórico. Specs: [FULL-01](docs/specs/FULL-01-application.md), [OPS-01](docs/specs/OPS-01-moodle-adapter.md), [UX02](docs/specs/UX02-visual-refinement.md) e [URL01](docs/specs/URL01-moodle-connection.md). O trabalho posterior de visual, módulos frontend e conexão por URL está registrado em [UX02](docs/tasks/UX02.json).

Subagentes/worktrees por funcionalidade, candidato congelado por hash, checks reais e dois eixos independentes de revisão antes do merge local main. docs/tasks distingue execução, verificação, aceite e integração. project-loop e frontend-design locais foram usados; não se afirma invocação de todos os workflows upstream. CodeGraph MCP indisponível, inspeção local realizada; grafo precisa sincronização após integração. Publicação/licença seguem decisão do mantenedor.
