# Coruja e caderno (v5)

Planejamento do redesign de 18 a 20/10/2026, já aplicado no app. Aqui ficam as telas finais, os fluxogramas, o design system em texto e o gerador dos fluxogramas. As versões editáveis estão no Claude Design (privadas, só para a conta do projeto):

- Design system “Moodle IA”: <https://claude.ai/artifact/Nb59WCuqbzecsU15PGLGV7>
- Fluxos de navegação: <https://claude.ai/artifact/UYpCjS2RNmX81UigWYLfQx>

## Pastas

| Pasta | O que tem |
| --- | --- |
| [`telas/`](telas/) | O app em 1366 × 768 (notebook), com dados fictícios, rodando local. Nenhuma tela rola a página. |
| [`fluxos/`](fluxos/) | Os oito quadros de navegação, do mapa do semestre aos erros. |
| [`antes/`](antes/) | O app antes do redesign (coruja e paisagem 3D), para comparar. |
| [`design-system/`](design-system/) | Regras de voz, cor, tipografia, superfície, movimento e acessibilidade (`README.md`), tokens em JSON e CSS, e o CSS dos componentes. Sem a fonte. |
| [`fonte-fluxos/`](fonte-fluxos/) | O gerador dos quadros: especificações (`specs/`), quadros (`boards/`), alturas medidas e ícones. |

### Telas

1. [Criar disciplina](telas/01-criar-disciplina.png) · [Importar JSON](telas/02-importar-json.png) · [Criar manualmente](telas/03-criar-manualmente.png)
2. [Caderno do curso](telas/04-caderno-do-curso.png) · [Conferir o curso](telas/05-conferir-o-curso.png) · [Seu curso está pronto!](telas/06-curso-pronto.png)
3. [Alunos: enviar planilha](telas/07-alunos-enviar-planilha.png) · [Preencher à mão](telas/08-alunos-preencher-a-mao.png) · [Conferir](telas/09-alunos-conferir.png)
4. [Datas: entrar](telas/10-datas-entrar.png) · [Novas datas](telas/11-datas-novas-datas.png) · [Conferir](telas/12-datas-conferir.png)
5. [Criar disciplina no tema escuro](telas/13-criar-disciplina-escuro.png)

### Fluxogramas

1. [Mapa do semestre](fluxos/01-mapa-do-semestre.png) · [Como ler os quadros](fluxos/02-como-ler.png) · [Coruja e fundo](fluxos/03-coruja-e-fundo.png)
2. [Do planejamento ao curso no Moodle](fluxos/04-do-planejamento-ao-moodle.png) · [Caderno e pendências](fluxos/05-caderno-e-pendencias.png)
3. [Cadastrar alunos](fluxos/06-alunos.png) · [Ajustar datas](fluxos/07-datas.png) · [Nenhum erro sem saída](fluxos/08-nenhum-erro-sem-saida.png)

## Decisões

