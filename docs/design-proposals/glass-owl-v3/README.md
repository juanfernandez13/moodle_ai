# Vidro e coruja — terceira proposta

Iteração de design isolada. Arquivos, JSON e alunos continuam sendo estados locais de uma demonstração, sem processamento, envio de dados ou operação no Moodle.

## Plano e revisão antes de construir

- Paleta clara: névoa `#EEF6F1`, tinta `#173E30`, secundário `#4F685B`, verde `#26764F`, menta `#B6D8BE` e branco `#FFFFFF`. Tema escuro: fundo `#14241C`, texto `#EAF4EC`, ação `#A5D6AE` e vidro neutro.
- Tipo: Nunito variável, hospedada nesta pasta com licença OFL. Uma família arredondada para títulos, campos e botões.
- Composição: header com troca de entrada, tema, cenário e pausa; um painel principal à esquerda e dois cartões menores empilhados à direita. Em tela pequena, tudo passa para uma coluna.
- Vidro: painel translúcido, reflexo na borda, desfoque e sombra suave. Campos têm fundo mais opaco. Botões usam formato de cápsula.
- Coruja: apenas cabeça e chapéu, tons neutros; uma escultura 3D simplificada com disco facial em forma de coração e olhos pequenos. O olhar acompanha o ponteiro com amplitude limitada. Sem corpo, livros, lápis ou giro contínuo.
- Cenário: campo ao entardecer, estrelas e uma árvore atrás dos cartões, inspirado no [vídeo indicado pelo usuário](https://x.com/Guronnimo/status/2108818974347526387). Grama com geometria instanciada e nuvens procedurais em Three.js; a troca claro/escuro muda a atmosfera. A cabeça da coruja fica acima dos cartões laterais, próxima da árvore. O header também permite voltar aos pontos. Uma paisagem SVG cobre a ausência de WebGL.

```text
marca                  Arquivos | JSON | Alunos     tema / pausa

Prepare seu próximo curso.                  cabeça da coruja

[                               ] [ outra entrada          ]
[       entrada principal       ] [ botão                  ]
[                               ] [------------------------]
[       ação principal          ] [ terceira entrada       ]
[                               ] [ botão                  ]
```

Revisão: a proposta anterior tinha três cartões semelhantes antes do formulário e uma mascote com corpo e olhos grandes. Esta versão dá mais área ao trabalho, diferencia a hierarquia dos cartões e concentra a troca de visualização no header. O modelo é uma escultura procedural, não uma reprodução fotorealista de um animal.

O runtime Three.js r186 é compartilhado com `../glass-owl-v2/vendor/three.browser.js`, com licença MIT preservada. Nenhuma dependência é instalada na aplicação. A fonte [Nunito](https://github.com/google/fonts/tree/main/ofl/nunito) está incluída com licença OFL.

O cenário usa uma chamada de desenho para a grama (75 mil lâminas em desktop, 26 mil em tela estreita ao carregar). A densidade de pixels é limitada. Movimentos pausam com a preferência de movimento reduzido, controle manual e aba oculta; o campo também pausa quando se seleciona o cenário pontilhado. São decisões para a demonstração, sem orçamento de desempenho medido em dispositivos de baixa potência.

Abra `index.html` ou a prévia incluída em `design-system.html`. A aplicação permanece em planejamento.

## Verificação da proposta

- Scripts do protótipo e script embutido do design system passaram na conferência de sintaxe.
- Navegador: alternância pelo header e cartões laterais; setas e Home nas abas; Escape no diálogo; arquivo ausente; JSON inválido e exemplo válido; prévia de aluno fictício; tema claro/escuro; cenário pontilhado; pausa manual.
- Tema da página de revisão e da prévia sincronizado nos dois sentidos. Exemplo do editor preservado, incluindo a pendência do quiz.
- Inspeção visual em desktop e 360 px, sem rolagem horizontal da página. A cabeça decorativa é omitida abaixo de 340 px para preservar a leitura.
- O protótipo independente terminou sem erros ou avisos de console. Na página de revisão, o navegador registrou um erro de `MutationObserver` sem arquivo de origem; os scripts desta proposta não usam essa API. A origem ainda precisa ser identificada; os controles inspecionados funcionaram.
- Movimento reduzido e ausência de WebGL têm tratamento no código, mas não foram emulados nesta verificação. Desempenho em aparelhos físicos, contraste composto e testes com usuários ficam pendentes.

Capturas: [campo escuro](screenshots/desktop-dark.jpg), [campo claro](screenshots/desktop-light.jpg), [pontos](screenshots/dots-dark.jpg), [celular](screenshots/mobile-dark.jpg) e [design system](screenshots/design-system.jpg).
