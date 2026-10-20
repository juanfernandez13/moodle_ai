// A fake Moodle site for adapter tests. It serves the core-markup fixtures in ./html, keeps the edit forms as
// mutable HTML and applies each POST to them the way Moodle would show the saved values on the next GET.
import { readFileSync } from "node:fs";
import { load } from "cheerio";

export const BASE = "http://localhost:3211";
export const page = (name: string): string =>
  readFileSync(new URL(`./html/${name}`, import.meta.url), "utf8");

export type CoreSiteOptions = {
  courseView?: string;
  /** Results page returned after the second tool_uploaduser form. */
  results?: string;
  /** Timezone shown in user/edit.php; "99" falls back to the site setting. */
  userTimezone?: string;
  /** Field names Moodle silently does not save. */
  ignore?: string[];
  /** Called after a form POST is stored, with the edited target key. */
  afterPost?: (key: string, site: CoreSite) => void;
  /** Course short names by course id (course/edit.php). */
  shortNames?: Record<string, string>;
  enrolDisabled?: boolean;
  roleArchetype?: string;
};
export type CoreSite = ReturnType<typeof coreSite>;

/** Applies posted pairs to a form document: text/hidden values, selected options, checked boxes and textareas. */
export function applyPost(html: string, body: URLSearchParams, ignore: readonly string[] = []): string {
  const $ = load(html);
  const form = $("form").first();
  const posted = new Map<string, string[]>();
  for (const [name, value] of body) posted.set(name, [...(posted.get(name) ?? []), value]);
  const checkboxes = new Set(
    form.find('input[type="checkbox"]').map((_, el) => $(el).attr("name")).get(),
  );
  form.find("input, select, textarea").each((_, element) => {
    const node = $(element), name = node.attr("name");
    if (!name || ignore.includes(name)) return;
    const values = posted.get(name);
    const type = (node.attr("type") ?? "text").toLowerCase();
    if (element.tagName === "select") {
      if (!values) return;
      node.find("option").each((_, option) => {
        if (values.includes($(option).attr("value") ?? "")) $(option).attr("selected", "selected");
        else $(option).removeAttr("selected");
      });
    } else if (element.tagName === "textarea") {
      if (values) node.text(values.at(-1)!);
    } else if (type === "checkbox") {
      if (values?.includes(node.attr("value") ?? "on")) node.attr("checked", "checked");
      else node.removeAttr("checked");
    } else if (type === "hidden" && checkboxes.has(name)) {
      // The hidden "0" companion of an advanced checkbox keeps its value.
    } else if (!["submit", "button"].includes(type) && values) node.attr("value", values.at(-1)!);
  });
  return $.html();
}

