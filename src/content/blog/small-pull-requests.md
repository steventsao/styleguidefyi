---
title: "Small pull requests: separate the decisions, not just the files"
description: "Learn how to split a pull request into coherent changes, keep refactors separate, and give reviewers useful evidence without chasing an arbitrary line limit."
published: 2026-10-17
category: Engineering practice
relatedRules:
  - smallest-diff
  - no-drive-by-refactors
  - no-speculative-code
---

A small pull request asks the reviewer to make a small number of related decisions. Line count is a useful warning, but it is not the goal. A generated lockfile can be long and mechanically explainable. A twelve-line permission change can require careful investigation.

Start by describing the user-visible behavior in one sentence. If that sentence needs several unrelated clauses, the work may contain more than one reviewable change.

## Separate preparation from behavior

Suppose you are adding a retry button to a report page. The existing fetch logic is embedded in a component, and you want to extract it before changing the failure behavior.

There are two decisions here: whether the extraction preserves the current behavior, and whether the new retry behavior is correct. Keeping them separate helps a reviewer focus on one contract at a time.

A possible sequence is:

1. Extract the existing request boundary while preserving its behavior.
2. Add the retry state and the checks that exercise it.
3. Remove an obsolete helper if it is no longer used.

This sequence is an example, not a rule that every extraction deserves a separate pull request. If the preparation is tiny and inseparable from the fix, keeping it together may be easier to understand. The point is to keep the behavioral change visible.

## Find the boundary that can stand on its own

Splitting by file often produces changes that cannot be reviewed independently. A component without its required API change may not build. A migration without a compatible reader may be unsafe to deploy.

Instead, identify a state in which the program still works. For a schema change, that might mean adding a compatible field before changing readers and writers. For a feature, it might mean a complete narrow path before adding another case.

Describe dependencies explicitly when changes must land in order. A reviewer should not need to reconstruct the plan from branch names. A separate commit is useful for explaining the diff, but it does not automatically make each intermediate state safe to deploy.

## Keep opportunistic cleanup bounded

Reading old code often reveals a name you dislike, a comment you would rewrite, or an abstraction you want to replace. Those findings can be valuable without belonging in the current change.

Ask whether the cleanup is necessary to understand or safely implement the requested behavior. If it is, explain the connection. If it is not, record it separately. This keeps a bug fix from turning into a broad refactor that requires a different reviewer and a larger verification plan.

The guide's [smallest-diff rule](/#smallest-diff) and [refactor rule](/#no-drive-by-refactors) provide defaults for this decision. Google's [small changes guidance](https://google.github.io/eng-practices/review/developer/small-cls.html) also discusses coherent changes, review effort, and exceptions.

## Give the reviewer evidence

A focused description can be short and still answer the important questions:

- What input or user action exposes the old behavior?
- What should happen after this change?
- Which checks exercised that behavior?
- What remains untested, or requires a deployment step?

For the report example, “Clicking Retry after a failed request starts one new request and preserves the selected date range” is more useful than “Improve report UX.” Include the relevant failure check, especially when the change is meant to fix a regression.

## Read the diff as a stranger

Before requesting review, read only the description and the diff. Temporarily set aside what you remember from implementing it. Look for unexplained renames, unrelated formatting, stale comments, and assertions that rely on context outside the change.

If a reviewer needs a five-minute explanation of why three unrelated changes belong together, the split may still be wrong. If the relationship is clear and each part is necessary to preserve correctness, a larger pull request can be the more responsible choice.

Use the [code review checklist](/blog/code-review-checklist) for the final pass. The goal is a change whose behavior, reasoning, and verification can all be understood together.
