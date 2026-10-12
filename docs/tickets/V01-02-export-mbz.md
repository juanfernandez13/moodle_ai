# V01-02 — Exportar o rascunho validado e conferir o MBZ

**Spec:** [V01](../specs/V01-course-to-mbz.md). **Blocked by:** V01-01; contrato de exportação, capacidades, configuração de notas/módulos e fixtures definidos após inventário do core. **Status:** planned. **Responsável previsto:** executor exportador.

Uma pessoa gera um MBZ de curso fictício válido sem IA. O pacote preserva o conjunto revisado e recusa combinações/arquivos que ainda não consegue exportar. O CourseGen-AI é somente referência; o núcleo incorporado pertence ao novo projeto.

- [ ] Fixar entrada/resultado/erros de `exportCourse` e mapa de capacidades antes de delegar.
- [ ] MBZ descompacta; XML e referências cruzadas são válidos.
- [ ] IDs Moodle próprios preservam todas as atividades/questões e seus vínculos; nenhuma atividade é truncada silenciosamente.
- [ ] Anexos resolvidos por ID preservam bytes/hashes; referência sem bytes bloqueia geração.
- [ ] Dados inválidos não geram pacote; temporários são limpos inclusive em falha parcial.
- [ ] Testes de regressão pertinentes do core incorporado passam; política pedagógica é opcional.

Evidência de integridade local não declara restauração. V01-04 é o gate de compatibilidade.