| Decisão | Por quê |
| --- | --- |
| Uma coruja 2D, a “Redonda”, com o “m” do Moodle na barriga. Sem 3D, nada se mexe sozinho. | A coruja 3D e a paisagem 3D causavam estranheza e não traziam o tom educativo. |
| Fundo de folha de caderno parada; painéis de vidro leve (blur 3px) por cima. Campos, tabelas e cartões internos são opacos. | O caderno dá o contexto de escola; o vidro deixa a pauta aparecer. Com menos transparência, alto contraste ou sem suporte, o painel fica opaco. |
| Só Switzer, sem serifa. Títulos 600, rótulos e botões 500, texto 400, nada em 700. Linhas de 1px. Números centralizados em círculos. | Bordas grossas e fontes pesadas tiravam o ar minimalista. |
| Pouco texto, um botão principal por passo, passos numerados, sem jargão. | Um professor mais velho, sem contexto, precisa entender sozinho o que fazer. |
| Botão desativado é cinza. | Fica claro que ainda falta algo antes de seguir. |
| Usar a largura; sem rolagem da página em 1280 × 720 e 1366 × 768. | No notebook sobrava espaço dos lados e faltava embaixo. |
| Criar disciplina: alternância **Importar arquivos \| Criar manualmente**; a Matriz é um arquivo só (“Enviar arquivo”); Tarefas e Quizzes são áreas de arrastar; a IA é um select com “Adicionar chave…”; o botão principal é “Enviar para análise”. No rodapé, só “Importar JSON” e “Copiar prompt”; “Ver exemplo” fica dentro de Importar JSON. | Segue o esboço do usuário. “Sem IA” era o mesmo que Criar manualmente; “Tópicos ou semanas” a IA descobre pelo documento; “Ver seus últimos cursos” virou o link “Seus cursos (N)” ao lado dos passos. |
| A chave de IA digitada fica só na memória da aba. A do servidor fica em `.env.local`, e a tela só diz se ela existe. | Nenhuma chave em `localStorage`, cópias ou registros. |
| Até 30 arquivos, 25 MB cada, 80 MB no total. | Os limites antigos eram pequenos para uma disciplina inteira. |
| Alunos: **Enviar planilha \| Preencher à mão**, com as colunas da planilha de exemplo (Nome completo, E-mail, CPF, Curso) e “Baixar modelo”. | O cadastro precisava ser o mesmo nos dois caminhos. |
| Datas: quatro passos (Entrar no Moodle, Escolher o curso, Novas datas, Conferir). Novas datas faz duas perguntas: “Quando o curso começa?” e “Cada unidade dura quantos dias?”. “Testar sem o Moodle” é um link no topo. | A tela anterior tinha fuso, alvos, JSON e cadência, e não dava para entender. |
| Ao trocar de passo, a folha do caderno vira (600ms); ao voltar, vira ao contrário. Com movimento reduzido, só um fade. | Pedido do usuário; reforça o caderno sem atrapalhar. |
| O .mbz baixa com o nome do curso (“Matemática básica.mbz”). | Fica fácil achar na pasta Downloads. |

## Diferenças entre os quadros e o app

- Os quadros mostram uma tela Início (“O que você quer fazer hoje?”). O app abre direto em Criar disciplina, e Alunos e Datas ficam no cabeçalho.
- Os números dos quadros (“8 semanas e 14 atividades”, “Aplicar 24 mudanças”) são exemplos.

## Fluxos conferidos em 20/10/2026

Só no app local (`http://127.0.0.1:3210`), com dados fictícios, sem Moodle real e sem chamar provedor de IA:

1. Importar JSON → Ver exemplo → Caderno → Conferir o curso → Gerar → Baixar: `.mbz` válido (gzip).
2. Criar manualmente → nome vazio mostra “Escreva o nome da disciplina.” → criar → adicionar Tarefa → renomear → Conferir → Baixar.
3. Alunos: Baixar modelo (CSV com as quatro colunas); Ver exemplo abre a conferência com um e-mail errado e o botão cinza; corrigir libera “Preparar arquivos”; Baixar planilha gera o CSV do Moodle. Preencher à mão com duas linhas e uma vazia: a vazia é ignorada; Voltar vira a folha para trás e mantém o que foi digitado.
4. Datas: Testar sem o Moodle → 4 unidades de 8 dias → Ver como fica (antes e depois) → Voltar mantém os valores.

## Licenças

- **Switzer** (Indian Type Foundry, ITF Free Font License): não está neste repositório, que é público. O app usa os arquivos de `public/fonts/`, que ficam fora do git; veja o README do projeto e `public/ASSET_SOURCE.md`. As imagens desta pasta só mostram a fonte renderizada.
- **Ícones Lucide**: ISC, em [`fonte-fluxos/icons/LICENSE.txt`](fonte-fluxos/icons/LICENSE.txt).

## Gerar os quadros de novo

O gerador usa Node 24 e não tem dependências:

```bash
cd docs/design-proposals/coruja-caderno-v5/fonte-fluxos
mkdir -p preview out/project
node build.mjs
```

`out/project/*.dc.html` são os quadros para o Claude Design, iguais byte a byte aos publicados em 20/10/2026 (`Q1-mapa.dc.html` é publicado como `Main.dc.html`; as imagens apontam para os arquivos já enviados ao artifact, em `blobs.json`). `preview/*.html` são prévias para o navegador: sirva uma pasta que tenha `ds/project/assets/Logos/brand-owl.svg` (cópia de `public/brand-owl.svg`) e `dl-fonts/` com a Switzer baixada do Fontshare. O [`BRIEF.md`](fonte-fluxos/BRIEF.md) descreve as regras dos quadros e o verificador de sobreposição.
