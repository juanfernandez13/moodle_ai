# Ponte QA pin4

Revision: **sha256:ad04237d5ef30724403d0dfc9ecc83b6e6ee00208fff7d5ec1ac2c41f89ed7e8**. Execução real de browser: **sha256:3d3c7883e7ac3566794af4cd1174c6dcab2581cea1840d881c933f11d1bf34e0**.

O único delta é docs/specs/FULL-01-application.md, método de evidência F7. Todos os198 demais arquivos, incluindo app/runtime/coruja/fundo/testes/assets/lockfile, são byte-idênticos. [browser.md](browser.md) continua o registro da execução real. [verification-4.json](verification-4.json) registra os hashes antes/depois e a reutilização explícita; não houve nova execução rotulada pin4. Capturas e resultados permanecem aplicáveis ao mesmo produto.

A preferência de movimento reduzido é coberta pelos testes do runtime real com media query/renderer simulados, não por emulação de preferência do sistema no navegador. CUA/IAB só oferece visibility e viewport; essa limitação permanece no aceite e na entrega.
