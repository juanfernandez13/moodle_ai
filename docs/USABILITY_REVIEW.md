# Avaliação de usabilidade do protótipo

**12/10/2026 · Inspeção por tarefas no navegador.** Esta avaliação foi executada pelo agente no protótipo local. Não participaram professores e não foram medidos tempo de aprendizagem, satisfação ou taxa de sucesso de usuários. O objetivo é encontrar bloqueios antes do teste com pessoas e antes da implementação.

O [quadro de telas](screen-flow.html) e o [Mermaid](SCREEN_FLOW.md) distinguem comportamento existente, MVP planejado e operações futuras. O curso fictício e os três registros do cadastro são dados de demonstração. A referência foi somente lida; nenhum cadastro ou alteração foi enviado ao Moodle.

## Tarefas observadas

| Tarefa | Resultado observado | Limite |
| --- | --- | --- |
| Encontrar documento, tarefas e quizzes | Os três grupos permanecem visíveis na entrada, com obrigatório/opcional por escrito. | O exemplo carrega o planejamento; upload de complementos não foi repetido nesta rodada. |
| Conferir sem planejamento | Mensagem pede documento ou exemplo e leva foco ao botão de seleção. | Extensão e seleção de arquivos locais também receberam revisão estática. |
| Escolher onde iniciar a leitura | O trecho do exemplo pode ser selecionado e seu título aparece na entrada e na conferência. | Não demonstra leitura de um DOCX arbitrário. |
| Conferir organização e início do curso | O campo de data recebe barras ao digitar oito números. `31/11/2026` mostra erro; `12/10/2026` é aceito. | Não edita datas de atividades ou turmas publicadas. |
| Usar o calendário por teclado | Setas e Enter mudam o dia para `13/10/2026`, fechando o calendário. | Preferência de movimento reduzido foi revisada no código; não alteramos a configuração do sistema. |
| Copiar prompt | A ação retorna status de cópia concluída. | Prompt ilustrativo; não foi enviado a outra IA. |
| Criar manualmente | Vazio mantém foco no nome obrigatório; nome e primeiro tópico preenchidos aparecem na conferência. | Ainda não há editor de atividades. |
| Alternar curso e alunos | Retorno recupera o modo manual, nome e primeiro tópico. | Preservação nesta página; recarregar não comprova persistência de projeto. |
| Corrigir JSON | Erro de sintaxe fica junto ao texto; exemplo válido abre conferência formatada. | JSON.parse valida sintaxe, não o contrato de curso. |
| Revisar alunos | E-mail ausente bloqueia a geração; corrigir revalida sem perder foco. | Lista fictícia; planilha real não é interpretada nesta demo. |
| Detectar duplicatas | Usuário repetido marca as duas linhas; curso repetido, inclusive com diferença de caixa, bloqueia a geração. | Política real de contas e matrícula ainda precisa de contrato. |
| Localizar uma pendência | Clicar no erro da linha 2 leva ao campo Usuário dessa linha. | Não comprova mensagens de todos os erros possíveis. |
| Voltar no cadastro | Voltar à planilha e à revisão mantém alterações, papéis e destinos. | Escolher outra planilha reinicia explicitamente o lote. |
| Gerar para dois cursos | Entrega mostra dois arquivos, com os mesmos três alunos em cada curso. | São CSVs locais de exemplo, sem comprovação de importação Moodle. |
| Baixar o CSV revisado | Download explícito concluído; conteúdo conferido com três linhas, curso escolhido, e-mail corrigido e papel editado. | Apenas o primeiro dos dois arquivos foi baixado nesta rodada. |
| Entender envio ao Moodle | Modal explica conexão, simulação e confirmação. Escape fecha e devolve foco ao botão acionador. | Modal informativo; nenhuma conexão ou prévia de servidor. |
| Editar em celular | Revisão passa de tabela para blocos por linha; rótulos visíveis e edição de e-mail acessível. Em 390 e 320 px, largura do documento não excedeu a viewport. | Inspeção em viewport emulada, sem aparelho físico. |

## Problemas encontrados e tratamento

