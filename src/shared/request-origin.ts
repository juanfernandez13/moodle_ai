/** Next can reconstruct a loopback URL with localhost while the browser uses 127.0.0.1.
 * Only the Host header's matching loopback alias at the application's fixed port is accepted.
 * Forwarded headers are never trusted and arbitrary external Host/Origin pairs remain invalid.
 */
export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const internal = new URL(request.url);
    if (!['http:', 'https:'].includes(source.protocol) || origin !== source.origin) return false;
    const host = request.headers.get('host');
    if (!host) return source.origin === internal.origin;
    const publicUrl = new URL(`${internal.protocol}//${host}`);
    if (publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash || publicUrl.host !== host.toLowerCase()) return false;
    if (publicUrl.host === internal.host) return source.origin === internal.origin;
    const loopback = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1';
    if (!loopback(internal.hostname) || !loopback(publicUrl.hostname) || internal.port !== '3210' || publicUrl.port !== '3210') return false;
    return source.origin === publicUrl.origin;
  } catch {
    return false;
  }
}
