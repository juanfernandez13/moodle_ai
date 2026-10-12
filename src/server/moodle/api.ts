import { z } from "zod";
import { BodyError, readJsonBody } from "../../shared/http.ts";
import { hasSameOrigin } from "../../shared/request-origin.ts";
import { MoodleClient } from "./client.ts";
import { MoodleError } from "./http.ts";
import type { HttpOptions } from "./http.ts";
import { canonicalMoodleUrl, LAB_URL } from "./url-policy.ts";
import { previewStudents, confirmStudents } from "./students.ts";
import type { StudentOperation } from "./students.ts";
import { readCourse, previewDates, confirmDates } from "./dates.ts";
import type { DateOperation } from "./dates.ts";

export const LAB_PROFILE = "moodle-4.1.17-lab-ops-v1";
const COOKIE = "moodle_ai_session";
const SESSION_TTL = 30 * 60_000,
  OPERATION_TTL = 10 * 60_000;
const LIMIT_SESSIONS = 100,
  LIMIT_OPERATIONS = 4;
export type MoodleAction =
  | "status"
  | "login"
  | "logout"
  | "courses"
  | "course"
  | "studentsPreview"
  | "studentsConfirm"
  | "datesPreview"
  | "datesConfirm";
type Configuration = HttpOptions & {
  url?: string;
  profile?: string;
  now?: () => number;
};
type Operation = {
  value: StudentOperation | DateOperation;
  createdAt: number;
  consumed: boolean;
};
type Session = {
  client: MoodleClient;
  name: string;
  expires: number;
  busy: boolean;
  operations: Map<string, Operation>;
};

const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const optionsSchema = z.strictObject({
  mode: z.enum(["create", "update"]),
  enrol: z.boolean(),
});
const rowSchema = z.strictObject({
  id: z.string().min(1).max(128),
  rowNumber: z.number().int().min(1),
  original: z
    .record(z.string().max(200), z.string().max(10_000))
    .refine((value) => Object.keys(value).length <= 64),
  username: z.string().max(100),
  firstName: z.string().max(200),
  lastName: z.string().max(200),
  email: z.string().max(254),
  cpf: z.string().max(20),
  course: z.string().max(200),
});
const studentSchema = z.strictObject({
  rows: z.array(rowSchema).min(1).max(10_000),
  options: optionsSchema,
  expectedHash: hashSchema,
});
const dateInputSchema = z.strictObject({
  startDate: z.iso.date(),
  unitCount: z.number().int().min(1).max(200),
  daysPerUnit: z.number().int().min(1).max(365),
  opensAtTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  closesAtTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});
const dateSchema = z.strictObject({
  courseId: z.number().int().min(2).max(2_147_483_647),
  input: dateInputSchema,
});
const confirmSchema = z.strictObject({
  previewId: z.uuid(),
  expectedHash: hashSchema,
  confirmation: z.literal(true),
});
const loginSchema = z.strictObject({
  url: z.string().trim().min(1).max(2048).optional(),
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(1000),
});

