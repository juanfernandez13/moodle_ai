import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import type { ClientRequest, IncomingMessage, RequestOptions } from "node:http";
import type { Address } from "./url-policy.ts";
import { MoodleError } from "./errors.ts";

export type NativeRequest = (
  url: URL,
  options: RequestOptions,
  response: (value: IncomingMessage) => void,
) => ClientRequest;
const nativeRequest: NativeRequest = (url, options, callback) =>
  (url.protocol === "https:" ? https : http).request(url, options, callback);

/** No proxy/global fetch/pool: the original host and TLS identity use one already validated IP. */
export async function pinnedTransport(
  url: URL,
  address: Address,
  init: RequestInit,
  requester: NativeRequest = nativeRequest,
): Promise<Response> {
  const encoded = new Request(url, init);
  const body =
    init.body == null ? undefined : Buffer.from(await encoded.arrayBuffer());
  if (body && body.length > 12 * 1024 * 1024)
    throw new MoodleError(
      "request_too_large",
      "O envio Moodle excede o limite permitido.",
    );
  const headers = Object.fromEntries(encoded.headers);
  if (body) headers["content-length"] = String(body.length);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  return await new Promise<Response>((resolve, reject) => {
    const request = requester(
      url,
      {
        method: encoded.method,
        headers,
        agent: false,
        family: address.family,
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
        ...(url.protocol === "https:"
          ? { servername: isIP(host) ? "" : host, rejectUnauthorized: true }
          : {}),
        ...(init.signal ? { signal: init.signal } : {}),
      },
      (message) => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(message.headers)) {
          if (Array.isArray(value))
            value.forEach((entry) => responseHeaders.append(name, entry));
          else if (value !== undefined) responseHeaders.set(name, value);
        }
        const status = message.statusCode ?? 502;
        const stream =
          [204, 205, 304].includes(status) || encoded.method === "HEAD"
            ? null
            : (Readable.toWeb(message) as ReadableStream<Uint8Array>);
        resolve(new Response(stream, { status, headers: responseHeaders }));
      },
    );
    request.on("error", reject);
    request.end(body);
  });
}
