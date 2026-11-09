---
title: "Timeouts, retries and backoff: a checklist for calls that fail"
description: "Seven questions to ask before code calls another service: timeout, retry budget, backoff with jitter, idempotency, cancellation, races and clocks, with examples."
published: 2026-11-09
category: Reliability
relatedRules:
  - bound-every-wait
  - retry-with-backoff
  - idempotent-before-retry
  - propagate-cancellation
  - atomic-check-and-act
  - monotonic-clock-for-durations
  - await-or-hand-off
---

A call to another service can succeed, fail, or do neither for a long time. Most code is written for the first case and tested for the second. The third is the one that takes a system down, because a caller that waits holds resources, and the callers behind it start waiting too.

This is a checklist for any code that calls a dependency: an HTTP API, a database, a queue. Each item links to the rule behind it, and each rule cites its published source.

## 1. Does every call have a timeout?

A `fetch` with no timeout waits as long as the server does. When the dependency slows down, each waiting call holds a connection or a request slot, and the slowdown spreads to your own callers. Google's SRE book describes this pattern in its chapter on [cascading failures](https://sre.google/sre-book/addressing-cascading-failures/).

```ts
const RATES_TIMEOUT_MS = 2_000;
const response = await fetch(url, { signal: AbortSignal.timeout(RATES_TIMEOUT_MS) });
```

Choose the number from the dependency's measured latency and the time your own caller is willing to wait. A timeout longer than your caller's patience does no good. The rule: [put a timeout or a deadline on every call to a dependency](/rules/bound-every-wait).

## 2. Is the retry bounded, delayed and randomized?

A retry that fires at once hits a dependency that is already struggling. If every client does the same, they retry in step and the load arrives in waves. The standard remedy is to wait longer after each failure and to add randomness. Marc Brooker's analysis of [exponential backoff and jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) compares the variants.

```ts
for (let attempt = 0; ; attempt++) {
  try {
    return await api.get("/rates");
  } catch (error) {
    if (!isRetryable(error) || attempt === MAX_RETRIES) throw error;
    const capMs = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
    await sleep(Math.random() * capMs);
  }
}
```

Three details matter as much as the formula:

- **Retry only what can succeed later.** A timeout or a 503 may pass on a second try. A 400 will fail the same way every time.
- **Bound the total time as well as the attempts.** The loop above limits attempts. A production version should also stop when the caller's deadline has passed. One of this site's reviewers [marked the rule's example down](/rules/retry-with-backoff) for leaving that out.
- **Retry at one layer.** If the SDK, your wrapper and your caller each retry three times, one failure becomes twenty-seven calls. Find out what your client library already does before adding a loop.

## 3. Is the operation safe to repeat?

A timeout does not tell you whether the request was processed. The server may have charged the card and lost the connection before replying. Retrying a write that is not idempotent then does the work twice.

Give each intended write a key that stays the same across retries, and use an endpoint that deduplicates on it:

```ts
const idempotencyKey = order.id; // one key per intended charge
await withRetry(() =>
  api.post("/charges", { amount, customer }, {
    headers: { "Idempotency-Key": idempotencyKey },
  })
);
```

The key only helps if the receiver enforces it for the whole retry window. Stripe's API documents this contract for [idempotent requests](https://docs.stripe.com/api/idempotent_requests), and the Amazon Builders' Library covers the server side in [making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/). The rule: [make an operation safe to repeat before you retry it](/rules/idempotent-before-retry).

## 4. Does the work stop when the caller leaves?

When a user navigates away or an upstream request times out, the work done on their behalf should stop. Work that continues spends the capacity the timeout was supposed to free.

```ts
async function buildReport(id: string, { signal }: { signal: AbortSignal }) {
  const rows = await db.query(REPORT_SQL, [id], { signal });
  signal.throwIfAborted();
  return render(rows);
}
```

Accept a signal and pass it to every call the caller owns. Cleanup is the exception: releasing a lock must finish, on its own short deadline. The rule: [pass cancellation through to the work the caller owns](/rules/propagate-cancellation).

## 5. Does every promise have an owner?

A promise that is not awaited, returned or given a handler fails with nobody watching. In Node.js an unhandled rejection [ends the process by default](https://nodejs.org/api/cli.html#--unhandled-rejectionsmode). Either await the work or hand it to something built to own it, such as a queue that retries and records failures. The typescript-eslint rule [`no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises/) finds these mechanically. The rule: [await every promise, or hand it to something that owns it](/rules/await-or-hand-off).

## 6. Is the check part of the write?

Retries and concurrency mean the same operation can run twice at once. Code that reads a value, checks it and then writes leaves a gap in which another request can change the value:

```ts
const account = await accounts.get(id);
if (account.balance >= amount) {
  await accounts.update(id, { balance: account.balance - amount });
}
```

Two concurrent withdrawals both pass the check. Put the condition inside the write, with a conditional update, a unique constraint or a transaction that detects the conflict, and handle the case where the write reports that the condition failed. The rule: [make a check and the action it guards one atomic step](/rules/atomic-check-and-act).

## 7. Are durations measured with the right clock?

Timeouts and backoff both measure elapsed time. The wall clock can jump when the system synchronizes its time, so a duration computed from `Date.now()` can come out negative or far too large. Use a monotonic source such as `performance.now()` for elapsed time, and keep the wall clock for timestamps people read. The rule: [measure elapsed time with a monotonic clock](/rules/monotonic-clock-for-durations).

## Using the checklist

Run through the seven questions when you review code that adds or changes a call to a dependency:

1. What is the timeout, and where does the number come from?
2. How many retries, with what delay, for which errors, at which layer?
3. What happens if the request is processed twice?
4. What stops this work when the caller gives up?
5. Who handles a failure in work that outlives the request?
6. Can two copies of this run at once, and what prevents a double write?
7. Which clock measures the wait?

All seven rules, with their sources, are on one page under [timeouts, retries and concurrency](/topics/concurrency). If you work with a coding agent, that page is also available as a Markdown file to add to its instructions.
