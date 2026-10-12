# FULL-01 — revisão independente de especificação, correção 1

Task / role / agent ID: FULL-01 / spec / `/root/contract_review_spec`.

Candidate revision: `sha256:98da4c329b360a5a3b78b4a08cf08d26ecb415ec543d35e6f9bfa464caa6f8c6`.

Base declarada: `645413365f4d0c8cec9bbc021c020a85a206f504`.

Decisão: **needs-fix**. Dois desvios concretos do editor impedem o aceite F2/F7. Este é um relatório parcial do candidato rejeitado; não concede aprovação final aos outros seis recortes.

## Integridade e limites da revisão

Recalculei SHA256 e tamanho dos 164 arquivos: 164/164 correspondem ao manifest, incluindo 149 marcados como alterados. O digest geral, SHA256 dos bytes UTF-8 de `JSON.stringify(files)`, coincide com a revisão acima. Reproduzi também os sete digests de feature. Uma nova conferência dos 164 hashes ao encerrar a inspeção não identificou mudanças.

Foram consultados FULL-01, PRD, arquitetura, AGENTS, OPS-01, registro/contexto da tarefa e skill project-loop. A inspeção parcial cobriu persistência/portátil/provenance/comandos e editor; importação/extração/providers/rotas; exportador/modelo/builders/perfil/rotas; modelos alunos/datas, adaptadores/rotas Moodle e evidências locais. Testes permanentes e snapshots foram usados para localizar cobertura, sem tomar narrativas dos autores como aprovação.

Não houve operação Git, alteração de fonte ou execução contra IFCE. Os únicos dados de Moodle examinados são evidências fictícias do laboratório `http://localhost:3211`.

O último check deste pin ainda estava em execução durante a inspeção. `check.exit.json` consultado continha apenas comando e exit 0, sem vínculo a este digest; `browser.md` ainda não existia. A instalação limpa possui exit 0 registrado. Esses resultados anteriores não servem para aprovar o pin final. O orquestrador autorizou encerrar com falha concreta antes da nova evidência de navegador.

## Escopos e digests

| Recorte exato do manifest | Digest | Estado desta revisão |
| --- | --- | --- |
| platform — 42 caminhos, configuração/shared/scripts/documentação/laboratório | `sha256:907aecd9d2ce5d5208d73dc48c3770420a59f05cbedd83c1433c58b34fe75233` | Inspeção parcial; sem aprovação final. F1/F8 exigem evidências finais vinculadas ao pin. |
| export — 13 caminhos, exportador/rota/fixtures/testes | `sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e` | Inspeção parcial; sem aprovação final. |
| import — 22 caminhos, importador/providers/rotas/fixtures/testes | `sha256:0f147e29de2731058e36b996c3bab5d421f03aa08697094cca5f2be9718c0706` | Inspeção parcial; sem aprovação final. |
| editor — 33 caminhos, aplicação/client/assets/testes | `sha256:87f74d7b36c18fb738fe97a0d9e33297b1670c3c986b618697a9e34371dac208` | **Rejeitado**: S1 e S2. |
| students — 6 caminhos, modelo/parser/rota/UI/testes | `sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a` | Inspeção parcial; sem aprovação final. |
| dates — 3 caminhos, modelo/UI/testes | `sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216` | Inspeção parcial; sem aprovação final. |
| operations — 30 caminhos, API/adaptadores/rotas/testes/evidência local | `sha256:b742f15d3b495db3f5a09bae281a67199aa01c36f9628c4583f2db1806cb3cc1` | Inspeção parcial; sem aprovação final. |

Os escopos exatos são os arrays `features[].files` do manifest. A soma de 149 caminhos corresponde aos alterados; os outros 15 arquivos do snapshot geral preservam a base. Nenhum dos recortes pode ser integrado como aprovado com base neste relatório parcial.

## Achados bloqueantes

### S1 / P2 — converter os instantes para UTC antes de exibir e editar

Critério: F2, datas editáveis e contrato coordenado que admite ISO com fuso; PRD R04/R07. O erro atravessa F5 quando a data alterada é exportada.

Locais: `src/client/components/activity-editor.tsx:49–50`, consumidores em `:632–643` e `:866–874`; `app/page.tsx:1537–1546` para início do curso.

