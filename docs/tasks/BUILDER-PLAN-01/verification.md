# Verificação do plano do builder

**Data:** 12 de outubro de 2026. **Candidato:** digest em `candidate.json`; conjunto formado por `docs/BUILDER_PIPELINE_PLAN.md` e `GLOSSARY.md`.

O integrador leu o conteúdo dos dois documentos, os requisitos do usuário e suas respostas: persistência somente no navegador, com projeto exportável/importável; Moodle alvo é o ambiente de referência, com número ainda desconhecido. Os documentos preservam esses limites e não iniciam implementação.

Verificação local por Python, executada no diretório Moodle-AI com código 0: todas as referências Markdown locais resolvem para arquivos existentes, cercas de código estão balanceadas e o digest de cada arquivo está registrado no manifesto. Há um diagrama Mermaid; sua sintaxe foi inspecionada, sem alegação de renderização automatizada. Inspeção de conteúdo confirmou relação explícita com PRD/arquitetura/backlog e distinguiu proposta, capacidade legada, lacuna e execução futura.

A inspeção do legado foi dividida com `/root/legacy_inventory`, somente leitura. Foram conferidos `builders.js` para os três tipos reais (`multichoice`, `match`, `essay`), `extractor.js` para o contrato de questões e `fileStore.ts` para IndexedDB. O inventário aponta perda de multiplicidade, coexistência chat/tarefa, anexos sem bytes, caminhos de cliente, merge de documentos grandes, normalização de notas e falhas parciais; o plano inclui aceites para tratá-los.

Pesquisa oficial, com leitura das páginas: especificação WebMCP de 9 de outubro de 2026 e documentação Chrome confirmam `document.modelContext` e status experimental; README moodlehq/moodle-docker confirma ambiente de testes e código Moodle separado; documentação Moodle confirma CLI de restauração e local administrativo para consultar versão; tabela de releases confirma situação do alvo histórico 4.1. Os links sustentam os fatos correspondentes, não a execução da arquitetura proposta.

Diagnósticos reais: `npm.cmd run codegraph:status` retornou código 0, índice com mudanças pendentes; MCP CodeGraph não está exposto nesta sessão. `docker version --format ...` encontrou CLI 27.3.1, mas falhou ao consultar o pipe do daemon Linux. Não foram iniciados containers, instaladas dependências ou testada restauração.

Não foram executados typecheck, lint, build, testes de aplicação, testes com IA real ou navegador do builder: a mudança é de planejamento e a aplicação não está implementada. O checker histórico `tmp/check-docs.py` rejeita qualquer menção a ambiente de referência; ele não foi usado como gate deste plano, que precisa documentar explicitamente o perfil institucional solicitado. A verificação local de links não estabelece essa proibição incompatível com o novo escopo.

As revisões originais foram recebidas em contextos independentes e preservadas em `review-spec-original.md` e `review-quality-original.md`. Uma correção incorporou prompt externo, prévia DOCX/PDF e configurações de presets personalizados na portabilidade. Os caminhos citados de `CopyPromptButton.tsx`, `api/prompt/route.ts` e `FileViewer.tsx` foram conferidos diretamente. O novo candidato deve passar pelas duas revisões antes de aceitação.

O digest agregado é SHA-256 do UTF-8 produzido por `json.dumps(files, sort_keys=True, separators=(',', ':'))`, preservando ordem dos arquivos. Cada entrada registra path, hash dos bytes, linhas e palavras; a regra também aparece em `candidate.json`.

As revisões finais foram recebidas: `review-spec.md` e `review-quality.md`, ambas passed no candidato `sha256:036ee62813d129e2a870bf91ba7a0e151df82837b14a87c2c9fcb44bbf46ab2b`. Todos os aceites A1–A7 foram satisfeitos como planejamento. Houve uma correção de duas permitidas. Aceitar a documentação não significa aprovar implementação, declarar compatibilidade ou liberar publicação.
