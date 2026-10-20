# Coruja Redonda, ícone Moodle e fonte Switzer

## Coruja Redonda

`brand-owl.svg` é a coruja Redonda do Moodle IA, desenhada para o projeto em 18/10/2026. Usa formas chapadas, sem gradientes, sombras, texturas, fontes ou dependências externas, com `viewBox="0 0 120 130"`. Um contorno claro fino some sobre fundo claro e separa a silhueta em fundo escuro. Aparece como mascote decorativa ao lado do título do painel de entrada.

O M laranja no peito é o primeiro `path` de `moodle-mark.svg`, com os mesmos comandos e valores numéricos; só os espaços e quebras de linha foram removidos. Ele é posicionado com `transform="translate(41.44 82.43) scale(.09)"`. A Redonda não usa o chapéu oficial: o capelo é um desenho próprio.

`brand-owl-mark.svg` é só a cabeça da Redonda, com `viewBox="0 0 64 64"`, para usos de 16 a 40 px: marca do cabeçalho e favicon. `favicon.svg` é uma cópia idêntica dele.

- SHA-256 de `brand-owl.svg`: `32ddab714148f982e70a255251bb5581e0027bac0ac074d5bbc8d51617a74169`.
- SHA-256 de `brand-owl-mark.svg` e `favicon.svg`: `ea1223b0488dde19a7f1f53550850cb0d95756468e975b44a1a3322bcc91bb38`.

## Ícone oficial Moodle

`moodle-mark.svg` contém o M laranja com chapéu do logotipo oficial Moodle. Fonte: [`public/pix/moodlelogo.svg` no repositório oficial](https://github.com/moodle/moodle/blob/f20534726a59a4b64d168bc4a70fc9518251613e/public/pix/moodlelogo.svg), revisão `f20534726a59a4b64d168bc4a70fc9518251613e`. Obtido em 12/10/2026.

Extração: primeiro e último `path` do SVG original, com os atributos `d` e `style` preservados. Apenas as outras letras foram removidas e o `viewBox` foi ajustado para `0 73 345 238`, com pequena margem transparente. Cores originais: `#F98012` e `#333333`. Nenhuma forma foi redesenhada.

Como o M da Redonda é copiado desse arquivo, os dois devem mudar juntos.

Hashes para conferir a proveniência:

- Git blob da fonte: `6f883fcf313c39a512a41028a43d62518b326d1c`.
- SHA-256 da fonte: `512448fbd83d378c0be0160f06dc3e877ec41f634c81604bdccc29702e7ef7c4`.
- SHA-256 do ícone local: `a16e54c7a4f21a4f012d6688b0fe16fe2361fb4b8aa299044ef1b7fbf432b2b4`.

As condições de uso da marca estão no [`TRADEMARK.txt` oficial](https://github.com/moodle/moodle/blob/f20534726a59a4b64d168bc4a70fc9518251613e/TRADEMARK.txt).

## Fonte Switzer

`fonts/Switzer-Variable.woff2` (normal) e `fonts/Switzer-VariableItalic.woff2` (itálico) são a Switzer, versão 1.200, variável, com pesos de 100 a 900, da Indian Type Foundry (ITF). Origem: Fontshare (fontshare.com). Os arquivos foram salvos no projeto em 18/10/2026 e são usados sem alteração.

Créditos gravados nos próprios arquivos: “Copyright 2015-2021 Indian Type Foundry. All rights reserved.” e “Switzer is a trademark of the Indian Type Foundry.” Desenho de Jeremie Hornus. Fabricante: [Indian Type Foundry](https://indiantypefoundry.com).

Licença: ITF Free Font License, conforme os [termos](https://fontshare.com/terms), endereço que consta na tabela `name` dos dois arquivos. Regras do projeto:

- Hospedagem própria, a partir de `public/fonts/`, sem CDN.
- Não modificar, subconjuntar nem converter os arquivos.
- Nunca colocar a fonte em repositório público, no `.mbz` gerado nem no conteúdo do curso.
- Manter o crédito de titularidade da ITF no README.

Hashes para conferir os arquivos (SHA-256):

- `Switzer-Variable.woff2`: `d1bf801ffb1a6096def70a7c532255722ad87d948b13a8a586e342f7091f8ee4`.
- `Switzer-VariableItalic.woff2`: `bf66eb64d539c68c9ebc455e7776cbfcf16cf3cae8b57ce1930e0f0f6ab32a49`.
