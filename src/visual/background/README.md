# Fundo interativo

`InteractiveBackground` é um componente cliente decorativo, com props
obrigatórias `enabled: boolean` e `theme: 'light' | 'dark'`.

```tsx
import InteractiveBackground from "@/src/visual/background/InteractiveBackground";

<InteractiveBackground enabled={scene} theme={dark ? "dark" : "light"} />
```

Substitui a camada `.landscape` do Shell. O CSS module fixa o wrapper atrás
da área de trabalho, em `z-index: 0`, sem capturar ponteiro ou teclado. O
formulário e a aplicação não recebem transformações.

A foto local existente é a camada distante. A névoa e uma luz ambiente
radial formam a camada média. O canvas 2D transparente desenha partículas
e vegetação nas laterais, com resposta ao ponteiro e vento discreto.
O parallax máximo da foto é 6,3 px na horizontal e 4,2 px na vertical;
atmosfera e primeiro plano têm profundidades diferentes. Essas camadas
compõem profundidade visual com fotografias e canvas 2D; não são um modelo
3D da paisagem.

As imagens `/meadow-day.png` e `/meadow-dusk.png` permanecem sem alteração.
Sua proveniência e prompts originais estão em `public/LANDSCAPE_SOURCE.md`.
Não há novos assets, biblioteca, dependência, CDN ou acesso externo.

O desenho fica limitado a 30 quadros por segundo, 1,6 milhão de pixels de
backing buffer, DPR 1,25 até 600 px e 1,5 nas demais larguras. O orçamento
compacto é de 12 partículas e 30 lâminas; desktop usa 24 e 56. Os elementos
ficam nas laterais, deixando o centro protegido para leitura. Toque não
depende de hover e não é impedido pelos listeners passivos.

Desligar `enabled` desmonta o runtime e oculta o fundo. Movimento reduzido
produz uma composição estática e centraliza o parallax. Aba oculta e saída
da viewport cancelam o loop; retomar não avança o tempo ausente. Dispose
é idempotente: remove listeners e observers, cancela o frame, apaga as
variáveis de profundidade e libera o buffer do canvas. Falha ou ausência
de Canvas mantém as fotos estáticas; falha durante desenho também limpa
os recursos.

Os testes exercitam fronteiras de DPR/pixels, 360 px, coordenadas fora do
quadro, pausa, toque, desligamento e retomada, limpeza e fallback. O
contexto Canvas e os eventos são simulados. A conferência visual real e
o desempenho em aparelhos físicos pertencem ao gate da aplicação integrada.
