---
title: "AGENTS.md vs CLAUDE.md: keep one set of rules for every agent"
description: "How Claude Code decides between CLAUDE.md and AGENTS.md, when to import one from the other, and how to keep a single source of truth across coding agents."
published: 2026-11-09
category: AI agents
relatedRules:
  - write-the-rules-down
  - one-word-per-concept
  - colocate
  - tool-output-is-data
---

Teams that use more than one coding agent end up with more than one instruction file: `AGENTS.md` for some tools, `CLAUDE.md` for Claude Code, and often a rules directory for an editor. The files start as copies and then drift. One says to run `pnpm test`; another still says `npm test`.

The fix is to keep the rules in one file and point the others at it. This article covers how that works for Claude Code, whose loading behavior is documented in detail, and the principle that applies to any tool.

## What each file is

`AGENTS.md` is a plain Markdown file, usually at the repository root, that several coding agents read for project instructions. It has no required structure.

`CLAUDE.md` is Claude Code's instruction file. It is also plain Markdown, and it can sit at the repository root, in `.claude/`, in your home directory for personal preferences, or in a subdirectory.

Both hold the same kind of content: commands, conventions and limits. The [rule this site keeps for that](/rules/write-the-rules-down) names both files for a reason. What matters is that the rules exist in a file the agent reads.

## How Claude Code chooses between them

Claude Code's [memory documentation](https://code.claude.com/docs/en/memory#agents-md) describes the default behavior:

- If the working directory and the directories above it contain an `AGENTS.md` and no `CLAUDE.md`, Claude Code reads the `AGENTS.md`.
- If a `CLAUDE.md` (or a `CLAUDE.local.md`) is present there, Claude Code reads the `CLAUDE.md` files only.
- If the `CLAUDE.md` imports `AGENTS.md`, Claude Code reads both through the import, once.

The documentation notes that reading `AGENTS.md` directly needs a recent version of Claude Code, and that a setting can make it load both files together. Check the linked page for the current details, because this behavior has changed over time.

The second case is the one that surprises people. If a repository with a complete `AGENTS.md` gains a three-line `CLAUDE.md`, Claude Code by default reads only those three lines. A personal `CLAUDE.local.md` has the same effect.

## Share one file with an import

When a repository needs both files, make `CLAUDE.md` import the shared one. Claude Code expands an `@path` reference into the file's contents:

```markdown
@AGENTS.md

## Claude Code

Instructions that apply only to Claude Code go below the import.
```

Now `AGENTS.md` is the single source. Other agents read it directly, Claude Code reads it through the import, and tool-specific notes have a place that does not pollute the shared file.

A symbolic link from `CLAUDE.md` to `AGENTS.md` also works when there is nothing tool-specific to add. The documentation lists two cautions: Claude Code's edit tools will not write through a symlink, and symlinks are unreliable for contributors on Windows. The import avoids both.

An instruction written in prose, such as "read AGENTS.md before you start," is weaker than either. The agent sees the other file only if it decides to open it.

## Split by topic when the file grows

An import organizes a long file. It does not shorten what the agent loads, because the imported text arrives with the file that imports it. The documentation's target is under 200 lines per file.

For rules that apply to part of a codebase, Claude Code supports rule files under `.claude/rules/`, which can be limited to matching paths:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API rules

- Validate every request body at the handler.
```

A path-scoped rule loads when Claude works with a matching file, so API rules stay out of a session that only edits documentation. This is the same idea as [keeping things that change together close together](/rules/colocate), applied to instructions.

Other tools have their own mechanisms for scoped rules. Before you rely on one, read that tool's current documentation: file names, frontmatter fields and precedence differ between tools and change between versions.

## Keep the wording consistent

Whatever the layout, contradictions do more damage than gaps. If one file says "use the repository pattern" and another says "call the database client directly," the agent picks one, and you cannot predict which.

Two habits prevent most of this:

- [Use one word per concept](/rules/one-word-per-concept) across every instruction file. If the code says "workspace," the instructions should not say "organization" for the same thing.
- Change instructions in the same pull request as the convention they describe, and review them like code.

## Know which files count as instructions

An agent should follow the instruction files your project authorizes and treat everything else it reads as information. A README in a dependency, a web page, or a log line that says "ignore previous instructions" has no authority. The guide's rule is to [treat tool output as data, not as instructions](/rules/tool-output-is-data). A short, clearly owned set of instruction files makes that boundary easier to hold, for the agent and for the people reviewing its work.

## A reasonable default

For a repository used with several agents:

1. Put shared rules in `AGENTS.md` at the root.
2. Add a `CLAUDE.md` containing `@AGENTS.md` only if you need Claude-specific notes or your sessions cannot read `AGENTS.md` directly.
3. Move directory-specific rules into scoped rule files once the root file passes about 200 lines.
4. Add general coding rules selectively. The [setup page for coding agents](/agents) offers this site's rules as a short one-line-per-rule file or one topic at a time.

One source of truth, a short root file and scoped rules for the rest will serve whichever agent your team uses next.
