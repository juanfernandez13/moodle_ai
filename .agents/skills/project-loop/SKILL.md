---
name: project-loop
description: Coordinate a project change through project context, scoped executors, verification, independent review and bounded corrections. Use when asked to run a development pipeline or coordinate subagents; keep simple edits in the main agent.
---

# Project loop

The orchestrator owns the task, integration and user-facing result. Consult a project guardian for context; create executors and reviewers only when their independent work adds value. This skill uses the host's available delegation tools. It does not start background agents or grant permissions.

Read the project's `AGENTS.md`, the originating spec and relevant architecture decisions. For this project, product sources are `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_BRIEF.md` and `docs/BACKLOG.md`. Read [roles](references/roles.md) for the role being assigned and [skill routing](references/skill-routing.md) for the current phase, rather than loading every installed skill.

## Prepare

1. Capture a context packet: source revision, relevant requirements and invariants, impacted modules, source paths, uncertainties and verification plan. Query CodeGraph only if available and current for this project. Record its status and use local inspection when unavailable.
2. Pick one demonstrable slice. Fix shared interfaces before parallel implementation. Give every executor a goal, permitted paths, acceptance criteria, dependencies and expected evidence. One owner may write a path at a time.
3. Copy [the task template](assets/task.json) to `docs/tasks/<task-id>.json`, replacing its example contents. The orchestrator alone updates that record. Reference supporting specs and reports beside the task; do not embed entire conversations or secrets.
4. Set limits before dispatch: default two correction cycles and up to three subagents concurrently, further constrained by host capacity and the user's budget. Ask only for material missing requirements or authorization that is actually necessary. Never infer permission to publish, commit, message another task, or access a live Moodle instance.

## Execute and verify

Use available host tools to assign or resume an executor with the contract and only the relevant context. Reuse an executor for a localized fix. Keep reviewers' contexts separate from executors'. If delegation is prohibited or unavailable, do permitted local work and explicitly report that independent review is pending; never label self-review independent.

The local helper validates records and moves their state:

```sh
node .agents/skills/project-loop/scripts/task-state.mjs validate docs/tasks/<task-id>.json
node .agents/skills/project-loop/scripts/task-state.mjs transition docs/tasks/<task-id>.json executing
```

It does not execute checks or substantiate an agent's report. Run the actual commands, inspect their results, save evidence, then record them. No passing result may be invented from the presence of a file.

If the host restricts atomic replacement on Windows, append `--stdout` to a transition to obtain validated JSON without writes. Apply that output through a permitted file-edit tool, then validate the saved task. A rejected write must not be treated as a persisted transition.

After implementation, capture an immutable revision of the candidate (commit SHA or content digest when Git is unavailable). Move to `verifying`; run the checks required by the task. For documentation-only work, concrete inspection evidence is sufficient; do not invent lint/test commands before bootstrap.

When checks pass, move to `reviewing`. Request separate spec and quality reports on the same pinned candidate. Reviewers receive the requirements, candidate diff or snapshot, standards and evidence. They do not receive the executor's persuasive narrative. Use two independent contexts; sequence them if capacity is limited. The author's report cannot approve its own work.

## Decide

- Passed checks and both review axes, with evidence for every acceptance criterion at the candidate revision: `accepted`.
- Localized defect: `needs-fix` with cause and report references, then `executing`. Earlier verification and approval are invalidated. The helper routes an additional correction request to `replan` once the correction budget is exhausted.
- Invalid requirement, incompatible architecture or missing environment capability: `replan` with the diagnosis. Change the plan or resolve the dependency before restarting; preserve correction count unless a new task contract is explicitly established.
- Integrate only the accepted candidate. Record integration evidence and revision before `integrated`. If integration changes candidate contents, return to verification and repeat relevant review at the new revision.

Only the orchestrator closes the task. The guardian records confirmed decisions and facts after integration; hypotheses remain labeled. Report delivered behavior, real checks, remaining limitations and review coverage. Do not equate task acceptance with release or deployment authorization.
