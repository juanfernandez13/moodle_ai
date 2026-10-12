# Adendo de imagens e inventário Moodle

Solicitação de 12 de outubro de 2026, posterior à entrega BUILDER-PLAN-01: explicar a consulta da versão Moodle, preservar imagens necessárias nas matrizes e identificar plugins/configurações pertinentes. A alteração é de planejamento, sem implementação da aplicação.

Arquivo alterado: `docs/BUILDER_PIPELINE_PLAN.md`. Adicionados requisito e aceite de imagens incorporadas, representação/vínculos/ocorrências, bytes originais, tabela/célula, persistência no navegador, projeto portátil e conferência após restauração. B04 e checklist Moodle incorporam esse requisito. Adicionado inventário de versões e plugins/formato/filtros/tipos de questão usados, distinguindo instalado, habilitado e necessário.

Inspeção direta de `CourseGen-AI/ui/server/parser.js`: apenas `word/document.xml` é carregado para extração de texto/equações. `/root/matrix_images_audit`, em contexto independente e somente leitura, confirmou a lacuna, o caminho separado de Mammoth na prévia, entrada textual da IA e incorporação MBZ limitada a anexos de tarefa em `mod_assign/introattachment`. O relatório é auditoria do legado; não é teste do recurso futuro nem nova aprovação integral do plano.

Fontes primárias consultadas: MoodleDocs `Moodle_version`, `Installing_plugins#Plugins_overview` e File API Moodle. O plano não presume qual versão/plugin está instalado no ambiente de referência nem acesso administrativo da aplicação.

Verificação local de links relativos e cercas Markdown executada por Python, código 0, sem referências locais ausentes ou cercas abertas. Nenhum teste de aplicação, importação de documento real, restauração Moodle, instalação de plugin ou alteração de design foi executado.

As revisões de BUILDER-PLAN-01 referem-se ao digest histórico registrado naquela tarefa. Este adendo altera o plano posteriormente e não reutiliza esses relatórios como aprovação do novo conteúdo.
