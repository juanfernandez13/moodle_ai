# Revisão independente de qualidade — primeiro candidato

Agente: /root/usability_quality_review. Candidato: `61f87e366576dc691a9e2bd958b05a383e4dd4a916ba14412b32d53b11747beb`. Resultado: changes-requested. Integridade: 194/194 hashes conferem. Revisão somente leitura, estática e com capturas, sem execução própria do navegador.

## Q1 / P2 — inspetor móvel e teclado

`screen-flow.js:149–152` aplica `role=dialog` e `aria-modal=true`, mas deixa inertes somente quadro e lista. Cabeçalho, abas, toolbar e rodapé continuam operáveis; o trap global de Tab em 188–193 impede chegar a esses controles por teclado. Em largura até 720 px, selecionar um cartão reproduz essa diferença entre ponteiro e teclado.

Corrigir como painel não modal: remover aria-modal e trap global, mantendo foco inicial e Escape com retorno ao acionador. A mudança de breakpoint em 234 também deve devolver foco quando ocultar um controle focado no inspetor. Isso atende A4 e a regra de navegação em tela estreita.

Não identificados outros bloqueios concretos nos estados dos alunos, validação, CSVs/Blob URLs, retorno de modos, dependências locais ou controle de movimento. Leitor de tela e aparelhos físicos continuam pendentes.
