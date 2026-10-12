import { test } from "node:test";
import assert from "node:assert/strict";
import { createMoodleApi } from "../../src/server/moodle/api.ts";
import { studentFixture, studentRow } from "./fixtures.ts";
import { buildStudentPreview } from "../../src/domain/students/index.ts";

function request(action: string, body?: unknown, cookie?: string): Request {
  return new Request(`http://app.local/api/moodle/${action}`, {
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
    headers: {
      origin: "http://app.local",
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
  });
}
const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 as const },
];

test("URL login works without a server default and shows the connected subdirectory without claiming verified compatibility", async () => {
  const calls: string[] = [];
  const api = createMoodleApi({
    resolve: publicResolver,
    fetch: async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/login/index.php") && init?.method !== "POST")
        return new Response(
          `<form id="login"><input name="logintoken" value="fake"></form>`,
        );
      if (url.includes("/course/index.php"))
        return new Response(
          `<div class="coursebox"><h3 class="coursename"><a href="https://learning.example/campus/course/view.php?id=5">Fictitious course</a></h3></div>`,
        );
      return new Response(
        `<script>M.cfg={"sesskey":"private"};</script><span class="usertext">Fictitious teacher</span>`,
      );
    },
  });
  const initial = await (await api(request("status"), "status")).json();
  assert.equal(initial.available, true);
  assert.equal(initial.validated, false);
  assert.equal(initial.authenticated, false);
  assert.equal(calls.length, 0);
  const login = await api(
    request("login", {
      url: "https://learning.example/campus",
      username: "teacher",
      password: "fake",
    }),
    "login",
  );
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
  const connected = await (
    await api(request("status", undefined, cookie), "status")
  ).json();
  assert.equal(connected.connectedUrl, "https://learning.example/campus/");
  assert.equal(connected.compatibility.verified, false);
  assert.equal(connected.validated, false);
  assert.equal(connected.authenticated, true);
  assert.equal(connected.available, true);
  const courses = await (
    await api(request("courses", undefined, cookie), "courses")
  ).json();
  assert.deepEqual(courses.courses, [{ id: 5, title: "Fictitious course" }]);
  assert.ok(
    calls.every((url) => url.startsWith("https://learning.example/campus/")),
  );
  assert.ok(!JSON.stringify(connected).includes("private"));
});

