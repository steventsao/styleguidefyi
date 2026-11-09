---
title: "What to put in AGENTS.md: rules a coding agent can follow"
description: "A practical structure for AGENTS.md: commands, conventions, limits and a definition of done. What to leave out, and how to keep the file short."
published: 2026-11-09
category: AI agents
relatedRules:
  - write-the-rules-down
  - verify-before-done
  - report-honestly
  - confirm-destructive
  - match-the-codebase
---

An `AGENTS.md` file is the briefing a coding agent reads before it touches your repository. The agent reads all of it at the start of a session, so every line competes with the task for attention. The useful question for each line is whether the agent would do the wrong thing without it.

This article gives a structure that holds up in practice, and the reasoning for each part, so you can adapt it instead of copying it.

## Start with the commands

An agent can read your code. It cannot guess which of four test commands is the real one. Put the commands first, in code fences, exactly as you would type them:

```markdown
## Commands

- Install: `pnpm install`
- Test one file: `pnpm vitest run src/lib/orders.test.ts`
- Test everything: `pnpm test`
- Typecheck: `pnpm typecheck`
```

Include the command for running a single test. An agent that can only run the whole suite will either wait several minutes after each edit or stop running tests.

## State conventions the code does not show

Most conventions are visible in the code, and an agent that reads the surrounding files will [match them](/rules/match-the-codebase). Write down the ones it cannot infer:

- Decisions with history. "We use `date-fns`; do not add another date library."
- Rules that the existing code breaks. If half the codebase uses a deprecated pattern, the agent will copy it unless told which half is current.
- Boundaries. "Handlers validate input; code under `src/domain/` assumes valid data."

Write each one as a concrete instruction. Claude Code's documentation makes the same point about its own instruction file: [instructions should be "concrete enough to verify"](https://code.claude.com/docs/en/memory#write-effective-instructions), such as "Run `npm test` before committing" in place of "Test your changes."

## Say what is off limits

An agent works fast, which makes an irreversible mistake arrive fast. List the actions that need a person:

```markdown
## Limits

- Never edit files under `migrations/` that are already merged. Add a new migration.
- Do not push to `main` or force-push any branch.
- Do not change `.github/workflows/` without asking.
```

This is the instruction-file half of a broader rule: [confirm the scope and authorization of irreversible actions](/rules/confirm-destructive). An instruction file is guidance, not enforcement. For an action that must never happen, use a mechanism that blocks it: branch protection, a pre-commit hook, or restricted credentials.

## Define done

Left alone, an agent tends to stop when the code is written. Tell it what finished means in this repository:

```markdown
## Definition of done

- The tests that cover the change pass, and you ran them.
- `pnpm typecheck` passes.
- Your summary lists anything you could not verify and any test you skipped.
```

Two rules from the guide carry most of the weight here: [run it before you say it works](/rules/verify-before-done), and [report what failed and what you skipped](/rules/report-honestly). A report that says "the migration is untested because no database was available" is more useful than a confident summary that hides it.

## Leave out what a tool already enforces

Indentation, import order and quote style belong to a formatter. A rule the linter checks does not need a sentence in `AGENTS.md`; the agent will see the failure and fix it. Spending instruction lines on formatting leaves less room for the decisions no tool can make.

Leave out generic advice as well. "Write clean, maintainable code" changes nothing, because it does not tell the agent what to do differently in this repository.

## Keep the file short

Length has a cost. Claude Code's documentation recommends a target of [under 200 lines per instruction file](https://code.claude.com/docs/en/memory#write-effective-instructions), because longer files "consume more context and reduce adherence." That guidance is written for `CLAUDE.md`, and the reasoning applies to any file that is loaded in full every session.

Three ways to stay under it:

- Link to longer documents and let the agent open them when a task needs them.
- Move rules that apply to one directory into that directory's own instruction file, if your tool supports nested files.
- Delete a rule when a linter or a test starts enforcing it.

## Add general coding rules last, and sparingly

Project-specific instructions come first because nobody else can write them. General rules about naming, error handling or testing are worth adding where your agent keeps making the same kind of mistake.

The styleguide.fyi rules are published as Markdown in three sizes for this purpose: [every rule as one line](/styleguide.compact.md), [one topic at a time](/rules), or the full guide. The [setup page for coding agents](/agents) lists the commands. Whichever you choose, read what you add and delete the rules your team does not follow. An instruction the project contradicts teaches the agent that the file is optional.

## Review it like code

An instruction file drifts the same way documentation does. Change it in the same pull request that changes the convention, and when an agent makes a mistake twice, ask whether a line in the file would have prevented it. That question, asked regularly, produces a better file than any template.
