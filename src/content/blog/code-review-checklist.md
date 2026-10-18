---
title: "A code review checklist that goes beyond formatting"
description: "Review behavior, failure paths, tests, and scope with a practical code review checklist. Includes a worked example and links to the underlying coding rules."
published: 2026-10-17
category: Code review
relatedRules:
  - smallest-diff
  - parse-at-the-boundary
  - never-swallow
  - test-behavior
---

A useful code review answers one question: can someone safely depend on this change? Formatting matters, but it rarely answers that question. Start with behavior, follow the data, and ask how the change fails before spending attention on naming.

This checklist is for a small application change: an endpoint, a component, a background job, or a library function. Treat it as a starting point. A database migration or an authorization change needs additional checks specific to that risk.

## Start with the promised behavior

Read the description before the diff. Identify the input that triggers the change and the observable result. “Improve error handling” is hard to assess. “A failed inventory lookup now shows a retry message instead of an empty cart” gives the reviewer something to verify.

Check that the implementation and the description agree. If a pull request also renames a module, changes a dependency, and rearranges tests, ask whether those changes are necessary to deliver the promised behavior. Separate changes that need separate reasoning.

## Follow one input across the boundary

Pick an input from outside the program: an HTTP body, a file, a query parameter, or a response from another service. Follow it from parsing to the state it changes.

- Is its shape checked at the point it enters?
- Does the caller have permission to perform the operation?
- Can state change between the permission or availability check and the write?
- Are units and optional values clear at the call site?

A TypeScript type assertion does not validate a request. A valid request does not prove authorization. These are distinct questions, even when the code answers them in neighboring lines. See the guide's [boundary parsing rule](/#parse-at-the-boundary).

## Read the failure path as carefully as the happy path

Consider this simplified lookup:

```ts
async function listInvoices() {
  try {
    return await billing.listInvoices();
  } catch {
    return [];
  }
}
```

The interface receives the same value for two different states: there are no invoices, or the billing service failed. A test that expects an array can pass while the user sees a misleading empty state.

The review question is not simply whether the function catches errors. It is whether the layer that can help the user receives enough information to act. Let the failure reach the caller, or represent failure explicitly in the return contract. Then check the interface's error state.

For asynchronous work, also identify its owner. Who observes the rejection? What ends the wait? If a retry is possible, can repeating the operation create a duplicate side effect?

## Ask what the tests demonstrate

Read a test's setup and assertion together. Does the assertion observe the promised behavior, or just confirm that an internal helper was called?

For the invoice example, useful checks distinguish an empty result from a failed lookup. If this fixes a regression, verify that the regression check would fail against the old behavior. Passing tests are evidence only for the cases they exercise.

Keep the test proportional to the change. A copy edit does not need an elaborate browser suite. A new database boundary needs more than a mock returning the value the implementation expects.

## Leave an actionable review

Separate a correctness problem from a preference. Name the trigger, explain the consequence, and suggest a direction without requiring your exact implementation.

“When billing times out, this returns an empty list, so the page says there are no invoices. Could the caller receive the failure and show its retry state?” is a review the author can act on. “Bad error handling” is not.

Before approving, use this final pass:

1. The change does what its description promises.
2. External data, permissions, and state changes have appropriate checks.
3. Failure is visible to the layer that can respond.
4. Tests exercise the important behavior and failure case.
5. Unrelated cleanup has not obscured the change.

Continue with [how to keep pull requests small](/blog/small-pull-requests) and the [complete coding guide](/#rules). For another perspective, Google's [small changes guidance](https://google.github.io/eng-practices/review/developer/small-cls.html) explains why focused changes are easier to review.
