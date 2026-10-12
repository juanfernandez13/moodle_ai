# Revisão da entrada de documentos

Data: 12/10/2026. Escopo: comparação da [versão publicada de referência](https://ifmoodle.vercel.app/) com a composição anterior da [proposta visual v4](design-proposals/glass-owl-v4/index.html), ambas observadas no navegador, seguida da aplicação da revisão ao protótipo. A análise considera a entrada do fluxo, os textos, a navegação e o alcance da importação; não mede tempo ou taxa de sucesso com usuários.

## Diagnóstico da composição anterior

A versão publicada chegava mais diretamente à tarefa. Exibia o caminho upload → revisão → download, os três grupos de arquivos e uma ação de extração. A composição anterior da v4 acrescentava uma abertura grande, frases que repetiam a intenção do painel e dois cartões com destinos já presentes nas abas. O trabalho principal perdia prioridade visual. A tabela registra o diagnóstico que motivou a revisão aplicada abaixo.

O ganho da proposta é dar mais destaque ao documento principal e apresentar anexos e quizzes como complementos menores. Vidro, verde, paisagem e coruja podem manter a identidade escolhida; o ajuste necessário está sobretudo na quantidade e na hierarquia das informações.

| Elemento observado | Efeito | Direção recomendada |
| --- | --- | --- |
| “Prepare seu próximo curso”, “Seu material, um bom começo”, “Tudo começa com seu planejamento” e “Prepare os arquivos do curso” | Repetem a intenção e ocupam espaço antes do upload. | Retirar a abertura promocional. Manter um título funcional: “Importar planejamento”. |
| Abas Arquivos/JSON/Alunos e cartões JSON/Alunos | Duas navegações para os mesmos destinos; os cartões mudam de posição conforme o modo. | Uma entrada principal para o curso. JSON como opção avançada; alunos em ferramenta própria. |
| JSON apresentado como alternativa manual | Exige conhecer uma estrutura técnica. | Preservar criação manual por formulário/editor visual. Importar JSON é uma opção adicional. |
| “Matriz do curso” | Sugere um modelo documental específico. | Usar “Documento de planejamento”, acompanhado do formato aceito e ajuda curta. |
| “Iniciar processamento” | Não explica o resultado da ação. | Na aplicação: “Interpretar planejamento”. Enquanto o protótipo só confere arquivos: “Conferir arquivos”. |
| Organização, início do curso e exibição do cronograma no upload | Antecipam decisões que podem ser tomadas depois de conhecer o conteúdo. | Levar à revisão do curso; manter aqui somente escolhas que afetam a leitura. |
| Ausência do caminho de etapas na v4 | A pessoa conhece os modos disponíveis, mas não o que acontece após a entrada. | Indicação curta: Documentos → Revisão → Download. |

A referência publicada também tem elementos a reconsiderar: termos como JSON e copiar prompt podem ficar em opções avançadas; rótulos pequenos e de baixo destaque merecem revisão. A comparação não recomenda copiar toda a interface antiga.

## Primeira revisão aplicada — 12/10/2026

O protótipo agora abre em um painel único de até 800 px, com o título “Importar planejamento”, sem abertura promocional nem cartões laterais. As etapas são Documentos → Revisão → Baixar curso. As duas entradas principais são “Importar documento” e “Criar manualmente”; a segunda apresenta um formulário de nome do curso e primeiro tópico. JSON é um link secundário e alunos ficam em ferramenta separada.

O planejamento DOCX recebe destaque. Após o retorno do usuário em 12/10, Tarefas e Quizzes passaram a ficar sempre visíveis, cada um com indicação de opcional e seu próprio botão. Ficam lado a lado no desktop e empilhados no celular. “Conferir arquivos” apresenta os arquivos selecionados, e organização/datas aparecem nessa conferência. O título desktop usa Nunito de 27 px e os rótulos usam 14 px. Verde, vidro, cenário e coruja foram preservados.

O catálogo também foi atualizado: abertura funcional para avaliar o design, amostra tipográfica “Importar planejamento” e explicação simples da nova entrada. As seis seções de avaliação continuam presentes.

## Refinamento com frontend-design — 12/10/2026

Após o pedido de uma composição mais simples, as etapas e as abas passaram para dentro do painel. O título agora é **“Arquivos do curso”**, acompanhado de “Adicione o planejamento e os materiais”. A aba **“Importar arquivos”** abrange o documento principal e os dois tipos de complemento; “Criar manualmente” continua como alternativa.

Os três grupos formam uma lista vertical tanto no desktop como no celular. **Documento de planejamento** recebe um fundo suave e a indicação “Obrigatório”. **Tarefas** e **Quizzes** permanecem sempre visíveis, com indicação “Opcional” e divisores. Cada linha aproxima nome, ajuda curta e ação específica: “Escolher documento”, “Adicionar tarefas” ou “Adicionar quizzes”. Em tela estreita, o botão aparece abaixo da descrição. Arquivos escolhidos, mensagens de erro e o controle de início da leitura permanecem associados ao grupo correspondente.

A coruja fica menor, junto ao título, sem criar uma faixa vazia acima do formulário no celular. “Usar exemplo” e “Importar JSON” são ações secundárias no rodapé; “Conferir arquivos” continua como ação principal. O título usa Nunito 800 de 26 px no desktop e 23 px no celular, com ajuste para 22 px até 360 px. O painel mantém até 800 px de largura, verde, vidro e paisagem.

O catálogo acompanha o novo título, a escala tipográfica e a prévia atualizada. As seis seções e seus controles de avaliação foram preservados. Esta seção descreve as alterações de composição; a verificação registrada abaixo pertence à revisão anterior.

## Refinamento dos controles e arquivos — 12/10/2026

O dropdown recebe menu personalizado com Nunito e foco de 2 px, sem halo duplo. A navegação oferece clique, setas, busca pela digitação, Enter, Escape e Tab. A personalização preserva o rótulo, a opção selecionada e o estado aberto para quem usa tecnologia assistiva.

O datepicker abre ao clicar no campo, mantendo o foco para digitar. As barras aparecem automaticamente ao informar oito números: `19102026` vira `19/10/2026`. O botão do calendário e `Alt` + seta para baixo permitem entrar na grade; setas, seleção, troca de mês, limpeza e Escape funcionam nessa escolha, inclusive na conferência em modal. Ao sair do campo, a interface sinaliza datas inexistentes ou fora de 1900–2100. A máscara não corrige silenciosamente uma data inválida.

A listagem dos arquivos deixa de cortar nomes por reticências. Cada linha apresenta ícone do formato, nome completo com quebra, extensão e tamanho. A contagem de selecionados fica no grupo correspondente. Remover usa área de 44 px, anuncia a contagem resultante e mantém o foco no próximo arquivo; quando a lista fica vazia, o foco volta ao botão de seleção. Esses estados descrevem seleção local, sem sugerir envio ou interpretação.

“Copiar prompt” volta a ficar visível nas ações secundárias da entrada e também em “Importar JSON”. O texto é um modelo ilustrativo local para usar com o planejamento em outra IA; a ação tenta copiar para a área de transferência. Se o navegador bloquear essa operação, o diálogo apresenta o texto selecionado para cópia manual. O protótipo não chama uma API de IA por esse caminho nem valida o contrato de curso da resposta.

Sol e lua têm traços coerentes. Os controles de aparência do topo passam a ser somente tema e mostrar/ocultar fundo; alunos continuam como ferramenta própria. O cenário inicial é o campo. Ocultar o cenário deixa a cor plana do tema, sem pontos, e pausa o movimento. A preferência do sistema por movimento reduzido continua sendo respeitada. Play e pausa deixam de aparecer como controles separados. A barriga da coruja usa o ícone Moodle com capelo e cores originais, com fonte oficial documentada na [proveniência do arquivo](design-proposals/glass-owl-v4/assets/ASSET_SOURCE.md). A mascote conserva o tamanho anterior: 110 × 118 px no desktop e 88 × 100 px no celular, conforme o CSS.

Esta rodada mantém a composição em três grupos e o limite de protótipo. O registro de testes abaixo é histórico; não comprova a verificação visual ou por teclado desses novos controles.

## Acabamento da natureza e navegação — 12/10/2026

O cenário recebe vagalumes discretos nas laterais, com o centro reservado à leitura do formulário. São 34 na composição desktop e 20 na compacta, com brilho maior no escuro. A animação respeita movimento reduzido; ao ocultar o fundo, os vagalumes também ficam ocultos e o cenário deixa de animar.

No editor de exemplo do catálogo, as unidades mostram seu número real na sequência, título e contagem de atividades. Uma barra lateral e um fundo suave indicam a unidade selecionada. A mudança torna mais fácil identificar posição e conteúdo sem acrescentar uma etapa à entrada dos arquivos. É um refinamento da demonstração, sem implementação do editor da aplicação. Não foi acrescentada aqui evidência de uma nova verificação no navegador.

## Cabeçalho aplicado — 12/10/2026

Alunos, Fundo e Tema aparecem sempre com ícone e texto. Os três controles usam cápsulas arredondadas e a seleção recebe preenchimento suave, sem barra interna; todos têm alvo de pelo menos 44 px. No desktop, as ações ficam ao lado do logotipo. No celular, ganham uma linha própria de três colunas. O controle Alunos recebe `aria-current` enquanto sua área está aberta e perde esse estado ao retornar ao curso.

O cabeçalho mantém os acessos identificados. A revisão posterior de alunos recupera o cadastro em lote, conforme a seção abaixo; datas e a composição base da paisagem continuam em avaliação.

## Propostas ainda em discussão

A crítica abaixo resulta da inspeção dos arquivos e dos requisitos planejados; não é uma pesquisa de usabilidade com participantes nem uma alteração já aplicada aos fluxos.

- **Natureza:** a vegetação pode dar uma identidade calma à ferramenta, mas sua presença precisa permitir leitura prolongada. A proposta é estudar vegetação mais distante e desfocada e manter a opção sem fundo durante a edição. O cenário atual não foi substituído por essa proposta.
- **Alunos:** a ficha individual foi substituída no protótipo pelo fluxo em lote descrito abaixo. A implementação real de F01 do [backlog](BACKLOG.md) permanece futura e fora do MVP.
- **Datas:** o campo atual de início do curso está dentro de “Organização e datas” na conferência, mas não demonstra o cronograma das atividades. A proposta para o editor planejado é apresentar uma seção fácil de encontrar, distinguindo início do curso e prazos das atividades, com erros localizados e resumo do que mudou. Isso acompanha R04/R07 do [PRD](PRD.md); alterações em turmas publicadas continuam reservadas à futura F02. O fluxo atual não foi alterado nesta revisão.

## Onde começar a leitura: demonstração atual

O controle aparece depois de selecionar o documento, com **“Ler a partir de: Início do documento”** como padrão. No documento de exemplo, **“Escolher trecho”** abre cinco blocos correspondentes ao DOCX incluído no protótipo. A pessoa seleciona um bloco e aciona **“Começar aqui”**. O trecho escolhido e os seguintes ficam incluídos; os anteriores são destacados como excluídos. O resumo mostra o início selecionado e permite **“Ler documento inteiro”**.

Arquivos locais mostram somente seus metadados. Sem um leitor implementado, a escolha de trechos fica indisponível para esses arquivos e a interface orienta usar o exemplo. Nenhum conteúdo fictício é apresentado como se tivesse sido extraído de um arquivo local. Trocar ou remover o documento limpa a seleção anterior.

## Condições para a implementação futura

- Mostrar o trecho selecionado antes de interpretar e permitir voltar ao documento inteiro.
- Uma busca por frase ajuda a localizar o início; ocorrências repetidas devem ser apresentadas para escolha, sem selecionar a primeira silenciosamente.
- A prévia destaca o conteúdo efetivamente incluído. Para cronogramas, a primeira proposta seleciona tabelas inteiras, preservando cabeçalhos.
- Não prometer seleção por página enquanto o leitor não fornecer uma correspondência confiável entre página e conteúdo extraído.
- Se nome do curso, datas ou regras estiverem fora do trecho, tratá-los como dados a completar ou contexto adicional incluído explicitamente. Não preencher com suposições nem acrescentar texto omitido de maneira invisível.

No legado, o parser devolve texto linear do documento inteiro; marcadores do prompt delimitam campos específicos, não um recorte global. A prévia visual e a extração também usam caminhos distintos. A implementação futura precisa fazer a seleção visual corresponder aos mesmos blocos enviados à interpretação. A demonstração de cinco blocos não implementa esse leitor, busca, seleção de tabelas ou referências por página, nem altera o contrato do MVP automaticamente.

## Composição atual do protótipo

```text
Moodle AI                                      Alunos / Fundo / Tema

┌ Documentos → Revisão → Baixar curso ─────────────────────────┐
│ [ Importar arquivos | Criar manualmente ]                   │
│                                                            │
│ Arquivos do curso                                  coruja  │
│ Adicione o planejamento e os materiais.                     │
│                                                            │
│ Documento de planejamento · Obrigatório                    │
│ Conteúdo e organização do curso · DOCX  [Escolher documento]│
│ Após selecionar: Ler a partir de…         [Escolher trecho*]│
│                                                            │
│ Tarefas · Opcional                      [Adicionar tarefas]│
│ Anexos em Word, PDF, planilha ou slides                     │
│ ────────────────────────────────────────────────────────── │
│ Quizzes · Opcional                      [Adicionar quizzes]│
│ Documentos com as questões · DOCX                          │
│                                                            │
│ Usar exemplo / Copiar prompt / Importar JSON                │
│                                        [Conferir arquivos]│
└────────────────────────────────────────────────────────────┘
```

\* A escolha de trechos funciona com o documento de exemplo. Para arquivo local, a orientação informa como experimentar essa demonstração. Na aplicação futura, a ação de interpretar dependerá de um leitor real e da integração de IA.

## Verificação registrada na primeira revisão

Foram observados no navegador: erro de documento ausente, carregamento do exemplo, escolha do início por setas, resumo do trecho, retorno ao documento inteiro, calendário na conferência e navegação criação manual → alunos → voltar preservando os campos preenchidos. Esses resultados confirmam os comportamentos demonstrados, sem comprovar interpretação, exportação ou usabilidade com usuários.

Esse registro é anterior à reorganização em três linhas e não constitui evidência de verificação do novo layout.

## Estado da decisão

A retirada da abertura promocional, o controle de início da leitura e as demais simplificações foram aplicados ao protótipo após autorização do usuário. A aprovação visual permanece em avaliação. O catálogo de cores, tipografia e componentes continua sendo um artefato de avaliação; sua navegação não faz parte da interface final do aplicativo.

O HTML e as interações locais da demonstração foram atualizados. A implementação da aplicação continua em planejamento: não houve envio de documentos, chamada de IA, cadastro no Moodle ou geração de curso.


## Cadastro em lote, marca e interação — 12/10/2026

Após comparar a jornada original, o protótipo recupera Planilha → Revisão → Download. A lista fictícia é editável, os cursos de destino são definidos para o lote inteiro e a saída apresenta um CSV de demonstração por curso. Arquivos locais mostram somente metadados; a revisão usa o exemplo explícito. O envio ao Moodle tem sua sequência descrita, sem conexão ou cadastro. Contrato, comparação e limites estão na [revisão do cadastro em lote](STUDENTS_DESIGN_REVIEW.md). Isso não incorpora F01 ao MVP nem inicia a aplicação.

A marca passa a usar uma coruja vetorial minimalista com M geométrico na barriga; o favicon usa somente a coruja. A mascote 3D conserva seu tamanho e o ícone oficial. Os botões Alunos, Fundo e Tema usam cápsulas com seleção suave. Após quatro segundos de ponteiro parado, poucos vagalumes se aproximam; acompanham por dois segundos ao retomar o movimento e voltam às laterais, respeitando movimento reduzido e fundo oculto.
