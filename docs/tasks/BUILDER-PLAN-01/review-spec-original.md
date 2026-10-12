# Revisão independente de especificação do candidato inicial

**Revisor:** `/root/review_spec`. **Candidato:** `sha256:13950907bcbc65c8f0a7381a87ba9a41cdf725c05c71f7c4c996e18083fcd201`. **Resultado recebido:** changes-requested.

Hashes, contagens e digest agregado foram confirmados antes e depois da revisão. A2, A3, A4, A5, A6 e A7 foram considerados satisfied. A1 foi marcado missing por dois fluxos expostos do legado ausentes da matriz explícita de paridade.

Finding F1, A1/P2: `UploadStep.tsx:281`, `CopyPromptButton.tsx:23` e `api/prompt/route.ts:6` expõem prompt copiável para geração de JSON em IA externa e retorno à revisão. `FileViewer.tsx:254` expõe visualização de DOCX/PDF. Adapters internos e importação JSON não asseguram o fluxo de prompt externo; prévia DOCX não registra prévia PDF. Registrar comportamentos e aceites próprios, sem definir layout ou alterar design.

O revisor conferiu proposta experimental WebMCP, ambiente moodle-docker, consulta oficial de versão Moodle e restauração CLI. Não alterou arquivos nem executou instalação/restauração. O integrador incorporará F1 e a melhoria opcional P3 da revisão de qualidade em uma correção localizada.

Este arquivo preserva o relatório recebido no candidato inicial; não constitui revisão do conteúdo após a correção.
