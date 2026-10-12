param(
  [ValidateSet('Setup','Start','Status','Install','Stop')][string]$Action = 'Status',
  [string]$LabRoot = (Join-Path $env:TEMP 'Moodle-AI-lab'),
  [ValidateSet('moodle-ai-lab-linux','moodle-ai-lab')][string]$ProjectName = 'moodle-ai-lab-linux'
)
$ErrorActionPreference = 'Stop'
$taskLabRoot = [IO.Path]::GetFullPath($LabRoot)
$taskMoodleRoot = Join-Path $taskLabRoot 'moodle'
$taskDockerRoot = Join-Path $taskLabRoot 'moodle-docker'
$taskMoodleCommit = 'b05bd11a84259e9669db576020b7a4392282bb67'
$taskDockerCommit = 'f4c2324d32fb74d7753264381f0a9b418b6034b2'
function Assert-Exit([string]$Message) { if ($LASTEXITCODE -ne 0) { throw $Message } }
if ($Action -eq 'Setup') {
  New-Item -ItemType Directory -Force -Path $taskLabRoot | Out-Null
  if (-not (Test-Path -LiteralPath $taskMoodleRoot)) { git clone --depth 1 --branch v4.1.17 https://github.com/moodle/moodle.git $taskMoodleRoot; Assert-Exit 'Falha ao obter Moodle oficial.' }
  if (-not (Test-Path -LiteralPath $taskDockerRoot)) { git clone https://github.com/moodlehq/moodle-docker.git $taskDockerRoot; Assert-Exit 'Falha ao obter ambiente oficial.'; git -C $taskDockerRoot checkout --detach $taskDockerCommit; Assert-Exit 'Falha ao fixar ambiente.' }
}
if (-not (Test-Path -LiteralPath $taskMoodleRoot) -or -not (Test-Path -LiteralPath $taskDockerRoot)) { throw 'Execute Setup antes de iniciar o laboratório.' }
if ((git -C $taskMoodleRoot rev-parse HEAD) -ne $taskMoodleCommit -or (git -C $taskDockerRoot rev-parse HEAD) -ne $taskDockerCommit) { throw 'A revisão do laboratório não corresponde às versões fixadas.' }
if (-not (Test-Path -LiteralPath (Join-Path $taskMoodleRoot 'config.php'))) { Copy-Item -LiteralPath (Join-Path $taskDockerRoot 'config.docker-template.php') -Destination (Join-Path $taskMoodleRoot 'config.php') }
if ($Action -eq 'Setup') {
  & docker volume create --label purpose=moodle-ai-local-lab moodle-ai-lab-code | Out-Null; Assert-Exit 'Falha ao criar cache Linux do código.'
  $taskLoaderStarted = $false
  try {
    & docker run -d --name moodle-ai-lab-code-init --label purpose=moodle-ai-local-lab -v moodle-ai-lab-code:/workspace moodlehq/moodle-php-apache@sha256:13be2641be8883e79fd1e97374d0df759d80c81cce8331f3e85035923b7f4576 sleep 3600 | Out-Null; Assert-Exit 'Falha ao iniciar cópia de código.'
    $taskLoaderStarted = $true
    & docker cp ($taskMoodleRoot + '/.') moodle-ai-lab-code-init:/workspace; Assert-Exit 'Falha ao copiar código ao volume Linux.'
  } finally { if ($taskLoaderStarted) { & docker rm -f moodle-ai-lab-code-init | Out-Null } }
}
$env:MOODLE_DOCKER_WWWROOT = $taskMoodleRoot.Replace('\','/')
$env:ASSETDIR = (Join-Path $taskDockerRoot 'assets').Replace('\','/')
$env:MOODLE_DOCKER_PHP_VERSION = '8.1'
$env:MOODLE_DOCKER_DB_VERSION = '13'
$env:MOODLE_DOCKER_BROWSER_TAG = '4'
$env:MOODLE_DOCKER_WEB_HOST = 'localhost'
$env:MOODLE_DOCKER_WEB_PORT = '127.0.0.1:3211'
$env:MOODLE_DOCKER_TIMEOUT_FACTOR = '1'
$taskComposeArgs = @('compose','-p',$ProjectName,'-f',(Join-Path $taskDockerRoot 'base.yml'),'-f',(Join-Path $taskDockerRoot 'service.mail.yml'),'-f',(Join-Path $taskDockerRoot 'db.pgsql.yml'),'-f',(Join-Path $taskDockerRoot 'webserver.port.yml'))
$taskImagePins = Join-Path $PSScriptRoot '../docs/lab/images.yml'
if (Test-Path -LiteralPath $taskImagePins) { $taskComposeArgs += @('-f',[IO.Path]::GetFullPath($taskImagePins)) }
if ($ProjectName -eq 'moodle-ai-lab-linux') { $taskComposeArgs += @('-f',[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/lab/code-volume.yml'))) }
switch ($Action) {
  'Setup' { Write-Output "Fontes fixadas em $taskLabRoot. Use Start e Install." }
  'Start' { & docker @taskComposeArgs up -d webserver db mailpit; Assert-Exit 'Falha ao iniciar containers do laboratório.' }
  'Status' { & docker @taskComposeArgs ps; Assert-Exit 'O daemon Docker não está disponível.' }
  'Install' {
    & docker @taskComposeArgs exec -T webserver php admin/cli/install_database.php --agree-license --adminuser=labadmin --adminpass=MoodleLab-Only2026 --adminemail=lab@example.test --fullname='Moodle AI Lab' --shortname='MoodleLab'; Assert-Exit 'Falha ao instalar o banco do laboratório.'
  }
  'Stop' { & docker @taskComposeArgs stop; Assert-Exit 'Falha ao parar laboratório.' }
}