function compatibility(url: string | undefined, config: Configuration) {
  const verified = url === LAB_URL && config.profile === LAB_PROFILE;
  return {
    verified,
    profile: verified ? LAB_PROFILE : null,
    message: verified
      ? "Adaptador conferido no laboratório Moodle 4.1.17."
      : "Login padrão e formulários Moodle são necessários. A compatibilidade desta instalação ainda não foi verificada.",
  };
}
function response(value: unknown, status = 200, cookie?: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    pragma: "no-cache",
  });
  if (cookie) headers.set("set-cookie", cookie);
  return new Response(JSON.stringify(value), { status, headers });
}
function cookie(
  request: Request,
  id: string,
  seconds = SESSION_TTL / 1000,
): string {
  return `${COOKIE}=${id}; Path=/api/moodle; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
function sessionId(request: Request): string | undefined {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return raw && z.uuid().safeParse(raw).success ? raw : undefined;
}
async function parse<T>(
  request: Request,
  schema: z.ZodType<T>,
  maximum = 1024 * 1024,
): Promise<T> {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  )
    throw new MoodleError(
      "invalid_content_type",
      "A solicitação deve usar JSON.",
    );
  const value = schema.safeParse(await readJsonBody(request, maximum));
  if (!value.success)
    throw new MoodleError(
      "invalid_input",
      "Confira os campos e limites da solicitação.",
    );
  return value.data;
}

/** Process-local opaque sessions: credentials are used once and never retained. */
export function createMoodleApi(
  config: Configuration,
): (request: Request, action: MoodleAction) => Promise<Response> {
  const sessions = new Map<string, Session>(),
    now = config.now ?? Date.now;
  const loginAttempts = new Map<string, { time: number; count: number }>();
  let defaultUrl: string | undefined;
  let defaultIssue: { code: string; message: string } | undefined;
  if (config.url) {
    try {
      defaultUrl = canonicalMoodleUrl(config.url).href;
    } catch {
      defaultIssue = {
        code: "invalid_configuration",
        message:
          "O endereço padrão desta instalação está indisponível. Informe a URL do seu Moodle.",
      };
    }
  }
  const sweep = () => {
    for (const [id, session] of sessions) {
      if (session.expires <= now()) {
        session.client.http.clear();
        sessions.delete(id);
      } else
        for (const [key, operation] of session.operations)
          if (now() - operation.createdAt > OPERATION_TTL)
            session.operations.delete(key);
    }
    for (const [origin, attempt] of loginAttempts)
      if (now() - attempt.time > 60_000) loginAttempts.delete(origin);
  };
  return async (request, action) => {
    let session: Session | undefined,
      locked = false,
      disconnected = false;
    try {
      sweep();
      const mutation = [
        "login",
        "logout",
        "studentsPreview",
        "studentsConfirm",
        "datesPreview",
        "datesConfirm",
      ].includes(action);
      if (request.method !== (mutation ? "POST" : "GET"))
        return response(
          {
            ok: false,
            issues: [
              { code: "invalid_method", message: "Método HTTP não permitido." },
            ],
          },
          405,
        );
      if (mutation && !hasSameOrigin(request))
        throw new MoodleError(
          "invalid_origin",
          "A operação deve partir desta aplicação.",
        );
      const id = sessionId(request);
      session = id ? sessions.get(id) : undefined;
      if (action === "status") {
        let authenticated = false;
        if (session && !session.busy) {
          try {
            authenticated = await session.client.alive();
          } catch {
            authenticated = false;
          }
          if (!authenticated) {
            session.client.http.clear();
            sessions.delete(id!);
            session = undefined;
          }
        } else authenticated = Boolean(session);
        const connectedUrl = authenticated
          ? session?.client.http.base.href
          : undefined;
        const proof = compatibility(connectedUrl ?? defaultUrl, config);
        return response({
          available: true,
          configured: Boolean(connectedUrl ?? defaultUrl),
          validated: proof.verified,
          authenticated,
          profile: proof.profile,
          compatibility: proof,
          ...(defaultUrl ? { defaultUrl } : {}),
          ...(authenticated ? { name: session?.name, connectedUrl } : {}),
          ...(defaultIssue ? { issues: [defaultIssue] } : {}),
        });
      }
      if (action === "logout") {
        if (request.body) await parse(request, z.strictObject({}), 1024);
        if (session && id) {
          if (session.busy)
            throw new MoodleError(
              "operation_busy",
              "Aguarde a operação em andamento antes de desconectar.",
            );
          sessions.delete(id);
          session.operations.clear();
          try {
            await session.client.logout();
          } catch {
            session.client.http.clear();
          }
        }
        return response({ ok: true }, 200, cookie(request, "", 0));
      }
      if (action === "login") {
        const credentials = await parse(request, loginSchema, 4096);
        const requestedUrl = credentials.url ?? defaultUrl;
        if (!requestedUrl)
          throw new MoodleError(
            "invalid_moodle_url",
            "Informe a URL base do Moodle para conectar.",
          );
        const targetUrl = canonicalMoodleUrl(requestedUrl).href;
        const key = `${targetUrl}\n${credentials.username.toLowerCase()}`,
          previous = loginAttempts.get(key);
        if (previous && previous.count >= 5)
          throw new MoodleError(
            "login_rate_limit",
            "Aguarde um minuto antes de tentar conectar novamente.",
          );
        if (loginAttempts.size >= 200 && !previous)
          throw new MoodleError(
            "login_rate_limit",
            "Aguarde um minuto antes de tentar conectar novamente.",
          );
        loginAttempts.set(key, {
          time: previous?.time ?? now(),
          count: (previous?.count ?? 0) + 1,
        });
        if (session && id) {
          if (session.busy)
            throw new MoodleError(
              "operation_busy",
              "Aguarde a operação em andamento antes de reconectar.",
            );
          // A change of target invalidates every prior preview before credentials leave this process.
          sessions.delete(id);
          session.operations.clear();
          session.client.http.clear();
          session = undefined;
          disconnected = true;
        }
        if (sessions.size >= LIMIT_SESSIONS)
          throw new MoodleError(
            "session_limit",
            "O limite de sessões locais foi atingido. Tente novamente após a expiração.",
          );
        const client = new MoodleClient(targetUrl, config);
        let authenticated: { name: string };
        try {
          authenticated = await client.login(
            credentials.username,
            credentials.password,
          );
        } catch (error) {
          client.http.clear();
          throw error;
        }
        const newId = crypto.randomUUID();
        sessions.set(newId, {
          client,
          name: authenticated.name,
          expires: now() + SESSION_TTL,
          busy: false,
          operations: new Map(),
        });
        loginAttempts.delete(key);
        return response(
          {
            ok: true,
            name: authenticated.name,
            connectedUrl: targetUrl,
            compatibility: compatibility(targetUrl, config),
          },
          200,
          cookie(request, newId),
        );
      }
      if (!session)
        throw new MoodleError(
          "authentication_required",
          "Conecte sua sessão Moodle para continuar.",
        );
      if (session.busy)
        throw new MoodleError(
          "operation_busy",
          "Já existe uma operação Moodle em andamento nesta sessão.",
        );
      session.busy = true;
      locked = true;
      if (action === "courses")
        return response({ ok: true, courses: await session.client.courses() });
      if (action === "course") {
        const url = new URL(request.url);
        if (
          [...url.searchParams.keys()].some((key) => key !== "courseId") ||
          url.searchParams.getAll("courseId").length !== 1
        )
          throw new MoodleError(
            "invalid_input",
            "Informe um único ID de curso.",
          );
        const raw = url.searchParams.get("courseId");
        if (!raw || !/^[1-9]\d*$/.test(raw))
          throw new MoodleError(
            "invalid_input",
            "Informe um ID de curso válido.",
          );
        const courseId = Number(raw);
        if (
          !Number.isSafeInteger(courseId) ||
          courseId < 2 ||
          courseId > 2_147_483_647
        )
          throw new MoodleError(
            "invalid_input",
            "Informe um ID de curso válido.",
          );
        const course = await readCourse(session.client, courseId);
        return response({
          ok: true,
          course: course.course,
          targets: course.targets,
          issues: course.issues,
        });
      }
      if (action === "studentsPreview" || action === "datesPreview") {
        if (session.operations.size >= LIMIT_OPERATIONS)
          throw new MoodleError(
            "preview_limit",
            "Há prévias demais nesta sessão. Aguarde a expiração ou reconecte.",
          );
        const previewId = crypto.randomUUID();
        if (action === "studentsPreview") {
          const input = await parse(request, studentSchema, 6 * 1024 * 1024);
          const preview = await previewStudents(
            session.client,
            input.rows,
            input.options,
            input.expectedHash,
          );
          session.operations.set(previewId, {
            value: preview.operation,
            createdAt: now(),
            consumed: false,
          });
          return response({
            ok: true,
            previewId,
            hash: preview.operation.hash,
            rows: preview.rows,
            effectiveOptions: preview.effectiveOptions,
            issues: preview.issues,
          });
        }
        const input = await parse(request, dateSchema, 4096),
          preview = await previewDates(
            session.client,
            input.courseId,
            input.input,
          );
        session.operations.set(previewId, {
          value: preview.operation,
          createdAt: now(),
          consumed: false,
        });
        return response({
          ok: true,
          previewId,
          hash: preview.hash,
          plan: preview.plan,
          targets: preview.targets,
          issues: preview.issues,
        });
      }
      const input = await parse(request, confirmSchema, 4096);
      const operation = session.operations.get(input.previewId),
        kind = action === "studentsConfirm" ? "students" : "dates";
      if (
        !operation ||
        operation.consumed ||
        operation.value.kind !== kind ||
        operation.value.hash !== input.expectedHash ||
        now() - operation.createdAt > OPERATION_TTL
      )
        throw new MoodleError(
          "stale_preview",
          "A prévia está obsoleta, expirada ou já foi consumida. Gere e revise outra prévia.",
        );
      // Consumed before any await or POST. A rejected/uncertain confirmation cannot be blindly retried.
      operation.consumed = true;
      if (operation.value.kind === "students") {
        const result = await confirmStudents(session.client, operation.value);
        return response({
          ok: true,
          results: result.rows,
          counts: result.counts,
        });
      }
      return response({
        ok: true,
        ...(await confirmDates(session.client, operation.value)),
      });
    } catch (error) {
      const known = error instanceof MoodleError || error instanceof BodyError;
      const code = known ? error.code : "moodle_operation_failed";
      if (code === "session_expired" && session) {
        session.client.http.clear();
        for (const [id, value] of sessions)
          if (value === session) sessions.delete(id);
      }
      const status =
        code === "invalid_origin"
          ? 403
          : [
                "invalid_credentials",
                "authentication_required",
                "session_expired",
              ].includes(code)
            ? 401
            : [
                  "stale_preview",
                  "moodle_state_changed",
                  "operation_busy",
                  "preview_limit",
                ].includes(code)
              ? 409
              : code === "request_too_large"
                ? 413
                : code === "login_rate_limit"
                  ? 429
                  : [
                        "invalid_input",
                        "invalid_content_type",
                        "invalid_json",
                        "invalid_students",
                        "invalid_date_plan",
                        "invalid_moodle_url",
                        "unsafe_moodle_url",
                        "unsafe_moodle_address",
                      ].includes(code)
                    ? 422
                    : 502;
      return response(
        {
          ok: false,
          issues: [
            {
              code,
              message: known
                ? error.message
                : "Não foi possível concluir a operação Moodle. Os detalhes privados permanecem no servidor.",
            },
          ],
        },
        status,
        disconnected ? cookie(request, "", 0) : undefined,
      );
    } finally {
      if (locked && session) session.busy = false;
    }
  };
}

const registry = globalThis as typeof globalThis & {
  __moodleAiOps?: { key: string; api: ReturnType<typeof createMoodleApi> };
};
export function handleMoodleRequest(
  request: Request,
  action: MoodleAction,
): Promise<Response> {
  const url = process.env.MOODLE_URL,
    profile = process.env.MOODLE_CAPABILITY_PROFILE,
    key = JSON.stringify([url, profile]);
  if (!registry.__moodleAiOps || registry.__moodleAiOps.key !== key)
    registry.__moodleAiOps = {
      key,
      api: createMoodleApi({
        ...(url ? { url } : {}),
        ...(profile ? { profile } : {}),
      }),
    };
  return registry.__moodleAiOps.api(request, action);
}
