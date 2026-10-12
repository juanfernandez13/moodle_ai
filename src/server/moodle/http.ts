import { MoodleError } from "./errors.ts";
import {
  canonicalMoodleUrl,
  resolveDestination,
  withinInstallation,
} from "./url-policy.ts";
import type { Resolver } from "./url-policy.ts";
import { pinnedTransport } from "./native-transport.ts";
import type { NativeRequest } from "./native-transport.ts";
export { MoodleError } from "./errors.ts";
/** fetch/resolve/nativeRequest are trusted constructor test seams, never accepted from HTTP input. */
export type HttpOptions = {
  fetch?: typeof fetch;
  resolve?: Resolver;
  nativeRequest?: NativeRequest;
  timeoutMs?: number;
  maximumBytes?: number;
};
type Cookie = {
  value: string;
  path: string;
  secure: boolean;
  expires?: number;
};
async function withinDeadline<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) throw new DOMException("Deadline exceeded", "AbortError");
  let abort: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    abort = () => reject(new DOMException("Deadline exceeded", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

/** One configured origin, one private cookie jar; no cookies cross origins. */
export class MoodleHttp {
  readonly base: URL;
  private options: HttpOptions;
  private cookies = new Map<string, Cookie>();
  private timeoutMs: number;
  private maximumBytes: number;
  constructor(base: string, options: HttpOptions = {}) {
    this.base = canonicalMoodleUrl(base);
    this.options = options;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maximumBytes = options.maximumBytes ?? 4 * 1024 * 1024;
  }
  url(path: string): URL {
    const prefixed =
      path.startsWith("/") &&
      !path.startsWith("//") &&
      !path.startsWith(this.base.pathname)
        ? `${this.base.pathname.replace(/\/$/, "")}${path}`
        : path;
    const url = new URL(prefixed, this.base);
    if (!withinInstallation(url, this.base))
      throw new MoodleError(
        "unsafe_redirect",
        "O Moodle tentou acessar um endereço fora da origem ou instalação configurada.",
      );
    return url;
  }
  clear(): void {
    this.cookies.clear();
  }
  private absorb(response: Response, url: URL): void {
    for (const raw of response.headers.getSetCookie()) {
      const parts = raw.split(";").map((part) => part.trim());
      const first = parts.shift() ?? "";
      const split = first.indexOf("=");
      if (split < 1) continue;
      const name = first.slice(0, split),
        value = first.slice(split + 1);
      if (!/^[A-Za-z0-9_-]+$/.test(name) || /[\x00-\x20;,]/.test(value))
        continue;
      const attributes = new Map(
        parts.map((part) => {
          const i = part.indexOf("=");
          return [
            part.slice(0, i < 0 ? undefined : i).toLowerCase(),
            i < 0 ? "" : part.slice(i + 1),
          ] as const;
        }),
      );
      const domain = attributes.get("domain")?.replace(/^\./, "").toLowerCase();
      if (domain && domain !== url.hostname.toLowerCase()) continue;
      const path =
        attributes.get("path") ||
        url.pathname.slice(0, url.pathname.lastIndexOf("/") + 1) ||
        "/";
      const key = `${path}\n${name}`;
      const maxAge = attributes.get("max-age");
      const expires =
        maxAge !== undefined && /^-?\d+$/.test(maxAge)
          ? Date.now() + Number(maxAge) * 1000
          : attributes.has("expires")
            ? Date.parse(attributes.get("expires")!)
            : undefined;
      if (
        !value ||
        value === "deleted" ||
        (expires !== undefined && expires <= Date.now())
      )
        this.cookies.delete(key);
      else
        this.cookies.set(key, {
          value,
          path,
          secure: attributes.has("secure"),
          ...(expires !== undefined && Number.isFinite(expires)
            ? { expires }
            : {}),
        });
    }
  }
  async request(
    path: string,
    options: RequestInit = {},
  ): Promise<{ html: string; url: string; status: number }> {
    let url = this.url(path),
      current = { ...options };
    let mutationSent = false;
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      for (let hop = 0; hop < 6; hop++) {
        const headers = new Headers(current.headers);
        headers.delete("cookie");
        headers.delete("authorization");
        headers.set("accept-language", "en");
        const pairs: string[] = [];
        for (const [key, cookie] of this.cookies) {
          if (cookie.expires !== undefined && cookie.expires <= Date.now()) {
            this.cookies.delete(key);
            continue;
          }
          if (
            (url.pathname === cookie.path ||
              url.pathname.startsWith(
                cookie.path.endsWith("/") ? cookie.path : `${cookie.path}/`,
              )) &&
            (!cookie.secure || url.protocol === "https:")
          )
            pairs.push(`${key.split("\n")[1]}=${cookie.value}`);
        }
        if (pairs.length) headers.set("cookie", pairs.join("; "));
        const address = await withinDeadline(
          resolveDestination(url, this.options.resolve),
          controller.signal,
        );
        mutationSent ||= (current.method ?? "GET").toUpperCase() !== "GET";
        const init = {
          ...current,
          headers,
          redirect: "manual" as const,
          signal: controller.signal,
        };
        const response = await withinDeadline(
          this.options.fetch
            ? this.options.fetch(url.toString(), init)
            : pinnedTransport(url, address, init, this.options.nativeRequest),
          controller.signal,
        );
        this.absorb(response, url);
        const location = response.headers.get("location");
        if (response.status >= 300 && response.status < 400 && location) {
          const next = new URL(location, url);
          // Check before reading or following; a redirect is never a new trust boundary.
          if (!withinInstallation(next, this.base)) {
            await response.body?.cancel();
            throw new MoodleError(
              "unsafe_redirect",
              "O Moodle redirecionou para fora da origem ou instalação configurada.",
              mutationSent,
            );
          }
          await response.body?.cancel();
          url = next;
          if ([301, 302, 303].includes(response.status))
            current = { method: "GET" };
          continue;
        }
        const declared = response.headers.get("content-length");
        if (declared && Number(declared) > this.maximumBytes) {
          await response.body?.cancel();
          throw new MoodleError(
            "response_too_large",
            "A resposta do Moodle excede o limite permitido.",
            mutationSent,
          );
        }
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        if (reader) {
          try {
            while (true) {
              const result = await withinDeadline(
                reader.read(),
                controller.signal,
              );
              if (result.done) break;
              length += result.value.length;
              if (length > this.maximumBytes) {
                await reader.cancel();
                throw new MoodleError(
                  "response_too_large",
                  "A resposta do Moodle excede o limite permitido.",
                  mutationSent,
                );
              }
              chunks.push(result.value);
            }
          } finally {
            if (controller.signal.aborted) void reader.cancel().catch(() => {});
            reader.releaseLock();
          }
        }
        const bytes = new Uint8Array(length);
        let cursor = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, cursor);
          cursor += chunk.length;
        }
        if (!response.ok)
          throw new MoodleError(
            "moodle_http_error",
            "O Moodle recusou a solicitação. Confira permissões e disponibilidade.",
            mutationSent,
          );
        return {
          html: new TextDecoder().decode(bytes),
          url: url.toString(),
          status: response.status,
        };
      }
      throw new MoodleError(
        "redirect_limit",
        "O Moodle excedeu o limite de redirecionamentos.",
        mutationSent,
      );
    } catch (error) {
      if (error instanceof MoodleError)
        throw new MoodleError(
          error.code,
          error.message,
          error.uncertain || mutationSent,
        );
      throw new MoodleError(
        controller.signal.aborted ? "moodle_timeout" : "moodle_unavailable",
        controller.signal.aborted
          ? "O prazo da solicitação ao Moodle foi esgotado."
          : "Não foi possível comunicar com o Moodle.",
        mutationSent,
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  async text(path: string, options?: RequestInit): Promise<string> {
    return (await this.request(path, options)).html;
  }
  async post(
    path: string,
    pairs: readonly (readonly [string, string])[],
  ): Promise<string> {
    const body = new URLSearchParams();
    for (const [name, value] of pairs) body.append(name, value);
    return this.text(path, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  }
}
