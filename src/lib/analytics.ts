/**
 * Event names and the capture wrapper for the search-traffic instrumentation.
 *
 * A pageview count cannot say which rule brought a reader in, what they came to look
 * up, or whether an agent read the guide. These events name that intent, so search
 * demand and on-page behaviour read together.
 */

/** Every event this site sends. PostHog adds `$pageview`, `$pageleave` and autocapture itself. */
export const EVENTS = {
	/** A reader used the rule filter. The query is search demand this page already answers. */
	ruleSearched: "rule_searched",
	/** A reader opened one rule, by anchor link or by landing on its hash from a search result. */
	ruleOpened: "rule_opened",
	sectionOpened: "section_opened",
	/** The reader took the guide away. This is the conversion for a content page. */
	guideCopied: "guide_copied",
	/** A click through to the markdown or the JSON endpoint. */
	dataEndpointOpened: "data_endpoint_opened",
	/** A click out to a cited source. */
	referenceOpened: "reference_opened",
	/** Whether this visitor's browser can drive the page as an agent. */
	webmcpDetected: "webmcp_detected",
	/** An agent, or the Run button, called one of the registered tools. */
	webmcpToolCalled: "webmcp_tool_called",
	consensusSearched: "consensus_searched",
	consensusRationaleOpened: "consensus_rationale_opened",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

export interface Capturer {
	capture(event: string, properties?: EventProperties): unknown;
}

/** PostHog rejects very long property values, and a shell command can be 4 KiB. */
const MAX_PROPERTY_LENGTH = 300;

/** Events captured before the client loads. Enough for the first clicks, then it stops growing. */
const MAX_QUEUED_EVENTS = 50;

interface QueuedEvent {
	event: EventName;
	properties: EventProperties;
}

let client: Capturer | undefined;
const queue: QueuedEvent[] = [];

function clamp(properties: EventProperties): EventProperties {
	const clamped: EventProperties = {};
	for (const [name, value] of Object.entries(properties)) {
		clamped[name] = typeof value === "string" ? value.slice(0, MAX_PROPERTY_LENGTH) : value;
	}
	return clamped;
}

function send(capturer: Capturer, { event, properties }: QueuedEvent): void {
	try {
		capturer.capture(event, properties);
	} catch (error) {
		// A failed capture must not break a page that works without analytics. Report it and continue.
		console.warn(`analytics: dropped ${event}`, error);
	}
}

/**
 * Attaches the loaded client and flushes what `track` captured while it loaded.
 * Pass `undefined` to detach, which makes every later `track` call a no-op.
 */
export function setCapturer(capturer: Capturer | undefined): void {
	client = capturer;
	if (!capturer) return;
	for (const queued of queue.splice(0)) send(capturer, queued);
}

/**
 * Sends one event, or queues it until the client loads. Never throws: the caller is
 * a click handler that has real work to finish.
 */
export function track(event: EventName, properties: EventProperties = {}): void {
	const queued = { event, properties: clamp(properties) };
	if (client) {
		send(client, queued);
		return;
	}
	if (queue.length < MAX_QUEUED_EVENTS) queue.push(queued);
}

/** Test seam: drops the client and anything still queued. */
export function resetAnalytics(): void {
	client = undefined;
	queue.length = 0;
}
