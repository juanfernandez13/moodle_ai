import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import {
  buildDatePlan,
  previewDatePlan,
} from "../../src/domain/dates/index.ts";
import type {
  DatePlan,
  DatePlanInput,
} from "../../src/domain/dates/index.ts";
import {
  dateMoment,
  dateResultLabel,
  dateTargets,
  friendlyMessage,
  longDate,
  momentText,
  nextMonday,
  scheduleProblem,
  spansYears,
  summarizeTargets,
} from "../../src/client/features/dates/helpers.ts";

const input: DatePlanInput = {
  startDate: "2026-10-19",
  unitCount: 2,
  daysPerUnit: 7,
  opensAtTime: "00:00",
  closesAtTime: "23:59",
  timezoneOffsetMinutes: -180,
};

test("datas aparecem no horário de Brasília, como o professor lê", () => {
  const opens = dateMoment("2026-10-20T03:00:00.000Z");
  assert.ok(opens);
  assert.equal(momentText(opens), "20/10 às 00:00");
  const closes = dateMoment("2026-10-26T02:59:00.000Z");
  assert.ok(closes);
  assert.equal(momentText(closes), "25/10 às 23:59");
  assert.equal(momentText(closes, true), "25/10/26 às 23:59");
  assert.equal(dateMoment(undefined), null);
  assert.equal(dateMoment("não é data"), null);
});

test("o ano só aparece quando o cronograma passa de um ano para outro", () => {
  const result = buildDatePlan(
    { ...input, startDate: "2026-12-14", unitCount: 1 },
    [{ id: "t", kind: "assignment", sectionIndex: 0, title: "Tarefa" }],
  );
  assert.ok(result.ok);
  assert.equal(spansYears(result.plan), false);
  const crossing = buildDatePlan(
    { ...input, startDate: "2026-12-28", daysPerUnit: 14, unitCount: 1 },
    [{ id: "t", kind: "assignment", sectionIndex: 0, title: "Tarefa" }],
  );
  assert.ok(crossing.ok);
  assert.equal(spansYears(crossing.plan), true);
});

test("o dia escolhido é mostrado por extenso e dia inexistente não passa", () => {
  assert.equal(longDate("2026-10-19"), "segunda-feira, 19/10/2026");
  assert.equal(longDate("2026-02-30"), "");
  assert.equal(longDate(""), "");
  assert.equal(longDate("20266-10-19"), "");
});

test("a próxima segunda-feira nunca é hoje", () => {
  assert.equal(nextMonday(new Date(2026, 9, 18)), "2026-10-19");
  assert.equal(nextMonday(new Date(2026, 9, 19)), "2026-10-26");
  assert.equal(nextMonday(new Date(2026, 11, 31)), "2027-01-04");
});

test("os problemas das respostas saem em palavras simples e antes de falar com o Moodle", () => {
  assert.equal(scheduleProblem(input), "");
  assert.match(scheduleProblem({ ...input, startDate: "" }), /Escolha o dia/);
  assert.match(
    scheduleProblem({ ...input, startDate: "2101-01-04" }),
    /entre 1900 e 2100/,
  );
  assert.match(scheduleProblem({ ...input, daysPerUnit: 0 }), /1 a 365/);
  assert.match(scheduleProblem({ ...input, closesAtTime: "" }), /horários/);
  assert.equal(
    scheduleProblem({ ...input, daysPerUnit: 1, closesAtTime: "00:00" }),
    "Fechar precisa ser depois de abrir.",
  );
  assert.equal(scheduleProblem({ ...input, daysPerUnit: 2, closesAtTime: "00:00" }), "");
});

test("o curso de exemplo é válido, tem datas antigas e cabe no resumo", () => {
  const targets = dateTargets(3, "");
  assert.equal(targets.length, 9);
  assert.ok(targets.every((target) => target.opensAt));
  assert.ok(targets.filter((t) => t.kind !== "section").every((t) => t.closesAt));
  assert.deepEqual(summarizeTargets(JSON.stringify(targets)), {
    units: 3,
    activities: 6,
  });
  const built = buildDatePlan({ ...input, unitCount: 3 }, targets);
  assert.ok(built.ok);
  assert.equal(built.plan.changes.length, 9);
  assert.equal(summarizeTargets(""), null);
  assert.equal(summarizeTargets("[]"), null);
  assert.equal(summarizeTargets("{"), null);
});

