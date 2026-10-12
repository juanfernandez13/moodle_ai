# Moodle local de laboratório

Nunca acessar, testar ou operar o Moodle do IFCE. Este ambiente usa somente cursos, contas, imagens e documentos fictícios em `http://localhost:3211`. Não possui credenciais institucionais. A referência Vercel é usada somente para comparar a interface pública.

Moodle oficial v4.1.17, commit `b05bd11a84259e9669db576020b7a4392282bb67`, release real **4.1.17 (Build: 20250317)**; moodle-docker commit `f4c2324d32fb74d7753264381f0a9b418b6034b2`. PHP 8.1, PostgreSQL 13. Os digests das imagens ficam em `images.yml`. O perfil não comprova a versão institucional 4.1.17+ /20250321 nem outras versões/plugins.

## Reproduzir

Requer Docker Desktop iniciado. O código é copiado para um volume Linux para evitar o custo de milhares de arquivos PHP em um bind mount Windows. Os contêineres têm o projeto exclusivo `moodle-ai-lab-linux`; somente o webserver expõe a porta 3211 em loopback.

```powershell
pwsh scripts/lab.ps1 -Action Setup -LabRoot "$env:TEMP/Moodle-AI-lab"
pwsh scripts/lab.ps1 -Action Start -LabRoot "$env:TEMP/Moodle-AI-lab"
pwsh scripts/lab.ps1 -Action Install -LabRoot "$env:TEMP/Moodle-AI-lab"
pwsh scripts/lab.ps1 -Action Status -LabRoot "$env:TEMP/Moodle-AI-lab"
```

Install é executado uma vez no banco vazio. A conta `labadmin` e a senha de demonstração declarada no script pertencem exclusivamente ao laboratório. Para reiniciar uma demonstração, restaure a fixture em um **curso novo**; o script não apaga cursos, volumes ou bancos. Stop preserva os dados.

```powershell
node scripts/lab-import-fixtures.mjs tmp/lab-import 2026-10-12T00:00:00Z
docker cp tmp/lab-import/topicos-com-imagens.mbz moodle-ai-lab-linux-webserver-1:/tmp/topicos.mbz
docker exec moodle-ai-lab-linux-webserver-1 php admin/cli/restore_backup.php --file=/tmp/topicos.mbz --categoryid=1 --showdebugging
docker cp scripts/lab-snapshot.php moodle-ai-lab-linux-webserver-1:/tmp/lab-snapshot.php
docker exec moodle-ai-lab-linux-webserver-1 php /tmp/lab-snapshot.php ID_DO_CURSO
```

Salvar o JSON retornado e executar `node scripts/check-lab-snapshot.mjs snapshot.json draft.json assets.json`. Para a fixture completa, os parâmetros draft/assets padrão são `tests/fixtures/export/full-course.json` e `assets.json`. O snapshot só lê dados; não altera o Moodle. O início semanal na linha de comando é uma revisão explícita porque está ausente no documento, e o exportador recusa gerar semanas sem início.

## Evidências desta execução

`evidence.json` e os snapshots `restored-full.json`, `restored-topicos.json`, `restored-semanas.json` registram restauração com saída 0 e conferência independente de tipos, ordem, questões/referências, notas, datas, arquivos e hashes dos bytes. A fixture completa preservou nove atividades, quatro questões, seis ocorrências de imagens e dez destinos de arquivo. Os dois DOCX também foram importados e restaurados.

O terceiro DOCX, `docs/examples/planejamento-completo.docx`, percorreu a rota HTTP real de importação offline e foi restaurado no curso fictício 7. `complete-evidence.json`, `complete-draft.json`, `complete-assets.json` e `complete-restored.json` preservam a prova: nove atividades, incluindo dois fóruns, duas tarefas, dois quizzes e os três tipos de questão. O documento não possui imagens; esse aspecto é coberto pelas fixtures anteriores. Reproduzir com `node scripts/lab-complete-fixture.mjs tmp/lab-complete`, com a aplicação local iniciada, e restaurar `complete.mbz` em um curso novo.

O glossário exige a opção de informação de usuário ativada **somente para seu conteúdo editorial**. O pacote tem `users.xml` vazio e autoria 0, sem contas/matrículas/submissões. A comparação antes/depois provou usuários 2→2 e inscrições 0→0, e o navegador carregou a entrada e sua imagem. O aviso é exibido antes de baixar o MBZ. Estes snapshots antecedem os testes separados de cadastro e datas.

As duas falhas reais de restauração foram corrigidas: versão de módulo ausente desviava quizzes para restauração antiga; `userinfo` desligado descartava entradas do glossário. O CLI core ainda imprime `Unknown setting: questionbank`, embora esse setting não esteja no arquivo; isso não impediu restauração nem a conferência dos dados. O registro de tentativa anterior é mantido como histórico, não como resultado atual.

## Adaptador local

Sem configuração, cadastro/datas permitem revisar e exportar propostas locais. Para habilitar o adaptador comprovado, iniciar a aplicação com `MOODLE_URL=http://localhost:3211` e `MOODLE_CAPABILITY_PROFILE=moodle-4.1.17-lab-ops-v1`, autenticar com a conta fictícia e revisar as opções efetivas antes da confirmação. URLs externas são rejeitadas. Sessões expiram e desaparecem ao reiniciar o servidor; nenhuma credencial pertence a um projeto portátil.

```powershell
pwsh scripts/lab.ps1 -Action Stop -LabRoot "$env:TEMP/Moodle-AI-lab"
```
