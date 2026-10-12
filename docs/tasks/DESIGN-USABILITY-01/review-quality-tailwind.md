# Revisão de qualidade — continuação de Q1

Agente: /root/usability_quality_review. Candidato: `bf243fa80560e6048710c590ba633c802ba3fd18d9d22b5b49c4c9622d9291b5`. Resultado: changes-requested. Revisão somente leitura. 195/195 hashes conferidos nesse candidato antes da correção. `node --check docs/screen-flow.js` passou. Inspecionadas as duas capturas, sem navegador ou build próprios.

Semântica modal, trap e inert de Q1 foram corrigidos. O retorno de foco em screen-flow.js:150 ainda verifica somente isConnected. No desktop: fechar detalhes iniciais → selecionar cartão do Quadro → Lista → fechar detalhes/Escape. A origem salva continua conectada, mas está sob a board-region oculta. A restauração tenta focar um cartão invisível. A sequência também pode afetar fechamento por breakpoint.

Correção solicitada: usar origem apenas se conectada e visível/focável; caso contrário, focar Detalhes. Continuação de Q1, segundo ciclo formal.

P3: o token `aria-pressed:bg-[#eff5ec]` em screen-flow.js:142 ficou colado à interpolação, por isso não foi compilado. Separar com espaço e conferir a cor no próximo build. A6 possui uso efetivo de Tailwind no restante: fontes explícitas, comando na raiz, utilities de layout e controles, sem Preflight. Nenhum outro bloqueio concreto encontrado.
