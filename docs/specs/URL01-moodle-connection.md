# URL01 — Conectar a uma instalação Moodle por URL

Pedido adicional durante UX02: ao saber que a URL estava fixada no laboratório, o usuário solicitou conexão a outras URLs. Isso autoriza a mudança de produto. A proibição anterior de acessar/testar Moodle IFCE continua válida. Todos os testes de rede reais desta entrega ficam no laboratório local; destinos públicos são simulados.

## Comportamento

- Formulário recebe URL base HTTP/HTTPS, usuário e senha. Suporta Moodle instalado em subdiretório e preserva o protocolo informado.
- URL padrão do servidor é opcional. Sem ela, formulário continua utilizável para informar o endereço. A URL efetivamente conectada aparece na interface.
- Cada sessão opaca fica vinculada ao endereço canônico escolhido. Trocar a conexão invalida sessão/prévias anteriores, sem compartilhar cookies ou credenciais entre destinos.
- Status preserva os campos existentes para clientes, mas separa disponibilidade do adaptador de compatibilidade verificada. Somente o laboratório conhecido possui a comprovação anterior. Login padrão e formulários suportados continuam necessários; versões, plugins e SSO arbitrários não são presumidos compatíveis.
- Prévia/confirmar preservam fingerprints, consumo único, prazo, travas e tratamento de resultado desconhecido.

## Limites de transporte

URL do usuário não pode transformar o servidor em acesso genérico à rede interna. Rejeitar credenciais embutidas, query/fragment, protocolos diferentes e hosts institucionais proibidos nesta execução. Bloquear endereços privados, loopback, link-local, multicast e reservados; exceção explícita somente para `http://localhost:3211/`. Verificar todas as respostas DNS e fixar o endereço validado no socket da requisição, mantendo hostname e verificação TLS. Redirecionamentos continuam dentro da origem configurada; mudança de origem requer informar o endereço correto explicitamente.

Mocks de DNS e transporte pertencem à composição confiável de testes no servidor; nenhuma entrada HTTP pode fornecê-los.

## Aceite

URL visível no formulário e na sessão; login/cursos/logout no laboratório local; HTTP/HTTPS e subdiretório em fixtures; erros de URL/login preservam recuperação. Testes negativos verificam origem, IPs especiais, DNS privado/rebinding, redirecionamentos, limites e isolamento de sessão. Sem acesso real a outro Moodle nem novas chamadas de IA.
