# Natureza interativa — referências visuais

Pesquisa de 12/10/2026 para revisar apenas o cenário e o acabamento de vidro do protótipo. Direção pedida: natureza interativa com aparência mais real. Documento, Tarefas e Quizzes continuam visíveis; a implementação da aplicação não começou.

## Referências selecionadas

| Referência | Evidência da pesquisa | O que aproveitar na direção visual |
| --- | --- | --- |
| [Three.js Grassworks — demonstração](https://grassworks.techredux.co/demo) | Demonstração aberta no navegador. Vegetação com lâminas curvas, variação de alturas e densidade, iluminação e interação em uma cena navegável. O painel oferece vento, altura e qualidade. | Tufos irregulares, movimento coerente pelo campo e diferença entre áreas iluminadas e sombreadas. |
| [Below the Grassland — Ameen Abdullah](https://below-the-grassland.ameen-abdullah.dev/) | Experiência aberta no navegador. Campo próximo à câmera, vegetação em camadas, flores, atmosfera e profundidade. O autor descreve vento, chuva e tratamentos de imagem em WebGPU. | Profundidade, variação natural de cor e foco, vento lento e vegetação com volume. |
| [Selva — Isolume, estudo de caso](https://isolume.studio/work/selva) | Estudo de caso consultado; a experiência completa não foi exercitada. O autor descreve floresta WebGL com folhas fotográficas, materiais iluminados, névoa e caminho de câmera. | Separação entre primeiro plano, ambiente e distância; luz que encontra superfícies, em vez de cores planas. |
| [False Earth — Ming Jyun Hung](https://mingjyunhung.com/projects/false-earth) | Página do criador consultada. Descreve terreno procedural, vegetação em grupos, vento, reação ao personagem e detalhe por distância. A demonstração não foi exercitada nesta pesquisa. | Distribuição orgânica, coerência entre terreno e vegetação, reação localizada ao movimento. |

## Aplicação ao protótipo

A recomendação de design é um campo aberto visto a uma distância confortável, com luz suave, relevo orgânico, vegetação mais detalhada perto da câmera e distância suavizada pela atmosfera. A interpretação segue as características observadas nas referências; não é uma reprodução dos projetos.

- O vidro volta a revelar mudanças de cor e formas do cenário por trás: branco com opacidade de 60% a 30% no claro e preenchimento verde de 52% a 36% no escuro, com desfoque e reflexos nas bordas. Texto permanece opaco.
- A vegetação usa alturas, curvaturas, orientações e distribuição variadas. Vento atravessa regiões, com respostas diferentes por posição.
- O centro permanece calmo para leitura. A paisagem não exige dirigir uma câmera, caminhar ou configurar efeitos para usar o formulário.
- Ponteiro altera levemente a perspectiva e a vegetação próxima. Pausa manual, movimento reduzido e fundo alternativo permanecem disponíveis.
- Não adicionar chuva, som automático, personagem explorável ou muitos controles visuais ao fluxo de criação do curso.

Colinas lisas foram consideradas como estudo de composição, mas o novo pedido de realismo exige materialidade e vegetação. O resultado local continua sendo uma interpretação procedural em desenvolvimento; não é descrito como fotorealista.

## Fontes e limites

As referências orientam composição, iluminação e movimento. Não foi comprado, instalado ou copiado código de produtos, nem foram incorporados modelos ou texturas desses sites. Grassworks apresenta uma oferta comercial; esta pesquisa não escolhe esse produto como dependência.

O fato de as duas demonstrações terem aberto neste navegador não comprova desempenho em outros dispositivos. A qualidade do cenário local deve ser avaliada com o formulário e a coruja, nos dois temas e em tela estreita. Estabilidade visual, leitura e resposta dos controles têm prioridade sobre quantidade de vegetação.
