# Skill routing and design authority

Installed skill sources are recorded in the project's `skills-lock.json`. Read the actual local `SKILL.md` before use; upstream instructions can change. Do not edit vendor skills to implement this routing.

## Matt Pocock

| Phase | Local skill | Use |
| --- | --- | --- |
| Clarify substantial ambiguity | `../../grill-with-docs/SKILL.md` | Investigate the project and ask targeted questions. |
| Specification | `../../to-spec/SKILL.md` | Produce observable behavior and implementation/testing decisions. |
| Split delivery | `../../to-tickets/SKILL.md` | Derive dependent tasks from the spec. |
| Architecture | `../../codebase-design/SKILL.md`, `../../domain-modeling/SKILL.md` | Establish module interfaces and domain vocabulary. |
| Critical behavior | `../../tdd/SKILL.md` | Test-first development at agreed public interfaces. |
| Implementation | `../../implement/SKILL.md` | Implement a delimited spec when its prerequisites and authorization apply. |
| Review | `../../code-review/SKILL.md` | Separate Standards and Spec review at a fixed Git point. |

The installed `implement` skill requests a commit; this loop does not authorize Git mutation merely because implementation is requested. Follow the session's authorization. The installed `tdd` asks for agreed test seams: record the interface and testing scope in the task, using any agreement already present in the session.

`code-review` expects a resolvable Git baseline and tracker configuration. When those prerequisites are missing, use the role contracts for two independent local reviews and report the mode explicitly; do not claim to have executed the upstream Git review workflow.

No external tracker setup is implied. Local specs and task JSON records support this loop. Configure the Matt Pocock tracker workflow separately when its full ticket/review integration is needed.

Source: [Matt Pocock skills](https://github.com/mattpocock/skills).

## Frontend Design and Impeccable

The installed `frontend-design` comes from `anthropics/skills`. Use [its local instructions](../../frontend-design/SKILL.md) for a new UI's deliberate visual direction, compact tokens, layout and critique against the brief. The current product brief is `docs/DESIGN_BRIEF.md`.

Impeccable is an optional upstream dependency, not installed by this loop. Its [current entrypoint](https://github.com/pbakaus/impeccable/blob/main/.agents/skills/impeccable/SKILL.md) has a broader design workflow and commands such as `critique`, `audit` and `polish`. It derives from Anthropic's frontend-design, so there is overlap; this is not a guarantees-of-compatibility claim.

Routing:

1. New screen or replacement design: one design owner uses `frontend-design` and the product brief to establish direction.
2. Existing candidate: an independent UI reviewer may use Impeccable `critique` or `audit` if installed and requested or appropriate to the task. These reports are read-only inputs.
3. An accepted refinement task may use Impeccable `polish`. Preserve the established tokens, product facts and behavior; route a proposed redesign back to the orchestrator.
4. Do not start two parallel design-authoring passes on the same screen. Do not install another skill named `frontend-design` over the existing one.

Project facts and explicit user choices govern both skills. If Impeccable is adopted later, reconcile its `PRODUCT.md`/`DESIGN.md` context requirements with the PRD and design brief, identifying a single authority for each fact. Surface inconsistencies instead of creating two contradictory sources. Follow the installed version's setup instructions; do not configure detector hooks or download a launcher merely because a task mentions UI.

For the course editor the operating task takes priority: legible content, consistent editing, discoverable validation errors, keyboard access and responsive layout. Marketing pages can have a different visual expression while sharing the same product facts.

Potential project-local installation, after checking the current CLI and package contents:

```sh
npx skills add pbakaus/impeccable --skill impeccable --agent codex --copy --yes
```

This is a documented option, not a command executed during this setup. Sources: [Impeccable repository](https://github.com/pbakaus/impeccable), [skills.sh entry](https://skills.sh/pbakaus/impeccable/impeccable).