Os inputs são rotulados UTC, mas `dateValue` corta a string original sem converter o fuso. `timestamp` grava o valor editado com `Z`. O início do curso repete o mesmo padrão. Uma data válida `2026-10-12T09:00:00-03:00` representa 12:00 UTC, porém o editor mostra 09:00 UTC. Alterar somente o minuto para 01 grava `2026-10-12T09:01:00Z`; a edição esperada após uma apresentação correta seria `2026-10-12T12:01:00Z`. O instante persistido fica três horas antes do esperado. Abertura, fechamento, primeira sessão do chat e início do curso são afetados; a validação do domínio aceita o resultado, portanto não impede o erro.

Reprodução independente: extraí as duas declarações reais do componente, transpilei com a dependência TypeScript existente e executei em memória com `node --input-type=module`, exit 0. Entrada e resultados observados:

```json
{
  "original": "2026-10-12T09:00:00-03:00",
  "actualUtc": "2026-10-12T12:00:00.000Z",
  "label": "Abertura (UTC)",
  "shown": "2026-10-12T09:00",
  "afterEditingMinute": "2026-10-12T09:01:00Z",
  "expectedIfUtcLabelCorrect": "2026-10-12T12:01:00Z"
}
```

Comando reproduzível, sem escrever fontes:

```js
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync('src/client/components/activity-editor.tsx', 'utf8');
const helpers = source.split('\n').filter(line =>
  line.startsWith('const dateValue') || line.startsWith('const timestamp')
).join('\n');
const js = ts.transpileModule(helpers, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 }
}).outputText;
const { dateValue, timestamp } = Function(js + ';return {dateValue,timestamp}')();
console.log(dateValue('2026-10-12T09:00:00-03:00'));
console.log(timestamp('2026-10-12T09:01'));
```

Ação: usar conversão por instante para a apresentação UTC em todos os quatro campos e uma conversão de entrada comum. Acrescentar regressões com `-03:00` e `+02:00`, verificando display UTC e instante depois de editar.

### S2 / P2 — paginar tabelas grandes também no conteúdo rico

Critério: F7 e restrição explícita posterior em `docs/specs/FULL-01-application.md:45`: evitar páginas/formulários longos e paginar tabelas grandes; PRD R14.

Locais: `src/client/components/content.tsx:72` (prévia) e `:279` (editor); `app/globals.css:1080–1084`.

Ambos os componentes renderizam `block.rows.map(...)` integralmente. Não há paginação, seleção de faixa ou limite de linhas visíveis nesse componente. A classe `table-scroll` possui somente overflow auto, largura e margem, sem conter a altura do formulário. O contrato aceita 100 linhas; uma tabela válida com 100 linhas e uma célula de texto por linha produz 100 textareas ao expandir o bloco, formando uma página longa. Recolher outros blocos ou paginar cinco atividades não reduz essa tabela. Alunos e datas já paginam suas tabelas, mas esta superfície continua sem o comportamento exigido.

Reprodução por inspeção: inserir/importar um bloco table válido com 100 linhas de texto; abrir “Organizar texto, imagens e tabelas”. O editor percorre e exibe as 100 linhas, e a prévia faz o mesmo. Cada célula tem textarea com altura mínima de 65 px, além de rótulos/padding. Não há botão de próxima página.

Ação: paginar linhas na edição e na prévia, mantendo índices reais, IDs e dados de todas as linhas; o diagnóstico de uma célula fora da página atual deve abrir a página correspondente. Verificar teclado e 360 px com tabela além da primeira página.

## Evidências restantes antes de aprovação

Após a correção, congelar novo manifest/digest e repetir checks relevantes. Consultar `check.exit.json` e `browser.md` finais vinculados à nova revisão antes de qualquer pass. Confirmar especificamente offset UTC e tabela grande, além da jornada completa, cinco atividades por página, blocos recolhidos, teclado/360 px/temas e preservação de provenance.

As evidências examinadas de laboratório registram Moodle real local 4.1.17 Build 20250317, restaurações e readback fictícios. Elas não comprovam a referência 4.1.17+ Build 20250321 nem outras instâncias. A revisão final ainda deverá conferir a semântica dos snapshots e a cobertura dos sete recortes, distinguindo simulação de chamadas reais. Este relatório não aprova F1–F8 por inteiro.
