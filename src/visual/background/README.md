# Fundo interativo

`InteractiveBackground` é decorativo e conserva as props públicas
`enabled: boolean` e `theme: 'light' | 'dark'`. Fica fixo em `z-index: 0`,
sem capturar ponteiro ou teclado nem transformar o formulário.

A paisagem usa a biblioteca Three.js r186 já aprovada em
`public/three-owl/three.browser.js`, carregada pelo loader compartilhado
da coruja, somente como dependência de leitura. Não acrescenta pacote,
CDN, textura remota ou requisição externa. `three-types.ts` descreve apenas
a superfície local necessária ao cenário.

Há uma câmera perspectiva, três relevos contínuos com normais, céu,
névoa por distância e luz lateral coerente. Lâminas curvas são agrupadas
em tufos com altura, direção e cor variadas. Um pequeno bosque lateral
usa troncos, galhos e copas com geometria irregular. O vale central
permanece calmo para o painel de vidro; o detalhe próximo ocupa as bordas.
O resultado é uma interpretação procedural de campo, sem alegação de
fotorrealismo. As fotos locais anteriores aparecem somente no fallback.

O movimento de ponteiro desloca a câmera em até ±0,9 unidades no desktop
(±0,378 em composição compacta), com leve mudança de direção e altura.
O vento atravessa o campo em ondas lentas; o ponteiro dobra a vegetação
lateral próxima. Toque não depende de hover. Vagalumes laterais têm
brilho discreto no claro e maior no escuro.

O runtime limita o desenho a 30 quadros por segundo e a 1,6 milhão de
pixels de buffer. DPR é limitado a 1,25 até 600 px e 1,5 nas demais
larguras. Há 8.000 lâminas e 20 vagalumes no compacto, 16.000 e 34 no
desktop. Grama usa uma única chamada de desenho instanciada. Resize
reutiliza buffers; cruzar o limite de qualidade reconstrói a topologia e
descarta todos os recursos anteriores.

Movimento reduzido mantém o cenário 3D estático e centraliza a câmera.
Aba oculta e saída da viewport interrompem animação e desenho; retomar
não acumula o tempo ausente. Desligar `enabled` desmonta o runtime e
oculta o cenário e remove o canvas do DOM. Religar cria um canvas novo,
pois o contexto nativo do anterior foi liberado. Dispose é idempotente e libera listeners, observers,
frame, geometrias, materiais, listas do renderer, contexto e buffer.

`data-field-state` identifica `interactive` (WebGL com movimento),
`static` (WebGL sem movimento) e `fallback` (carregamento ou WebGL
indisponível). Perda de contexto interrompe o loop e revela a foto local;
restauração redesenha com o tema atual. Falha na construção ou desenho
libera os recursos e mantém o fallback. A proveniência das fotos está em
`public/LANDSCAPE_SOURCE.md`.

Os testes carregam as classes reais do bundle local e substituem apenas
o renderer. Exercitam orçamento, geometria enraizada no terreno,
proteção do centro, ponteiro/toque, pausa, restauração, descarte e falhas.
Não compilam os shaders nem comprovam aparência ou desempenho de GPU;
esses pontos exigem conferência no navegador da aplicação integrada.
