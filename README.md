<p align="center">
  <img src="public/brand-owl.svg" alt="Moodle IA" width="96" />
</p>

<h1 align="center">Moodle IA</h1>

<p align="center">
  Transforme documentos de planejamento em cursos Moodle prontos para restaurar, com revisão humana em cada etapa.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node-24-5fa04e?style=for-the-badge&logo=node.js&logoColor=white" alt="Node 24" />
  <img src="https://img.shields.io/badge/Moodle-.mbz-f98012?style=for-the-badge&logo=moodle&logoColor=white" alt="Moodle .mbz" />
</p>

---

## O que é

**Moodle IA** é uma aplicação web que automatiza a preparação de cursos no Moodle. Ela lê o planejamento de uma disciplina (DOCX, PDF ou TXT), monta uma proposta de curso com unidades, atividades, questões, notas e datas, deixa tudo editável e gera um backup `.mbz` que pode ser restaurado em qualquer instalação Moodle compatível.

A IA (OpenAI ou Gemini) é opcional: existe um perfil local, sem IA, para documentos com estrutura conhecida, e todo o curso também pode ser criado à mão. Nada é aplicado sem passar pela revisão de quem está usando.

Além dos cursos, a aplicação cuida de duas tarefas repetitivas de quem administra turmas:

- **Cadastro em lote de alunos**: planilha da turma → CSV de importação do Moodle, ou envio direto ao Moodle.
- **Ajuste de datas**: reprograma as datas das atividades de um curso já publicado, com prévia de antes/depois.

---

## Funcionalidades

- **Importação de documentos**: DOCX (por tópicos ou semanas), PDF com texto e TXT, preservando imagens, tabelas e a origem de cada trecho.
- **Interpretação com IA**: OpenAI ou Gemini com saída estruturada e validação comum; a chave fica no servidor e nunca é salva em arquivos.
- **Editor visual do curso**: metadados, unidades, atividades, questões, livro de notas, datas e anexos, em painéis paginados.
- **Seis tipos de atividade**: fórum, tarefa, quiz, chat, wiki e glossário, com várias atividades do mesmo tipo na mesma unidade.
- **Três tipos de questão**: múltipla escolha, associação e resposta discursiva.
- **Validação antes de exportar**: pendências levam direto ao campo com problema e bloqueiam a geração de um pacote inválido.
- **Exportação `.mbz`**: XML no formato de backup do Moodle, com hashes dos arquivos preservados.
- **Projetos portáteis `.moodleai`**: salvam fontes, anexos, IDs e configurações para continuar o trabalho em outra máquina.
- **Salvamento local**: projetos guardados no navegador (IndexedDB), com proteção contra sobrescrita entre abas.
- **Alunos e datas no Moodle**: conexão por URL, usuário e senha, com prévia vinculada antes de qualquer alteração.
- **Tema claro e escuro** e layout responsivo.

---

## Fluxo de uso

```
1. Entrada            →   2. Revisão             →   3. Entrega
──────────────────        ────────────────────       ──────────────────
Documento, JSON ou        Proposta da IA ou do       Validação e download
criação manual            perfil local no editor     do .mbz ou .moodleai
```

Para restaurar no Moodle, use um **curso novo e vazio**. Ao mesclar num curso existente, o Moodle pode não recriar as categorias do livro de notas.

---

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js 16 (App Router), React 19, TypeScript |
| Estilo | Tailwind CSS v4 e CSS próprio por área |
| Contrato do curso | Zod |
| IA | Adaptadores HTTP para OpenAI e Gemini |
| Documentos | mammoth (DOCX), pdfjs-dist (PDF), cheerio |
| Planilhas | SheetJS (CSV, XLS, XLSX) |
| Pacotes | fast-xml-parser, tar-stream, JSZip |
| Testes | `node:test` com Node 24 |

---

## Como rodar

### Pré-requisitos

