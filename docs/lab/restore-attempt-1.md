# Primeira restauração real — falha detectada

Fixture fictícia SHA256 `0155706667931e557f6d41ca5b7193c2399ab81e38af77e0bdd3545fbe337310`, Moodle oficial commit `b05bd11a84259e9669db576020b7a4392282bb67`, ambiente oficial `f4c2324d32fb74d7753264381f0a9b418b6034b2`. Imagens fixadas em images.yml. Instalação completada no volume Linux; a tentativa anterior de instalação pelo bind mount Windows foi interrompida para eliminar espera de IO, sem descartar volumes.

Comando: `docker exec moodle-ai-lab-linux-webserver-1 php admin/cli/restore_backup.php --file=/tmp/export-fixture.mbz --categoryid=1 --showdebugging`, exit 1.

O restaurador extraiu o pacote e iniciou o plano, mas encontrou `stdClass::$version` ausente em restore_stepslib.php:4452, `stdClass::$questionid` ausente em restore_quiz_stepslib.php:321 e recusou NULL em question_references.questionbankentryid. Houve também avisos de título da seção e setting questionbank. Nenhuma compatibilidade/restauração bem-sucedida foi declarada nesta revisão. O executor do exportador recebeu a falha para corrigir a geração e adicionar regressões; o contrato de domínio continua congelado.