test("switching URL invalidates the earlier session and previews even when the new login fails", async () => {
  const fixture = studentFixture();
  const calls: { url: string; cookie: string | null }[] = [];
  const api = createMoodleApi({
    resolve: publicResolver,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      calls.push({
        url: url.href,
        cookie: new Headers(init?.headers).get("cookie"),
      });
      if (url.hostname === "other.example")
        return new Response(
          `<form id="login"><input name="logintoken" value="other"></form>`,
        );
      const response = await fixture.fetch(input, init);
      response.headers.set("set-cookie", "MoodleSession=first-private; Path=/");
      return response;
    },
  });
  const first = await api(
    request("login", {
      url: "https://first.example/",
      username: "teacher",
      password: "fake",
    }),
    "login",
  );
  const cookie = first.headers.get("set-cookie")!.split(";")[0]!;
  const reviewed = await buildStudentPreview([studentRow], {
    mode: "create",
    enrol: false,
  });
  assert.ok(reviewed.ok);
  const preview = await api(
    request(
      "students/preview",
      {
        rows: [studentRow],
        options: { mode: "create", enrol: false },
        expectedHash: reviewed.preview.hash,
      },
      cookie,
    ),
    "studentsPreview",
  );
  assert.equal(preview.status, 200);
  const operation = await preview.json();
  const change = await api(
    request(
      "login",
      {
        url: "http://other.example/moodle/",
        username: "teacher",
        password: "wrong",
      },
      cookie,
    ),
    "login",
  );
  assert.equal(change.status, 401);
  assert.equal(
    (await api(request("courses", undefined, cookie), "courses")).status,
    401,
  );
  const confirm = await api(
    request(
      "students/confirm",
      {
        previewId: operation.previewId,
        expectedHash: operation.hash,
        confirmation: true,
      },
      cookie,
    ),
    "studentsConfirm",
  );
  assert.equal(confirm.status, 401);
  assert.equal(fixture.confirms(), 0);
  assert.ok(
    calls
      .filter((call) => call.url.startsWith("http://other.example/"))
      .every((call) => call.cookie === null),
  );
  assert.match(change.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("public target overrides the optional lab default and starts a private cookie jar for the new session", async () => {
  const initialCookies: (string | null)[] = [];
  const api = createMoodleApi({
    url: "http://localhost:3211",
    profile: "moodle-4.1.17-lab-ops-v1",
    resolve: publicResolver,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      if (
        url.pathname.endsWith("/login/index.php") &&
        init?.method !== "POST"
      ) {
        initialCookies.push(new Headers(init?.headers).get("cookie"));
        return new Response(
          `<form id="login"><input name="logintoken" value="token"></form>`,
          {
            headers: { "set-cookie": `MoodleSession=${url.hostname}; Path=/` },
          },
        );
      }
      return new Response(`<script>M.cfg={"sesskey":"private"};</script>`);
    },
  });
  const initial = await (await api(request("status"), "status")).json();
  assert.equal(initial.defaultUrl, "http://localhost:3211/");
  assert.equal(initial.validated, true);
  const lab = await api(
    request("login", { username: "first", password: "fake" }),
    "login",
  );
  const labCookie = lab.headers.get("set-cookie")!.split(";")[0]!;
  const other = await api(
    request(
      "login",
      {
        url: "http://learning.example/campus",
        username: "other",
        password: "fake",
      },
      labCookie,
    ),
    "login",
  );
  assert.equal(other.status, 200);
  const otherCookie = other.headers.get("set-cookie")!.split(";")[0]!;
  assert.notEqual(otherCookie, labCookie);
  assert.equal(
    (await api(request("courses", undefined, labCookie), "courses")).status,
    401,
  );
  const status = await (
    await api(request("status", undefined, otherCookie), "status")
  ).json();
  assert.equal(status.connectedUrl, "http://learning.example/campus/");
  assert.equal(status.validated, false);
  assert.equal(status.profile, null);
  assert.equal(status.compatibility.verified, false);
  assert.deepEqual(initialCookies, [null, null]);
});

test("URL validation and malformed login input fail before DNS or transport and the form can recover", async () => {
  let dns = 0,
    sent = 0;
  const api = createMoodleApi({
    resolve: async () => {
      dns++;
      return await publicResolver();
    },
    fetch: async (_input, init) => {
      sent++;
      return new Response(
        init?.method === "POST"
          ? `<script>M.cfg={"sesskey":"key"};</script>`
          : `<form id="login"><input name="logintoken" value="token"></form>`,
      );
    },
  });
  for (const url of [
    "http://127.1",
    "http://2130706433",
    "http://[::ffff:7f00:1]",
    "https://moodle.ifce.edu.br/",
    "file:///secret",
    "https://me:secret@learning.example/",
    "https://learning.example/?key=secret",
    "https://learning.example/#secret",
  ]) {
    assert.equal(
      (
        await api(
          request("login", { url, username: "teacher", password: "fake" }),
          "login",
        )
      ).status,
      422,
      url,
    );
  }
  assert.equal(
    (
      await api(
        request("login", { username: "teacher", password: "fake" }),
        "login",
      )
    ).status,
    422,
  );
  assert.equal(
    (
      await api(
        request("login", {
          url: "https://learning.example",
          username: "teacher",
          password: "fake",
          fetch: "http://attacker.example",
        }),
        "login",
      )
    ).status,
    422,
  );
  assert.equal(dns, 0);
  assert.equal(sent, 0);
  const recovery = await api(
    request("login", {
      url: "https://learning.example",
      username: "teacher",
      password: "fake",
    }),
    "login",
  );
  assert.equal(recovery.status, 200);
  assert.equal(dns, 2);
  assert.equal(sent, 2);
});

test("a target change cannot interrupt an existing operation or leak credentials while that session is busy", async () => {
  let release: (() => void) | undefined;
  let entered: (() => void) | undefined;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const publicCalls: string[] = [];
  const api = createMoodleApi({
    url: "http://localhost:3211",
    resolve: publicResolver,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname !== "localhost") publicCalls.push(url.href);
      if (url.pathname === "/course/index.php") {
        entered!();
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return new Response("No courses");
      }
      return new Response(
        init?.method === "POST" || url.pathname === "/my/"
          ? `<script>M.cfg={"sesskey":"key"};</script>`
          : `<form id="login"><input name="logintoken" value="token"></form>`,
      );
    },
  });
  const login = await api(
    request("login", { username: "teacher", password: "fake" }),
    "login",
  );
  const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
  const running = api(request("courses", undefined, cookie), "courses");
  await started;
  const change = await api(
    request(
      "login",
      { url: "https://other.example/", username: "teacher", password: "fake" },
      cookie,
    ),
    "login",
  );
  assert.equal(change.status, 409);
  assert.deepEqual(publicCalls, []);
  release!();
  assert.equal((await running).status, 200);
  const status = await (
    await api(request("status", undefined, cookie), "status")
  ).json();
  assert.equal(status.authenticated, true);
  assert.equal(status.connectedUrl, "http://localhost:3211/");
});