export function coreSite(options: CoreSiteOptions = {}) {
  const requests: { method: string; path: string; body: URLSearchParams | FormData | undefined }[] = [];
  const uploads: string[] = [];
  let draft = 900000, expired = false;
  const sectionForm = (id: string, name: string) => {
    const $ = load(page("editsection.html"));
    $('input[name="id"]').attr("value", id);
    $('input[name="name[value]"]').attr("value", name);
    // A section without a custom name uses the format default ("Topic 2").
    if (!name) $('input[type="checkbox"][name="name[customize]"]').removeAttr("checked");
    return $.html();
  };
  const forms = new Map<string, string>([
    ["section:22", sectionForm("22", "Unidade 1 — Ligações")],
    ["section:23", sectionForm("23", "")],
    ["module:61", page("modedit-forum.html")],
    ["module:62", page("modedit-assign.html")],
    ["module:63", page("modedit-quiz.html")],
  ]);
  // Moodle prepares new draft areas on every GET of an edit form.
  const withFreshDrafts = (html: string) => {
    const $ = load(html);
    const id = String(++draft);
    $('input[name$="[itemid]"], input[name="introattachments"], input[name="filemanager_sebconfigfile"]').attr("value", id);
    $("textarea").each((_, element) => {
      $(element).text($(element).text().replace(/(\/user\/draft\/)\d+(\/)/g, `$1${id}$2`));
    });
    return $.html();
  };
  const html = (body: string, status = 200) =>
    new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
  const redirect = (location: string) => new Response(null, { status: 303, headers: { location } });
  const site = {
    requests,
    uploads,
    forms,
    expire() {
      expired = true;
    },
    posts: () => requests.filter((request) => request.method === "POST"),
    fetch: (async (input, init) => {
      const url = new URL(String(input));
      const method = (init?.method ?? "GET").toUpperCase();
      const body = init?.body instanceof FormData ? init.body : init?.body === undefined ? undefined : new URLSearchParams(String(init.body));
      requests.push({ method, path: `${url.pathname}${url.search}`, body });
      const fields = body instanceof URLSearchParams ? body : new URLSearchParams();
      if (url.pathname === "/login/index.php") {
        if (method === "GET") return html(page("login.html"));
        expired = false;
        return new Response(null, { status: 303, headers: { location: `${BASE}/my/`, "set-cookie": "MoodleSession=lab-cookie; path=/; HttpOnly" } });
      }
      if (expired) return redirect(`${BASE}/login/index.php`);
      switch (url.pathname) {
        case "/my/":
          return html(page("dashboard.html"));
        case "/admin/tool/uploaduser/index.php":
          if (method === "GET") return html(page("uploaduser-step1.html"));
          if (fields.has("_qf__admin_uploaduser_form1")) return html(page("uploaduser-preview.html"));
          return html(page(options.results ?? "uploaduser-results.create.en.html"));
        case "/repository/repository_ajax.php": {
          const file = body instanceof FormData ? body.get("repo_upload_file") : null;
          if (file instanceof Blob) uploads.push(await file.text());
          const itemid = body instanceof FormData ? body.get("itemid") : null;
          return Response.json({ url: `${BASE}/draftfile.php/5/user/draft/${itemid}/alunos.csv`, id: Number(itemid), file: "alunos.csv" });
        }
        case "/course/search.php":
          return html(page("course-search.html"));
        case "/course/edit.php": {
          const $ = load(page("course-edit.html"));
          const id = url.searchParams.get("id") ?? "";
          $('input[name="shortname"]').attr("value", options.shortNames?.[id] ?? (id === "4" ? "LAB" : `OTHER-${id}`));
          return html($.html());
        }
        case "/enrol/instances.php":
          return html(page("enrol-instances.html"));
        case "/enrol/editinstance.php": {
          const $ = load(page("enrol-manual-edit.html"));
          if (options.enrolDisabled) {
            $('select[name="status"] option').removeAttr("selected");
            $('select[name="status"] option[value="1"]').attr("selected", "selected");
          }
          return html($.html());
        }
        case "/admin/roles/define.php": {
          const $ = load(page("role-define.html"));
          if (options.roleArchetype !== undefined) {
            $('select[name="archetype"] option').removeAttr("selected");
            $(`select[name="archetype"] option[value="${options.roleArchetype}"]`).attr("selected", "selected");
          }
          return html($.html());
        }
        case "/course/view.php":
          return html(page(options.courseView ?? "course-view.boost-4.1.en.html"));
        case "/user/edit.php": {
          const $ = load(page("user-edit.html"));
          if (options.userTimezone) {
            $('select[name="timezone"] option').removeAttr("selected");
            $(`select[name="timezone"] option[value="${options.userTimezone}"]`).attr("selected", "selected");
          }
          return html($.html());
        }
        case "/admin/settings.php":
          return html(page("admin-locationsettings.html"));
        case "/course/editsection.php":
        case "/course/modedit.php": {
          const isSection = url.pathname.endsWith("editsection.php");
          const id = method === "POST" ? fields.get(isSection ? "id" : "update") : url.searchParams.get(isSection ? "id" : "update");
          const key = `${isSection ? "section" : "module"}:${id}`;
          const current = forms.get(key);
          if (!current) return html(`<div id="page-error"><div class="errorbox alert alert-danger">Invalid course module ID</div></div>`, 404);
          if (method === "GET") return html(withFreshDrafts(current));
          forms.set(key, applyPost(current, fields, options.ignore));
          options.afterPost?.(key, site);
          return redirect(`${BASE}/course/view.php?id=4`);
        }
      }
      return html("Not found", 404);
    }) as typeof fetch,
  };
  return site;
}

/** The named control values of a stored form, as the browser would submit them. */
export function formValues(html: string): Record<string, string> {
  const $ = load(html), values: Record<string, string> = {};
  $("form").first().find("input, select, textarea").each((_, element) => {
    const node = $(element), name = node.attr("name");
    if (!name) return;
    const type = (node.attr("type") ?? "text").toLowerCase();
    if (element.tagName === "select") values[name] = node.find("option[selected]").attr("value") ?? "";
    else if (element.tagName === "textarea") values[name] = node.text();
    else if (type === "checkbox") { if (node.attr("checked") !== undefined) values[name] = node.attr("value") ?? "on"; }
    else if (!["submit", "button"].includes(type) && !(type === "hidden" && name in values)) values[name] = node.attr("value") ?? "";
  });
  return values;
}
