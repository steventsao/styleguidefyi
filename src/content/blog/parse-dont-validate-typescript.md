---
title: "Parse, don't validate, in TypeScript: check data once at the edge"
description: "Why a type cast on JSON is not a check, how to parse external data into typed values at the boundary, and what types still cannot prove inside your code."
published: 2026-11-09
category: TypeScript
relatedRules:
  - parse-at-the-boundary
  - no-any
  - illegal-states
  - useful-error-messages
---

TypeScript types describe what your code expects. They say nothing about what arrives at runtime. An HTTP body, an environment variable, a file and a database row are all outside the compiler's view, and a program that treats them as already typed has bugs the compiler cannot report.

"Parse, don't validate" is the name [Alexis King gave](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/) to the fix: check external data once, where it enters, and turn it into a value whose type records that the check happened. This article shows what that means in TypeScript.

## A cast is not a check

This handler compiles, and the editor shows `body` as a `CreateOrder`:

```ts
interface CreateOrder {
  customerId: string;
  quantity: number;
}

async function handler(req: Request) {
  const body = (await req.json()) as CreateOrder;
  return createOrder(body);
}
```

`as` does no work at runtime. If the client sends `{ "quantity": "3" }`, the program carries a string where every later function believes there is a number. The failure appears far from the cause: a total that reads `"31"` after an addition, or a `NaN` written to a database.

The same problem exists without the cast. `JSON.parse` and `response.json()` return `any`, and [`any` turns the type checker off](/rules/no-any) for everything it touches. Assigning the result to `unknown` first makes the missing step visible, because TypeScript will not let you read a property of `unknown` until you [narrow it](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).

## Validating versus parsing

A validator answers yes or no and leaves the type as it was:

```ts
function isValidOrder(body: unknown): boolean {
  return typeof body === "object" && body !== null && "quantity" in body;
}

if (isValidOrder(body)) {
  createOrder(body as CreateOrder); // the check and the type are not connected
}
```

Nothing ties the check to the cast. Someone can add a field to `CreateOrder` and forget the validator, and the compiler stays silent.

A parser returns the typed value or fails. The type is the evidence that the check ran:

```ts
function parseCreateOrder(input: unknown): CreateOrder {
  if (typeof input !== "object" || input === null) {
    throw new Error(`Expected an order object, received ${typeof input}`);
  }
  const { customerId, quantity } = input as Record<string, unknown>;
  if (typeof customerId !== "string" || customerId === "") {
    throw new Error("Order is missing customerId");
  }
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Order quantity must be a positive integer, received ${JSON.stringify(quantity)}`);
  }
  return { customerId, quantity };
}
```

The only way to obtain a `CreateOrder` from outside data is to call the parser. A schema library gives you the same guarantee with less code, and derives the type from the schema so the two cannot drift:

```ts
const CreateOrder = z.object({
  customerId: z.string().min(1),
  quantity: z.number().int().positive(),
});
type CreateOrder = z.infer<typeof CreateOrder>;

const body = CreateOrder.parse(await req.json());
```

Which library to use is a decision for your repository. The technique does not depend on it.

## Where the boundary is

Parse at every point where data enters from something your compiler did not check:

- HTTP request and response bodies, query strings and headers
- environment variables and configuration files
- rows from a database, when the schema can change independently of the code
- messages from a queue, and anything read from `localStorage` or disk

Then [trust your types inside](/rules/parse-at-the-boundary). A function three calls deep that receives a `CreateOrder` should not check again that `quantity` is a number. Repeated checks add branches that can never run, and they hide the place where the real check lives.

## Parse into a more precise type

Parsing is the moment to make the type say more than the wire format does. A response with optional fields often hides a small set of real states:

```ts
type Payment =
  | { status: "pending" }
  | { status: "paid"; paidAt: Date }
  | { status: "failed"; reason: string };
```

If the API sends `{ status, paidAt?, reason? }`, the parser is the place to reject a "paid" payment with no date and return the union. The rest of the code then cannot construct or receive the contradictory combination. That is the rule to [make illegal states unrepresentable](/rules/illegal-states), applied at the edge.

## Make the failure readable

A parser fails on purpose, so its error is part of its interface. Say which field failed, what was expected and what arrived, as the hand-written parser above does. [A useful error message](/rules/useful-error-messages) turns a rejected request into a fix in one step. Take care with what you echo back: the received value belongs in a server log, and a public error response should not repeat secrets or large payloads.

Decide what happens after a failure as well. For an HTTP handler, a parse failure is the client's error and maps to a 400. For a message from a queue, it may mean the message goes to a dead-letter queue. The parser reports; the boundary decides.

## What parsing does not prove

A parsed value is well-formed. It is not necessarily permitted or current:

- **Authorization.** A valid `customerId` does not mean this caller may order for that customer. Check permissions where the operation happens.
- **State.** A parsed "quantity: 3" does not mean three items are still in stock. Check state-dependent conditions at the moment you act, in the same step as the write.
- **Time.** A value parsed an hour ago described the world an hour ago.

Types record facts about shape. The rest still needs a check at the point of use.

## A short checklist

- No `as` on data that came from outside the program.
- External data starts as `unknown` and becomes typed only through a parser.
- One parser per boundary type, and the type is derived from it or returned by it.
- Inside the boundary, no repeated shape checks.
- Parse failures name the field, the expectation and the value.
- Permissions and current state are checked where the operation runs.

Applied consistently, this removes a class of bug where bad data travels deep into a program before anything notices.