test("frases técnicas viram frases simples e as demais passam sem mudança", () => {
  assert.equal(
    friendlyMessage("Confira data, horários, quantidade de unidades e alvos do cronograma."),
    "Confira o dia e os horários.",
  );
  assert.equal(
    friendlyMessage("O fechamento deve ocorrer depois da abertura.\nOutra linha."),
    "Fechar precisa ser depois de abrir.\nOutra linha.",
  );
  assert.equal(friendlyMessage("O Moodle não aceitou a senha."), "O Moodle não aceitou a senha.");
  for (const technical of [
    "A unidade não está no intervalo do cronograma.",
    "O mesmo alvo não pode ser aplicado duas vezes.",
    "Este alvo mudou desde a revisão; o envio foi interrompido.",
  ])
    assert.doesNotMatch(friendlyMessage(technical), /alvo|cronograma|hash|UTC|fuso/i);
  assert.deepEqual(
    ["applied", "error", "unknown", "not_applied"].map(dateResultLabel),
    ["Aplicado", "Erro", "Não sabemos", "Não aplicado"],
  );
});

// ---- the planner hook, extracted the same way tests/moodle/session-hooks.test.ts does ----
function extract<T>(name: string, dependencies: Record<string, unknown>): T {
  const path = new URL(
    "../../src/client/features/dates/use-date-planner.ts",
    import.meta.url,
  );
  const source = readFileSync(path, "utf8");
  const ast = ts.createSourceFile(path.pathname, source, ts.ScriptTarget.ESNext, true);
  const declaration = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  assert.ok(declaration, name);
  const compiled = ts
    .transpileModule(declaration.getText(ast), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/^export /, "");
  return new Function(
    ...Object.keys(dependencies),
    `${compiled}; return ${name};`,
  )(...Object.values(dependencies)) as T;
}
function stateFixture() {
  let cursor = 0;
  const states: unknown[] = [];
  function useState<T>(initial: T): [T, (next: T | ((value: T) => T)) => void] {
    const index = cursor++;
    if (!(index in states)) states[index] = initial;
    return [
      states[index] as T,
      (next) => {
        states[index] =
          typeof next === "function"
            ? (next as (value: T) => T)(states[index] as T)
            : next;
      },
    ];
  }
  return {
    hooks: {
      useState,
      useRef: <T>(initial: T) => useState({ current: initial })[0],
      useCallback: <T>(callback: T) => callback,
      useEffect() {},
    },
    render<T>(hook: () => T) {
      cursor = 0;
      return hook();
    },
  };
}
type Planner = {
  input: DatePlanInput;
  targetsText: string;
  preview: { plan: DatePlan } | null;
  moodlePreview: unknown;
  error: string;
  pane: string;
  demo: boolean;
  demoUnits: number;
  courseId: number;
  busy: boolean;
  results: unknown[];
  unknownResult: boolean;
  change(field: keyof DatePlanInput, value: string | number): void;
  changeDemoUnits(value: number): void;
  selectCourse(id: number): void;
  startDemo(): void;
  leaveDemo(): void;
  simulate(): Promise<void>;
  readTargets(id?: number): Promise<void>;
  previewMoodleDates(): Promise<void>;
  confirmDates(): Promise<void>;
};
const targets = [
  { id: "section:2", kind: "section", sectionIndex: 0, title: "Unit" },
];
function fixture(
  post: (path: string, body: unknown) => Promise<unknown> = async () => ({ ok: true }),
  authenticated = true,
) {
  const state = stateFixture();
  const urls: string[] = [];
  const planner = extract<() => Planner>("useDatePlanner", {
    ...state.hooks,
    useMoodle: () => ({
      status: { authenticated },
      courses: [],
      busy: false,
      error: "",
    }),
    z,
    buildDatePlan,
    previewDatePlan,
    moodlePost: post,
    issuesMessage: (_value: unknown, fallback: string) => fallback,
    dateTargets,
    fetch: async (url: string) => {
      urls.push(url);
      return Response.json({ ok: true, targets });
    },
  });
  return { render: () => state.render(planner), urls };
}
function preview(body: unknown) {
  const plan = buildDatePlan(
    (body as { input: DatePlanInput }).input,
    targets as Parameters<typeof buildDatePlan>[1],
  );
  assert.ok(plan.ok);
  return {
    ok: true,
    previewId: "p1",
    hash: "h1",
    plan: plan.plan,
    targets,
  };
}

test("escolher outro curso descarta as datas do curso anterior", async () => {
  const { render } = fixture();
  let planner = render();
  planner.selectCourse(5);
  planner = render();
  await planner.readTargets();
  planner = render();
  assert.match(planner.targetsText, /section:2/);
  planner.selectCourse(6);
  planner = render();
  assert.equal(planner.targetsText, "");
  assert.equal(planner.courseId, 6);
});

