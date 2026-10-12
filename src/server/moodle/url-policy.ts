import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { MoodleError } from "./errors.ts";

export const LAB_URL = "http://localhost:3211/";
export type Address = { address: string; family: 4 | 6 };
export type Resolver = (hostname: string) => Promise<readonly Address[]>;
const systemResolver: Resolver = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((value) => ({
    address: value.address,
    family: value.family as 4 | 6,
  }));
const hostname = (url: URL) =>
  url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
// Avoid discrepancies between URL parsing and a proxy/PHP decoding the same path again.
const ambiguousPath = (path: string) => /%(?:2f|5c|2e|25)/i.test(path);

function ipv4(value: string): number {
  return value
    .split(".")
    .reduce((result, octet) => (result * 256 + Number(octet)) >>> 0, 0);
}
function inV4(value: number, network: string, bits: number): boolean {
  const divisor = 2 ** (32 - bits);
  return Math.floor(value / divisor) === Math.floor(ipv4(network) / divisor);
}
function ipv6(value: string): bigint {
  const [left = "", right] = value.toLowerCase().split("::");
  const a = left ? left.split(":") : [],
    b = right ? right.split(":") : [];
  const words =
    right === undefined
      ? a
      : [...a, ...Array<string>(8 - a.length - b.length).fill("0"), ...b];
  return words.reduce(
    (result, word) => result * 65536n + BigInt(`0x${word || "0"}`),
    0n,
  );
}

/** Conservative global-unicast allow policy, including denial of transition/embedded IPv4 ranges. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4(address);
    const excluded: [string, number][] = [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.88.99.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ];
    return (
      address !== "168.63.129.16" &&
      !excluded.some(([network, bits]) => inV4(value, network, bits))
    );
  }
  if (family !== 6 || address.includes(".")) return false;
  const value = ipv6(address);
  const prefix = (network: string, bits: number) =>
    value >> BigInt(128 - bits) === ipv6(network) >> BigInt(128 - bits);
  return (
    prefix("2000::", 3) &&
    !prefix("2001::", 23) &&
    !prefix("2001:db8::", 32) &&
    !prefix("2002::", 16) &&
    !prefix("3fff::", 20)
  );
}

function checkHost(url: URL): void {
  const host = hostname(url),
    domain = host.replace(/\.+$/, "");
  if (domain === "ifce.edu.br" || domain.endsWith(".ifce.edu.br"))
    throw new MoodleError(
      "unsafe_moodle_url",
      "Este endereço está excluído desta execução.",
    );
  if (url.origin === "http://localhost:3211") return;
  if (
    isIP(host)
      ? !isPublicAddress(host)
      : !host.includes(".") ||
        /(?:^|\.)(?:localhost|local|internal|invalid)$/.test(domain)
  )
    throw new MoodleError(
      "unsafe_moodle_url",
      "Use um endereço público Moodle. Endereços privados e serviços internos não são permitidos.",
    );
}

export function canonicalMoodleUrl(value: string): URL {
  let url: URL;
  try {
    if (
      !value.trim() ||
      value.length > 2048 ||
      /[\x00-\x20\\]/.test(value.trim())
    )
      throw new Error("Invalid URL");
    url = new URL(value.trim());
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.hostname ||
      ambiguousPath(url.pathname)
    )
      throw new Error("Invalid URL");
  } catch {
    throw new MoodleError(
      "invalid_moodle_url",
      "Informe a URL base Moodle HTTP ou HTTPS, sem usuário, senha, consulta ou fragmento.",
    );
  }
  checkHost(url);
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url;
}

/** Repeated for every actual request/redirect. Any unsafe DNS answer rejects the whole destination. */
export async function resolveDestination(
  url: URL,
  resolver: Resolver = systemResolver,
): Promise<Address> {
  checkHost(url);
  if (url.origin === "http://localhost:3211")
    return { address: "127.0.0.1", family: 4 };
  const host = hostname(url);
  const records = isIP(host)
    ? [{ address: host, family: isIP(host) as 4 | 6 }]
    : await resolver(host);
  if (
    !records.length ||
    records.some(
      (record) =>
        ![4, 6].includes(record.family) ||
        isIP(record.address) !== record.family ||
        !isPublicAddress(record.address),
    )
  )
    throw new MoodleError(
      "unsafe_moodle_address",
      "O endereço Moodle resolve para uma rede privada ou indisponível. A conexão foi bloqueada.",
    );
  return records.find((record) => record.family === 4) ?? records[0]!;
}

export function withinInstallation(url: URL, base: URL): boolean {
  return (
    url.origin === base.origin &&
    !url.username &&
    !url.password &&
    !url.hash &&
    !ambiguousPath(url.pathname) &&
    (url.pathname === base.pathname.slice(0, -1) ||
      url.pathname.startsWith(base.pathname))
  );
}
