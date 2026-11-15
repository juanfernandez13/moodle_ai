/**
 * O endereço da "Outra IA" é digitado por quem usa a tela, e é o servidor que faz a chamada. Sem cuidado, isso deixaria
 * qualquer pessoa mandar o servidor falar com a rede interna dele (SSRF). Daqui sai só um endereço que pode ser chamado.
 *
 * - O que vale por padrão: https, sem usuário e senha na URL, e nome que não seja da máquina nem da rede interna.
 * - Máquina local (Ollama, LM Studio): só fora de produção, ou com AI_ALLOW_LOCAL_BASE_URLS=1.
 * - Servidor publicado: AI_ALLOWED_BASE_URLS (endereços separados por vírgula) trava a lista; só eles passam.
 *
 * Limite conhecido: um nome público que passa a apontar para um endereço interno (DNS rebinding) não é visto aqui.
 * Para isso a lista AI_ALLOWED_BASE_URLS é a defesa.
 */

export type BaseUrlCheck = { ok: true; url: string } | { ok: false; message: string };
export interface BaseUrlPolicy {
  /** Aceita localhost e endereços de rede privada (e http). */
  allowLocal: boolean;
  /** Se existir, só estes endereços passam. */
  allowed?: readonly string[] | undefined;
}

export function baseUrlPolicy(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): BaseUrlPolicy {
  const list = (environment.AI_ALLOWED_BASE_URLS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return {
    allowLocal:
      environment.NODE_ENV !== "production" ||
      environment.AI_ALLOW_LOCAL_BASE_URLS === "1",
    allowed: list.length > 0 ? list : undefined,
  };
}

function privateIpv4(host: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}
function privateIpv6(host: string): boolean {
  const value = host.toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (/^f[cd]/.test(value) || /^fe[89ab]/.test(value)) return true;
  // ::ffff:a.b.c.d (IPv4 escondido num IPv6)
  const mapped = /^::ffff:(.+)$/.exec(value)?.[1];
  if (mapped !== undefined) {
    if (privateIpv4(mapped)) return true;
    // O URL do Node escreve o IPv4 mapeado em hexadecimal (::ffff:7f00:1).
    const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(mapped);
    if (hex) {
      const high = parseInt(hex[1]!, 16);
      const low = parseInt(hex[2]!, 16);
      return privateIpv4(
        `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
      );
    }
  }
  return false;
}
function internalName(host: string): boolean {
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    // Nome de uma palavra só ("redis", "intranet") só existe dentro de uma rede.
    !host.includes(".")
  );
}

const normalize = (url: URL): string =>
  `${url.origin}${url.pathname}`.replace(/\/+$/, "");

export function checkBaseUrl(
  raw: string,
  policy: BaseUrlPolicy = baseUrlPolicy(),
): BaseUrlCheck {
  const refuse = (message: string): BaseUrlCheck => ({ ok: false, message });
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return refuse("O endereço da IA não é válido. Exemplo: https://openrouter.ai/api/v1");
  }
  if (url.username || url.password)
    return refuse("O endereço da IA não pode ter usuário e senha. A chave vai no campo próprio.");
  if (url.search || url.hash)
    return refuse("O endereço da IA não pode ter parâmetros.");
  const normalized = normalize(url);
  if (policy.allowed !== undefined) {
    const listed = policy.allowed.some((entry) => {
      try {
        return normalize(new URL(entry)) === normalized;
      } catch {
        return false;
      }
    });
    return listed
      ? { ok: true, url: normalized }
      : refuse("Este endereço não está na lista permitida deste servidor.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const local =
    privateIpv4(host) || privateIpv6(host) || internalName(host);
  if (local) {
    if (!policy.allowLocal)
      return refuse("Endereço da rede interna não é aceito neste servidor.");
    if (url.protocol !== "https:" && url.protocol !== "http:")
      return refuse("O endereço da IA precisa começar com https://.");
    return { ok: true, url: normalized };
  }
  if (url.protocol !== "https:")
    return refuse("O endereço da IA precisa começar com https://.");
  return { ok: true, url: normalized };
}
