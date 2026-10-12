# Contexto de domínio

Domínio único inicial: preparação de cursos Moodle. Vocabulário em [GLOSSARY.md](../../GLOSSARY.md), comportamento em [PRD](../PRD.md), decisões em [arquitetura](../ARCHITECTURE.md), contrato inicial em [spec V01](../specs/V01-course-to-mbz.md).

CourseDraft é rascunho canônico; projeto portátil inclui rascunho, bytes e presets; MBZ é backup para restauração. Esses artefatos não são equivalentes. Não misturar modelos de cadastro e planos de datas com CourseDraft.

O diagrama arquitetural é conceitual; a spec V01 fixa campos do contrato executável. Mudanças coordenadas atualizam ambos e seus testes/consumidores; agentes não criam schemas concorrentes. Não criar ADR/novo contexto para decisões triviais.
