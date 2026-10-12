# V02-01 — Criar, revisar e exportar curso pelo editor

**Fontes:** V02 do [backlog](../BACKLOG.md), [design](../DESIGN_BRIEF.md) e [V01](../specs/V01-course-to-mbz.md). **Blocked by:** V01-02; spec detalhada do editor e operações/revisão fixadas. **Status:** planned. **Responsável previsto:** executor UI com contrato do integrador.

Professor cria curso com duas seções, edita atividades sem JSON, encontra pendências e solicita download da mesma revisão conferida.

- [ ] Usar Next/TypeScript e Tailwind, preservando a direção visual já definida.
- [ ] Usar o mesmo domínio; editar incrementa revisão e invalida validação/conferência anterior.
- [ ] Mostrar erros localizados, abrir campo pertinente e preservar rascunho após falha.
- [ ] Caminho manual funciona sem IA; controles só aparecem com comportamento implementado.
- [ ] Jornada, erro, teclado e largura de 360 px verificados no navegador.

IndexedDB e pacote portátil completo recebem ticket próprio na próxima especificação de persistência. Dados/anexos permanecerão no navegador conforme a decisão do mantenedor; a UI deve declarar o que foi salvo e o que foi copiado.
