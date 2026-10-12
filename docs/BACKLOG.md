# Backlog da v2

Nome provisório: **Moodle-AI**. Planejamento para um hackathon solo; a data e a duração ainda não foram definidas. Os itens abaixo estão propostos, sem implementação iniciada.

O MVP atende professores e equipes que criam cursos Moodle: DOCX ou criação manual → `CourseDraft` → editor visual → validação → `.mbz`. O CourseGen-AI é referência de regras já aprendidas, especialmente exportação; não é o local de implementação da v2.

## Sequência de entrega

Cada item entrega comportamento verificável. Os contratos e as regras detalhadas pertencem à especificação aprovada pelo integrador; este backlog não cria outro formato de `CourseDraft`.

| ID | Fatia vertical | Dependências | Aceite mensurável |
| --- | --- | --- | --- |
| V01 | Draft sintético → validação → download MBZ, sem IA | Nenhuma | Um draft fictício válido gera um arquivo que pode ser descompactado; XML e referências cruzadas passam nas verificações. Três fixtures inválidas retornam diagnóstico com campo/caminho e não geram pacote. Nenhuma chave externa é necessária. |
| V02 | Criação manual → editor visual → exportação | V01 | Professor cria curso com duas aulas, edita uma atividade e exporta. Dados exibidos e dados exportados correspondem à mesma versão validada do draft. Editar depois da validação invalida a aprovação anterior. Fluxo completo verificado no navegador. |
| V03 | Salvar e reabrir um draft JSON versionado | V02 | Exportar e reimportar preserva o draft semanticamente. Versão desconhecida, JSON inválido e campos internos proibidos produzem erro útil, sem quebrar a tela. Pelo menos uma fixture por caso. |
| V04 | DOCX → extração com IA → revisão no editor | V03, S01, S03, S04 | DOCX sintético gera proposta de draft, validada antes de entrar no editor. Sucesso, timeout, resposta parcial e resposta inválida têm tratamento verificável com adapter simulado. Origem e campos que exigem revisão aparecem ao usuário. O usuário consegue continuar pela criação manual. |
| V05 | Dois DOCX diferentes → organização configurável | V04 | Um DOCX organizado por tópicos e outro semanal geram drafts revisáveis e pacotes exportáveis. Presets configuram títulos, notas e organização, sem defaults hardcoded. Pelo menos uma das duas fixtures contém dois quizzes, duas tarefas e dois fóruns na mesma seção. Editor, conferência e pacote preservam as seis atividades, contagens, configurações, IDs do draft e referências de anexos e notas, sem truncamento. Testes conferem a tradução dos IDs estáveis para IDs únicos do backup e a integridade das referências. |
| V06 | Restaurar e conferir em Moodle de teste | V05, S01–S04 | Os dois pacotes são restaurados em cursos novos e vazios numa instância de teste. Registrar versão do Moodle e opções de restauração. Conferir seções, atividades, anexos, notas e datas contra checklist derivado dos drafts. Na fixture com dois quizzes, duas tarefas e dois fóruns na mesma seção, verificar as seis atividades e suas configurações; documentar a correspondência entre IDs do draft, IDs do backup e IDs remapeados na restauração, com referências de anexos e notas íntegros. IDs numéricos não precisam ser preservados pelo Moodle, mas nenhuma atividade ou associação pode desaparecer. Diferenças bloqueiam a entrega. |
| V07 | Demo reproduzível e deploy público | V06, S01–S04 | Ambiente limpo executa typecheck, lint, testes relevantes e build. Smoke no navegador cobre os fluxos manual e DOCX; modo demo usa apenas dados fictícios. README registra comandos, limitações e requisitos de configuração. Todos os gates P0 abaixo estão concluídos. |

V01–V03 formam a primeira demonstração útil. V04 acrescenta a IA sem mudar a autoridade do domínio. V05–V06 comprovam a generalidade com dois formatos de planejamento Moodle e restauração em teste; V07 libera apresentação pública. Se o prazo ficar curto, reduzir tipos de atividade e acabamento secundário, preservando a exportação demonstrável e os gates de confiança.

## Gates P0 antes de deploy público

| ID | Gate | Dependências | Aceite mensurável |
| --- | --- | --- | --- |
| S01 | Contratos e referências de anexos confiáveis | V01 | API, importação JSON e resposta da IA rejeitam `filePath` e outros campos internos. Cliente envia apenas `attachmentId`; servidor resolve e autoriza o anexo por sessão/job. Testes com caminho arbitrário e ID de outro job são rejeitados, sem ler arquivos externos ao workspace do job. |
| S02 | Prévia de documento e conteúdo seguro | V02 | HTML vindo de DOCX ou IA passa por política de sanitização ou isolamento. Fixtures com script, evento inline e URL `javascript:` não executam código nem acessam dados do app. Texto, links permitidos e formatação básica continuam visíveis; verificar no navegador. |
| S03 | Acesso, limites de upload e orçamento de IA | V01 | Limites explícitos de bytes, quantidade, formato e tempo são aplicados no servidor. Upload/resolução verificam propriedade do arquivo. Testes rejeitam excesso de limite, upload sem autorização e origem inválida. Deploy público não permite consumo irrestrito da chave do servidor; quota/orçamento e cancelamento têm comportamento documentado. |
| S04 | Lifecycle e logs de jobs | V01 | Todos os temporários são registrados ao serem criados. Testes com falha no segundo arquivo, falha do modelo e cancelamento deixam o workspace do job limpo. Blobs abandonados têm expiração/varredura definida. Logs de teste não contêm credenciais ou conteúdo pessoal bruto. |

## Depois do MVP

| ID | Entrega | Dependências | Critério de entrada |
| --- | --- | --- | --- |
| F01 | Planilhas de alunos → revisão → CSV | V07 | Manter valores e identidade das linhas da fonte; IA propõe mapeamento, código valida. Política de papel, senha e dados pessoais precisa estar definida antes de usar dados reais. |
| F02 | Prévia e aplicação de datas em turma existente | V07 | Adapter testado com fixtures HTML; plano aprovado vinculado ao conteúdo e ao escopo. Moodle de teste antes de qualquer turma real. |
| F03 | Envio de cadastro ao Moodle | F01 | Prévia vinculada ao CSV/opções aprovados, proteção contra repetição e relatório por aluno. Permissão e configuração de sessão definidas; validar em Moodle de teste. |

## Base de qualidade observada no legado

Na cópia analisada, `yarn.cmd test` passou nos 16 testes do `taskFileMapper`; oito arquivos de teste não carregaram por `MODULE_NOT_FOUND` (`jsonrepair`, `tar-stream`, `cheerio` e `xlsx`). Isso caracteriza ambiente sem dependências completas, **não um resultado de falha funcional da suíte**. A UI não tem cobertura automatizada documentada. A v2 deve instalar seu próprio ambiente e validar sua própria linha de base; nenhum resultado do legado deve ser apresentado como teste da v2.
