# BG01 — cenário interativo local

Pedido direto do usuário em12/10/2026: integrar o fundo interativo da aplicação. O cenário aprovado de prado claro/crepúsculo mantém sua identidade, acrescentando resposta visível ao ponteiro com profundidade/parallax, luz ambiente e partículas suaves. A coruja 3D é uma funcionalidade separada.

Componente cliente `src/visual/background`, com enabled/theme explícitos, integrado ao Shell. Nenhuma transformação é aplicada ao formulário. A camada decorativa é aria-hidden e pointer-events:none; cliques, seleção de texto, foco e scroll continuam pertencendo à interface. Fundo desliga completamente animação e eventos; tema muda aparência sem recriar loops desnecessários.

Prefers-reduced-motion apresenta composição estável. Toque não exige hover. Aba oculta, cenário fora de viewport e desmontagem cancelam RAF/listeners/observers. DPR e quantidade de partículas são limitados; falha de canvas conserva o cenário estático. Sem dependências novas, CDN, chamadas de rede externas ou dados reais.

Aceite: fonte local/licenças preservadas, interação visível de ponteiro no navegador, Fundo ligado/desligado e temas, dimensões360px sem overflow, formulário acessível e lifecycle verificado com testes significativos. Candidato congelado, revisão independente pelos dois eixos de FULL-01, branch própria e merge local na main após aceite.
