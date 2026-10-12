# Verificação do candidato

Data: 12/10/2026. Integrador: /root. Escopo: planejamento e protótipos locais; aplicação não iniciada.

## Navegador

Inspeção por tarefas documentada em [USABILITY_REVIEW.md](../../USABILITY_REVIEW.md), sem participantes humanos nem métricas inventadas. Cenários de documento ausente, exemplo e trecho, formulário manual, JSON inválido e exemplo válido, copiar prompt, data inválida e calendário por teclado foram exercitados. Retorno da área Alunos mantém nome/tópico e modo do curso.

Alunos: pendência inicial de e-mail, usuário duplicado, curso duplicado e ausência de curso bloqueiam a geração. Link de pendência devolve foco ao campo. Voltar à planilha preserva revisão; papel editado e dois destinos aparecem na saída. O CSV efetivamente baixado foi lido e contém cabeçalho, três registros fictícios, e-mail corrigido, curso `programacao-2026` e papel modificado; não há coluna de senha. Reiniciar remove seleção e desabilita interpretação. Escape fecha o modal de envio e devolve foco ao acionador.

Em 390 e 320 px, largura do documento não excedeu a viewport e os alunos ficaram em blocos por linha, com rótulos. Cabeçalho manteve seleção suave e marca vetorial. A mascote conserva as dimensões aprovadas; seu código não foi alterado nesta revisão.

Quadro: seleção de mapa e tela atualiza detalhes; aumento de zoom altera escala; seta direita move a transformação; Lista oferece títulos, estado e próximos passos. A primeira revisão encontrou Q1: detalhe móvel anunciado como modal com controles externos ainda operáveis. Na versão corrigida, o aside é um painel não modal, sem aria-modal, elementos inert ou trap global de Tab. Em 360 px, selecionar A02 recebe foco no título; Shift+Tab passa por Fechar até Detalhes externo; Escape oculta o painel e devolve foco ao cartão A02. Ao mudar de desktop para celular com foco interno, o painel é ocultado e o foco volta a um controle externo visível. Enquadrar final deixou zero cartões fora da área em 1280 × 900. Console do quadro sem erros ou avisos nesta rodada.

Tailwind: `npm run design:css` executa a CLI local 4.3.3, com fontes explícitas de HTML/JS do quadro e da prévia. O build no sandbox retornou exit 0 mas não detectou fontes (CSS de 1.576 bytes sem .flex); essa saída foi rejeitada. O build fora do sandbox, autorizado, gerou utilities efetivas. No navegador, workspace do quadro é grid com duas colunas no desktop; aba selecionada tem fundo branco. Cabeçalho da prévia é flex no desktop e grid de três opções no celular, com botões de 44 px; gap, min-height e radius vêm das utilities. Larguras 1280 e 360 sem transbordamento horizontal; coruja com dimensões aprovadas. Acesso ao lote fictício e alternância de tema/fundo passaram no smoke após a migração. CSS próprio mantém vidro, cenário e canvas.

Vagalumes: cena pronta, movimento ativo e página visível. Após corrigir registro por clique e prazo real, captura posterior à espera de 5,5 segundos mostrou aproximação à região do ponteiro. Quantidade de seguidores (6/3) e acompanhamento por dois segundos foram conferidos no código; as capturas não medem precisamente trajetória ou duração. Preferência do sistema e desempenho em aparelho físico permanecem verificações futuras. Nenhum novo ciclo ou timer foi criado.

## Evidências visuais

- [Quadro](../../design-proposals/glass-owl-v4/screenshots/screen-flow-board.png) e [painel móvel não modal](../../design-proposals/glass-owl-v4/screenshots/screen-flow-mobile-details.png).
- [Alunos desktop](../../design-proposals/glass-owl-v4/screenshots/students-batch-final-desktop.png) e [edição em tela estreita](../../design-proposals/glass-owl-v4/screenshots/students-mobile-edit.png).
- [Data na conferência](../../design-proposals/glass-owl-v4/screenshots/course-date-visible.png).
- Vagalumes: [antes](../../design-proposals/glass-owl-v4/screenshots/fireflies-final-before-idle.png) e [após espera](../../design-proposals/glass-owl-v4/screenshots/fireflies-final-after-idle.png).

## Limites

Nenhum teste de interpretação de arquivo real, editor completo, exportação MBZ, autenticação ou cadastro Moodle ocorreu. Contraste completo, leitor de tela e teste com professores permanecem pendentes. O teste não aprova o editor futuro; há roteiro concreto para a próxima avaliação.

O commit inicial registra também artefatos anteriores, cuja redação institucional foi generalizada. O inventário recebido mudou apenas de nome para `MOODLE_REFERENCE_PLUGIN_INVENTORY.json`, preservando dados e origem. Relatórios históricos mantêm seus resultados originais; essa normalização não representa reexecução dos testes antigos.

## Resultados estáticos e preparação do commit

- `node --check`: os oito scripts externos de v4 e `screen-flow.js` passaram; script embutido do catálogo também passou.
- HTML: IDs únicos no catálogo (69), protótipo (117) e quadro (28); referências locais inspecionadas sem ausências.
- Markdown: 37 arquivos próprios inspecionados antes dos relatórios finais; links locais resolvidos e sem menção institucional. Dependências em node_modules excluídas da verificação. JSON do inventário e registro da tarefa parseados.
- Auditoria inicial: 197 arquivos candidatos, cerca de 13,4 MB; nenhum acima de 5 MB. Dependências, tmp, índice CodeGraph e env excluídos pelo ignore; nenhuma assinatura de chave privada/token nos textos candidatos. Essa busca não substitui a leitura dos arquivos: `.codex/config.toml` contém caminhos locais e flags, sem credenciais.
- `codegraph sync`: quatro arquivos alterados sincronizados, 76 nós, 181 referências pendentes resolvidas; consulta ocorreu pela CLI, não pelo MCP da sessão.

O digest e os relatórios finais de especificação e qualidade acompanham este registro.

Atualização final após Tailwind e Q1: CSS compilado de 18.195 bytes, com utilities de flex, borda e breakpoints de 600/720 px; nove scripts externos e script do catálogo passaram em sintaxe. Auditoria de 201 arquivos (195 no digest, excluindo registro/relatórios mutáveis), 13.479.191 bytes, sem achados de tamanho, paths excluídos ou assinatura de credenciais. CodeGraph sincronizou novamente o JS do quadro: um arquivo, 21 nós. O índice permanece ignorado pelo Git.

Segundo ciclo de Q1: origem conectada porém oculta ao mudar Quadro → Lista passou a exigir visibilidade, tabIndex, habilitação e ausência de hidden/inert. O fallback é Detalhes. Navegador confirmou Quadro → cartão → Lista → Fechar e o mesmo caminho com Escape: foco em `toggle-details`, painel oculto. Repetido com foco interno no painel e mudança de 1280 para 360 px: foco em `toggle-details` visível, sem transbordamento. Fechar o detalhe inicial também usa esse fallback. Separado o token de fundo da Lista da interpolação para o scanner; recompilação de 18.270 bytes, cor computada da linha selecionada `rgb(239,245,236)`. Sintaxe do JS afetado passou, 39 documentos próprios sem links ausentes, CodeGraph sincronizou um arquivo/21 nós novamente. O restante do candidato permanece sem alteração funcional.
