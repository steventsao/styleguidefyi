---
title: "How to choose a TypeScript style guide for your team"
description: "Separate formatting, linting, and engineering judgment when choosing a TypeScript style guide. Adopt a small set of conventions your team can explain and check."
published: 2026-10-17
category: TypeScript
relatedRules:
  - match-the-codebase
  - units-in-names
  - no-any
  - parse-at-the-boundary
---

A TypeScript style guide works when it makes the next change easier to read and review. The strongest starting point is usually the repository in front of you: its existing conventions, compiler configuration, formatter, tests, and recurring review comments.

Before choosing a published guide, separate three jobs that often get bundled together: formatting code, checking mechanically detectable problems, and making engineering decisions. Each needs a different kind of agreement.

## Let the formatter own layout

Indentation, wrapping, and spacing are recurring decisions that a formatter can make consistently. Choose a configuration, check it in, and use the same version locally and in CI. Avoid requiring reviewers to enforce choices that a command can apply.

[Prettier's comparison with linters](https://prettier.io/docs/comparison) draws this distinction: formatting and code-quality checks solve different problems. A formatted program can still be wrong. Passing a formatting check should free review attention for behavior.

On an existing repository, keep a large formatting migration separate from a feature. Otherwise, the meaningful change is buried inside hundreds of unrelated line changes.

## Use the type checker and linter for enforceable rules

Start from the actual project configuration. A convention only becomes a reliable mechanical check when the tool is enabled, its failures are visible, and the team knows how to run it.

Consider a rule about data from an HTTP response. Declaring the desired type does not verify the response:

```ts
const body: unknown = await response.json();
// Parse body with the application's boundary validator before using it.
```

The type `unknown` makes the missing step visible. Which parser to use is a repository decision; a style guide should explain the boundary contract without inventing a new dependency for every example.

Keep exceptions specific. If a generated file or a framework boundary needs an exception, document that boundary. A broad disable comment makes it harder to tell whether later code is intentional or accidental.

## Write down decisions that tools cannot make

A formatter cannot tell you whether a helper represents a shared concept or just similar-looking code. A linter cannot establish that a retry is safe for your payment operation. These decisions need a short rationale and an example.

For each proposed convention, answer:

- Which recurring problem does it solve here?
- When does it apply?
- What would a reasonable exception look like?
- How will a contributor know whether they followed it?

For example, “put units in names” becomes useful when a codebase crosses boundaries with different units. `timeoutMs` tells a caller more than `timeout`. The value is in preventing a misunderstanding, not in enforcing a naming pattern for its own sake.

## Compare published guides by scope

Read the original source before adopting a rule. The [reference catalog](/#references) explains the scope and limits of several public guides, and the [captured library](/library) preserves source and license information for saved snapshots.

A language guide, a formatter's rationale, and a code-review handbook are different resources. You can use all three without claiming that one replaces the others. A captured version may also differ from the current upstream document; check the source link when a detail matters.

Avoid copying an entire guide into a repository and treating every paragraph as an equally important requirement. Start with the conventions that resolve actual uncertainty, then link to deeper material.

## Adopt a small, reviewable set

Try the proposed rules on one representative change. Keep the rules that make the review clearer. Revise rules whose wording leaves contributors guessing. Record the reason for a decision where a future contributor can find it.

The [styleguide.fyi rules](/#rules) are proposed defaults with reasons and examples. Their [review table](/#consensus) records individual assessments, including disagreement. Neither a published rule nor a positive rating establishes that it fits every project.

Once your team chooses its conventions, connect each mechanical rule to a real check and each judgment call to a short explanation. That gives a new contributor a way to act without memorizing a book of preferences.