| Prioridade | Achado | Tratamento |
| --- | --- | --- |
| Alta — lacuna de prototipação | Não é possível testar correção de quiz, destino de anexo ou prazo de atividade: editor C07 ainda é um estudo separado. | Prototipar uma unidade completa com duas tarefas e dois quizzes antes de aprovar o editor. O quadro marca o que está planejado. |
| Média — descoberta | Organização e data estavam escondidas sob “Organização e datas”. Não se distingue início do curso de prazos das atividades. | A conferência passa a abrir “Organização e início do curso”. No editor planejado, cronograma deverá ter acesso próprio e antes/depois. |
| Média — expectativa | A barra “Baixar curso” pode parecer uma etapa já funcionando, embora a demo termine na conferência. | Aviso da demo e mapa explicitam o limite. No próximo protótipo, demonstrar editor, bloqueio e entrega com estados claramente simulados. |
| Média — início do cadastro | Selecionar arquivo real não libera interpretação nesta prévia. | Explicação junto ao controle e ação explícita “Usar planilha de exemplo”; não apresentar dados fictícios como extração de arquivo real. |
| Baixa — linguagem | Resumo de um único destino usava plural incorreto. | Corrigido para “em cada curso escolhido”. |
| Média — movimento | A espera de atração dos vagalumes usava delta limitado da animação, alongando o prazo quando os frames são lentos. Clique sem movimento também não iniciava a espera. | Separar prazo real da suavização visual e registrar ponteiro por clique não-touch; manter fundo oculto, aba oculta e movimento reduzido. |
| Média — teclado no quadro | O inspetor móvel se anunciava como modal e prendia Tab, enquanto controles externos continuavam operáveis pelo ponteiro. A revisão seguinte encontrou retorno a cartão oculto após mudar de Quadro para Lista. | Painel não modal; origem de foco deve estar conectada, visível e habilitada, com fallback em Detalhes. Verificados Shift+Tab e Escape em 360 px, Quadro → Lista → fechar/Escape no desktop e mudança para celular com foco interno. |

Após a adoção de Tailwind, a estrutura do quadro e o cabeçalho da prévia foram novamente conferidos no navegador. O quadro mantém zoom, deslocamento por setas, enquadramento e Lista; em 1280 × 900 nenhum cartão ficou fora da área enquadrada. Em 360 px, não houve transbordamento horizontal. Na prévia, o header passa para três colunas no celular, os botões medem 44 px e a mascote mantém 110 × 118 px no desktop e 88 × 100 px no celular. Alunos e os controles de tema/fundo continuam acessíveis. Isso verifica a migração do layout, sem ampliar o teste às funções futuras da aplicação.

Não existe evidência de que a paisagem melhora aprendizagem. Ela é uma preferência visual do projeto. Sua utilidade deve ser avaliada pela leitura e concentração, incluindo a opção sem fundo; a animação fica atrás do conteúdo.

## Teste com pessoas a realizar

Recrutar de três a cinco professores ou integrantes de equipe pedagógica, incluindo pessoas com pouca familiaridade com o produto. Essa quantidade é uma proposta operacional, não uma garantia estatística. Pedir que expliquem o que esperam de cada ação e realizem as tarefas sem demonstrar o caminho primeiro.

1. Iniciar um curso por exemplo, identificar a finalidade de documento/tarefas/quizzes e escolher onde a leitura começa.
2. Criar um curso manual e retomar seus dados após visitar Alunos.
3. Corrigir uma pendência do lote, escolher dois cursos e explicar quem entra em cada destino antes de baixar.
4. Encontrar e editar o início do curso por digitação e calendário.
5. Com C07 prototipado: corrigir quiz incompleto, mudar destino de anexo e prazo; explicar o bloqueio da exportação e o que o pacote contém.

Registrar conclusão sem ajuda, pedidos de orientação, ação escolhida por engano, texto mal interpretado e perda de dados. Cronometrar cada tarefa a partir de uma instrução igual para todos, sem prometer economia. Priorizar impedimentos de conclusão e consequências sobre conteúdo; repetir as tarefas afetadas após corrigir.

Não declarar o editor aprovado antes de testar C07/C08/C10 juntos. Compatibilidade de exportação exige a restauração independente descrita no PRD; avaliação visual não substitui esse aceite.

As verificações finais, limitações do efeito visual e revisão independente estão no [registro desta tarefa](tasks/DESIGN-USABILITY-01/verification.md).
