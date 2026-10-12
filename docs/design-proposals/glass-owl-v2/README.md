# Proposta visual: vidro, verde e coruja

Protótipo independente para avaliar o design. Não altera a aplicação, seu escopo aprovado ou o pipeline do projeto. Os arquivos escolhidos ficam no navegador; não há upload, IA, cadastro ou conexão com Moodle.

## Direção antes da implementação

- Cores: névoa `#eef6f1`, vidro `#ffffff`, tinta `#173e30`, verde `#26764f`, menta `#b6d8be` e amarelo suave `#ebcd82` apenas nos detalhes da coruja.
- Tipografia: Trebuchet MS para títulos arredondados, Segoe UI para leitura e controles; sem fontes remotas.
- Composição: área de trabalho pontilhada; conteúdo alinhado à esquerda; três cartões pequenos escolhem arquivos, JSON ou alunos; uma superfície de vidro recebe a entrada escolhida. A coruja com chapéu aparece à direita e ao fundo.
- Movimento: somente a coruja e seus pequenos objetos próximos flutuam e giram devagar. Respeitar preferência por movimento reduzido e permitir pausar.
- Vidro: transparência, desfoque, reflexo na borda e sombra suave; campos recebem fundo mais opaco para manter legibilidade.

```text
marca                                     pausar animação

Prepare seu próximo curso.                    coruja 3D
Breve orientação.                         com chapéu

[ Arquivos ] [ JSON manual ] [ Alunos ]
[          entrada selecionada         ]
[                ação principal        ]
```

Revisão do plano: removemos a ilustração grande de materiais escolares e o painel dividido da primeira proposta. O pedido atual é uma área de trabalho simples com profundidade. Os três cartões representam entradas reais; a coruja concentra a personalidade visual. Evitar gráficos, menus e indicadores que não ajudam a começar.

## Explorar

Abra `index.html` diretamente ou sirva esta pasta por HTTP local. O modelo procedural usa Three.js r186, incluído em `vendor` com licença MIT. Os módulos oficiais `three.core.js` e `three.module.js` foram reunidos em duas funções isoladas, com os exports expostos em `window.THREE`; o bundle permite a prévia local sem imports no navegador ou serviços externos. Nenhuma dependência é instalada na aplicação.

- Arquivos: selecionar/arrastar DOCX, acrescentar materiais e abrir uma demonstração de revisão.
- JSON manual: editar um exemplo fictício e verificar somente a sintaxe. Um JSON parseável não comprova o contrato de curso.
- Alunos: formulário demonstrativo com prévia local; nenhum aluno é cadastrado.
- Prévia: identifica claramente os resultados simulados; não gera pacote Moodle.

Skill utilizada: `frontend-design`. Matt Pocock não é necessário para esta exploração visual; suas skills de PRD, arquitetura e testes continuam disponíveis no projeto para o trabalho correspondente.

Fonte da biblioteca: https://github.com/mrdoob/three.js/releases/tag/r186

## Verificação desta proposta

- Prévia inspecionada no navegador em desktop e em 360 px; corrigido o transbordamento da cena 3D. Em 360 px, a largura do conteúdo também é 360 px.
- Seleção do DOCX de exemplo e orientação sem arquivo; abertura da prévia de processamento sem enviar o documento.
- Erro de sintaxe JSON e prévia do exemplo parseável; cadastro demonstrativo usando Ana Exemplo e `ana@example.com`.
- Troca de entrada com setas do teclado, fechamento do diálogo com Escape e pausa/retomada da coruja.
- Temas claro/escuro e conferência do quiz no catálogo do design system continuam funcionando.
- JavaScript próprio e bundle passam na verificação de sintaxe. A versão final da prévia apresentou um canvas 3D e nenhum erro/aviso no console consultado.
- Contraste calculado para pares sólidos: texto/fundo 10,80:1; secundário/fundo 5,51:1; branco/ação 5,55:1. Isso não comprova todas as combinações de vidro nem substitui uma avaliação de acessibilidade.

As preferências de movimento reduzido e o fallback sem WebGL estão implementados, mas não foram emulados nessa verificação. Imagens da inspeção: `screenshots/desktop.jpg`, `screenshots/mobile.jpg` e `screenshots/design-system.jpg`.