- **Node.js 24** e npm
- Opcional: chave da [OpenAI](https://platform.openai.com/api-keys) ou do [Google AI Studio](https://aistudio.google.com/app/apikey)

### Passos

```bash
git clone https://github.com/juanfernandez13/moodle_ai.git
cd moodle_ai
npm ci
cp .env.example .env.local   # opcional, para configurar a IA
npm run dev
```

Acesse [http://127.0.0.1:3210](http://127.0.0.1:3210).

Para produção:

```bash
npm run build
npm start
```

### Fonte da interface

A interface usa a fonte [Switzer](https://www.fontshare.com/fonts/switzer) (Indian Type Foundry), que não é distribuída neste repositório por causa da licença. Sem ela, a aplicação usa a fonte do sistema. Para usá-la, baixe a família no Fontshare e coloque `Switzer-Variable.woff2` e `Switzer-VariableItalic.woff2` em `public/fonts/`.

---

## Variáveis de ambiente

Todas são opcionais. Copie `.env.example` para `.env.local` e reinicie o servidor.

| Variável | Descrição |
| --- | --- |
| `OPENAI_API_KEY` | Chave da OpenAI, usada só no servidor |
| `OPENAI_MODEL` | Modelo da OpenAI; sem valor, usa o padrão |
| `GEMINI_API_KEY` | Chave do Gemini, usada só no servidor |
| `GEMINI_MODEL` | Modelo do Gemini; sem valor, usa o padrão |
| `MOODLE_URL` | Endereço sugerido na tela de conexão com o Moodle |
| `MOODLE_CAPABILITY_PROFILE` | Perfil de compatibilidade do Moodle conectado |

Sem chave no servidor, a pessoa pode informar uma chave só para a sessão: ela fica na memória da aba e some ao recarregar a página. Chaves nunca vão para projetos, downloads ou logs.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento na porta 3210 |
| `npm run build` | Build do Next.js e da CLI |
| `npm start` | Servidor de produção |
| `npm test` | Testes unitários e de rotas |
| `npm run check` | Typecheck, lint sem warnings, testes e build |
| `npm run demo` | Valida um curso de exemplo pela CLI, sem IA |
| `npm run validate:draft -- <arquivo.json>` | Valida um JSON de curso pela CLI |

---

## Estrutura do projeto

```
.
├── app/                        # Rotas do Next.js
│   ├── page.tsx                # Criação de curso
│   ├── cadastro-lote/          # Cadastro em lote de alunos
│   ├── datas/                  # Ajuste de datas de cursos publicados
│   ├── styles/                 # CSS por área
│   └── api/
│       ├── import/             # Documentos → proposta de curso
│       ├── interpret/          # Interpretação com IA
│       ├── export/             # Curso → .mbz
│       ├── students/           # Leitura de planilhas
│       └── moodle/             # Login, cursos, alunos e datas no Moodle
├── src/
│   ├── domain/                 # Regras de curso, alunos e datas
│   ├── shared/                 # Limites, HTTP e utilitários comuns
│   ├── client/                 # Interface, separada por área
│   │   ├── components/         # Componentes compartilhados e editores de atividade
│   │   └── features/           # course, students, dates, moodle
│   ├── server/                 # Importação, IA, exportação e adaptador Moodle
│   └── cli/                    # Validador de cursos em linha de comando
├── tests/                      # Testes e fixtures fictícias
├── scripts/                    # Testes, fixtures e laboratório Moodle local
└── docs/                       # Arquitetura, PRD, specs e mapa do código
```

Mais detalhes em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e [docs/CODE_MAP.md](docs/CODE_MAP.md).

---

## Limites

| Operação | Limites |
| --- | --- |
| Importação | 30 arquivos, 25 MiB por arquivo, 80 MiB no total; 300 mil caracteres, 200 páginas de PDF |
| Exportação | 16 MiB por anexo, 64 MiB no total |
| Projeto portátil | 160 MiB |
| Alunos | 8 MiB por planilha, 10 mil linhas |

Os limites de envio ficam em [`src/shared/upload-limits.ts`](src/shared/upload-limits.ts) e valem tanto para a API quanto para o navegador.

---

## Segurança

- Rotas de importação e interpretação exigem a mesma origem da aplicação e o `Content-Type` correto.
- O tamanho real do corpo das requisições é limitado, mesmo sem `Content-Length`.
- A conexão com o Moodle valida a URL e o DNS, fixa o IP aprovado e recusa endereços internos (exceto o laboratório local em `localhost:3211`).
- Sessões do Moodle ficam em memória, com cookie `httpOnly` e expiração; senha e cookies nunca vão para arquivos.
- Conteúdo importado nunca é executado como HTML.

---

## Compatibilidade com o Moodle

A exportação e as operações de alunos e datas foram validadas no **Moodle 4.1.17** rodando em um laboratório local com Docker, usando apenas cursos e contas fictícias. Outras versões e plugins podem funcionar, mas não foram comprovados. Login por SSO não é suportado.

O laboratório pode ser reproduzido com os passos de [docs/lab/README.md](docs/lab/README.md).

---

## Créditos

- Ícone do Moodle extraído do [repositório oficial](https://github.com/moodle/moodle); Moodle é marca registrada da Moodle Pty Ltd.
- Switzer © 2015–2021 Indian Type Foundry; Switzer é marca da Indian Type Foundry.
- Origem e hashes dos recursos visuais em [public/ASSET_SOURCE.md](public/ASSET_SOURCE.md).
