import { test } from "node:test";
import assert from "node:assert/strict";
import { MoodleHttp, MoodleError } from "../../src/server/moodle/http.ts";
import { PassThrough, Writable } from "node:stream";
import type { IncomingMessage, ClientRequest } from "node:http";
import type { NativeRequest } from "../../src/server/moodle/native-transport.ts";

test("user URLs reject local, private, metadata, numeric-IP aliases and explicitly excluded IFCE before network", () => {
  const unsafe = [
    "http://127.0.0.1",
    "https://10.0.0.1/moodle",
    "http://169.254.169.254",
    "https://[::1]",
    "https://[::ffff:127.0.0.1]",
    "http://2130706433",
    "http://0x7f000001",
    "http://localhost:3210",
    "https://moodle.ifce.edu.br/",
    "https://ifce.edu.br./",
    "https://user:pass@public.example/",
    "https://public.example/?x=1",
    "https://public.example/#x",
    "file:///moodle",
  ];
  for (const url of unsafe)
    assert.throws(
      () => new MoodleHttp(url),
      (error) =>
        error instanceof MoodleError &&
        ["unsafe_moodle_url", "invalid_moodle_url"].includes(error.code),
      url,
    );
});

test("subpath routes and already-prefixed form URLs resolve exactly once and cannot escape installation", () => {
  const http = new MoodleHttp("https://moodle.example/campus");
  assert.equal(
    http.url("/login/index.php").href,
    "https://moodle.example/campus/login/index.php",
  );
  assert.equal(
    http.url("/campus/course/modedit.php?id=4").href,
    "https://moodle.example/campus/course/modedit.php?id=4",
  );
  assert.equal(
    http.url("https://moodle.example/campus/course/modedit.php?id=4").href,
    "https://moodle.example/campus/course/modedit.php?id=4",
  );
  assert.throws(
    () => http.url("https://moodle.example/other/admin.php"),
    /origem|instalação/,
  );
});

test("ambiguous encoded redirect paths cannot escape the configured installation at the Moodle server", async () => {
  for (const location of [
    "/campus/%2f../other",
    "/campus/%5c../other",
    "/campus/%252e%252e/other",
    "//different.example/campus/",
  ]) {
    let calls = 0;
    const http = new MoodleHttp("https://moodle.example/campus/", {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      fetch: async () => {
        calls++;
        return new Response("", { status: 302, headers: { location } });
      },
    });
    await assert.rejects(
      http.text("/my/"),
      (error) =>
        error instanceof MoodleError && error.code === "unsafe_redirect",
      location,
    );
    assert.equal(calls, 1, location);
  }
});

test("every DNS answer must be public, including mapped, multicast, transition and metadata IPs", async () => {
  const denied = [
    "127.0.0.1",
    "10.10.0.2",
    "172.16.2.1",
    "192.168.2.1",
    "100.100.100.200",
    "169.254.169.254",
    "168.63.129.16",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "192.0.2.1",
    "198.18.0.1",
    "::1",
    "::",
    "::ffff:7f00:1",
    "fc00::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "2002:7f00:1::",
  ];
  for (const address of denied) {
    let calls = 0;
    const http = new MoodleHttp("https://moodle.example/", {
      resolve: async () => [
        { address: "93.184.216.34", family: 4 },
        { address, family: address.includes(":") ? 6 : 4 },
      ],
      fetch: async () => {
        calls++;
        return new Response("never");
      },
    });
    await assert.rejects(
      http.text("/login/index.php"),
      (error) =>
        error instanceof MoodleError && error.code === "unsafe_moodle_address",
      address,
    );
    assert.equal(calls, 0, address);
  }
});

test("DNS is checked again before redirect and a rebinding result never receives cookies or credentials", async () => {
  let resolutions = 0,
    calls = 0;
  const http = new MoodleHttp("https://moodle.example/", {
    resolve: async () => [
      {
        address: ++resolutions === 1 ? "93.184.216.34" : "127.0.0.1",
        family: 4,
      },
    ],
    fetch: async () => {
      calls++;
      return new Response("", {
        status: 307,
        headers: {
          location: "/next",
          "set-cookie": "MoodleSession=private; Path=/",
        },
      });
    },
  });
  await assert.rejects(
    http.post("/login/index.php", [["password", "fake"]]),
    (error) =>
      error instanceof MoodleError &&
      error.code === "unsafe_moodle_address" &&
      error.uncertain,
  );
  assert.equal(calls, 1);
  assert.equal(resolutions, 2);
});

test("production transport pins the validated DNS address while preserving hostname, TLS verification and form body", async () => {
  const observed: {
    host?: string;
    servername?: string;
    rejectUnauthorized?: boolean;
    address?: string;
    body?: string;
    pooled?: boolean;
  } = {};
  let dnsCalls = 0;
  const nativeRequest: NativeRequest = (url, options, callback) => {
    observed.host = url.host;
    observed.servername = (options as { servername: string }).servername;
    observed.rejectUnauthorized = (
      options as { rejectUnauthorized: boolean }
    ).rejectUnauthorized;
    observed.pooled = options.agent !== false;
    options.lookup!(url.hostname, {}, (error, address) => {
      assert.equal(error, null);
      observed.address = String(address);
    });
    const request = new Writable({
      write(chunk, _encoding, done) {
        observed.body = String(chunk);
        done();
      },
    });
    request.on("finish", () => {
      const message = Object.assign(new PassThrough(), {
        statusCode: 200,
        headers: { "content-type": "text/plain" },
      });
      callback(message as unknown as IncomingMessage);
      message.end("connected");
    });
    return request as unknown as ClientRequest;
  };
  const http = new MoodleHttp("https://moodle.example/campus/", {
    resolve: async () => {
      dnsCalls++;
      return [{ address: "93.184.216.34", family: 4 }];
    },
    nativeRequest,
  });
  assert.equal(
    await http.post("/login/index.php", [["password", "fictitious"]]),
    "connected",
  );
  assert.deepEqual(observed, {
    host: "moodle.example",
    servername: "moodle.example",
    rejectUnauthorized: true,
    address: "93.184.216.34",
    body: "password=fictitious",
    pooled: false,
  });
  assert.equal(dnsCalls, 1);
});

test("a slow DNS resolution times out before sending a POST, including after its delayed result arrives", async () => {
  let sent = 0;
  let resolve:
    ((addresses: { address: string; family: 4 }[]) => void) | undefined;
  const http = new MoodleHttp("https://moodle.example/", {
    timeoutMs: 15,
    resolve: async () =>
      await new Promise((done) => {
        resolve = done;
      }),
    fetch: async () => {
      sent++;
      return new Response("never");
    },
  });
  await assert.rejects(
    http.post("/login/index.php", [["password", "fake"]]),
    (error) =>
      error instanceof MoodleError &&
      error.code === "moodle_timeout" &&
      !error.uncertain,
  );
  resolve!([{ address: "93.184.216.34", family: 4 }]);
  await new Promise((done) => setTimeout(done, 10));
  assert.equal(sent, 0);
});

test("normal public IPv4 and IPv6 destinations retain HTTP or HTTPS without external requests", async () => {
  for (const origin of [
    "http://93.184.216.34/",
    "https://[2606:4700:4700::1111]/",
  ]) {
    let requested = "";
    const http = new MoodleHttp(origin, {
      fetch: async (input) => {
        requested = String(input);
        return new Response("ok");
      },
    });
    assert.equal(await http.text("/login/index.php"), "ok");
    assert.equal(requested, `${origin}login/index.php`);
  }
});