test("o curso pode ser lido no mesmo clique que o escolheu, pelo número dele", async () => {
  const { render, urls } = fixture();
  const planner = render();
  planner.selectCourse(7);
  await planner.readTargets(7);
  assert.deepEqual(urls, ["/api/moodle/course?courseId=7"]);
  assert.match(render().targetsText, /section:2/);
});

test("ler um curso não depende do que foi digitado nas datas", async () => {
  const { render } = fixture();
  let planner = render();
  planner.change("startDate", "");
  planner.selectCourse(5);
  planner = render();
  await planner.readTargets();
  planner = render();
  assert.equal(planner.error, "");
  assert.match(planner.targetsText, /section:2/);
});

test("o modo de teste usa unidades de exemplo e ignora o curso lido do Moodle", async () => {
  const { render } = fixture();
  let planner = render();
  planner.selectCourse(5);
  planner = render();
  await planner.readTargets();
  planner = render();
  assert.equal(planner.input.unitCount, 1);
  planner.startDemo();
  planner = render();
  assert.equal(planner.demo, true);
  assert.equal(planner.pane, "plan");
  planner.changeDemoUnits(2);
  planner = render();
  await planner.simulate();
  planner = render();
  assert.equal(planner.error, "");
  assert.equal(planner.pane, "preview");
  assert.equal(planner.moodlePreview, null);
  assert.equal(planner.preview?.plan.changes.length, 6);
  assert.equal(planner.preview?.plan.changes[0]?.title, "Unidade 1");
  // The Moodle course keeps its own unit count; the test mode never rewrites it.
  assert.equal(planner.input.unitCount, 1);
});

test("sair do modo de teste volta ao curso quando já há conexão, ou ao login quando não há", () => {
  const connected = fixture();
  let planner = connected.render();
  planner.startDemo();
  connected.render().leaveDemo();
  planner = connected.render();
  assert.equal(planner.demo, false);
  assert.equal(planner.pane, "course");
  const offline = fixture(undefined, false);
  offline.render().startDemo();
  offline.render().leaveDemo();
  assert.equal(offline.render().pane, "login");
});

test("mudar as datas no modo de teste apaga a prévia de teste", async () => {
  const { render } = fixture();
  render().startDemo();
  await render().simulate();
  assert.notEqual(render().preview, null);
  render().change("daysPerUnit", 3);
  assert.equal(render().preview, null);
  await render().simulate();
  assert.notEqual(render().preview, null);
  render().changeDemoUnits(5);
  assert.equal(render().preview, null);
});

test("uma confirmação que falha trava o curso e mostra só o motivo", async () => {
  const calls: string[] = [];
  const { render } = fixture(async (path, body) => {
    calls.push(path);
    if (path.endsWith("/preview")) return preview(body);
    throw new Error("O Moodle não respondeu.");
  });
  let planner = render();
  planner.selectCourse(5);
  planner = render();
  await planner.previewMoodleDates();
  planner = render();
  assert.equal(planner.pane, "preview");
  await planner.confirmDates();
  planner = render();
  assert.equal(planner.unknownResult, true);
  assert.equal(planner.pane, "result");
  assert.equal(planner.error, "O Moodle não respondeu.");
  await planner.previewMoodleDates();
  await render().confirmDates();
  assert.deepEqual(calls, ["/api/moodle/dates/preview", "/api/moodle/dates/confirm"]);
});

test("uma segunda aplicação não mostra o resultado da primeira enquanto espera", async () => {
  let release: ((value: unknown) => void) | undefined;
  let confirmations = 0;
  const { render } = fixture(async (path, body) => {
    if (path.endsWith("/preview")) return preview(body);
    confirmations++;
    if (confirmations === 1)
      return {
        ok: true,
        results: [{ id: "section:2", title: "Unit", status: "error", message: "Recusado." }],
      };
    return await new Promise((resolve) => {
      release = resolve;
    });
  });
  const planner = render();
  planner.selectCourse(5);
  await render().previewMoodleDates();
  await render().confirmDates();
  assert.equal(render().results.length, 1);
  assert.equal(render().unknownResult, false);
  await render().previewMoodleDates();
  const second = render().confirmDates();
  assert.equal(render().results.length, 0);
  assert.equal(render().busy, true);
  release!({
    ok: true,
    results: [{ id: "section:2", title: "Unit", status: "applied", message: "Aplicado." }],
  });
  await second;
  assert.equal(render().results.length, 1);
  assert.equal(render().busy, false);
});
