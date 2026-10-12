# Evidência TDD da CLI

Integrador `/root`, interface observada: processo `node src/cli/validate-draft.ts` (stdout JSON, stderr, exit code). Windows/Node 24.19.0. Testes executados incrementalmente por `node --test tests/cli/validate-draft.test.ts`.

1. Argumento ausente: red 0/1, saída 1 em vez de 2 por script ainda inexistente; green 1/1 após diagnóstico de uso.
2. Fixture válida: red 1/2, saída 2 em vez de 0 por stub; implementação leu arquivo/chamou validateDraft. Corrigida expectativa do teste de anexos: fixture escrita independentemente pelo executor tem três referências, não uma. Green observado na execução do terceiro ciclo.
3. JSON malformado: red 2/3, stdout vazio causava erro ao ler resultado e stderr bruto; green 3/3 após diagnóstico invalid_json sem conteúdo de origem.
4. Arquivo ausente/diretório: red 3/4, saída 1 em vez de 2; green 4/4 após diagnóstico file_error.
5. Limite 1 MiB: red 4/5, saída 1 em vez de 2; green 5/5 após leitura limitada a 1 MiB + 1 byte e fechamento do handle em finally. Não usa process.exit imediato; deixa stdout drenar.

Testes das três fixtures de domínio e equivalência do compilado são verificações adicionais de integração, sem alegação de novo ciclo TDD para regras já implementadas pelo executor.
