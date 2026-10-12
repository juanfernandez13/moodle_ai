# Mascote procedural local

O componente `src/visual/owl/Owl3D.tsx` partiu do modelo em
`docs/design-proposals/glass-owl-v4/owl.js`. A revisão de 12/10/2026 em
`src/visual/owl/model.ts` suaviza o corpo, as asas, as orelhas e o bico,
aproxima os olhos menores dos discos de rosto creme e usa materiais
foscos. Capelo, cordão e olhos verdes permanecem. As geometrias são
procedurais; não há modelo externo baixado ou carregamento por CDN.

## Three.js

- Versão: r186, confirmada por `REVISION = '186'` no bundle.
- Fonte registrada no protótipo: https://github.com/mrdoob/three.js/releases/tag/r186
- Origem local: `docs/design-proposals/glass-owl-v2/vendor/three.browser.js`.
- `three.browser.js` é uma cópia byte a byte do bundle local aprovado. O
  protótipo reuniu `three.core.js` e `three.module.js` em duas funções
  isoladas que expõem `window.THREE`.
- Licença MIT, preservada em `LICENSE.three.txt` e no cabeçalho do bundle.
- SHA-256: `48a72b659ea420d53106960d0327328da1b91ba63e281da9dd40ed3e08349fda`.

## Marca e fallback

`brand-owl.svg` foi redesenhado localmente em 12/10/2026 para acompanhar
a coruja castanha e creme do modelo: capelo escuro, discos do rosto
suaves, olhos verde-musgo menores e bico arredondado. Usa formas SVG
originais desta aplicação. A cópia em `public/brand-owl.svg` mantém a
mesma identidade no cabeçalho. O fallback aparece no HTML inicial e
permanece visível quando WebGL ou o carregamento local não está disponível.
O ícone da barriga incorpora as formas e cores do `moodle-mark.svg`
local, com escala e posição adaptadas à barriga; sua atribuição segue abaixo.

`moodle-mark.svg` é uma cópia sem alteração do ícone local do protótipo,
usado somente como textura transparente no peito. Contém o primeiro e
último `path` do SVG oficial, com formas, estilos e cores preservados;
as demais letras foram removidas e o viewBox é `0 73 345 238`.

- Fonte oficial: https://github.com/moodle/moodle/blob/f20534726a59a4b64d168bc4a70fc9518251613e/public/pix/moodlelogo.svg
- Revisão: `f20534726a59a4b64d168bc4a70fc9518251613e`.
- Git blob da fonte: `6f883fcf313c39a512a41028a43d62518b326d1c`.
- SHA-256 da fonte: `512448fbd83d378c0be0160f06dc3e877ec41f634c81604bdccc29702e7ef7c4`.
- SHA-256 do ícone local: `a16e54c7a4f21a4f012d6688b0fe16fe2361fb4b8aa299044ef1b7fbf432b2b4`.
- Condições da marca: https://github.com/moodle/moodle/blob/f20534726a59a4b64d168bc4a70fc9518251613e/TRADEMARK.txt

Não houve nova obtenção de assets para esta revisão. Os hashes em
`tests/visual/delivery.json` registram a entrega histórica anterior e não
validam o modelo ou o fallback refinados. O hash SHA-256 atual do fallback
está registrado abaixo; a conferência visual da revisão pertence ao gate
da aplicação integrada.

- SHA-256 de `public/three-owl/brand-owl.svg` e `public/brand-owl.svg`:
  `f08e80cbabd0c7470ffdaada2ada2f950df72e2dc0178110249bdb025d51bc63`.

## Integração

```tsx
import Owl3D from "@/src/visual/owl/Owl3D";

<Owl3D theme="light" />
```

Props opcionais: `theme: 'light' | 'dark'`, `paused: boolean` e
`className: string`. O import normal é seguro: o componente cliente só
carrega o runtime e o Three local após montar. CSS module próprio reserva
110 × 118 px no desktop e 88 × 100 px até 600 px. A mascote é decorativa,
não recebe foco nem intercepta o ponteiro.

`paused` e `prefers-reduced-motion` produzem uma pose estática com olhos
abertos. Aba oculta e saída da viewport cancelam o loop; retomada não
avança o tempo ausente. Desmontagem remove listeners, observers e canvas,
cancela o frame, libera geometrias, materiais, textura e renderer e encerra
o contexto. A biblioteca compartilhada é carregada uma vez na página.

Os testes usam a biblioteca local real para montar as geometrias, com
renderer e eventos simulados. A revisão visual em navegador pertence ao
gate da aplicação integrada; estes testes não medem desempenho de GPU
em dispositivos físicos.
